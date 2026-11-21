-- ============================================================================
--  TECHSTORE - cơ sở dữ liệu MySQL / MariaDB (XAMPP)
--  Cách dùng: phpMyAdmin -> tab "Nhập" (Import) -> chọn file này -> Thực hiện.
--  Hoặc chạy:  npm run db:setup   (file này an toàn khi chạy lại: không ghi đè dữ liệu đã có)
-- ============================================================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS techstore_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE techstore_db;

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(30),
  role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  status        ENUM('active','locked') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_status (role, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS addresses (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  recipient_name VARCHAR(120) NOT NULL,
  phone          VARCHAR(30) NOT NULL,
  address_line   VARCHAR(500) NOT NULL,
  is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS brands (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(120) NOT NULL,
  slug       VARCHAR(150) NOT NULL UNIQUE,
  logo_url   VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name           VARCHAR(220) NOT NULL,
  slug           VARCHAR(240) NOT NULL UNIQUE,
  description    TEXT,
  category_id    BIGINT UNSIGNED,
  brand_id       BIGINT UNSIGNED,
  price          DECIMAL(14,2) NOT NULL,
  original_price DECIMAL(14,2),
  stock          INT UNSIGNED NOT NULL DEFAULT 0,
  is_new         BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  sales_count    INT UNSIGNED NOT NULL DEFAULT 0,
  status         ENUM('active','draft','archived') NOT NULL DEFAULT 'active',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id)    REFERENCES brands(id)     ON DELETE SET NULL,
  INDEX idx_products_name (name),
  INDEX idx_products_category (category_id, status),
  INDEX idx_products_brand (brand_id),
  INDEX idx_products_price (price),
  INDEX idx_products_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_images (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url  VARCHAR(700) NOT NULL,
  alt_text   VARCHAR(240),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_images_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_specs (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  spec_name  VARCHAR(120) NOT NULL,
  spec_value VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_specs_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carts (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cart_id    BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cart_product (cart_id, product_id),
  FOREIGN KEY (cart_id)    REFERENCES carts(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coupons (
  id               BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code             VARCHAR(50) NOT NULL UNIQUE,
  description      VARCHAR(255),
  discount_type    ENUM('percent','fixed') NOT NULL,
  discount_value   DECIMAL(12,2) NOT NULL,
  maximum_discount DECIMAL(12,2),
  minimum_order    DECIMAL(12,2) NOT NULL DEFAULT 0,
  usage_limit      INT UNSIGNED NOT NULL,
  used_count       INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at        DATETIME NOT NULL,
  ends_at          DATETIME NOT NULL,
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_coupon_active (code, status, starts_at, ends_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id               BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  status           ENUM('pending','confirmed','shipping','delivered','completed','cancelled') NOT NULL DEFAULT 'pending',
  subtotal         DECIMAL(14,2) NOT NULL,
  discount_amount  DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(14,2) NOT NULL,
  recipient_name   VARCHAR(120) NOT NULL,
  recipient_phone  VARCHAR(30) NOT NULL,
  shipping_address VARCHAR(700) NOT NULL,
  note             TEXT,
  payment_method   ENUM('COD','SIMULATED') NOT NULL DEFAULT 'COD',
  cancelled_at     DATETIME,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_orders_user (user_id, created_at),
  INDEX idx_orders_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id     BIGINT UNSIGNED NOT NULL,
  product_id   BIGINT UNSIGNED,
  product_name VARCHAR(220) NOT NULL,
  quantity     INT UNSIGNED NOT NULL,
  unit_price   DECIMAL(14,2) NOT NULL,
  line_total   DECIMAL(14,2) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id        BIGINT UNSIGNED NOT NULL,
  method          ENUM('COD','SIMULATED') NOT NULL,
  amount          DECIMAL(14,2) NOT NULL,
  status          ENUM('pending','simulated','paid','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  transaction_ref VARCHAR(190),
  paid_at         DATETIME,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_payments_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  order_id   BIGINT UNSIGNED NOT NULL,
  rating     TINYINT UNSIGNED NOT NULL,
  comment    TEXT,
  status     ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review_purchase (product_id, user_id, order_id),
  CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  INDEX idx_reviews_product_status (product_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coupon_usages (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  coupon_id       BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  order_id        BIGINT UNSIGNED NOT NULL,
  discount_amount DECIMAL(14,2) NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_coupon_order (coupon_id, order_id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id)   REFERENCES users(id),
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_coupon_user (coupon_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wishlists (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wishlist_items (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  wishlist_id BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wishlist_product (wishlist_id, product_id),
  FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id      BIGINT UNSIGNED NOT NULL,
  order_id        BIGINT UNSIGNED,
  quantity_change INT NOT NULL,
  type            ENUM('sale','return','restock','adjustment') NOT NULL,
  note            VARCHAR(500),
  created_by      BIGINT UNSIGNED,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_inventory_product (product_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_status_history (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id   BIGINT UNSIGNED NOT NULL,
  status     ENUM('pending','confirmed','shipping','delivered','completed','cancelled') NOT NULL,
  note       VARCHAR(500),
  changed_by BIGINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_order_history (order_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscribers (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email      VARCHAR(190) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
--  DỮ LIỆU MẪU (INSERT IGNORE: nhập lại nhiều lần không bị trùng / không ghi đè)
--  Tài khoản demo:  admin@techstore.vn / Admin123!   |   khach@techstore.vn / Khach123!
-- ============================================================================

INSERT IGNORE INTO categories (id, name, slug, sort_order) VALUES
  (1, 'Laptop', 'laptop', 1),
  (2, 'Điện thoại', 'dien-thoai', 2),
  (3, 'Máy tính bảng', 'may-tinh-bang', 3),
  (4, 'Màn hình', 'man-hinh', 4),
  (5, 'Phụ kiện', 'phu-kien', 5);

INSERT IGNORE INTO brands (id, name, slug) VALUES
  (1, 'Apple', 'apple'),
  (2, 'Samsung', 'samsung'),
  (3, 'Dell', 'dell'),
  (4, 'Sony', 'sony'),
  (5, 'LG', 'lg'),
  (6, 'ASUS', 'asus'),
  (7, 'Lenovo', 'lenovo');

INSERT IGNORE INTO users (id, name, email, password_hash, phone, role, created_at) VALUES
  (1, 'Quản trị viên', 'admin@techstore.vn', '$2b$12$a5r4mYF8UZ68L1R3oOXdlu60Bq73vNvrFBkOahk8iLPwu3O8mzeVS', '0900000001', 'admin', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 120 DAY), INTERVAL 0 MINUTE)),
  (2, 'Nguyễn Minh Anh', 'khach@techstore.vn', '$2b$12$t9JXRJcyYc9aYXlTJ9xkH.X46KIdxS5tGzUfZ.nS4BshI1lONPJXC', '0901234567', 'customer', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 60 DAY), INTERVAL 0 MINUTE)),
  (3, 'Trần Quốc Bảo', 'quocbao@techstore.vn', '$2b$12$t9JXRJcyYc9aYXlTJ9xkH.X46KIdxS5tGzUfZ.nS4BshI1lONPJXC', '0912345678', 'customer', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 55 DAY), INTERVAL 0 MINUTE)),
  (4, 'Lê Thu Hà', 'thuha@techstore.vn', '$2b$12$t9JXRJcyYc9aYXlTJ9xkH.X46KIdxS5tGzUfZ.nS4BshI1lONPJXC', '0987654321', 'customer', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 50 DAY), INTERVAL 0 MINUTE)),
  (5, 'Phạm Gia Huy', 'giahuy@techstore.vn', '$2b$12$t9JXRJcyYc9aYXlTJ9xkH.X46KIdxS5tGzUfZ.nS4BshI1lONPJXC', '0933222111', 'customer', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 45 DAY), INTERVAL 0 MINUTE)),
  (6, 'Võ Thanh Tùng', 'thanhtung@techstore.vn', '$2b$12$t9JXRJcyYc9aYXlTJ9xkH.X46KIdxS5tGzUfZ.nS4BshI1lONPJXC', '0977111222', 'customer', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 40 DAY), INTERVAL 0 MINUTE)),
  (7, 'Đặng Hải Yến', 'haiyen@techstore.vn', '$2b$12$t9JXRJcyYc9aYXlTJ9xkH.X46KIdxS5tGzUfZ.nS4BshI1lONPJXC', '0966333444', 'customer', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 35 DAY), INTERVAL 0 MINUTE));

INSERT IGNORE INTO products (id, name, slug, description, category_id, brand_id, price, original_price, stock, is_new, is_featured, sales_count, status, created_at) VALUES
  (1, 'MacBook Air 13 inch chip M3 8GB/256GB', 'macbook-air-13-m3', 'Mỏng nhẹ, pin cả ngày và hiệu năng mạnh mẽ cho học tập, làm việc và sáng tạo nội dung.', 1, 1, 24990000, 27990000, 14, 1, 1, 540, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 39 DAY), INTERVAL 0 MINUTE)),
  (2, 'iPhone 16 128GB', 'iphone-16-128gb', 'Chip A18 mạnh mẽ, camera nâng cấp và nút Camera Control mới.', 2, 1, 21990000, NULL, 30, 1, 1, 920, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 38 DAY), INTERVAL 0 MINUTE)),
  (3, 'iPad Air M2 11 inch Wi-Fi 128GB', 'ipad-air-m2-11', 'Hiệu năng chip M2 trong thiết kế mỏng nhẹ, hỗ trợ Apple Pencil Pro.', 3, 1, 16990000, 18990000, 8, 0, 1, 310, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 37 DAY), INTERVAL 0 MINUTE)),
  (4, 'Dell UltraSharp 27 4K U2723QE', 'dell-ultrasharp-27-4k', 'Màn hình IPS Black 4K cho độ tương phản cao, màu sắc chuẩn xác cho dân thiết kế.', 4, 3, 14990000, 16490000, 5, 0, 0, 140, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 36 DAY), INTERVAL 0 MINUTE)),
  (5, 'Sony WH-1000XM5 chống ồn', 'sony-wh-1000xm5', 'Chống ồn hàng đầu, âm thanh Hi-Res và thời lượng pin 30 giờ.', 5, 4, 7990000, 8990000, 0, 0, 0, 760, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 35 DAY), INTERVAL 0 MINUTE)),
  (6, 'MacBook Pro 14 inch M3 Pro 18GB/512GB', 'macbook-pro-14-m3-pro', 'Hiệu năng chuyên nghiệp với màn hình Liquid Retina XDR.', 1, 1, 49990000, NULL, 3, 0, 1, 95, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 34 DAY), INTERVAL 0 MINUTE)),
  (7, 'Samsung Galaxy S24 Ultra 256GB', 'samsung-galaxy-s24-ultra', 'Camera 200MP, bút S Pen và Galaxy AI.', 2, 2, 26990000, 33990000, 18, 0, 1, 480, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 33 DAY), INTERVAL 0 MINUTE)),
  (8, 'LG UltraGear 27 inch 2K 165Hz', 'lg-ultragear-27-2k-165hz', 'Tần số quét cao, phản hồi 1ms, mượt mà cho mọi tác vụ.', 4, 5, 7490000, 8490000, 22, 1, 0, 260, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 32 DAY), INTERVAL 0 MINUTE)),
  (9, 'ASUS ROG Zephyrus G14 Ryzen 9 RTX 4070', 'asus-rog-zephyrus-g14', 'Laptop gaming 14 inch nhỏ gọn, màn hình OLED 120Hz và hiệu năng đồ họa mạnh mẽ.', 1, 6, 42990000, 45990000, 5, 0, 1, 120, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 31 DAY), INTERVAL 0 MINUTE)),
  (10, 'Dell XPS 13 9340 Core Ultra 7', 'dell-xps-13-9340', 'Thiết kế nguyên khối cao cấp, viền màn hình siêu mỏng, pin bền cho cả ngày làm việc.', 1, 3, 36990000, NULL, 6, 1, 0, 64, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 30 DAY), INTERVAL 0 MINUTE)),
  (11, 'iPhone 16 Pro Max 256GB', 'iphone-16-pro-max-256gb', 'Khung titan, màn hình lớn 6.9 inch và hệ thống camera chuyên nghiệp.', 2, 1, 34990000, NULL, 12, 1, 1, 310, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 29 DAY), INTERVAL 0 MINUTE)),
  (12, 'Samsung Galaxy Tab S9 FE 128GB', 'samsung-galaxy-tab-s9-fe', 'Màn hình 10.9 inch mượt mà, bút S Pen đi kèm và chuẩn kháng nước IP68.', 3, 2, 9490000, 10990000, 15, 0, 0, 98, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 28 DAY), INTERVAL 0 MINUTE)),
  (13, 'Samsung Odyssey G5 32 inch 2K 165Hz', 'samsung-odyssey-g5-32', 'Màn hình cong 1000R đắm chìm, tần số quét 165Hz cho game thủ.', 4, 2, 6990000, 8290000, 9, 0, 0, 87, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 27 DAY), INTERVAL 0 MINUTE)),
  (14, 'AirPods Pro 2 USB-C', 'airpods-pro-2-usb-c', 'Chống ồn chủ động, âm thanh không gian và hộp sạc USB-C có loa tìm kiếm.', 5, 1, 5490000, 6190000, 40, 0, 0, 650, 'active', DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 0 MINUTE));

