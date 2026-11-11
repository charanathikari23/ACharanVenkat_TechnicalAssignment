import test from 'node:test';
import assert from 'node:assert/strict';

// Pure logic for calculation & validation
function calculateOrderFinancials(
  items: { quantity: number; rate: number }[],
  discountPercentage: number
) {
  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one product');
  }

  if (discountPercentage < 0 || discountPercentage > 20) {
    throw new Error('Discount percentage must be between 0% and 20%');
  }

  let subtotal = 0;
  for (const it of items) {
    if (it.quantity <= 0 || !Number.isInteger(it.quantity)) {
      throw new Error('Quantity must be a positive integer');
    }
    if (it.rate < 0) {
      throw new Error('Rate cannot be negative');
    }
    const itemAmount = Math.round(it.quantity * it.rate * 100) / 100;
    subtotal = Math.round((subtotal + itemAmount) * 100) / 100;
  }

  const discountAmount = Math.round(((subtotal * discountPercentage) / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal - discountAmount) * 100) / 100;

  return { subtotal, discountAmount, grandTotal };
}

test('Scenario 1: Order with multiple items and discount matches financial rules', () => {
  // 2 keyboards @ 1500 = 3000, 3 mice @ 500 = 1500
  // subtotal = 4500.00, discount 10% = 450.00, grand total = 4050.00
  const items = [
    { quantity: 2, rate: 1500.00 },
    { quantity: 3, rate: 500.00 }
  ];
  const res = calculateOrderFinancials(items, 10.0);
  assert.equal(res.subtotal, 4500.00);
  assert.equal(res.discountAmount, 450.00);
  assert.equal(res.grandTotal, 4050.00);
});

test('Scenario 2: Zero or negative quantity is rejected', () => {
  assert.throws(() => {
    calculateOrderFinancials([{ quantity: 0, rate: 100 }], 0);
  }, /Quantity must be a positive integer/);

  assert.throws(() => {
    calculateOrderFinancials([{ quantity: -2, rate: 100 }], 0);
  }, /Quantity must be a positive integer/);
});

test('Scenario 3: Discount outside 0-20% is rejected', () => {
  const items = [{ quantity: 1, rate: 100 }];
  assert.throws(() => {
    calculateOrderFinancials(items, -1);
  }, /Discount percentage must be between 0% and 20%/);

  assert.throws(() => {
    calculateOrderFinancials(items, 25);
  }, /Discount percentage must be between 0% and 20%/);
});

test('Scenario 8: Role-based IDOR access check blocks sales user from viewing other users orders', () => {
  interface Order {
    id: number;
    createdBy: number;
  }
  const order: Order = { id: 101, createdBy: 2 }; // created by John Sales

  function canAccessOrder(orderObj: Order, userId: number, role: string): boolean {
    if (role === 'ADMIN') return true;
    return orderObj.createdBy === userId;
  }

  // John (id 2) can access his own order
  assert.equal(canAccessOrder(order, 2, 'SALES_USER'), true);
  // Admin can access any order
  assert.equal(canAccessOrder(order, 1, 'ADMIN'), true);
  // Emma (id 3) must be denied
  assert.equal(canAccessOrder(order, 3, 'SALES_USER'), false);
});
