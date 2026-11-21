import pool from '../config/db.js'
import { fail, orderCode } from '../utils/http.js'

/** Luồng trạng thái hợp lệ do quản trị viên điều khiển. */
export const NEXT_STATUS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  completed: [],
  cancelled: [],
}

const norm = (s) => (s === 'completed' ? 'delivered' : s)

/** Chuyển các dòng orders (+ order_items) thành đối tượng Order mà giao diện dùng. */
export async function serializeOrders(rows) {
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const [items] = await pool.query(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.unit_price,
            (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image
       FROM order_items oi WHERE oi.order_id IN (?) ORDER BY oi.id`, [ids])
  const by = new Map()
  for (const i of items) {
    const list = by.get(i.order_id) ?? by.set(i.order_id, []).get(i.order_id)
    list.push({ id: i.id, productId: i.product_id, name: i.product_name, price: i.unit_price, qty: i.quantity, image: i.image ?? '' })
  }
  return rows.map((o) => ({
    id: String(o.id),
    code: orderCode(o.id),
    createdAt: new Date(o.created_at).toISOString(),
    status: norm(o.status),
    customer: o.recipient_name,
    phone: o.recipient_phone,
    address: o.shipping_address,
    note: o.note ?? undefined,
    payment: o.payment_method,
    subtotal: o.subtotal,
    discount: o.discount_amount,
    total: o.total_amount,
    items: by.get(o.id) ?? [],
    ...(o.account_email ? { account: { name: o.account_name, email: o.account_email } } : {}),
  }))
}

/**
 * Tính giảm giá cho một mã. `conn` có thể là pool hoặc connection trong transaction.
 * Khi `lock` = true dùng FOR UPDATE để hai đơn cùng lúc không vượt quá giới hạn lượt dùng.
 */
export async function evaluateCoupon(conn, code, subtotal, userId, { lock = false } = {}) {
  const [rows] = await conn.query(
    `SELECT * FROM coupons WHERE code = ? AND status = 'active' AND starts_at <= NOW() AND ends_at >= NOW() ${lock ? 'FOR UPDATE' : ''}`,
    [String(code).trim().toUpperCase()])
  const c = rows[0]
  if (!c) throw fail(400, 'Mã giảm giá không tồn tại hoặc đã hết hạn.')
  if (c.used_count >= c.usage_limit) throw fail(400, 'Mã giảm giá đã hết lượt sử dụng.')
  if (subtotal < c.minimum_order) {
    throw fail(400, `Đơn hàng cần tối thiểu ${Number(c.minimum_order).toLocaleString('vi-VN')}₫ để dùng mã này.`)
  }
  const [[used]] = await conn.query(
    `SELECT COUNT(*) AS n FROM coupon_usages cu JOIN orders o ON o.id = cu.order_id
      WHERE cu.coupon_id = ? AND cu.user_id = ? AND o.status <> 'cancelled'`, [c.id, userId])
  if (used.n > 0) throw fail(400, 'Bạn đã sử dụng mã giảm giá này rồi.')

  let discount = c.discount_type === 'percent' ? Math.round((subtotal * c.discount_value) / 100) : Number(c.discount_value)
  if (c.discount_type === 'percent' && c.maximum_discount) discount = Math.min(discount, Number(c.maximum_discount))
  discount = Math.max(0, Math.min(discount, subtotal))
  return { coupon: c, discount }
}

/**
 * Hủy đơn trong transaction đang mở: hoàn kho (một lần), ghi lịch sử, hủy thanh toán, trả lại lượt dùng mã.
 * Người gọi phải đã khóa dòng orders (SELECT ... FOR UPDATE) và kiểm tra trạng thái được phép hủy.
 */
export async function cancelOrderTx(conn, order, actorId, note) {
  const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL', [order.id])
  for (const i of items) {
    await conn.query('UPDATE products SET stock = stock + ?, sales_count = GREATEST(sales_count - ?, 0) WHERE id = ?', [i.quantity, i.quantity, i.product_id])
    await conn.query(
      "INSERT INTO inventory_transactions (product_id, order_id, quantity_change, type, note, created_by) VALUES (?, ?, ?, 'return', ?, ?)",
      [i.product_id, order.id, i.quantity, note, actorId])
  }
  await conn.query("UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?", [order.id])
  await conn.query("UPDATE payments SET status = 'cancelled' WHERE order_id = ?", [order.id])
  await conn.query("INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, 'cancelled', ?, ?)", [order.id, note, actorId])
  await conn.query(
    'UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE id IN (SELECT coupon_id FROM coupon_usages WHERE order_id = ?)', [order.id])
}

/** Chạy `fn(conn)` trong một transaction; tự commit/rollback và trả connection về pool. */
export async function withTransaction(fn) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
