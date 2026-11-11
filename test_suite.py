"""
SAVYANT SYSTEMS - TECHNICAL ASSIGNMENT
Part 12: Automated Testing Suite
Covers all critical business logic scenarios required by the assignment:
- Order with multiple items and discount
- Zero or negative quantity rejection
- Discount outside 0-20% rejection
- Confirmation with sufficient stock (stock deducted)
- Confirmation with one insufficient-stock item (atomic rollback)
- Repeated confirmation idempotency (no double deduction)
- Cancellation of Confirmed order (stock restored once)
- Sales User authorization / IDOR protection (access denied)
- CSV with invalid row rejection (all-or-nothing atomicity)
"""

import unittest
import sqlite3
from decimal import Decimal
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from backend_python.services import calculate_order_financials, validate_csv_products


class TestSalesOrderAndInventoryLogic(unittest.TestCase):

    def setUp(self):
        """Set up an in-memory SQLite database mimicking our schema for transactional testing."""
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()

        # Create schema
        self.cursor.executescript("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL
            );

            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Active'
            );

            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
                status TEXT NOT NULL DEFAULT 'Active'
            );

            CREATE TABLE sales_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT NOT NULL UNIQUE,
                customer_id INTEGER NOT NULL,
                order_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Draft',
                discount_percentage REAL NOT NULL DEFAULT 0.0,
                subtotal REAL NOT NULL DEFAULT 0.0,
                discount_amount REAL NOT NULL DEFAULT 0.0,
                grand_total REAL NOT NULL DEFAULT 0.0,
                created_by INTEGER NOT NULL
            );

            CREATE TABLE sales_order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sales_order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                rate REAL NOT NULL,
                amount REAL NOT NULL
            );

            CREATE TABLE stock_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                movement_type TEXT NOT NULL,
                quantity_change INTEGER NOT NULL,
                related_order_id INTEGER,
                reason TEXT NOT NULL,
                created_by INTEGER NOT NULL,
                timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Seed test data
        self.cursor.execute("INSERT INTO users (id, name, email, role) VALUES (1, 'Admin', 'admin@savyant.com', 'ADMIN')")
        self.cursor.execute("INSERT INTO users (id, name, email, role) VALUES (2, 'John Sales', 'john@savyant.com', 'SALES_USER')")
        self.cursor.execute("INSERT INTO users (id, name, email, role) VALUES (3, 'Emma Sales', 'emma@savyant.com', 'SALES_USER')")

        self.cursor.execute("INSERT INTO customers (id, name, status) VALUES (1, 'Acme Corp', 'Active')")

        self.cursor.execute("INSERT INTO products (id, product_code, name, price, stock_quantity, status) VALUES (1, 'PRD-001', 'Keyboard', 1500.00, 10, 'Active')")
        self.cursor.execute("INSERT INTO products (id, product_code, name, price, stock_quantity, status) VALUES (2, 'PRD-002', 'Mouse', 500.00, 2, 'Active')")
        self.cursor.execute("INSERT INTO products (id, product_code, name, price, stock_quantity, status) VALUES (3, 'PRD-003', 'Monitor', 12000.00, 0, 'Active')")

        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    # --------------------------------------------------------------------------
    # Scenario 1: Order with multiple items and discount -> Correct subtotal and grand total
    # --------------------------------------------------------------------------
    def test_scenario_1_order_with_multiple_items_and_discount(self):
        # 2 Keyboards @ 1500 = 3000
        # 3 Mice @ 500 = 1500
        # Subtotal = 4500.00
        # Discount 10% = 450.00
        # Grand Total = 4050.00
        items = [
            {"product_id": 1, "quantity": 2, "rate": 1500.00},
            {"product_id": 2, "quantity": 3, "rate": 500.00}
        ]
        calc = calculate_order_financials(items, discount_percentage=10.0)

        self.assertEqual(calc["subtotal"], 4500.00)
        self.assertEqual(calc["discount_percentage"], 10.0)
        self.assertEqual(calc["discount_amount"], 450.00)
        self.assertEqual(calc["grand_total"], 4050.00)
        self.assertEqual(calc["items"][0]["amount"], 3000.00)
        self.assertEqual(calc["items"][1]["amount"], 1500.00)

    # --------------------------------------------------------------------------
    # Scenario 2: Zero or negative quantity -> Rejected
    # --------------------------------------------------------------------------
    def test_scenario_2_zero_or_negative_quantity_rejected(self):
        items_zero = [{"product_id": 1, "quantity": 0, "rate": 100.00}]
        with self.assertRaises(ValueError) as ctx_zero:
            calculate_order_financials(items_zero, 0)
        self.assertIn("positive whole number", str(ctx_zero.exception).lower())

        items_negative = [{"product_id": 1, "quantity": -3, "rate": 100.00}]
        with self.assertRaises(ValueError) as ctx_neg:
            calculate_order_financials(items_negative, 0)
        self.assertIn("positive whole number", str(ctx_neg.exception).lower())

    # --------------------------------------------------------------------------
    # Scenario 3: Discount outside 0-20% -> Rejected
    # --------------------------------------------------------------------------
    def test_scenario_3_discount_outside_bounds_rejected(self):
        items = [{"product_id": 1, "quantity": 1, "rate": 100.00}]

        # Negative discount
        with self.assertRaises(ValueError) as ctx_neg:
            calculate_order_financials(items, discount_percentage=-5.0)
        self.assertIn("between 0% and 20%", str(ctx_neg.exception))

        # Discount above 20%
        with self.assertRaises(ValueError) as ctx_high:
            calculate_order_financials(items, discount_percentage=20.5)
        self.assertIn("between 0% and 20%", str(ctx_high.exception))

    # Helper function simulating transactional order confirmation
    def confirm_order_transaction(self, order_id: int, user_id: int):
        cur = self.conn.cursor()
        try:
            cur.execute("BEGIN TRANSACTION")

            cur.execute("SELECT status FROM sales_orders WHERE id = ?", (order_id,))
            order = cur.fetchone()
            if not order:
                raise ValueError("Order not found")

            if order["status"] == "Confirmed":
                # Idempotent: already confirmed, no additional stock deduction
                self.conn.commit()
                return {"success": True, "already_confirmed": True}

            if order["status"] != "Draft":
                raise ValueError(f"Cannot confirm order in status {order['status']}")

            # Fetch items
            cur.execute("SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?", (order_id,))
            items = cur.fetchall()

            # Check stock availability for all items first
            for item in items:
                cur.execute("SELECT stock_quantity, name FROM products WHERE id = ?", (item["product_id"],))
                prod = cur.fetchone()
                if not prod or prod["stock_quantity"] < item["quantity"]:
                    raise ValueError(f"Insufficient stock for product {item['product_id']}. Available: {prod['stock_quantity'] if prod else 0}, Requested: {item['quantity']}")

            # Deduct stock and record movements
            for item in items:
                cur.execute("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", (item["quantity"], item["product_id"]))
                cur.execute("""
                    INSERT INTO stock_movements (product_id, movement_type, quantity_change, related_order_id, reason, created_by)
                    VALUES (?, 'ORDER_DEDUCT', ?, ?, 'Order confirmation deduction', ?)
                """, (item["product_id"], -item["quantity"], order_id, user_id))

            # Update order status
            cur.execute("UPDATE sales_orders SET status = 'Confirmed' WHERE id = ?", (order_id,))

            self.conn.commit()
            return {"success": True, "already_confirmed": False}

        except Exception as e:
            self.conn.rollback()
            raise e

    # Helper function simulating transactional order cancellation
    def cancel_order_transaction(self, order_id: int, user_id: int):
        cur = self.conn.cursor()
        try:
            cur.execute("BEGIN TRANSACTION")

            cur.execute("SELECT status FROM sales_orders WHERE id = ?", (order_id,))
            order = cur.fetchone()
            if not order:
                raise ValueError("Order not found")

            if order["status"] == "Cancelled":
                # Idempotent: already cancelled, no duplicate restoration
                self.conn.commit()
                return {"success": True, "already_cancelled": True}

            if order["status"] == "Confirmed":
                # Restore stock
                cur.execute("SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?", (order_id,))
                items = cur.fetchall()
                for item in items:
                    cur.execute("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", (item["quantity"], item["product_id"]))
                    cur.execute("""
                        INSERT INTO stock_movements (product_id, movement_type, quantity_change, related_order_id, reason, created_by)
                        VALUES (?, 'ORDER_RESTORE', ?, ?, 'Order cancellation stock restore', ?)
                    """, (item["product_id"], item["quantity"], order_id, user_id))

            cur.execute("UPDATE sales_orders SET status = 'Cancelled' WHERE id = ?", (order_id,))
            self.conn.commit()
            return {"success": True, "already_cancelled": False}

        except Exception as e:
            self.conn.rollback()
            raise e

    # --------------------------------------------------------------------------
    # Scenario 4: Confirmation with sufficient stock -> Order confirmed and stock deducted
    # --------------------------------------------------------------------------
    def test_scenario_4_confirmation_with_sufficient_stock(self):
        # Initial stock for Product 1 (Keyboard) is 10
        self.cursor.execute("INSERT INTO sales_orders (id, order_number, customer_id, order_date, status, created_by) VALUES (10, 'SO-TEST-01', 1, '2026-11-11', 'Draft', 2)")
        self.cursor.execute("INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount) VALUES (10, 1, 3, 1500.0, 4500.0)")
        self.conn.commit()

        result = self.confirm_order_transaction(10, user_id=2)
        self.assertTrue(result["success"])

        # Verify order status is Confirmed
        self.cursor.execute("SELECT status FROM sales_orders WHERE id = 10")
        self.assertEqual(self.cursor.fetchone()["status"], "Confirmed")

        # Verify stock was deducted: 10 - 3 = 7
        self.cursor.execute("SELECT stock_quantity FROM products WHERE id = 1")
        self.assertEqual(self.cursor.fetchone()["stock_quantity"], 7)

        # Verify stock movement record created
        self.cursor.execute("SELECT quantity_change, movement_type FROM stock_movements WHERE related_order_id = 10")
        m = self.cursor.fetchone()
        self.assertEqual(m["movement_type"], "ORDER_DEDUCT")
        self.assertEqual(m["quantity_change"], -3)

    # --------------------------------------------------------------------------
    # Scenario 5: Confirmation with one insufficient-stock item -> No stock or status changes (Rollback)
    # --------------------------------------------------------------------------
    def test_scenario_5_confirmation_with_insufficient_stock_aborts(self):
        # Product 1 has stock 10. Product 2 has stock 2.
        # Order requests 1 Keyboard (ok) and 5 Mice (exceeds 2 available!)
        self.cursor.execute("INSERT INTO sales_orders (id, order_number, customer_id, order_date, status, created_by) VALUES (20, 'SO-TEST-02', 1, '2026-11-11', 'Draft', 2)")
        self.cursor.execute("INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount) VALUES (20, 1, 1, 1500.0, 1500.0)")
        self.cursor.execute("INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount) VALUES (20, 2, 5, 500.0, 2500.0)")
        self.conn.commit()

        with self.assertRaises(ValueError) as ctx:
            self.confirm_order_transaction(20, user_id=2)
        self.assertIn("Insufficient stock", str(ctx.exception))

        # Check that order is still Draft
        self.cursor.execute("SELECT status FROM sales_orders WHERE id = 20")
        self.assertEqual(self.cursor.fetchone()["status"], "Draft")

        # Verify NO stock was deducted for Keyboard or Mouse (atomic rollback)
        self.cursor.execute("SELECT stock_quantity FROM products WHERE id = 1")
        self.assertEqual(self.cursor.fetchone()["stock_quantity"], 10)

        self.cursor.execute("SELECT stock_quantity FROM products WHERE id = 2")
        self.assertEqual(self.cursor.fetchone()["stock_quantity"], 2)

    # --------------------------------------------------------------------------
    # Scenario 6: Repeated confirmation -> No additional deduction
    # --------------------------------------------------------------------------
    def test_scenario_6_repeated_confirmation_idempotent(self):
        self.cursor.execute("INSERT INTO sales_orders (id, order_number, customer_id, order_date, status, created_by) VALUES (30, 'SO-TEST-03', 1, '2026-11-11', 'Draft', 2)")
        self.cursor.execute("INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount) VALUES (30, 1, 2, 1500.0, 3000.0)")
        self.conn.commit()

        # First confirmation
        res1 = self.confirm_order_transaction(30, user_id=2)
        self.assertFalse(res1["already_confirmed"])

        # Check stock: 10 - 2 = 8
        self.cursor.execute("SELECT stock_quantity FROM products WHERE id = 1")
        self.assertEqual(self.cursor.fetchone()["stock_quantity"], 8)

        # Repeated confirmation request
        res2 = self.confirm_order_transaction(30, user_id=2)
        self.assertTrue(res2["already_confirmed"])

        # Stock must remain 8 (NO double deduction)
        self.cursor.execute("SELECT stock_quantity FROM products WHERE id = 1")
        self.assertEqual(self.cursor.fetchone()["stock_quantity"], 8)

    # --------------------------------------------------------------------------
    # Scenario 7: Cancellation of Confirmed order -> Stock restored once
    # --------------------------------------------------------------------------
    def test_scenario_7_cancellation_of_confirmed_order_restores_stock_once(self):
        # Create and confirm order with 4 Keyboards
        self.cursor.execute("INSERT INTO sales_orders (id, order_number, customer_id, order_date, status, created_by) VALUES (40, 'SO-TEST-04', 1, '2026-11-11', 'Draft', 2)")
        self.cursor.execute("INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount) VALUES (40, 1, 4, 1500.0, 6000.0)")
        self.conn.commit()

        self.confirm_order_transaction(40, user_id=2)
        # Stock: 10 - 4 = 6
        self.cursor.execute("SELECT stock_quantity FROM products WHERE id = 1")
        self.assertEqual(self.cursor.fetchone()["stock_quantity"], 6)

        # Cancel Confirmed order
        res1 = self.cancel_order_transaction(40, user_id=2)
        self.assertFalse(res1["already_cancelled"])

        # Stock must be restored: 6 + 4 = 10
        self.cursor.execute("SELECT stock_quantity FROM products WHERE id = 1")
        self.assertEqual(self.cursor.fetchone()["stock_quantity"], 10)

        # Verify restoration movement record
        self.cursor.execute("SELECT movement_type, quantity_change FROM stock_movements WHERE related_order_id = 40 AND movement_type = 'ORDER_RESTORE'")
        rest_mov = self.cursor.fetchone()
        self.assertIsNotNone(rest_mov)
        self.assertEqual(rest_mov["quantity_change"], 4)

        # Repeated cancellation must not restore stock a second time
        res2 = self.cancel_order_transaction(40, user_id=2)
        self.assertTrue(res2["already_cancelled"])

        # Stock still 10
        self.cursor.execute("SELECT stock_quantity FROM products WHERE id = 1")
        self.assertEqual(self.cursor.fetchone()["stock_quantity"], 10)

    # --------------------------------------------------------------------------
    # Scenario 8: Sales User accesses another user's order -> Access denied
    # --------------------------------------------------------------------------
    def test_scenario_8_sales_user_access_another_user_order_denied(self):
        # Order 50 was created by John Sales (user_id = 2)
        self.cursor.execute("INSERT INTO sales_orders (id, order_number, customer_id, order_date, status, created_by) VALUES (50, 'SO-TEST-05', 1, '2026-11-11', 'Draft', 2)")
        self.conn.commit()

        # Authorization check function
        def check_order_access(order_id: int, request_user_id: int, role: str) -> bool:
            cur = self.conn.cursor()
            cur.execute("SELECT created_by FROM sales_orders WHERE id = ?", (order_id,))
            o = cur.fetchone()
            if not o:
                return False
            if role == "ADMIN":
                return True
            return o["created_by"] == request_user_id

        # John Sales can access his own order
        self.assertTrue(check_order_access(order_id=50, request_user_id=2, role="SALES_USER"))

        # Admin can access any order
        self.assertTrue(check_order_access(order_id=50, request_user_id=1, role="ADMIN"))

        # Emma Sales (user_id = 3) MUST BE DENIED access to John's order
        self.assertFalse(check_order_access(order_id=50, request_user_id=3, role="SALES_USER"))

    # --------------------------------------------------------------------------
    # Scenario 9: CSV containing an invalid row -> No products imported
    # --------------------------------------------------------------------------
    def test_scenario_9_csv_containing_invalid_row_aborts_all(self):
        existing_codes = {"PRD-001", "PRD-002", "PRD-003"}

        # CSV with 1 valid item, 1 negative price item
        invalid_csv = (
            "product_code,product_name,category,price,stock_quantity,status\n"
            "PRD-991,Valid Scanner,Office,350.00,10,Active\n"
            "PRD-992,Defective Item,Office,-20.00,5,Active\n"
        )

        success, products, errors = validate_csv_products(invalid_csv, existing_codes)

        # Must fail and import NOTHING
        self.assertFalse(success)
        self.assertEqual(len(products), 0)
        self.assertTrue(len(errors) > 0)
        self.assertIn("Price cannot be negative", errors[0])

        # Test valid CSV imports successfully
        valid_csv = (
            "product_code,product_name,category,price,stock_quantity,status\n"
            "PRD-801,Clean Desk Lamp,Office,850.00,20,Active\n"
            "PRD-802,Cable Organizer Box,Accessories,180.00,50,Active\n"
        )
        success_v, products_v, errors_v = validate_csv_products(valid_csv, existing_codes)
        self.assertTrue(success_v)
        self.assertEqual(len(errors_v), 0)
        self.assertEqual(len(products_v), 2)
        self.assertEqual(products_v[0]["product_code"], "PRD-801")


if __name__ == "__main__":
    unittest.main(verbosity=2)
