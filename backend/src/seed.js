import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from './config/db.js';
import { additionalProducts } from './seed-products.js';
import { productImageSources } from './product-image-sources.js';

const categories = [
  ['Laptop', 'laptop'],
  ['Điện thoại', 'dien-thoai'],
  ['Máy tính bảng', 'may-tinh-bang'],
  ['Màn hình', 'man-hinh'],
  ['Linh kiện', 'linh-kien'],
  ['Thiết bị ngoại vi', 'thiet-bi-ngoai-vi'],
  ['Phụ kiện', 'phu-kien'],
  ['Thiết bị âm thanh', 'thiet-bi-am-thanh'],
];

const brands = [
  'Apple', 'ASUS', 'Dell', 'Samsung', 'Sony', 'Lenovo', 'Acer', 'HP', 'MSI',
  'Xiaomi', 'Google', 'OPPO', 'OnePlus', 'Huawei', 'AOC', 'BenQ', 'Corsair',
  'Kingston', 'Logitech', 'Keychron', 'Razer', 'HyperX', 'Anker', 'SanDisk',
  'JBL', 'Bose', 'Marshall', 'LG',
];

const products = [
  ['MacBook Air 13 M3 2024', 'Apple', 'Laptop', 'macbook-air-13-m3-2024', 25990000, 27990000, 12, 'photo-1517336714731-489689fd1ca8'],
  ['iPhone 16 Pro 256GB', 'Apple', 'Điện thoại', 'iphone-16-pro-256gb', 28990000, 30990000, 8, 'photo-1592750475338-74b7b21085ab'],
  ['ASUS ROG Zephyrus G14', 'ASUS', 'Laptop', 'asus-rog-zephyrus-g14', 42990000, 45990000, 5, 'photo-1593642632823-8f785ba67e45'],
  ['Sony WH-1000XM5', 'Sony', 'Thiết bị âm thanh', 'sony-wh-1000xm5', 7990000, 8990000, 18, 'photo-1546435770-a3e426bf472b'],
  ['iPad Air M2 11 inch', 'Apple', 'Máy tính bảng', 'ipad-air-m2-11-inch', 16990000, 17990000, 10, 'photo-1544244015-0df4b3ffc6b0'],
  ['Dell UltraSharp 27 4K', 'Dell', 'Màn hình', 'dell-ultrasharp-27-4k', 14990000, 16990000, 7, 'photo-1527443224154-c4a3942d3acf'],
];

const coupons = [
  ['TECH10', 'percent', 10, 1000000],
  ['WELCOME500', 'fixed', 500000, 5000000],
];

async function seed() {
  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin123!', 12);
  const customerHash = await bcrypt.hash(process.env.SEED_CUSTOMER_PASSWORD || 'Khach123!', 12);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const [name, slug] of categories) {
      await connection.execute(
        'INSERT IGNORE INTO categories(name,slug) VALUES(?,?)',
        [name, slug],
      );
    }
    for (const name of brands) {
      await connection.execute(
        'INSERT IGNORE INTO brands(name,slug) VALUES(?,?)',
        [name, name.toLowerCase()],
      );
    }

    await connection.execute(
      "INSERT IGNORE INTO users(name,email,password_hash,role) VALUES('Quản trị viên','admin@techstore.vn',?,'admin')",
      [adminHash],
    );
    await connection.execute(
      "INSERT IGNORE INTO users(name,email,password_hash,role) VALUES('Nguyễn Minh Anh','khach@techstore.vn',?,'customer')",
      [customerHash],
    );

    for (const [name, brandName, categoryName, slug, price, originalPrice, stock, image] of products) {
      const [[brand]] = await connection.execute('SELECT id FROM brands WHERE name=?', [brandName]);
      const [[category]] = await connection.execute('SELECT id FROM categories WHERE name=?', [categoryName]);
      const [result] = await connection.execute(
        "INSERT INTO products(name,slug,description,category_id,brand_id,price,original_price,stock,is_featured,status) VALUES(?,?,?,?,?,?,?,?,1,'active') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
        [name, slug, 'Thiết bị công nghệ chính hãng, bảo hành đầy đủ tại TECHSTORE.', category.id, brand.id, price, originalPrice, stock],
      );
      const productId = result.insertId;
      const imageUrl = 'https://images.unsplash.com/' + image + '?auto=format&fit=crop&w=900&q=85';
      await connection.execute(
        'INSERT INTO product_images(product_id,image_url,alt_text) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM product_images WHERE product_id=? AND image_url=?)',
        [productId, imageUrl, name, productId, imageUrl],
      );
    }

    for (const product of additionalProducts) {
      const [[brand]] = await connection.execute('SELECT id FROM brands WHERE name=?', [product.brand]);
      const [[category]] = await connection.execute('SELECT id FROM categories WHERE name=?', [product.category]);
      const [result] = await connection.execute(
        "INSERT INTO products(name,slug,description,category_id,brand_id,price,original_price,stock,is_new,is_featured,status) VALUES(?,?,?,?,?,?,?,?,?,?,'active') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
        [
          product.name,
          product.slug,
          product.description,
          category.id,
          brand.id,
          product.price,
          product.originalPrice,
          product.stock,
          1,
          0,
        ],
      );
      const productId = result.insertId;
      const imageSource = productImageSources[product.slug];
      if (!imageSource) throw new Error('Missing product image source for ' + product.slug);
      const [[existingImage]] = await connection.execute(
        'SELECT id FROM product_images WHERE product_id=? ORDER BY sort_order,id LIMIT 1',
        [productId],
      );
      if (existingImage) {
        await connection.execute(
          'UPDATE product_images SET image_url=?,alt_text=? WHERE id=?',
          [imageSource.imageUrl, product.name, existingImage.id],
        );
      } else {
        await connection.execute(
          'INSERT INTO product_images(product_id,image_url,alt_text) VALUES(?,?,?)',
          [productId, imageSource.imageUrl, product.name],
        );
      }

      for (const [sortOrder, [specName, specValue]] of product.specs.entries()) {
        await connection.execute(
          'INSERT INTO product_specs(product_id,spec_name,spec_value,sort_order) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM product_specs WHERE product_id=? AND spec_name=?)',
          [productId, specName, specValue, sortOrder, productId, specName],
        );
      }
    }

    for (const [code, type, value, minimum] of coupons) {
      await connection.execute(
        "INSERT IGNORE INTO coupons(code,discount_type,discount_value,minimum_order,usage_limit,starts_at,ends_at,status) VALUES(?,?,?,?,100,NOW(),DATE_ADD(NOW(),INTERVAL 1 YEAR),'active')",
        [code, type, value, minimum],
      );
    }

    await connection.commit();
    console.log('TECHSTORE demo data is ready (existing customer data was preserved).');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch(error => {
  console.error('Could not seed TECHSTORE demo data:', error.message);
  process.exitCode = 1;
  pool.end();
});
