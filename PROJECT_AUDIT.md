# TECHSTORE project audit

Ngày rà soát: 2026-11-25. Active root là thư mục workspace này, Git root nhánh `main`, ứng dụng JavaScript/Vite + Express/MySQL chạy qua Compose. Có repo thứ hai lồng trong `TMDT_TechStore/TMDT_TechStore/` với React 19/TypeScript và hướng dẫn XAMPP; repo lồng được giữ nguyên, không xóa hay sửa.

## Kiến trúc

- Frontend: React 18, React Router 7, Vite 6, Axios, Bootstrap, Lucide.
- Backend: Node.js 22 trong container, Express 4, JWT, bcryptjs, MySQL2, Helmet, express-validator, rate-limit.
- Database: MySQL 8; schema 19 bảng, foreign key, index và seed demo.
- Compose: frontend `5173`, API `5000`, MySQL `3306`; source được bind mount, dependencies dùng named volume.
- Cấu hình local `.env` là file ignored; `.env.example` có mẫu không chứa secret thật.

## Trạng thái runtime

Đã khởi chạy đúng root Compose; DB và backend healthy, frontend hoạt động trên `localhost:5173`; `/api/health` thành công và API trả sáu sản phẩm. Dữ liệu khởi tạo bằng seed idempotent trên named volume riêng của TECHSTORE. Một container MySQL bên ngoài dự án ở cổng 3307 và volume của dự án khác được giữ nguyên.

## Đã có

- Trang cửa hàng, tìm kiếm/danh mục cơ bản, sản phẩm và trang chi tiết, giỏ client-side.
- Đăng ký/đăng nhập, JWT role guard, rate limit cho auth.
- Checkout COD/mô phỏng; giá, kho, coupon tính/kiểm tra ở backend; tạo order/payment/history/inventory trong transaction.
- Khách xem lịch sử/chi tiết đơn và hủy đơn hợp lệ; stock/coupon được hoàn trong transaction.
- Admin dashboard có metrics/2 biểu đồ; giao diện quản lý, tìm kiếm và cập nhật trạng thái đơn gọi API được bảo vệ.
- Trang thông tin đặt hàng, thanh toán và liên hệ; Google Form/payment/social links được cấu hình qua env, chưa có URL thật.
- Tài liệu README, API, database, audit, status, user guide và test report.

## Lỗi ban đầu đã xử lý

- Tài liệu API sai cổng 4000; Compose/backend thực tế dùng 5000.
- Seed cũ có nguy cơ xóa dữ liệu; đã đổi sang upsert idempotent giữ nguyên dữ liệu khách/đơn.
- Order API không gộp dòng trùng, thiếu kiểm tra payment/note, không tính tiền an toàn, không kiểm tra affected rows, và hủy không hoàn coupon/payment nhất quán; đã sửa.
- Admin chưa chặn chuyển trạng thái sai; đã thêm state machine và transaction hủy dùng chung.
- Auth từng tin role trong JWT; hiện kiểm tra user active/role từ DB mỗi request.
- Thiếu giới hạn riêng cho login/register; đã thêm limit 10 lần/15 phút.
- Checkout cũ không yêu cầu login, không có coupon validation UI, ghi chú không được giữ; checkout mới đã nối API và yêu cầu xác thực.
- Account không có lịch sử/đăng xuất; đã bổ sung. Order detail hiển thị items, người nhận, trạng thái và cho hủy khi hợp lệ.
- Hero ở breakpoint tablet bị đè chữ/ảnh; đã thêm điều chỉnh CSS 561–800px và mobile.
- Dependency audit ban đầu có lỗ hổng; thay native `bcrypt` bằng `bcryptjs`, nâng React Router lên 7.18.7. Audit hiện tại đã báo không còn vulnerability theo lệnh npm.

## Vấn đề còn lại

- UI catalog chưa có mọi bộ lọc thương hiệu/giá/tồn kho, sort mới/popular đầy đủ và pagination controls dù API hỗ trợ một phần.
- Product detail chưa có quantity/mua ngay/related products; review API chỉ đọc, chưa có gửi review.
- Không có profile editing/address book, wishlist hoạt động, quên mật khẩu hoặc persistent cart.
- Admin có dashboard, order list/status, CRUD sản phẩm, customer search/lock/unlock. Chưa có CRUD brand, category, coupon, review, inventory view. Customer access `/admin` bị backend trả 403 và UI hiển thị trang từ chối.
- Chưa có dark mode, newsletter, đầy đủ About/FAQ/policy pages; không có gateway thanh toán thật.
- Seed chỉ có sáu sản phẩm với nội dung demo rút gọn; cần bổ sung dữ liệu nếu yêu cầu tối thiểu 20 sản phẩm.
- JWT đặt trong localStorage; cần cân nhắc cookie HttpOnly khi triển khai thật và bổ sung CSRF/CSP/deployment hardening.
- Multer đang ở nhánh 1.x và npm hiện cảnh báo deprecated; chưa dùng upload trong API.
- Thông tin cửa hàng, Google Form và link thanh toán thật chưa được cung cấp; cấu hình hiện là placeholder/demo.

## Kiểm thử

Kết quả xác minh cuối ở [TEST_REPORT.md](TEST_REPORT.md). Không thực hiện xóa DB/volume; test đặt đơn dùng tài khoản QA local và đã hủy đơn để hoàn kho.