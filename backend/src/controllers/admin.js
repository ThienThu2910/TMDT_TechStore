import pool from '../config/db.js'
import { fail, int, ok, slugify, str } from '../utils/http.js'
import { fetchProduct, fetchProducts } from '../services/products.js'
import { NEXT_STATUS, cancelOrderTx, serializeOrders, withTransaction } from '../services/orders.js'

const DAY = 86_400_000
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const millions = (n) => Math.round(n / 1e5) / 10

const ORDER_SELECT = `SELECT o.*, u.name AS account_name, u.email AS account_email
                        FROM orders o JOIN users u ON u.id = o.user_id`

/* ------------------------------------------------------------------ tổng quan */
export async function dashboard(req, res) {
  const [[k]] = await pool.query(
    `SELECT (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('delivered','completed')) AS revenue,
            (SELECT COUNT(*) FROM orders) AS orders,
            (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers,
            (SELECT COUNT(*) FROM products WHERE status = 'active') AS products,
            (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending`)

  const [statusRows] = await pool.query('SELECT status, COUNT(*) AS n FROM orders GROUP BY status')
  const statusCounts = { pending: 0, confirmed: 0, shipping: 0, delivered: 0, cancelled: 0 }
  for (const r of statusRows) statusCounts[r.status === 'completed' ? 'delivered' : r.status] += r.n

  // Gom doanh thu theo ngày/tuần ở phía Node để đúng "ngày" theo múi giờ của máy chạy cửa hàng.
  const today = startOfDay(new Date())
  const since = new Date(today.getTime() - 27 * DAY)
  const [paid] = await pool.query(
    "SELECT total_amount, created_at FROM orders WHERE status IN ('delivered','completed') AND created_at >= ?", [since])
  const perDay = new Array(28).fill(0)
  for (const o of paid) {
    const idx = Math.round((startOfDay(o.created_at).getTime() - since.getTime()) / DAY)
    if (idx >= 0 && idx < 28) perDay[idx] += o.total_amount
  }
  const week = { labels: [], values: [] }
  for (let i = 0; i < 7; i++) {
    week.labels.push(WEEKDAYS[new Date(today.getTime() - (6 - i) * DAY).getDay()])
    week.values.push(millions(perDay[21 + i]))
  }
  const month = { labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'], values: [0, 1, 2, 3].map((w) => millions(perDay.slice(w * 7, w * 7 + 7).reduce((s, v) => s + v, 0))) }

  const [recent] = await pool.query(`${ORDER_SELECT} ORDER BY o.created_at DESC, o.id DESC LIMIT 5`)
  return ok(res, { kpis: k, statusCounts, series: { week, month }, recent: await serializeOrders(recent) })
}

/* ------------------------------------------------------------------ đơn hàng */
export async function orders(req, res) {
  const [rows] = await pool.query(`${ORDER_SELECT} ORDER BY o.created_at DESC, o.id DESC LIMIT 500`)
  return ok(res, await serializeOrders(rows))
}

export async function updateStatus(req, res) {
  const id = int(req.params.id, 'Mã đơn hàng', { min: 1 })
  const next = req.body.status
  await withTransaction(async (conn) => {
    const [rs] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id])
    const o = rs[0]
    if (!o) throw fail(404, 'Không tìm thấy đơn hàng.')
    if (!(NEXT_STATUS[o.status] ?? []).includes(next)) throw fail(409, 'Không thể chuyển đơn sang trạng thái này.')
    if (next === 'cancelled') {
      await cancelOrderTx(conn, o, req.user.id, 'Quản trị viên hủy đơn')
      return
    }
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [next, id])
    await conn.query('INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)', [id, next, 'Cập nhật bởi quản trị viên', req.user.id])
    if (next === 'delivered') {
      await conn.query("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE order_id = ? AND status IN ('pending','simulated')", [id])
    }
  })
  const [rows] = await pool.query(`${ORDER_SELECT} WHERE o.id = ?`, [id])
  return ok(res, (await serializeOrders(rows))[0])
}

/* ------------------------------------------------------------------ sản phẩm */
export async function products(req, res) {
  const [categories] = await pool.query('SELECT id, name, slug FROM categories ORDER BY sort_order, name')
  const [brands] = await pool.query('SELECT id, name FROM brands ORDER BY name')
  return ok(res, { products: await fetchProducts({ order: 'p.id DESC' }), categories, brands })
}

