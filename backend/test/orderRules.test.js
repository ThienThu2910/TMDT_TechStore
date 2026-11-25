import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscountCents,
  canTransitionOrder,
  fromCents,
  normalizeOrderItems,
  toCents,
} from '../src/utils/orderRules.js';

test('combines duplicate product rows before inventory validation', () => {
  assert.deepEqual(normalizeOrderItems([
    { product_id: 4, quantity: 2 },
    { product_id: 2, quantity: 1 },
    { product_id: 4, quantity: 3 },
  ]), [
    { product_id: 2, quantity: 1 },
    { product_id: 4, quantity: 5 },
  ]);
});

test('rejects invalid IDs, fractional quantities, and excessive combined quantities', () => {
  assert.throws(() => normalizeOrderItems([{ product_id: 0, quantity: 1 }]), /Mã sản phẩm/);
  assert.throws(() => normalizeOrderItems([{ product_id: 2, quantity: 1.5 }]), /số nguyên dương/);
  assert.throws(() => normalizeOrderItems([
    { product_id: 2, quantity: 60 },
    { product_id: 2, quantity: 41 },
  ]), /tối đa 100/);
});

test('keeps monetary arithmetic in cents and caps discounts at the subtotal', () => {
  assert.equal(toCents(1234.56), 123456);
  assert.equal(fromCents(123456), 1234.56);
  assert.equal(calculateDiscountCents({ discount_type: 'percent', discount_value: 10, minimum_order: 0, maximum_discount: 100 }, 50000), 5000);
  assert.equal(calculateDiscountCents({ discount_type: 'fixed', discount_value: 200, minimum_order: 0 }, 5000), 5000);
});

test('enforces the forward order state machine while allowing idempotent updates', () => {
  assert.equal(canTransitionOrder('pending', 'confirmed'), true);
  assert.equal(canTransitionOrder('pending', 'pending'), true);
  assert.equal(canTransitionOrder('delivered', 'shipping'), false);
  assert.equal(canTransitionOrder('cancelled', 'confirmed'), false);
  assert.equal(canTransitionOrder('unknown', 'pending'), false);
});
