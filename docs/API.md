# API TECHSTORE

Base URL: `http://localhost:4000/api`. JSON envelope: `{ "success": boolean, "data"?: any, "message"?: string, "meta"?: any }`. Protected endpoints nhận `Authorization: Bearer <JWT>`.

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Không | `{name,email,password}`; role luôn customer |
| POST | `/auth/login` | Không | Trả JWT và user |
| GET | `/auth/me` | Có | Hồ sơ hiện tại |
| GET | `/products?q=&category=&brand=&minPrice=&maxPrice=&sort=&page=&limit=` | Không | Danh sách, lọc, sort và pagination API |
| GET | `/products/:id` | Không | Chi tiết, ảnh, specs, review |
| POST | `/orders` | Customer | Tạo đơn, kiểm tra và cập nhật tồn kho trong transaction |
| GET | `/orders` | Customer | Đơn của người dùng hiện tại |
| GET | `/orders/:id` | Customer | Chi tiết đơn thuộc người dùng hiện tại |
| POST | `/orders/:id/cancel` | Customer | Hủy đơn pending/confirmed và hoàn kho một lần |
| GET | `/admin/dashboard` | Admin | Thống kê và đơn gần đây |
| GET | `/admin/orders` | Admin | Danh sách đơn |
| PATCH | `/admin/orders/:id/status` | Admin | `confirmed`, `shipping`, `delivered`, `completed`, `cancelled` |
| GET | `/health` | Không | Kiểm tra API và kết nối DB |

Checkout body: `{"items":[{"product_id":1,"quantity":1}],"recipient_name":"...","phone":"...","address":"...","payment_method":"COD","coupon_code":"TECH10"}`. Không gửi giá; API lấy giá thực từ database.

## Chưa triển khai

Các endpoints CRUD quản trị, user profile/address, cart DB, wishlist, coupon validation riêng, review creation/moderation, upload, payment provider, API response pagination links và cancellation admin policy refinement chưa tồn tại.
