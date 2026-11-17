# TECHSTORE — Tiến độ triển khai

## Giai đoạn 1 — Phân tích môi trường (hoàn thành)

- Workspace rỗng ngoài `.git`; không có source code hoặc dependencies cũ.
- Node 26.13.0, npm 11.20.0, Git 2.56.0; MySQL CLI không có trong PATH.
- Tạo monorepo npm workspace, frontend/backend tách biệt.

## Giai đoạn 2–3 — Kiến trúc, schema, khởi tạo (đã tạo nền tảng)

- REST API Express module controllers/routes/config/middleware.
- MySQL schema 19 bảng với khóa ngoại/index.
- React/Vite responsive storefront và service API.

## Giai đoạn 4–7 — Nghiệp vụ cốt lõi (một phần)

- Đã có đăng ký/đăng nhập JWT, bcrypt, role guards.
- Đã có product listing/detail API và UI.
- Đã có cart frontend, checkout API transaction, coupon validation khi checkout, order history/detail/cancel.
- Đã có dashboard metrics API, order listing/status update.
- Chưa có CRUD quản trị đầy đủ, review, wishlist, persistent cart, address book và uploads.

## Giai đoạn 8–10 — Còn lại

- Hoàn thiện module CRUD admin; review chỉ khách đã mua và hoàn tất được đánh giá.
- Tạo ít nhất 20 sản phẩm và đơn hàng mẫu; seed an toàn/idempotent thay cho reset.
- Tích hợp chart UI, trang lịch sử đơn, so sánh và trạng thái pagination.
- Chạy npm install/build, sửa lỗi; kiểm thử tích hợp trên MySQL 8 thật.
- Môi trường hiện không phát hiện MySQL server/client, nên cần cài/cấu hình MySQL để xác nhận schema, seed và luồng DB end-to-end.