function parseProduct(b) {
  const name = str(b.name, 'Tên sản phẩm', { min: 2, max: 220 })
  const price = int(b.price, 'Giá bán', { min: 1000 })
  const originalPrice = b.originalPrice ? int(b.originalPrice, 'Giá niêm yết', { min: 1 }) : null
  if (originalPrice && originalPrice < price) throw fail(400, 'Giá niêm yết phải lớn hơn hoặc bằng giá bán.')
  const images = (Array.isArray(b.images) ? b.images : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 10)
  if (!images.length) throw fail(400, 'Cần ít nhất một đường dẫn ảnh sản phẩm.')
  if (images.some((u) => !/^(https?:\/\/|\/)/i.test(u) || u.length > 700)) throw fail(400, 'Đường dẫn ảnh phải bắt đầu bằng http(s):// hoặc /.')
  const specs = (Array.isArray(b.specs) ? b.specs : [])
    .map((p) => [String(p?.[0] ?? '').trim().slice(0, 120), String(p?.[1] ?? '').trim().slice(0, 500)])
    .filter(([k, v]) => k && v).slice(0, 30)
  return {
    name, price, originalPrice, images, specs,
    stock: int(b.stock ?? 0, 'Tồn kho'),
    categoryId: int(b.categoryId, 'Danh mục', { min: 1 }),
    brand: str(b.brand, 'Thương hiệu', { max: 120 }),
    description: typeof b.description === 'string' ? b.description.trim().slice(0, 5000) : '',
    isNew: !!b.isNew,
    isFeatured: !!b.isFeatured,
    status: ['active', 'draft', 'archived'].includes(b.status) ? b.status : 'active',
  }
}

async function ensureBrand(conn, name) {
  const [found] = await conn.query('SELECT id FROM brands WHERE name = ?', [name])
  if (found[0]) return found[0].id
  let slug = slugify(name)
  const [dup] = await conn.query('SELECT id FROM brands WHERE slug = ?', [slug])
  if (dup[0]) slug = `${slug}-${Date.now() % 100000}`
  const [r] = await conn.query('INSERT INTO brands (name, slug) VALUES (?, ?)', [name, slug])
  return r.insertId
}

async function uniqueSlug(conn, name, selfId) {
  const base = slugify(name)
  const [dup] = await conn.query('SELECT id FROM products WHERE slug = ? AND id <> ?', [base, selfId])
  return dup[0] ? `${base}-${Date.now() % 100000}` : base
}

async function replaceMedia(conn, productId, v) {
  await conn.query('DELETE FROM product_images WHERE product_id = ?', [productId])
  await conn.query('DELETE FROM product_specs WHERE product_id = ?', [productId])
  await conn.query('INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES ?', [v.images.map((u, i) => [productId, u, v.name, i])])
  if (v.specs.length) await conn.query('INSERT INTO product_specs (product_id, spec_name, spec_value, sort_order) VALUES ?', [v.specs.map(([k, val], i) => [productId, k, val, i])])
}

async function checkCategory(conn, id) {
  const [c] = await conn.query('SELECT id FROM categories WHERE id = ?', [id])
  if (!c[0]) throw fail(400, 'Danh mục không tồn tại.')
}