INSERT IGNORE INTO product_images (id, product_id, image_url, alt_text, sort_order) VALUES
  (1, 1, 'https://images.unsplash.com/photo-1620365602462-40d8f2cdd84c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'MacBook Air 13 inch chip M3 8GB/256GB', 0),
  (2, 1, 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'MacBook Air 13 inch chip M3 8GB/256GB', 1),
  (3, 1, 'https://images.unsplash.com/photo-1621606453029-5656bd7fa6c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'MacBook Air 13 inch chip M3 8GB/256GB', 2),
  (4, 2, 'https://images.unsplash.com/photo-1634403665481-74948d815f03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'iPhone 16 128GB', 0),
  (5, 2, 'https://images.unsplash.com/photo-1580910051074-3eb694886505?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'iPhone 16 128GB', 1),
  (6, 3, 'https://images.unsplash.com/photo-1561154464-82e9adf32764?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'iPad Air M2 11 inch Wi-Fi 128GB', 0),
  (7, 3, 'https://images.unsplash.com/photo-1623126908029-58cb08a2b272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'iPad Air M2 11 inch Wi-Fi 128GB', 1),
  (8, 3, 'https://images.unsplash.com/photo-1662893170097-d6563d0093d3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'iPad Air M2 11 inch Wi-Fi 128GB', 2),
  (9, 4, 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Dell UltraSharp 27 4K U2723QE', 0),
  (10, 4, 'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Dell UltraSharp 27 4K U2723QE', 1),
  (11, 4, 'https://images.unsplash.com/photo-1575318634028-6a0cfcb60c59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Dell UltraSharp 27 4K U2723QE', 2),
  (12, 5, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Sony WH-1000XM5 chống ồn', 0),
  (13, 5, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Sony WH-1000XM5 chống ồn', 1),
  (14, 5, 'https://images.unsplash.com/photo-1545127398-14699f92334b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Sony WH-1000XM5 chống ồn', 2),
  (15, 6, 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'MacBook Pro 14 inch M3 Pro 18GB/512GB', 0),
  (16, 6, 'https://images.unsplash.com/photo-1621606453029-5656bd7fa6c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'MacBook Pro 14 inch M3 Pro 18GB/512GB', 1),
  (17, 7, 'https://images.unsplash.com/photo-1480694313141-fce5e697ee25?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Samsung Galaxy S24 Ultra 256GB', 0),
  (18, 7, 'https://images.unsplash.com/photo-1580910051074-3eb694886505?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Samsung Galaxy S24 Ultra 256GB', 1),
  (19, 8, 'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'LG UltraGear 27 inch 2K 165Hz', 0),
  (20, 8, 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'LG UltraGear 27 inch 2K 165Hz', 1),
  (21, 9, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'ASUS ROG Zephyrus G14 Ryzen 9 RTX 4070', 0),
  (22, 9, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'ASUS ROG Zephyrus G14 Ryzen 9 RTX 4070', 1),
  (23, 10, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Dell XPS 13 9340 Core Ultra 7', 0),
  (24, 10, 'https://images.unsplash.com/photo-1621606453029-5656bd7fa6c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Dell XPS 13 9340 Core Ultra 7', 1),
  (25, 11, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'iPhone 16 Pro Max 256GB', 0),
  (26, 11, 'https://images.unsplash.com/photo-1634403665481-74948d815f03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'iPhone 16 Pro Max 256GB', 1),
  (27, 12, 'https://images.unsplash.com/photo-1623126908029-58cb08a2b272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Samsung Galaxy Tab S9 FE 128GB', 0),
  (28, 12, 'https://images.unsplash.com/photo-1561154464-82e9adf32764?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Samsung Galaxy Tab S9 FE 128GB', 1),
  (29, 13, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Samsung Odyssey G5 32 inch 2K 165Hz', 0),
  (30, 13, 'https://images.unsplash.com/photo-1575318634028-6a0cfcb60c59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'Samsung Odyssey G5 32 inch 2K 165Hz', 1),
  (31, 14, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'AirPods Pro 2 USB-C', 0),
  (32, 14, 'https://images.unsplash.com/photo-1545127398-14699f92334b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'AirPods Pro 2 USB-C', 1);

INSERT IGNORE INTO product_specs (id, product_id, spec_name, spec_value, sort_order) VALUES
  (1, 1, 'Chip', 'Apple M3 8 nhân', 0),
  (2, 1, 'RAM', '8GB', 1),
  (3, 1, 'Ổ cứng', 'SSD 256GB', 2),
  (4, 1, 'Màn hình', '13.6 inch Liquid Retina', 3),
  (5, 1, 'Pin', 'Đến 18 giờ', 4),
  (6, 1, 'Trọng lượng', '1.24 kg', 5),
  (7, 2, 'Chip', 'A18', 0),
  (8, 2, 'Bộ nhớ', '128GB', 1),
  (9, 2, 'Màn hình', '6.1 inch OLED', 2),
  (10, 2, 'Camera', '48MP + 12MP', 3),
  (11, 2, 'Cổng sạc', 'USB-C', 4),
  (12, 3, 'Chip', 'Apple M2', 0),
  (13, 3, 'Bộ nhớ', '128GB', 1),
  (14, 3, 'Màn hình', '11 inch Liquid Retina', 2),
  (15, 3, 'Kết nối', 'Wi-Fi 6E', 3),
  (16, 4, 'Kích thước', '27 inch', 0),
  (17, 4, 'Độ phân giải', '3840 × 2160', 1),
  (18, 4, 'Tấm nền', 'IPS Black', 2),
  (19, 4, 'Tần số quét', '60Hz', 3),
  (20, 4, 'Cổng', 'USB-C 90W, HDMI, DP', 4),
  (21, 5, 'Loại', 'Over-ear không dây', 0),
  (22, 5, 'Chống ồn', 'ANC thích ứng', 1),
  (23, 5, 'Pin', '30 giờ', 2),
  (24, 5, 'Kết nối', 'Bluetooth 5.2', 3),
  (25, 6, 'Chip', 'M3 Pro 11 nhân', 0),
  (26, 6, 'RAM', '18GB', 1),
  (27, 6, 'Ổ cứng', 'SSD 512GB', 2),
  (28, 6, 'Màn hình', '14.2 inch XDR', 3),
  (29, 7, 'Chip', 'Snapdragon 8 Gen 3', 0),
  (30, 7, 'Bộ nhớ', '256GB', 1),
  (31, 7, 'Màn hình', '6.8 inch AMOLED', 2),
  (32, 7, 'Camera', '200MP', 3),
  (33, 8, 'Kích thước', '27 inch', 0),
  (34, 8, 'Độ phân giải', '2560 × 1440', 1),
  (35, 8, 'Tần số quét', '165Hz', 2),
  (36, 9, 'Chip', 'AMD Ryzen 9 8945HS', 0),
  (37, 9, 'RAM', '32GB', 1),
  (38, 9, 'Ổ cứng', 'SSD 1TB', 2),
  (39, 9, 'Card đồ họa', 'RTX 4070 8GB', 3),
  (40, 9, 'Màn hình', '14 inch OLED 120Hz', 4),
  (41, 10, 'Chip', 'Intel Core Ultra 7 155H', 0),
  (42, 10, 'RAM', '16GB', 1),
  (43, 10, 'Ổ cứng', 'SSD 512GB', 2),
  (44, 10, 'Màn hình', '13.4 inch FHD+', 3),
  (45, 10, 'Trọng lượng', '1.19 kg', 4),
  (46, 11, 'Chip', 'A18 Pro', 0),
  (47, 11, 'Bộ nhớ', '256GB', 1),
  (48, 11, 'Màn hình', '6.9 inch Super Retina XDR', 2),
  (49, 11, 'Camera', '48MP + 48MP + 12MP', 3),
  (50, 11, 'Cổng sạc', 'USB-C', 4),
  (51, 12, 'Chip', 'Exynos 1380', 0),
  (52, 12, 'Bộ nhớ', '128GB', 1),
  (53, 12, 'Màn hình', '10.9 inch', 2),
  (54, 12, 'Kết nối', 'Wi-Fi 6', 3),
  (55, 12, 'Chống nước', 'IP68', 4),
  (56, 13, 'Kích thước', '32 inch', 0),
  (57, 13, 'Độ phân giải', '2560 × 1440', 1),
  (58, 13, 'Tấm nền', 'VA cong 1000R', 2),
  (59, 13, 'Tần số quét', '165Hz', 3),
  (60, 13, 'Phản hồi', '1ms', 4),
  (61, 14, 'Loại', 'In-ear không dây', 0),
  (62, 14, 'Chống ồn', 'ANC chủ động', 1),
  (63, 14, 'Pin', 'Đến 30 giờ (kèm hộp sạc)', 2),
  (64, 14, 'Kết nối', 'Bluetooth 5.3', 3),
  (65, 14, 'Cổng sạc', 'USB-C', 4);

INSERT IGNORE INTO coupons (id, code, description, discount_type, discount_value, maximum_discount, minimum_order, usage_limit, starts_at, ends_at, status) VALUES
  (1, 'TECH10', 'Giảm 10% cho đơn từ 1 triệu (tối đa 3 triệu)', 'percent', 10, 3000000, 1000000, 100, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 365 DAY), 'active'),
  (2, 'WELCOME500', 'Giảm 500.000₫ cho đơn từ 5 triệu', 'fixed', 500000, NULL, 5000000, 100, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 365 DAY), 'active'),
  (3, 'BLACKFRIDAY', 'Giảm 15% cho đơn từ 10 triệu (tối đa 5 triệu)', 'percent', 15, 5000000, 10000000, 50, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 365 DAY), 'active');

INSERT IGNORE INTO orders (id, user_id, status, subtotal, discount_amount, total_amount, recipient_name, recipient_phone, shipping_address, note, payment_method, cancelled_at, created_at) VALUES
  (1, 5, 'delivered', 22480000, 0, 22480000, 'Phạm Gia Huy', '0933222111', '99 Hai Bà Trưng, Cần Thơ', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 480 MINUTE)),
  (2, 7, 'delivered', 49990000, 0, 49990000, 'Đặng Hải Yến', '0966333444', '71 Pasteur, TP.HCM', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 21 DAY), INTERVAL 600 MINUTE)),
  (3, 3, 'delivered', 21990000, 0, 21990000, 'Trần Quốc Bảo', '0912345678', '45 Nguyễn Huệ, Hà Nội', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 19 DAY), INTERVAL 900 MINUTE)),
  (4, 4, 'delivered', 22480000, 0, 22480000, 'Lê Thu Hà', '0987654321', '8 Trần Phú, Đà Nẵng', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 660 MINUTE)),
  (5, 2, 'delivered', 26990000, 0, 26990000, 'Nguyễn Minh Anh', '0901234567', '12 Lê Lợi, Q.1, TP.HCM', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 12 DAY), INTERVAL 540 MINUTE)),
  (6, 6, 'delivered', 42990000, 0, 42990000, 'Võ Thanh Tùng', '0977111222', '3 Lý Thường Kiệt, Huế', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 9 DAY), INTERVAL 1140 MINUTE)),
  (7, 5, 'delivered', 24990000, 0, 24990000, 'Phạm Gia Huy', '0933222111', '99 Hai Bà Trưng, Cần Thơ', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 6 DAY), INTERVAL 480 MINUTE)),
  (8, 3, 'delivered', 10980000, 0, 10980000, 'Trần Quốc Bảo', '0912345678', '45 Nguyễn Huệ, Hà Nội', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 840 MINUTE)),
  (9, 7, 'delivered', 34990000, 0, 34990000, 'Đặng Hải Yến', '0966333444', '71 Pasteur, TP.HCM', NULL, 'SIMULATED', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 4 DAY), INTERVAL 960 MINUTE)),
  (10, 4, 'delivered', 14480000, 0, 14480000, 'Lê Thu Hà', '0987654321', '8 Trần Phú, Đà Nẵng', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 3 DAY), INTERVAL 600 MINUTE)),
  (11, 2, 'delivered', 36990000, 0, 36990000, 'Nguyễn Minh Anh', '0901234567', '12 Lê Lợi, Q.1, TP.HCM', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 780 MINUTE)),
  (12, 6, 'cancelled', 7990000, 0, 7990000, 'Võ Thanh Tùng', '0977111222', '3 Lý Thường Kiệt, Huế', NULL, 'COD', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 1140 MINUTE), INTERVAL 90 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 1140 MINUTE)),
  (13, 4, 'shipping', 16990000, 0, 16990000, 'Lê Thu Hà', '0987654321', '8 Trần Phú, Đà Nẵng', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 660 MINUTE)),
  (14, 3, 'confirmed', 43980000, 0, 43980000, 'Trần Quốc Bảo', '0912345678', '45 Nguyễn Huệ, Hà Nội', NULL, 'COD', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 1 DAY), INTERVAL 900 MINUTE)),
  (15, 2, 'pending', 24990000, 0, 24990000, 'Nguyễn Minh Anh', '0901234567', '12 Lê Lợi, Q.1, TP.HCM', NULL, 'COD', NULL, DATE_SUB(NOW(), INTERVAL 25 MINUTE));

