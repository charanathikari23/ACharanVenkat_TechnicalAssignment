"""
SAVYANT SYSTEMS - TECHNICAL ASSIGNMENT
Part 11: Debugging Exercise & Explanation

Problem Statement:
The original function was intended to calculate the total amount of all items:

    def calculate_total(items):
        total = 0
        for item in items:
            amount = item["qty"] * item["rate"]
            total = amount
        return total

For input:
    items = [
        {"qty": 2, "rate": 100},
        {"qty": 3, "rate": 50}
    ]
Expected result: 350 (i.e., 2*100 + 3*50 = 200 + 150 = 350)
Actual buggy result: 150

EXPLANATION & ANALYSIS:
--------------------------------------------------------------------------------
1. Cause of the incorrect result:
   Inside the loop, the assignment statement is `total = amount` instead of
   `total += amount` (or `total = total + amount`).
   On each iteration through the list, the accumulated sum from previous items
   is completely overwritten with only the current item's amount. Consequently,
   the function merely returns the amount of the very last item in the list
   (3 * 50 = 150) rather than the sum of all item amounts (350).

2. Behaviour for an empty list:
   If `items = []`, the loop never executes, and `total = 0` (or `Decimal('0.00')`)
   is returned immediately. This is the correct mathematical identity for an empty sum.

3. Behaviour when quantity or rate is missing:
   The buggy implementation uses direct dictionary indexing `item["qty"]` and
   `item["rate"]`. If an item is missing either key (e.g. `{"qty": 2}` or `{"rate": 50}`),
   Python raises a `KeyError`, crashing the application without an informative message.
   The corrected version checks for the presence of both keys and raises a descriptive
   `ValueError("Missing required key 'qty' or 'rate' in item: ...")`.

4. Validation of invalid quantities and rates:
   - Quantities must be positive integers (or whole numbers, as specified in the assignment).
     Non-numeric, zero, or negative quantities must be rejected.
   - Rates must be non-negative real numbers or Decimals. Non-numeric or negative rates
     must be rejected.
   - The corrected function validates types and ranges before multiplying, protecting
     against `TypeError` or invalid financial computations.
   - For financial accuracy, the corrected function supports standard floating point,
     integer, and `decimal.Decimal` representations, rounding to 2 decimal places.
"""

from decimal import Decimal, InvalidOperation
import unittest


def calculate_total(items):
    """
    Calculates the total monetary amount for a list of line items.

    Args:
        items (list[dict]): A list of dicts, each containing 'qty' and 'rate'.

    Returns:
        float: The sum of (qty * rate) across all items, rounded to 2 decimal places.

    Raises:
        TypeError: If items is not an iterable / list or item is not a dictionary.
        ValueError: If 'qty' or 'rate' is missing, non-numeric, or violates business bounds
                    (qty must be a positive integer; rate must be non-negative).
    """
    if items is None:
        raise TypeError("Items argument cannot be None")

    if not isinstance(items, (list, tuple)):
        raise TypeError(f"Expected items to be a list or tuple, received {type(items).__name__}")

    total = Decimal("0.00")

    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise TypeError(f"Item at index {index} must be a dictionary, received {type(item).__name__}")

        # Check for missing keys
        if "qty" not in item:
            raise ValueError(f"Item at index {index} is missing required 'qty' field: {item}")
        if "rate" not in item:
            raise ValueError(f"Item at index {index} is missing required 'rate' field: {item}")

        raw_qty = item["qty"]
        raw_rate = item["rate"]

        # Validate Quantity: must be a whole number > 0
        if raw_qty is None or isinstance(raw_qty, bool):
            raise ValueError(f"Invalid quantity at index {index}: cannot be None or boolean")

        try:
            qty_val = float(raw_qty)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid non-numeric quantity at index {index}: {raw_qty}")

        if not qty_val.is_integer() or qty_val <= 0:
            raise ValueError(f"Quantity at index {index} must be a positive integer, got {raw_qty}")

        qty = int(qty_val)

        # Validate Rate: must be a numeric value >= 0
        if raw_rate is None or isinstance(raw_rate, bool):
            raise ValueError(f"Invalid rate at index {index}: cannot be None or boolean")

        try:
            rate = Decimal(str(raw_rate))
        except (InvalidOperation, TypeError):
            raise ValueError(f"Invalid non-numeric rate at index {index}: {raw_rate}")

        if rate < Decimal("0.00"):
            raise ValueError(f"Rate at index {index} cannot be negative, got {raw_rate}")

        # Accumulate correctly (fixing the bug: += instead of =)
        amount = Decimal(qty) * rate
        total += amount

    # Return as standard 2-decimal rounded float for JSON compatibility
    return float(round(total, 2))


