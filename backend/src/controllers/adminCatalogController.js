import pool from '../config/db.js';
import { ruleError } from '../utils/orderRules.js';

const STATUSES = new Set(['active', 'draft', 'archived']);

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 240);
}

function parseProductInput(body) {
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  const description = String(body.description || '').trim();
  const price = Number(body.price);
  const originalPrice = body.original_price === '' || body.original_price == null
    ? null
    : Number(body.original_price);
  const stock = Number(body.stock);
  const categoryId = body.category_id ? Number(body.category_id) : null;
  const brandId = body.brand_id ? Number(body.brand_id) : null;
  const status = String(body.status || 'active');
  const imageUrl = String(body.image_url || '').trim();
  const specifications = body.specifications || [];

  if (name.length < 2 || name.length > 220) throw ruleError('Tên sản phẩm phải có từ 2 đến 220 ký tự.');
  if (!slug || slug.length > 240) throw ruleError('Slug sản phẩm không hợp lệ.');
  if (description.length > 60000) throw ruleError('Mô tả sản phẩm quá dài.');
  if (!Number.isFinite(price) || price <= 0 || price > 999999999999) throw ruleError('Giá bán không hợp lệ.');
  if (originalPrice != null && (!Number.isFinite(originalPrice) || originalPrice < price)) {
    throw ruleError('Giá niêm yết phải lớn hơn hoặc bằng giá bán.');
  }
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 4294967295) throw ruleError('Tồn kho không hợp lệ.');
  for (const [label, id] of [['Danh mục', categoryId], ['Thương hiệu', brandId]]) {
    if (id != null && (!Number.isSafeInteger(id) || id < 1)) throw ruleError(label + ' không hợp lệ.');
  }
  if (!STATUSES.has(status)) throw ruleError('Trạng thái sản phẩm không hợp lệ.');
  if (imageUrl.length > 700) throw ruleError('URL hình ảnh quá dài.');
  if (imageUrl) {
    let parsed;
    try { parsed = new URL(imageUrl); } catch { throw ruleError('URL hình ảnh không hợp lệ.'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw ruleError('URL hình ảnh chỉ được dùng HTTP hoặc HTTPS.');
  }
  if (!Array.isArray(specifications) || specifications.length > 40) {
    throw ruleError('Tối đa 40 thông số kỹ thuật.');
  }
  const specs = specifications.map(item => ({
    name: String(item?.name || '').trim(),
    value: String(item?.value || '').trim(),
  })).filter(item => item.name || item.value);
  if (specs.some(item => item.name.length < 1 || item.name.length > 120 || item.value.length < 1 || item.value.length > 500)) {
    throw ruleError('Tên thông số tối đa 120 ký tự và giá trị tối đa 500 ký tự.');
  }

  return {
    name,
    slug,
    description,
    price,
    originalPrice,
    stock,
    categoryId,
    brandId,
    status,
    imageUrl,
    isFeatured: [true, 1, '1', 'true'].includes(body.is_featured),
    specifications: specs,
  };
}

async function assertReferences(connection, product) {
  if (product.categoryId) {
    const [rows] = await connection.execute('SELECT id FROM categories WHERE id=? AND is_active=1', [product.categoryId]);
    if (!rows.length) throw ruleError('Danh mục không tồn tại hoặc đã ngừng hoạt động.');
  }
  if (product.brandId) {
    const [rows] = await connection.execute('SELECT id FROM brands WHERE id=?', [product.brandId]);
    if (!rows.length) throw ruleError('Thương hiệu không tồn tại.');
  }
}

async function saveImage(connection, productId, imageUrl, name) {
  if (!imageUrl) return;
  const [images] = await connection.execute(
    'SELECT id FROM product_images WHERE product_id=? ORDER BY sort_order,id LIMIT 1 FOR UPDATE',
    [productId],
  );
  if (images.length) {
    await connection.execute('UPDATE product_images SET image_url=?,alt_text=? WHERE id=?', [imageUrl, name, images[0].id]);
  } else {
    await connection.execute('INSERT INTO product_images(product_id,image_url,alt_text) VALUES(?,?,?)', [productId, imageUrl, name]);
  }
}

async function replaceSpecifications(connection, productId, specifications) {
  await connection.execute('DELETE FROM product_specs WHERE product_id=?', [productId]);
  for (const [index, spec] of specifications.entries()) {
    await connection.execute(
      'INSERT INTO product_specs(product_id,spec_name,spec_value,sort_order) VALUES(?,?,?,?)',
      [productId, spec.name, spec.value, index],
    );
  }
}

export async function metadata(req, res) {
  const [categories] = await pool.execute('SELECT id,name FROM categories WHERE is_active=1 ORDER BY sort_order,name');
  const [brands] = await pool.execute('SELECT id,name FROM brands ORDER BY name');
  return res.json({ success: true, data: { categories, brands } });
}

export async function list(req, res) {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
  const offset = (page - 1) * limit;
  const where = q ? 'WHERE p.name LIKE ? OR p.slug LIKE ? OR b.name LIKE ?' : '';
  const values = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const [rows] = await pool.execute(
    `SELECT p.id,p.name,p.slug,p.description,p.price,p.original_price,p.stock,p.status,p.is_featured,
      p.category_id,p.brand_id,c.name category,b.name brand,
      (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY sort_order,id LIMIT 1) image_url
      FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id
      ${where} ORDER BY p.updated_at DESC,p.id DESC LIMIT ${limit} OFFSET ${offset}`,
    values,
  );
  const [[count]] = await pool.execute(
    `SELECT COUNT(*) total FROM products p LEFT JOIN brands b ON b.id=p.brand_id ${where}`,
    values,
  );
  return res.json({ success: true, data: rows, meta: { page, limit, total: count.total } });
}

export async function detail(req, res) {
  const [rows] = await pool.execute('SELECT * FROM products WHERE id=?', [req.params.id]);
  if (!rows.length) throw ruleError('Không tìm thấy sản phẩm.', 404);
  const [images] = await pool.execute(
    'SELECT id,image_url,alt_text FROM product_images WHERE product_id=? ORDER BY sort_order,id',
    [req.params.id],
  );
  const [specifications] = await pool.execute(
    'SELECT spec_name name,spec_value value FROM product_specs WHERE product_id=? ORDER BY sort_order,id',
    [req.params.id],
  );
  return res.json({ success: true, data: { ...rows[0], images, specifications } });
}

export async function create(req, res) {
  const product = parseProductInput(req.body);
  const connection = await pool.getConnection();
  let transactionOpen = false;
  try {
    await connection.beginTransaction();
    transactionOpen = true;
    await assertReferences(connection, product);
    const [result] = await connection.execute(
      'INSERT INTO products(name,slug,description,category_id,brand_id,price,original_price,stock,is_featured,status) VALUES(?,?,?,?,?,?,?,?,?,?)',
      [product.name, product.slug, product.description || null, product.categoryId, product.brandId, product.price,
        product.originalPrice, product.stock, product.isFeatured, product.status],
    );
    if (product.stock > 0) {
      await connection.execute(
        "INSERT INTO inventory_transactions(product_id,quantity_change,type,note,created_by) VALUES(?,?,'restock','Tồn đầu khi tạo sản phẩm',?)",
        [result.insertId, product.stock, req.user.id],
      );
    }
    await saveImage(connection, result.insertId, product.imageUrl, product.name);
    await replaceSpecifications(connection, result.insertId, product.specifications);
    await connection.commit();
    transactionOpen = false;
    return res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Đã tạo sản phẩm.' });
  } catch (error) {
    if (transactionOpen) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw ruleError('Tên slug đã được sử dụng. Hãy chọn slug khác.', 409);
    throw error;
  } finally {
    connection.release();
  }
}

export async function update(req, res) {
  const product = parseProductInput(req.body);
  const connection = await pool.getConnection();
  let transactionOpen = false;
  try {
    await connection.beginTransaction();
    transactionOpen = true;
    const [rows] = await connection.execute('SELECT id,stock FROM products WHERE id=? FOR UPDATE', [req.params.id]);
    if (!rows.length) throw ruleError('Không tìm thấy sản phẩm.', 404);
    await assertReferences(connection, product);
    await connection.execute(
      'UPDATE products SET name=?,slug=?,description=?,category_id=?,brand_id=?,price=?,original_price=?,stock=?,is_featured=?,status=? WHERE id=?',
      [product.name, product.slug, product.description || null, product.categoryId, product.brandId, product.price,
        product.originalPrice, product.stock, product.isFeatured, product.status, req.params.id],
    );
    const stockDelta = product.stock - Number(rows[0].stock);
    if (stockDelta !== 0) {
      await connection.execute(
        'INSERT INTO inventory_transactions(product_id,quantity_change,type,note,created_by) VALUES(?,?,?,?,?)',
        [req.params.id, stockDelta, stockDelta > 0 ? 'restock' : 'adjustment', 'Điều chỉnh tồn kho bởi quản trị viên', req.user.id],
      );
    }
    await saveImage(connection, req.params.id, product.imageUrl, product.name);
    await replaceSpecifications(connection, req.params.id, product.specifications);
    await connection.commit();
    transactionOpen = false;
    return res.json({ success: true, message: 'Đã cập nhật sản phẩm.' });
  } catch (error) {
    if (transactionOpen) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw ruleError('Tên slug đã được sử dụng. Hãy chọn slug khác.', 409);
    throw error;
  } finally {
    connection.release();
  }
}