INSERT IGNORE INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, line_total) VALUES
  (1, 1, 4, 'Dell UltraSharp 27 4K U2723QE', 1, 14990000, 14990000),
  (2, 1, 8, 'LG UltraGear 27 inch 2K 165Hz', 1, 7490000, 7490000),
  (3, 2, 6, 'MacBook Pro 14 inch M3 Pro 18GB/512GB', 1, 49990000, 49990000),
  (4, 3, 2, 'iPhone 16 128GB', 1, 21990000, 21990000),
  (5, 4, 3, 'iPad Air M2 11 inch Wi-Fi 128GB', 1, 16990000, 16990000),
  (6, 4, 14, 'AirPods Pro 2 USB-C', 1, 5490000, 5490000),
  (7, 5, 7, 'Samsung Galaxy S24 Ultra 256GB', 1, 26990000, 26990000),
  (8, 6, 9, 'ASUS ROG Zephyrus G14 Ryzen 9 RTX 4070', 1, 42990000, 42990000),
  (9, 7, 1, 'MacBook Air 13 inch chip M3 8GB/256GB', 1, 24990000, 24990000),
  (10, 8, 14, 'AirPods Pro 2 USB-C', 2, 5490000, 10980000),
  (11, 9, 11, 'iPhone 16 Pro Max 256GB', 1, 34990000, 34990000),
  (12, 10, 8, 'LG UltraGear 27 inch 2K 165Hz', 1, 7490000, 7490000),
  (13, 10, 13, 'Samsung Odyssey G5 32 inch 2K 165Hz', 1, 6990000, 6990000),
  (14, 11, 10, 'Dell XPS 13 9340 Core Ultra 7', 1, 36990000, 36990000),
  (15, 12, 5, 'Sony WH-1000XM5 chống ồn', 1, 7990000, 7990000),
  (16, 13, 3, 'iPad Air M2 11 inch Wi-Fi 128GB', 1, 16990000, 16990000),
  (17, 14, 2, 'iPhone 16 128GB', 2, 21990000, 43980000),
  (18, 15, 1, 'MacBook Air 13 inch chip M3 8GB/256GB', 1, 24990000, 24990000);

