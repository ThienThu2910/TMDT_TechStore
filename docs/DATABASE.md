# Database

MySQL 8 schema nằm ở `database/techstore.sql`; engine InnoDB, charset utf8mb4. 19 bảng: users, addresses, categories, brands, products, product_images, product_specs, carts, cart_items, orders, order_items, payments, reviews, coupons, coupon_usages, wishlists, wishlist_items, inventory_transactions, order_status_history.

`orders` lưu ảnh chụp thông tin nhận hàng, subtotal, discount, total, payment method và trạng thái. `order_items.unit_price` lưu đơn giá thời điểm mua, nên thay đổi giá sản phẩm không ảnh hưởng lịch sử. Checkout khóa hàng sản phẩm `FOR UPDATE`, kiểm tra stock, tạo đơn/items/payment/audit, trừ stock có điều kiện trong cùng transaction. Hủy chỉ cho `pending` hoặc `confirmed`; khóa đơn và hoàn kho trong cùng transaction nên không thể hoàn nhiều lần qua lần gọi lặp.

Khởi tạo: chạy toàn bộ SQL trong MySQL Workbench hoặc `mysql -u root -p < database/techstore.sql`, sau đó đặt `DB_*` trong `backend/.env`, chạy `npm run seed -w backend`. Seed reset các bảng nghiệp vụ để dữ liệu demo sạch; không chạy seed trên dữ liệu cần giữ.
