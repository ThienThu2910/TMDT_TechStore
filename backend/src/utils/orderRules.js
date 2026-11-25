export const ORDER_TRANSITIONS = Object.freeze({
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
});

export function ruleError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function normalizeOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw ruleError('Đơn hàng phải có từ 1 đến 50 sản phẩm.');
  }

  const quantities = new Map();
  for (const item of items) {
    const productId = Number(item?.product_id);
    const quantity = Number(item?.quantity);
    if (!Number.isSafeInteger(productId) || productId < 1) {
      throw ruleError('Mã sản phẩm không hợp lệ.');
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw ruleError('Số lượng sản phẩm phải là số nguyên dương.');
    }
    const combined = (quantities.get(productId) || 0) + quantity;
    if (combined > 100) throw ruleError('Mỗi sản phẩm chỉ được đặt tối đa 100 chiếc.');
    quantities.set(productId, combined);
  }

  return [...quantities.entries()]
    .map(([product_id, quantity]) => ({ product_id, quantity }))
    .sort((a, b) => a.product_id - b.product_id);
}

export function toCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw ruleError('Giá trị tiền không hợp lệ.');
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromCents(value) {
  return Number((value / 100).toFixed(2));
}

export function calculateDiscountCents(coupon, subtotalCents) {
  if (subtotalCents < toCents(coupon.minimum_order || 0)) {
    throw ruleError('Đơn hàng chưa đạt giá trị tối thiểu để dùng mã giảm giá.');
  }

  const value = Number(coupon.discount_value);
  if (!Number.isFinite(value) || value <= 0) throw ruleError('Mã giảm giá có cấu hình không hợp lệ.');

  let discountCents;
  if (coupon.discount_type === 'percent') {
    if (value > 100) throw ruleError('Mã giảm giá có cấu hình không hợp lệ.');
    discountCents = Math.round(subtotalCents * value / 100);
    if (coupon.maximum_discount != null) {
      discountCents = Math.min(discountCents, toCents(coupon.maximum_discount));
    }
  } else if (coupon.discount_type === 'fixed') {
    discountCents = toCents(value);
  } else {
    throw ruleError('Mã giảm giá có cấu hình không hợp lệ.');
  }

  return Math.min(subtotalCents, Math.max(0, discountCents));
}

export function canTransitionOrder(current, next) {
  return current === next || ORDER_TRANSITIONS[current]?.includes(next) === true;
}