INSERT IGNORE INTO payments (id, order_id, method, amount, status, paid_at, created_at) VALUES
  (1, 1, 'COD', 22480000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 480 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 480 MINUTE)),
  (2, 2, 'COD', 49990000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 21 DAY), INTERVAL 600 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 21 DAY), INTERVAL 600 MINUTE)),
  (3, 3, 'COD', 21990000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 19 DAY), INTERVAL 900 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 19 DAY), INTERVAL 900 MINUTE)),
  (4, 4, 'COD', 22480000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 660 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 660 MINUTE)),
  (5, 5, 'COD', 26990000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 12 DAY), INTERVAL 540 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 12 DAY), INTERVAL 540 MINUTE)),
  (6, 6, 'COD', 42990000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 9 DAY), INTERVAL 1140 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 9 DAY), INTERVAL 1140 MINUTE)),
  (7, 7, 'COD', 24990000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 6 DAY), INTERVAL 480 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 6 DAY), INTERVAL 480 MINUTE)),
  (8, 8, 'COD', 10980000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 840 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 840 MINUTE)),
  (9, 9, 'SIMULATED', 34990000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 4 DAY), INTERVAL 960 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 4 DAY), INTERVAL 960 MINUTE)),
  (10, 10, 'COD', 14480000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 3 DAY), INTERVAL 600 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 3 DAY), INTERVAL 600 MINUTE)),
  (11, 11, 'COD', 36990000, 'paid', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 780 MINUTE), INTERVAL 300 MINUTE), DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 780 MINUTE)),
  (12, 12, 'COD', 7990000, 'cancelled', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 1140 MINUTE)),
  (13, 13, 'COD', 16990000, 'pending', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 660 MINUTE)),
  (14, 14, 'COD', 43980000, 'pending', NULL, DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 1 DAY), INTERVAL 900 MINUTE)),
  (15, 15, 'COD', 24990000, 'pending', NULL, DATE_SUB(NOW(), INTERVAL 25 MINUTE));

