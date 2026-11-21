import pool from '../config/db.js'

const DEFAULT_ORDER = 'p.is_featured DESC, p.sales_count DESC, p.id ASC'

/**
 * Lấy danh sách sản phẩm đã gồm ảnh, thông số, điểm đánh giá — dùng chung cho cửa hàng và trang quản trị.
 * Dùng 3 truy vấn (sản phẩm / ảnh / thông số) thay vì truy vấn lồng từng sản phẩm.
 * Kết quả có đúng hình dạng mà giao diện React dùng (kiểu Product).
 */
export async function fetchProducts({ where = '', params = [], order = DEFAULT_ORDER, limit = 0, offset = 0 } = {}) {
  const limitSql = limit ? `LIMIT ${Number(limit) | 0} OFFSET ${Number(offset) | 0}` : ''
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.slug, p.description, p.price, p.original_price, p.stock, p.is_new, p.is_featured,
            p.sales_count, p.status, p.created_at,
            b.id AS brand_id, b.name AS brand, c.id AS category_id, c.slug AS category, c.name AS category_name,
            (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.status = 'visible') AS rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'visible') AS review_count
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY ${order} ${limitSql}`,
    params,
  )
  if (!rows.length) return []

  const ids = rows.map((r) => r.id)
  const [imgs] = await pool.query(
    'SELECT product_id, image_url FROM product_images WHERE product_id IN (?) ORDER BY sort_order, id', [ids])
  const [specs] = await pool.query(
    'SELECT product_id, spec_name, spec_value FROM product_specs WHERE product_id IN (?) ORDER BY sort_order, id', [ids])

  const imagesBy = new Map(), specsBy = new Map()
  for (const i of imgs) (imagesBy.get(i.product_id) ?? imagesBy.set(i.product_id, []).get(i.product_id)).push(i.image_url)
  for (const s of specs) (specsBy.get(s.product_id) ?? specsBy.set(s.product_id, []).get(s.product_id)).push([s.spec_name, s.spec_value])

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    brand: r.brand ?? 'Khác',
    category: r.category ?? '',
    categoryName: r.category_name ?? '',
    price: r.price,
    originalPrice: r.original_price && r.original_price > r.price ? r.original_price : undefined,
    stock: r.stock,
    rating: r.rating ?? 0,
    reviews: r.review_count,
    isNew: !!r.is_new,
    isFeatured: !!r.is_featured,
    sold: r.sales_count,
    status: r.status,
    description: r.description ?? '',
    images: imagesBy.get(r.id) ?? [],
    specs: specsBy.get(r.id) ?? [],
  }))
}

export async function fetchProduct(id, { onlyActive = true } = {}) {
  const list = await fetchProducts({ where: `WHERE p.id = ?${onlyActive ? " AND p.status = 'active'" : ''}`, params: [id] })
  return list[0] ?? null
}