# ==============================================================================
# AUTOMATED UNIT TESTS DEMONSTRATING THE CORRECTION
# ==============================================================================
class TestCalculateTotal(unittest.TestCase):

    def test_original_assignment_example(self):
        """Test the exact input from Part 11 of the assignment."""
        items = [
            {"qty": 2, "rate": 100},
            {"qty": 3, "rate": 50}
        ]
        # 2*100 + 3*50 = 200 + 150 = 350
        self.assertEqual(calculate_total(items), 350.00)

    def test_empty_list(self):
        """Test behaviour when items list is empty."""
        self.assertEqual(calculate_total([]), 0.00)

    def test_single_item(self):
        """Test single item calculation."""
        items = [{"qty": 5, "rate": 19.99}]
        self.assertEqual(calculate_total(items), 99.95)

    def test_multiple_items_with_decimals(self):
        """Test multiple items with fractional rates and proper rounding."""
        items = [
            {"qty": 2, "rate": 1500.00},
            {"qty": 3, "rate": 500.00},
            {"qty": 1, "rate": 12500.50}
        ]
        # 3000 + 1500 + 12500.50 = 17000.50
        self.assertEqual(calculate_total(items), 17000.50)

    def test_missing_qty_key(self):
        """Test rejection when 'qty' is missing."""
        items = [{"rate": 100}]
        with self.assertRaises(ValueError) as ctx:
            calculate_total(items)
        self.assertIn("missing required 'qty' field", str(ctx.exception).lower())

    def test_missing_rate_key(self):
        """Test rejection when 'rate' is missing."""
        items = [{"qty": 2}]
        with self.assertRaises(ValueError) as ctx:
            calculate_total(items)
        self.assertIn("missing required 'rate' field", str(ctx.exception).lower())

    def test_zero_quantity_rejected(self):
        """Test rejection of zero quantity (must be positive whole number)."""
        items = [{"qty": 0, "rate": 100}]
        with self.assertRaises(ValueError) as ctx:
            calculate_total(items)
        self.assertIn("positive integer", str(ctx.exception))

    def test_negative_quantity_rejected(self):
        """Test rejection of negative quantity."""
        items = [{"qty": -2, "rate": 100}]
        with self.assertRaises(ValueError) as ctx:
            calculate_total(items)
        self.assertIn("positive integer", str(ctx.exception))

    def test_fractional_quantity_rejected(self):
        """Test rejection of fractional quantity (assignment: whole numbers only)."""
        items = [{"qty": 2.5, "rate": 100}]
        with self.assertRaises(ValueError) as ctx:
            calculate_total(items)
        self.assertIn("positive integer", str(ctx.exception))

    def test_negative_rate_rejected(self):
        """Test rejection of negative rate."""
        items = [{"qty": 2, "rate": -50.00}]
        with self.assertRaises(ValueError) as ctx:
            calculate_total(items)
        self.assertIn("cannot be negative", str(ctx.exception))

    def test_non_numeric_rate_rejected(self):
        """Test rejection of non-numeric string rate."""
        items = [{"qty": 2, "rate": "invalid_rate"}]
        with self.assertRaises(ValueError) as ctx:
            calculate_total(items)
        self.assertIn("non-numeric rate", str(ctx.exception))

    def test_invalid_items_type(self):
        """Test rejection when items is not a list/tuple."""
        with self.assertRaises(TypeError):
            calculate_total(None)
        with self.assertRaises(TypeError):
            calculate_total("invalid")


if __name__ == "__main__":
    unittest.main(verbosity=2)