INSERT IGNORE INTO order_status_history (id, order_id, status, note, changed_by, created_at) VALUES
  (1, 1, 'pending', 'Đơn hàng được tạo', 5, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 480 MINUTE), INTERVAL 0 MINUTE)),
  (2, 1, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 480 MINUTE), INTERVAL 90 MINUTE)),
  (3, 1, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 480 MINUTE), INTERVAL 180 MINUTE)),
  (4, 1, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 480 MINUTE), INTERVAL 270 MINUTE)),
  (5, 2, 'pending', 'Đơn hàng được tạo', 7, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 21 DAY), INTERVAL 600 MINUTE), INTERVAL 0 MINUTE)),
  (6, 2, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 21 DAY), INTERVAL 600 MINUTE), INTERVAL 90 MINUTE)),
  (7, 2, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 21 DAY), INTERVAL 600 MINUTE), INTERVAL 180 MINUTE)),
  (8, 2, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 21 DAY), INTERVAL 600 MINUTE), INTERVAL 270 MINUTE)),
  (9, 3, 'pending', 'Đơn hàng được tạo', 3, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 19 DAY), INTERVAL 900 MINUTE), INTERVAL 0 MINUTE)),
  (10, 3, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 19 DAY), INTERVAL 900 MINUTE), INTERVAL 90 MINUTE)),
  (11, 3, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 19 DAY), INTERVAL 900 MINUTE), INTERVAL 180 MINUTE)),
  (12, 3, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 19 DAY), INTERVAL 900 MINUTE), INTERVAL 270 MINUTE)),
  (13, 4, 'pending', 'Đơn hàng được tạo', 4, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 660 MINUTE), INTERVAL 0 MINUTE)),
  (14, 4, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 660 MINUTE), INTERVAL 90 MINUTE)),
  (15, 4, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 660 MINUTE), INTERVAL 180 MINUTE)),
  (16, 4, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 660 MINUTE), INTERVAL 270 MINUTE)),
  (17, 5, 'pending', 'Đơn hàng được tạo', 2, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 12 DAY), INTERVAL 540 MINUTE), INTERVAL 0 MINUTE)),
  (18, 5, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 12 DAY), INTERVAL 540 MINUTE), INTERVAL 90 MINUTE)),
  (19, 5, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 12 DAY), INTERVAL 540 MINUTE), INTERVAL 180 MINUTE)),
  (20, 5, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 12 DAY), INTERVAL 540 MINUTE), INTERVAL 270 MINUTE)),
  (21, 6, 'pending', 'Đơn hàng được tạo', 6, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 9 DAY), INTERVAL 1140 MINUTE), INTERVAL 0 MINUTE)),
  (22, 6, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 9 DAY), INTERVAL 1140 MINUTE), INTERVAL 90 MINUTE)),
  (23, 6, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 9 DAY), INTERVAL 1140 MINUTE), INTERVAL 180 MINUTE)),
  (24, 6, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 9 DAY), INTERVAL 1140 MINUTE), INTERVAL 270 MINUTE)),
  (25, 7, 'pending', 'Đơn hàng được tạo', 5, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 6 DAY), INTERVAL 480 MINUTE), INTERVAL 0 MINUTE)),
  (26, 7, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 6 DAY), INTERVAL 480 MINUTE), INTERVAL 90 MINUTE)),
  (27, 7, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 6 DAY), INTERVAL 480 MINUTE), INTERVAL 180 MINUTE)),
  (28, 7, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 6 DAY), INTERVAL 480 MINUTE), INTERVAL 270 MINUTE)),
  (29, 8, 'pending', 'Đơn hàng được tạo', 3, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 840 MINUTE), INTERVAL 0 MINUTE)),
  (30, 8, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 840 MINUTE), INTERVAL 90 MINUTE)),
  (31, 8, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 840 MINUTE), INTERVAL 180 MINUTE)),
  (32, 8, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 840 MINUTE), INTERVAL 270 MINUTE)),
  (33, 9, 'pending', 'Đơn hàng được tạo', 7, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 4 DAY), INTERVAL 960 MINUTE), INTERVAL 0 MINUTE)),
  (34, 9, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 4 DAY), INTERVAL 960 MINUTE), INTERVAL 90 MINUTE)),
  (35, 9, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 4 DAY), INTERVAL 960 MINUTE), INTERVAL 180 MINUTE)),
  (36, 9, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 4 DAY), INTERVAL 960 MINUTE), INTERVAL 270 MINUTE)),
  (37, 10, 'pending', 'Đơn hàng được tạo', 4, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 3 DAY), INTERVAL 600 MINUTE), INTERVAL 0 MINUTE)),
  (38, 10, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 3 DAY), INTERVAL 600 MINUTE), INTERVAL 90 MINUTE)),
  (39, 10, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 3 DAY), INTERVAL 600 MINUTE), INTERVAL 180 MINUTE)),
  (40, 10, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 3 DAY), INTERVAL 600 MINUTE), INTERVAL 270 MINUTE)),
  (41, 11, 'pending', 'Đơn hàng được tạo', 2, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 780 MINUTE), INTERVAL 0 MINUTE)),
  (42, 11, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 780 MINUTE), INTERVAL 90 MINUTE)),
  (43, 11, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 780 MINUTE), INTERVAL 180 MINUTE)),
  (44, 11, 'delivered', 'Giao hàng thành công', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 780 MINUTE), INTERVAL 270 MINUTE)),
  (45, 12, 'pending', 'Đơn hàng được tạo', 6, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 1140 MINUTE), INTERVAL 0 MINUTE)),
  (46, 12, 'cancelled', 'Khách hàng hủy đơn', 6, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 1140 MINUTE), INTERVAL 90 MINUTE)),
  (47, 13, 'pending', 'Đơn hàng được tạo', 4, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 660 MINUTE), INTERVAL 0 MINUTE)),
  (48, 13, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 660 MINUTE), INTERVAL 90 MINUTE)),
  (49, 13, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 660 MINUTE), INTERVAL 180 MINUTE)),
  (50, 14, 'pending', 'Đơn hàng được tạo', 3, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 1 DAY), INTERVAL 900 MINUTE), INTERVAL 0 MINUTE)),
  (51, 14, 'confirmed', 'Cửa hàng đã xác nhận', 1, DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 1 DAY), INTERVAL 900 MINUTE), INTERVAL 90 MINUTE)),
  (52, 15, 'pending', 'Đơn hàng được tạo', 2, DATE_ADD(DATE_SUB(NOW(), INTERVAL 25 MINUTE), INTERVAL 0 MINUTE));

