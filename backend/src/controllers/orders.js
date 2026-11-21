import pool from '../config/db.js'
import { PHONE_RE, fail, int, ok, str } from '../utils/http.js'
import { cancelOrderTx, evaluateCoupon, serializeOrders, withTransaction } from '../services/orders.js'

/** Đặt hàng: giá và tồn kho luôn lấy từ database (không tin giá do trình duyệt gửi), toàn bộ nằm trong một transaction. */
export async function create(req, res) {
  const customer = str(req.body.customer, 'Họ tên người nhận', { min: 2, max: 120 })
  const phone = String(req.body.phone ?? '').replace(/\s/g, '')
  if (!PHONE_RE.test(phone)) throw fail(400, 'Số điện thoại không hợp lệ.')
  const address = str(req.body.address, 'Địa chỉ giao hàng', { min: 8, max: 700 })
  const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : ''
  const method = req.body.payment === 'SIMULATED' ? 'SIMULATED' : 'COD'
  const couponCode = typeof req.body.coupon === 'string' ? req.body.coupon.trim() : ''

  const items = req.body.items
  if (!Array.isArray(items) || !items.length || items.length > 50) throw fail(400, 'Giỏ hàng đang trống.')
  const qtyBy = new Map() // gộp các dòng trùng sản phẩm để kiểm tra tồn kho đúng tổng số lượng
  for (const it of items) {
    const id = int(it?.productId, 'Mã sản phẩm', { min: 1 })
    const qty = int(it?.qty, 'Số lượng', { min: 1, max: 100 })
    qtyBy.set(id, (qtyBy.get(id) ?? 0) + qty)
  }
  const ids = [...qtyBy.keys()].sort((a, b) => a - b) // khóa theo thứ tự cố định để tránh deadlock

  const orderId = await withTransaction(async (conn) => {
    const [active] = await conn.query("SELECT id FROM users WHERE id = ? AND status = 'active'", [req.user.id])
    if (!active[0]) throw fail(403, 'Tài khoản không hoạt động.')

    let subtotal = 0
    const lines = []
    for (const id of ids) {
      const [rows] = await conn.query('SELECT id, name, price, stock, status FROM products WHERE id = ? FOR UPDATE', [id])
      const p = rows[0]
      if (!p || p.status !== 'active') throw fail(400, 'Một sản phẩm trong giỏ hàng không còn kinh doanh.')
      const qty = qtyBy.get(id)
      if (p.stock < qty) throw fail(409, p.stock === 0 ? `${p.name} đã hết hàng.` : `${p.name} chỉ còn ${p.stock} sản phẩm trong kho.`)
      subtotal += p.price * qty
      lines.push({ p, qty })
    }

    let discount = 0, coupon = null
    if (couponCode) {
      const r = await evaluateCoupon(conn, couponCode, subtotal, req.user.id, { lock: true })
      discount = r.discount
      coupon = r.coupon
    }
    const total = subtotal - discount

    const [o] = await conn.query(
      `INSERT INTO orders (user_id, status, subtotal, discount_amount, total_amount, recipient_name, recipient_phone, shipping_address, note, payment_method)
       VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, subtotal, discount, total, customer, phone, address, note || null, method])

    for (const { p, qty } of lines) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)',
        [o.insertId, p.id, p.name, qty, p.price, p.price * qty])
      await conn.query('UPDATE products SET stock = stock - ?, sales_count = sales_count + ? WHERE id = ?', [qty, qty, p.id])
      await conn.query(
        "INSERT INTO inventory_transactions (product_id, order_id, quantity_change, type, note, created_by) VALUES (?, ?, ?, 'sale', 'Khách đặt hàng', ?)",
        [p.id, o.insertId, -qty, req.user.id])
    }
    await conn.query('INSERT INTO payments (order_id, method, amount, status) VALUES (?, ?, ?, ?)',
      [o.insertId, method, total, method === 'COD' ? 'pending' : 'simulated'])
    await conn.query("INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, 'pending', 'Đơn hàng được tạo', ?)", [o.insertId, req.user.id])
    if (coupon) {
      await conn.query('INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)', [coupon.id, req.user.id, o.insertId, discount])
      await conn.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id])
    }
    return o.insertId
  })

  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId])
  return ok(res, (await serializeOrders(rows))[0], 201)
}

export async function mine(req, res) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC', [req.user.id])
  return ok(res, await serializeOrders(rows))
}

export async function detail(req, res) {
  const id = int(req.params.id, 'Mã đơn hàng', { min: 1 })
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, req.user.id])
  if (!rows[0]) throw fail(404, 'Không tìm thấy đơn hàng.')
  return ok(res, (await serializeOrders(rows))[0])
}

export async function cancel(req, res) {
  const id = int(req.params.id, 'Mã đơn hàng', { min: 1 })
  await withTransaction(async (conn) => {
    const [rs] = await conn.query('SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE', [id, req.user.id])
    const o = rs[0]
    if (!o) throw fail(404, 'Không tìm thấy đơn hàng.')
    if (!['pending', 'confirmed'].includes(o.status)) throw fail(409, 'Chỉ có thể hủy đơn đang chờ xác nhận hoặc đã xác nhận.')
    await cancelOrderTx(conn, o, req.user.id, 'Khách hàng hủy đơn')
  })
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id])
  return ok(res, (await serializeOrders(rows))[0])
}
