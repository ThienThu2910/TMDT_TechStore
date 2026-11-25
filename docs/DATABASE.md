<<<<<<< HEAD
# Cơ sở dữ liệu `techstore_db` (MySQL / MariaDB, InnoDB, utf8mb4)

Tạo bằng `database/techstore.sql`. Tất cả bảng dùng khóa chính `BIGINT UNSIGNED AUTO_INCREMENT`, ràng buộc khóa ngoại đầy đủ.

| Bảng | Nội dung chính |
|---|---|
| `users` | Tài khoản (`role`: customer / admin, `status`: active / locked), mật khẩu băm bcrypt |
| `categories`, `brands` | Danh mục (có `slug`, `sort_order`) và thương hiệu |
| `products` | Tên, `slug`, giá bán, `original_price`, `stock`, `is_new`, `is_featured`, `sales_count`, `status` (active / draft / archived) |
| `product_images`, `product_specs` | Ảnh và thông số kỹ thuật của từng sản phẩm (có `sort_order`) |
| `orders` | Đơn hàng: tạm tính, giảm giá, tổng tiền, người nhận, địa chỉ, `payment_method` (COD / SIMULATED), `status` |
| `order_items` | Dòng hàng — **lưu tên và đơn giá tại thời điểm mua** nên lịch sử không đổi khi sản phẩm đổi giá |
| `payments` | Trạng thái thanh toán của đơn (COD: pending → paid khi giao) |
| `order_status_history` | Nhật ký chuyển trạng thái của đơn |
| `inventory_transactions` | Nhật ký kho: bán, hoàn, nhập, điều chỉnh (`quantity_change` âm / dương) |
| `coupons`, `coupon_usages` | Mã giảm giá (% hoặc cố định, tối thiểu, giảm tối đa, lượt dùng, hiệu lực) và lịch sử dùng |
| `reviews` | Đánh giá 1–5 sao, duy nhất theo (sản phẩm, người dùng, đơn) |
| `wishlists`, `wishlist_items` | Danh sách yêu thích theo tài khoản |
| `subscribers` | Email đăng ký nhận ưu đãi |
| `carts`, `cart_items`, `addresses` | Đã có sẵn trong schema để mở rộng (giỏ hàng hiện lưu ở trình duyệt) |

Quan hệ chính: `users 1—n orders 1—n order_items n—1 products`; `products n—1 categories / brands`, `products 1—n product_images / product_specs / reviews`.

Dữ liệu mẫu: 5 danh mục, 7 thương hiệu, 14 sản phẩm, 7 tài khoản, 15 đơn hàng trải trong 4 tuần gần nhất (để biểu đồ có số liệu), 13 đánh giá, 3 mã giảm giá (`TECH10`, `WELCOME500`, `BLACKFRIDAY`). Thời gian mẫu tính tương đối theo lúc nhập nên luôn "mới".
=======
# Database TECHSTORE

Schema MySQL 8 ở `database/techstore.sql`, InnoDB, `utf8mb4`. Có 19 bảng: `users`, `addresses`, `categories`, `brands`, `products`, `product_images`, `product_specs`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `reviews`, `coupons`, `coupon_usages`, `wishlists`, `wishlist_items`, `inventory_transactions`, `order_status_history`.

Các quan hệ dùng khóa ngoại; email user, slug sản phẩm, mã coupon, wishlist/user và review purchase có ràng buộc unique. Bảng sản phẩm, đơn, user và review có index cho các truy vấn chính. `orders` lưu snapshot địa chỉ, người nhận, subtotal/discount/total, phương thức và trạng thái. `order_items.unit_price` giữ giá mua tại thời điểm checkout.

Checkout khóa hàng sản phẩm `FOR UPDATE`, đọc giá/kho từ DB, tính bằng cents, tạo order/items/payment/history/inventory/coupon usage và giảm tồn kho trong cùng transaction. Hủy đơn hợp lệ khóa đơn, hoàn kho một lần, trả lượt coupon và ghi trạng thái/payment trong cùng transaction. Những lần hủy lặp không hoàn kho lần hai vì trạng thái đã là `cancelled`.

## Khởi tạo và seed an toàn

Compose nạp SQL tự động chỉ trên volume DB mới. Seed `npm run seed -w backend` là idempotent cho dữ liệu demo: dùng `INSERT IGNORE`/upsert, không `TRUNCATE`, không xóa đơn/khách hàng hiện có. Nó thêm 8 danh mục, 6 brand, 6 sản phẩm, 2 coupon và tạo 2 tài khoản demo nếu chưa tồn tại. Seed không cập nhật mật khẩu/tài khoản đã có.

Không xóa volume hay import lại schema vào DB có dữ liệu. Backup trước khi chạy migration thủ công. `docker compose down` giữ volume; `docker compose down -v` xóa dữ liệu MySQL.
>>>>>>> 7af6a08 (Cải thiện giao diện và hoàn thiện các chức năng website TECHSTORE)