INSERT IGNORE INTO reviews (id, product_id, user_id, order_id, rating, comment, status, created_at) VALUES
  (1, 4, 5, 1, 5, 'Màu rất chuẩn, đáng đồng tiền cho dân thiết kế.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 1200 MINUTE), INTERVAL 0 MINUTE)),
  (2, 8, 5, 1, 4, 'Màn hình mượt, giá hợp lý. Chân đế hơi nhẹ.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 26 DAY), INTERVAL 1200 MINUTE), INTERVAL 1 MINUTE)),
  (3, 6, 7, 2, 5, 'Hiệu năng quá mạnh, làm việc đồ họa rất mượt.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 21 DAY), INTERVAL 1200 MINUTE), INTERVAL 2 MINUTE)),
  (4, 2, 3, 3, 5, 'Máy chính hãng, nhân viên tư vấn nhiệt tình.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 19 DAY), INTERVAL 1200 MINUTE), INTERVAL 3 MINUTE)),
  (5, 3, 4, 4, 4, 'Mỏng nhẹ, viết bằng Pencil rất thích. Pin dùng cả ngày.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 1200 MINUTE), INTERVAL 4 MINUTE)),
  (6, 14, 4, 4, 5, 'Chống ồn tốt, kết nối nhanh với iPhone.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 14 DAY), INTERVAL 1200 MINUTE), INTERVAL 5 MINUTE)),
  (7, 7, 2, 5, 4, 'Camera zoom xa ấn tượng, S Pen tiện lợi.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 12 DAY), INTERVAL 1200 MINUTE), INTERVAL 6 MINUTE)),
  (8, 9, 6, 6, 5, 'Gaming mượt, màn OLED đẹp xuất sắc.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 9 DAY), INTERVAL 1200 MINUTE), INTERVAL 7 MINUTE)),
  (9, 1, 5, 7, 5, 'Đúng mô tả, giao nhanh, đóng gói cẩn thận.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 6 DAY), INTERVAL 1200 MINUTE), INTERVAL 8 MINUTE)),
  (10, 14, 3, 8, 4, 'Âm thanh sạch, đeo thoải mái cả buổi.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 5 DAY), INTERVAL 1200 MINUTE), INTERVAL 9 MINUTE)),
  (11, 11, 7, 9, 5, 'Thiết kế titan sang trọng, pin trâu.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 4 DAY), INTERVAL 1200 MINUTE), INTERVAL 10 MINUTE)),
  (12, 13, 4, 10, 4, 'Màn cong đắm chìm, giá rất tốt trong tầm này.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 3 DAY), INTERVAL 1200 MINUTE), INTERVAL 11 MINUTE)),
  (13, 10, 2, 11, 5, 'Mua COD rất yên tâm, nhận hàng kiểm tra rồi mới trả tiền.', 'visible', DATE_ADD(DATE_ADD(DATE_SUB(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 1200 MINUTE), INTERVAL 12 MINUTE));
