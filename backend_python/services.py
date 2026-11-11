"""
SAVYANT SYSTEMS - TECHNICAL ASSIGNMENT
Python Business Logic & Services Layer
Implements calculation rules, stock transaction logic, and CSV validation.
"""

from decimal import Decimal, ROUND_HALF_UP
import re
import csv
import io
import sqlite3
from typing import List, Dict, Any, Tuple, Optional


def round_money(val: Decimal) -> Decimal:
    """Rounds a monetary decimal value to 2 decimal places using standard half-up rounding."""
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_order_financials(items: List[Dict[str, Any]], discount_percentage: float) -> Dict[str, Any]:
    """
    Calculates and validates order totals according to Part 5:
    Item Amount = Quantity * Rate
    Subtotal = Sum of Item Amounts
    Discount Amount = Subtotal * Discount Percentage / 100
    Grand Total = Subtotal - Discount Amount
    """
    if not items or len(items) == 0:
        raise ValueError("Order must contain at least one product item")

    if discount_percentage is None:
        discount_percentage = 0.0

    discount_dec = Decimal(str(discount_percentage))
    if discount_dec < Decimal("0.00") or discount_dec > Decimal("20.00"):
        raise ValueError("Discount percentage must be between 0% and 20%")

    seen_products = set()
    calculated_items = []
    subtotal = Decimal("0.00")

    for idx, item in enumerate(items, start=1):
        product_id = item.get("product_id")
        if not product_id:
            raise ValueError(f"Item {idx} is missing product_id")

        if product_id in seen_products:
            raise ValueError(f"Duplicate product ID {product_id} is not allowed within the same order")
        seen_products.add(product_id)

        raw_qty = item.get("quantity")
        if raw_qty is None:
            raise ValueError(f"Item {idx} is missing quantity")

        try:
            qty_val = float(raw_qty)
        except (ValueError, TypeError):
            raise ValueError(f"Item {idx} has invalid non-numeric quantity: {raw_qty}")

        if not qty_val.is_integer() or qty_val <= 0:
            raise ValueError(f"Item {idx} quantity must be a positive whole number, received: {raw_qty}")

        qty = int(qty_val)

        raw_rate = item.get("rate")
        if raw_rate is None:
            raise ValueError(f"Item {idx} is missing rate")

        try:
            rate = Decimal(str(raw_rate))
        except Exception:
            raise ValueError(f"Item {idx} has invalid rate: {raw_rate}")

        if rate < Decimal("0.00"):
            raise ValueError(f"Item {idx} rate cannot be negative: {raw_rate}")

        rate_rounded = round_money(rate)
        amount = round_money(Decimal(qty) * rate_rounded)
        subtotal += amount

        calculated_items.append({
            "product_id": product_id,
            "quantity": qty,
            "rate": float(rate_rounded),
            "amount": float(amount)
        })

    subtotal_rounded = round_money(subtotal)
    discount_amount = round_money((subtotal_rounded * discount_dec) / Decimal("100.00"))
    grand_total = round_money(subtotal_rounded - discount_amount)

    return {
        "items": calculated_items,
        "subtotal": float(subtotal_rounded),
        "discount_percentage": float(discount_dec),
        "discount_amount": float(discount_amount),
        "grand_total": float(grand_total)
    }


def validate_csv_products(csv_content: str, existing_codes: set) -> Tuple[bool, List[Dict[str, Any]], List[str]]:
    """
    Validates CSV product import according to Part 10:
    Header: product_code,product_name,category,price,stock_quantity,status
    - Validate required columns
    - Reject duplicate product codes within file or already in DB
    - Reject invalid numeric values, negative values, and invalid statuses
    - Row-level error reporting (row numbers and reasons)
    - All-or-nothing: if any row is invalid, import nothing.
    """
    errors = []
    parsed_products = []
    seen_in_file = set()

    lines = [line.strip() for line in csv_content.strip().splitlines() if line.strip()]
    if not lines:
        return False, [], ["CSV file is empty"]

    reader = csv.reader(lines)
    header = next(reader, None)
    if not header:
        return False, [], ["CSV header is missing"]

    expected_cols = ["product_code", "product_name", "category", "price", "stock_quantity", "status"]
    header_clean = [col.strip().lower() for col in header]

    if header_clean != expected_cols:
        return False, [], [f"Invalid CSV columns. Expected: {','.join(expected_cols)}, received: {','.join(header_clean)}"]

    for row_num, row in enumerate(reader, start=2):
        if len(row) < 6:
            errors.append(f"Row {row_num}: Expected 6 columns, received {len(row)}")
            continue

        code, name, category, price_str, stock_str, status = [c.strip() for c in row[:6]]

        # Product Code
        if not code:
            errors.append(f"Row {row_num}: Product code is required")
        elif code in seen_in_file:
            errors.append(f"Row {row_num}: Duplicate product code '{code}' within CSV file")
        elif code in existing_codes:
            errors.append(f"Row {row_num}: Product code '{code}' already exists in database")
        seen_in_file.add(code)

        # Name & Category
        if not name:
            errors.append(f"Row {row_num}: Product name is required")
        if not category:
            errors.append(f"Row {row_num}: Category is required")

        # Price
        try:
            price = Decimal(price_str)
            if price < Decimal("0.00"):
                errors.append(f"Row {row_num}: Price cannot be negative (got '{price_str}')")
        except Exception:
            errors.append(f"Row {row_num}: Invalid numeric price '{price_str}'")
            price = None

        # Stock quantity
        try:
            stock_float = float(stock_str)
            if not stock_float.is_integer() or stock_float < 0:
                errors.append(f"Row {row_num}: Stock quantity must be a non-negative integer (got '{stock_str}')")
            stock = int(stock_float)
        except Exception:
            errors.append(f"Row {row_num}: Invalid numeric stock quantity '{stock_str}'")
            stock = None

        # Status
        status_clean = status.capitalize()
        if status_clean not in ["Active", "Inactive"]:
            errors.append(f"Row {row_num}: Status must be 'Active' or 'Inactive' (got '{status}')")

        if not errors or len(errors) == 0:
            parsed_products.append({
                "product_code": code,
                "name": name,
                "category": category,
                "price": float(price) if price is not None else 0.0,
                "stock_quantity": stock if stock is not None else 0,
                "status": status_clean
            })

    if errors:
        return False, [], errors

    return True, parsed_products, []
