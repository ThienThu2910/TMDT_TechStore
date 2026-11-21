import pool from '../config/db.js'
import { EMAIL_RE, fail, ok, int, str } from '../utils/http.js'
import { fetchProduct, fetchProducts } from '../services/products.js'
import { evaluateCoupon } from '../services/orders.js'

/** Toàn bộ dữ liệu cửa hàng trong một lần gọi: danh mục + sản phẩm + đánh giá mới nhất. */
export async function catalog(req, res) {
  const [categories] = await pool.query(
    'SELECT id, name, slug FROM categories WHERE is_active = 1 ORDER BY sort_order, name')
  const products = await fetchProducts({ where: "WHERE p.status = 'active'" })
  const [latestReviews] = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS customer, p.name AS product
       FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
      WHERE r.status = 'visible' AND r.comment IS NOT NULL AND r.comment <> '' AND p.status = 'active'
      ORDER BY r.created_at DESC LIMIT 6`)
  return ok(res, {
    categories,
    products,
    latestReviews: latestReviews.map((r) => ({
      id: r.id, rating: r.rating, comment: r.comment, customer: r.customer, product: r.product, createdAt: new Date(r.created_at).toISOString(),
    })),
  })
}

/** Danh sách có lọc phía máy chủ (dành cho tích hợp ngoài; giao diện chính dùng /catalog). */
export async function list(req, res) {
  const { q = '', category = '', brand = '', sort = '', minPrice, maxPrice, page = '1', limit = '24' } = req.query
  const where = ["p.status = 'active'"], params = []
  if (q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }
  if (category) { where.push('c.slug = ?'); params.push(String(category)) }
  if (brand) { where.push('b.name = ?'); params.push(String(brand)) }
  if (minPrice) { where.push('p.price >= ?'); params.push(Number(minPrice) || 0) }
  if (maxPrice) { where.push('p.price <= ?'); params.push(Number(maxPrice) || 0) }
  const order = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', popular: 'p.sales_count DESC', newest: 'p.created_at DESC' }[sort]
  const size = Math.min(100, Math.max(1, Number(limit) || 24))
  const pageNo = Math.max(1, Number(page) || 1)
  const whereSql = `WHERE ${where.join(' AND ')}`
  const data = await fetchProducts({ where: whereSql, params, order, limit: size, offset: (pageNo - 1) * size })
  const [[count]] = await pool.query(
    `SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id ${whereSql}`, params)
  return res.json({ success: true, data, meta: { page: pageNo, limit: size, total: count.total } })
}

export async function detail(req, res) {
  const p = await fetchProduct(int(req.params.id, 'Mã sản phẩm', { min: 1 }))
  if (!p) throw fail(404, 'Không tìm thấy sản phẩm.')
  const [reviews] = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS customer
       FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ? AND r.status = 'visible' ORDER BY r.created_at DESC LIMIT 50`, [p.id])
  return ok(res, {
    ...p,
    reviewList: reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment ?? '', customer: r.customer, createdAt: new Date(r.created_at).toISOString() })),
  })
}

/** Chỉ khách đã nhận hàng mới được đánh giá, mỗi sản phẩm trong mỗi đơn đánh giá một lần. */
export async function addReview(req, res) {
  const productId = int(req.params.id, 'Mã sản phẩm', { min: 1 })
  const rating = int(req.body.rating, 'Số sao', { min: 1, max: 5 })
  const comment = typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 1000) : ''
  const [eligible] = await pool.query(
    `SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('delivered','completed')
        AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id AND r.product_id = oi.product_id AND r.user_id = o.user_id)
      ORDER BY o.created_at DESC LIMIT 1`, [req.user.id, productId])
  if (!eligible[0]) throw fail(403, 'Bạn chỉ có thể đánh giá sản phẩm sau khi đã nhận hàng (và mỗi đơn đánh giá một lần).')
  await pool.query('INSERT INTO reviews (product_id, user_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)', [productId, req.user.id, eligible[0].id, rating, comment || null])
  return detail(req, res)
}

export async function validateCoupon(req, res) {
  const code = str(req.body.code, 'Mã giảm giá', { max: 50 })
  const subtotal = Number(req.body.subtotal)
  if (!Number.isFinite(subtotal) || subtotal <= 0) throw fail(400, 'Giỏ hàng đang trống.')
  const { coupon, discount } = await evaluateCoupon(pool, code, subtotal, req.user.id)
  return ok(res, { code: coupon.code, description: coupon.description ?? '', discount })
}

export async function subscribe(req, res) {
  const email = str(req.body.email, 'Email', { max: 190 }).toLowerCase()
  if (!EMAIL_RE.test(email)) throw fail(400, 'Email không hợp lệ.')
  await pool.query('INSERT IGNORE INTO subscribers (email) VALUES (?)', [email])
  return ok(res, { email })
}
