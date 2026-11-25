# TECHSTORE API

<<<<<<< HEAD
Base URL: `http://localhost:5000/api` (khi `npm run dev`, giao diện gọi qua proxy `/api`).
Phản hồi thành công: `{ "success": true, "data": … }` · lỗi: `{ "success": false, "message": "…" }`.
Xác thực: header `Authorization: Bearer <token>` (token trả về khi đăng nhập / đăng ký).
JSON dùng camelCase; tiền tệ là số nguyên VND.

## Công khai
| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/health` | Kiểm tra API + kết nối MySQL |
| GET | `/catalog` | Toàn bộ danh mục, sản phẩm đang bán (kèm ảnh, thông số, điểm đánh giá) và 6 đánh giá mới nhất |
| GET | `/products` | Danh sách lọc phía máy chủ: `q, category, brand, minPrice, maxPrice, sort (price_asc, price_desc, popular, newest), page, limit` |
| GET | `/products/:id` | Chi tiết + `reviewList` |
| POST | `/newsletter` | `{ email }` — lưu email nhận ưu đãi |
| POST | `/auth/register` | `{ name, email, password (≥ 8 ký tự) }` |
| POST | `/auth/login` | `{ email, password }` |

## Cần đăng nhập
| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET / PATCH | `/auth/me` | Xem / sửa `{ name, phone }` |
| POST | `/products/:id/reviews` | `{ rating 1–5, comment }` — chỉ khi đã nhận hàng, mỗi sản phẩm / đơn một lần |
| POST | `/coupons/validate` | `{ code, subtotal }` → `{ code, description, discount }` |
| GET · PUT | `/wishlist` | Xem danh sách mã sản phẩm · gộp `{ ids: [] }` |
| PUT · DELETE | `/wishlist/:productId` | Thêm · bỏ |
| POST | `/orders` | `{ items: [{ productId, qty }], customer, phone, address, note, payment: "COD" \| "SIMULATED", coupon? }` |
| GET | `/orders` · `/orders/:id` | Đơn của chính mình |
| POST | `/orders/:id/cancel` | Hủy đơn đang `pending` / `confirmed` (hoàn kho) |
=======
Base URL: `http://localhost:5000/api`. JSON response thường có dạng `{ "success": true, "data": ..., "meta": ... }`; lỗi trả `success: false` và `message`. Endpoint được bảo vệ nhận `Authorization: Bearer <JWT>`. Token có thời hạn cấu hình ở `JWT_EXPIRES_IN` (mặc định 1 ngày); middleware đọc lại role và trạng thái user từ MySQL.

## Tài khoản và catalog

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Không | `{name,email,password}`; role luôn là customer |
| POST | `/auth/login` | Không | Trả JWT và user; tối đa 10 lần thử mỗi 15 phút theo IP |
| GET | `/auth/me` | Có | Hồ sơ cơ bản |
| GET | `/products?q=&category=&brand=&minPrice=&maxPrice=&sort=&page=&limit=` | Không | Tìm kiếm, lọc cơ bản, sắp xếp và metadata phân trang |
| GET | `/products/:id` | Không | Chi tiết, ảnh, thông số và đánh giá hiển thị |

`sort`: `price_asc`, `price_desc`, `popular`; mặc định ưu tiên sản phẩm nổi bật/mới. `limit` được giới hạn tối đa 100. Catalog UI hiện chưa cung cấp mọi bộ lọc và phân trang API.