export async function createProduct(req, res) {
  const v = parseProduct(req.body)
  const id = await withTransaction(async (conn) => {
    await checkCategory(conn, v.categoryId)
    const brandId = await ensureBrand(conn, v.brand)
    const slug = await uniqueSlug(conn, v.name, 0)
    const [r] = await conn.query(
      `INSERT INTO products (name, slug, description, category_id, brand_id, price, original_price, stock, is_new, is_featured, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.name, slug, v.description, v.categoryId, brandId, v.price, v.originalPrice, v.stock, v.isNew, v.isFeatured, v.status])
    await replaceMedia(conn, r.insertId, v)
    if (v.stock > 0) {
      await conn.query("INSERT INTO inventory_transactions (product_id, quantity_change, type, note, created_by) VALUES (?, ?, 'restock', 'Nhập kho ban đầu', ?)", [r.insertId, v.stock, req.user.id])
    }
    return r.insertId
  })
  return ok(res, await fetchProduct(id, { onlyActive: false }), 201)
}

export async function updateProduct(req, res) {
  const id = int(req.params.id, 'Mã sản phẩm', { min: 1 })
  const v = parseProduct(req.body)
  await withTransaction(async (conn) => {
    const [cur] = await conn.query('SELECT id, stock FROM products WHERE id = ? FOR UPDATE', [id])
    if (!cur[0]) throw fail(404, 'Không tìm thấy sản phẩm.')
    await checkCategory(conn, v.categoryId)
    const brandId = await ensureBrand(conn, v.brand)
    const slug = await uniqueSlug(conn, v.name, id)
    await conn.query(
      `UPDATE products SET name = ?, slug = ?, description = ?, category_id = ?, brand_id = ?, price = ?, original_price = ?,
              stock = ?, is_new = ?, is_featured = ?, status = ? WHERE id = ?`,
      [v.name, slug, v.description, v.categoryId, brandId, v.price, v.originalPrice, v.stock, v.isNew, v.isFeatured, v.status, id])
    await replaceMedia(conn, id, v)
    const diff = v.stock - cur[0].stock
    if (diff !== 0) {
      await conn.query(
        "INSERT INTO inventory_transactions (product_id, quantity_change, type, note, created_by) VALUES (?, ?, ?, 'Quản trị viên chỉnh tồn kho', ?)",
        [id, diff, diff > 0 ? 'restock' : 'adjustment', req.user.id])
    }
  })
  return ok(res, await fetchProduct(id, { onlyActive: false }))
}

/** Không xóa cứng (để giữ lịch sử đơn hàng / kho): chuyển sang trạng thái "ngừng bán". */
export async function archiveProduct(req, res) {
  const id = int(req.params.id, 'Mã sản phẩm', { min: 1 })
  const [r] = await pool.query("UPDATE products SET status = 'archived' WHERE id = ?", [id])
  if (!r.affectedRows) throw fail(404, 'Không tìm thấy sản phẩm.')
  return ok(res, await fetchProduct(id, { onlyActive: false }))
}

/* ------------------------------------------------------------------ khách hàng */
export async function customers(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
            COUNT(o.id) AS orders,
            COALESCE(SUM(CASE WHEN o.status IN ('delivered','completed') THEN o.total_amount ELSE 0 END), 0) AS spent
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'customer'
      GROUP BY u.id, u.name, u.email, u.phone, u.status, u.created_at
      ORDER BY u.created_at DESC`)
  return ok(res, rows.map((r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone ?? '', status: r.status, createdAt: new Date(r.created_at).toISOString(), orders: r.orders, spent: r.spent })))
}

export async function setCustomerStatus(req, res) {
  const id = int(req.params.id, 'Mã khách hàng', { min: 1 })
  const status = req.body.status === 'locked' ? 'locked' : 'active'
  const [r] = await pool.query("UPDATE users SET status = ? WHERE id = ? AND role = 'customer'", [status, id])
  if (!r.affectedRows) throw fail(404, 'Không tìm thấy khách hàng.')
  return ok(res, { id, status })
}

/* ------------------------------------------------------------------ mã giảm giá */
const couponOut = (c) => ({
  id: c.id, code: c.code, description: c.description ?? '', type: c.discount_type, value: c.discount_value,
  maxDiscount: c.maximum_discount ?? null, minOrder: c.minimum_order, limit: c.usage_limit, used: c.used_count,
  startsAt: new Date(c.starts_at).toISOString(), endsAt: new Date(c.ends_at).toISOString(), status: c.status,
})

export async function coupons(req, res) {
  const [rows] = await pool.query('SELECT * FROM coupons ORDER BY id DESC')
  return ok(res, rows.map(couponOut))
}

export async function createCoupon(req, res) {
  const code = str(req.body.code, 'Mã giảm giá', { min: 3, max: 50 }).toUpperCase()
  if (!/^[A-Z0-9_-]+$/.test(code)) throw fail(400, 'Mã chỉ gồm chữ cái, số, dấu gạch ngang hoặc gạch dưới.')
  const type = req.body.type === 'fixed' ? 'fixed' : 'percent'
  const value = int(req.body.value, 'Giá trị giảm', { min: 1 })
  if (type === 'percent' && value > 100) throw fail(400, 'Phần trăm giảm tối đa là 100.')
  const minOrder = int(req.body.minOrder ?? 0, 'Đơn tối thiểu')
  const maxDiscount = req.body.maxDiscount ? int(req.body.maxDiscount, 'Giảm tối đa', { min: 1 }) : null
  const limit = int(req.body.limit ?? 100, 'Số lượt dùng', { min: 1, max: 1_000_000 })
  const days = int(req.body.days ?? 30, 'Thời hạn (ngày)', { min: 1, max: 730 })
  const description = typeof req.body.description === 'string' ? req.body.description.trim().slice(0, 255) : ''
  const [dup] = await pool.query('SELECT id FROM coupons WHERE code = ?', [code])
  if (dup[0]) throw fail(409, 'Mã giảm giá này đã tồn tại.')
  const [r] = await pool.query(
    `INSERT INTO coupons (code, description, discount_type, discount_value, maximum_discount, minimum_order, usage_limit, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))`,
    [code, description || null, type, value, maxDiscount, minOrder, limit, days])
  const [rows] = await pool.query('SELECT * FROM coupons WHERE id = ?', [r.insertId])
  return ok(res, couponOut(rows[0]), 201)
}

export async function setCouponStatus(req, res) {
  const id = int(req.params.id, 'Mã', { min: 1 })
  const status = req.body.status === 'inactive' ? 'inactive' : 'active'
  const [r] = await pool.query('UPDATE coupons SET status = ? WHERE id = ?', [status, id])
  if (!r.affectedRows) throw fail(404, 'Không tìm thấy mã giảm giá.')
  const [rows] = await pool.query('SELECT * FROM coupons WHERE id = ?', [id])
  return ok(res, couponOut(rows[0]))
}
