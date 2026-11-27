# TECHSTORE — trạng thái dự án

> Lưu ý môi trường: ứng dụng hiện chạy React/Vite + Express với MySQL của XAMPP; cần Node.js 20+. Nội dung tính năng bên dưới là ảnh chụp trạng thái ngày 2026-11-25 và chưa được rà soát lại sau khi chuyển cấu hình.

Cập nhật nội dung lịch sử: 2026-11-25.

## Đã hoàn thiện và kiểm chứng

- Compose khởi chạy được frontend, backend và MySQL; DB/backend healthy; API health 200.
- Catalog có sáu sản phẩm mẫu, trang chi tiết, tìm kiếm cơ bản và giỏ hàng phía browser.
- Đăng ký/đăng nhập JWT; auth guard đối chiếu trạng thái/role trong DB.
- Checkout COD/mô phỏng, coupon, giá server-side, kho nguyên tử, order history và hủy đơn có hoàn kho/coupon/payment.
- Account hiển thị lịch sử và đăng xuất; trang order detail hiển thị trạng thái/lịch sử và thao tác hủy.
- Admin dashboard, order list/search/status, CRUD sản phẩm và tìm kiếm/khóa/mở khóa khách hàng; backend bảo vệ role.
- Điều chỉnh tồn kho trong màn hình sản phẩm ghi giao dịch `restock`/`adjustment` cùng transaction; sản phẩm QA được lưu ở trạng thái ngừng bán.
- Google Form/địa chỉ/hotline/social/payment tùy chọn cấu hình qua env.
- Frontend build, 4 unit tests, dependency audit; browser đã đi qua đăng ký, giỏ, coupon, checkout, hủy, product CRUD, khóa/mở khóa khách hàng và admin guard.

## Một phần

- API lọc giá/brand/category và sort popular/price; giao diện chỉ có tìm kiếm, category và hai lựa chọn sort giá.
- Product detail có ảnh/spec/read-only reviews nhưng thiếu gallery đầy đủ, chọn số lượng, mua ngay và sản phẩm liên quan.
- Dashboard có doanh thu, đơn, khách, sản phẩm, hàng sắp hết, đơn chờ và hai biểu đồ tháng; chưa có customer/order detail screens.
- Database có schema cho address, wishlist, cart và review nhưng API/UI quản lý các phần này chưa hoàn thiện.
- Thiết kế responsive đã rà ở 390px, 562px và 1280px; tiếp tục QA trên trình duyệt/thiết bị thực tế.

## Chưa triển khai

Admin CRUD danh mục/brand/coupon/review và màn hình kho/lịch sử tồn riêng; customer order details; profile edit và address book; wishlist; review submission chỉ sau đơn hoàn tất; thanh toán gateway thật; quên mật khẩu; dark mode; newsletter; About/policy/FAQ; pagination/filter nâng cao; ít nhất 20 sản phẩm mẫu; upload ảnh.

## Dữ liệu QA

Một user `qa.techstore.20261125@example.test`, sản phẩm `qa-test-product` (id 13) và hai đơn COD QA đã được tạo trên DB local riêng. Khách hủy đơn #1; admin xác nhận rồi hủy đơn #2. Cả hai hoàn stock/payment đúng, lượt TECH10 trở về 0. User được mở khóa lại; sản phẩm còn 5 chiếc và được lưu là archived. QA xác nhận điều chỉnh tồn kho +1/-1 được ghi vào `inventory_transactions`. Không có dữ liệu bên ngoài hoặc cổng thanh toán thật nào được dùng.
