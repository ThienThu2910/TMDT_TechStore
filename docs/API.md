# TECHSTORE API

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

Mã lỗi thường gặp: `400` dữ liệu sai · `401` chưa đăng nhập / token hết hạn · `403` không đủ quyền · `409` xung đột (hết hàng, sai luồng trạng thái) · `503` MySQL chưa chạy hoặc chưa có database (kèm hướng dẫn).
