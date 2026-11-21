import pool from '../config/db.js'
import { ok, int } from '../utils/http.js'

async function wishlistId(userId) {
  await pool.query('INSERT IGNORE INTO wishlists (user_id) VALUES (?)', [userId])
  const [[w]] = await pool.query('SELECT id FROM wishlists WHERE user_id = ?', [userId])
  return w.id
}
async function currentIds(userId) {
  const [rows] = await pool.query(
    `SELECT wi.product_id FROM wishlist_items wi JOIN wishlists w ON w.id = wi.wishlist_id
      WHERE w.user_id = ? ORDER BY wi.id`, [userId])
  return rows.map((r) => r.product_id)
}

export async function list(req, res) {
  return ok(res, await currentIds(req.user.id))
}

/** Gộp danh sách yêu thích của khách chưa đăng nhập vào tài khoản (bỏ qua mã sản phẩm không tồn tại). */
export async function merge(req, res) {
  const ids = Array.isArray(req.body.ids) ? [...new Set(req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200) : []
  if (ids.length) {
    const wid = await wishlistId(req.user.id)
    const [valid] = await pool.query('SELECT id FROM products WHERE id IN (?)', [ids])
    for (const p of valid) await pool.query('INSERT IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)', [wid, p.id])
  }
  return ok(res, await currentIds(req.user.id))
}

export async function add(req, res) {
  const productId = int(req.params.productId, 'Mã sản phẩm', { min: 1 })
  const wid = await wishlistId(req.user.id)
  const [exists] = await pool.query('SELECT id FROM products WHERE id = ?', [productId])
  if (exists[0]) await pool.query('INSERT IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)', [wid, productId])
  return ok(res, await currentIds(req.user.id))
}

export async function remove(req, res) {
  const productId = int(req.params.productId, 'Mã sản phẩm', { min: 1 })
  await pool.query(
    'DELETE wi FROM wishlist_items wi JOIN wishlists w ON w.id = wi.wishlist_id WHERE w.user_id = ? AND wi.product_id = ?', [req.user.id, productId])
  return ok(res, await currentIds(req.user.id))
}