## Coupon và đơn hàng

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/coupons/validate` | Có | `{coupon_code,items:[{product_id,quantity}]}`; trả subtotal/discount/total do server tính |
| POST | `/orders` | Có | Tạo đơn và trừ kho trong transaction; giá luôn lấy từ DB |
| GET | `/orders` | Có | Đơn của khách hiện tại |
| GET | `/orders/:id` | Có | Chi tiết, sản phẩm và lịch sử; chỉ chủ đơn xem được |
| POST | `/orders/:id/cancel` | Có | Hủy đơn `pending`/`confirmed`, hoàn kho và lượt coupon trong transaction |

Ví dụ body tạo đơn:

```json
{"items":[{"product_id":1,"quantity":1}],"recipient_name":"Nguyễn Văn An","phone":"0901234567","address":"Cà Mau","note":"Gọi trước khi giao","payment_method":"COD","coupon_code":"TECH10"}
```

Phương thức hiện hỗ trợ `COD` và `SIMULATED`. `SIMULATED` chỉ là trạng thái trình diễn, không phải giao dịch hoặc tích hợp cổng thật. Coupon kiểm tra thời hạn, ngưỡng đơn, số lượt và giới hạn giảm; giảm giá không vượt subtotal. Checkout khóa dòng sản phẩm và kiểm tra lại số lượng tồn.

## Admin và health

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/admin/dashboard` | Admin | Doanh thu, đơn, khách, sản phẩm, tồn thấp, doanh thu theo tháng và đơn mới |
| GET | `/admin/products/meta` | Admin | Danh mục và thương hiệu để nhập sản phẩm |
| GET | `/admin/products?q=&page=&limit=` | Admin | Tìm kiếm và phân trang sản phẩm quản trị |
| GET | `/admin/products/:id` | Admin | Chi tiết sản phẩm, ảnh và thông số |
| POST | `/admin/products` | Admin | Tạo sản phẩm, ảnh chính qua URL và thông số |
| PATCH | `/admin/products/:id` | Admin | Sửa thông tin/giá/tồn kho; dùng `archived` để ngừng bán |
| GET | `/admin/customers?q=` | Admin | Tìm danh sách khách và tổng hợp số đơn/doanh thu đã giao |
| PATCH | `/admin/customers/:id/status` | Admin | Khóa hoặc mở khóa tài khoản customer |
| GET | `/admin/orders` | Admin | Tối đa 200 đơn mới nhất |
| PATCH | `/admin/orders/:id/status` | Admin | Cập nhật trạng thái theo state machine; hủy đơn hoàn kho và cập nhật payment/history |
| GET | `/health` | Không | Kiểm tra kết nối MySQL |

Chuyển trạng thái hợp lệ: `pending → confirmed → shipping → delivered → completed`; chỉ `pending` hoặc `confirmed` có thể chuyển sang `cancelled`. Backend kiểm tra quyền cho mọi endpoint admin.
>>>>>>> 7af6a08 (Cải thiện giao diện và hoàn thiện các chức năng website TECHSTORE)

## Quản trị (`role = admin`)
| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/admin/dashboard` | KPI, doanh thu 7 ngày / 4 tuần, số đơn theo trạng thái, 5 đơn gần nhất |
| GET | `/admin/orders` | Tất cả đơn (tối đa 500, mới nhất trước) |
| PATCH | `/admin/orders/:id/status` | `{ status }` theo luồng: pending → confirmed → shipping → delivered; pending / confirmed → cancelled |
| GET · POST | `/admin/products` | Danh sách (cả bản nháp / ngừng bán) + danh mục + thương hiệu · tạo sản phẩm |
| PUT · DELETE | `/admin/products/:id` | Sửa · ngừng bán (không xóa cứng) |
| GET | `/admin/customers` | Khách hàng + số đơn + đã chi tiêu |
| PATCH | `/admin/customers/:id` | `{ status: "active" \| "locked" }` |
| GET · POST | `/admin/coupons` | Danh sách · tạo `{ code, type, value, minOrder, maxDiscount, limit, days, description }` |
| PATCH | `/admin/coupons/:id` | `{ status: "active" \| "inactive" }` |

<<<<<<< HEAD
Mã lỗi thường gặp: `400` dữ liệu sai · `401` chưa đăng nhập / token hết hạn · `403` không đủ quyền · `409` xung đột (hết hàng, sai luồng trạng thái) · `503` MySQL chưa chạy hoặc chưa có database (kèm hướng dẫn).
=======
Product admin payload gồm `name`, `slug` (tùy chọn), `description`, `category_id`, `brand_id`, `price`, `original_price`, `stock`, `status` (`active`, `draft`, `archived`), `is_featured`, `image_url` và `specifications:[{name,value}]`. Ảnh hiện nhập qua URL; chưa có upload file. Cập nhật thay thế bộ thông số kỹ thuật.

Chưa có CRUD admin cho danh mục/brand/coupon/review/kho hoặc customer order detail; không có sửa profile/địa chỉ, wishlist, cart server-side, tạo review, upload, quên mật khẩu hoặc payment gateway. Đây là giới hạn của phiên bản hiện tại.
>>>>>>> 7af6a08 (Cải thiện giao diện và hoàn thiện các chức năng website TECHSTORE)
