# TECHSTORE — kế hoạch và mốc triển khai

Cập nhật: 2026-11-25. Active application root: workspace `TMDT_TechStore/` (React/Vite JavaScript + Express/MySQL + Docker Compose). Một repository React/TypeScript/XAMPP lồng bên trong được giữ nguyên và không dùng để chạy stack active.

## Đã hoàn thành

- Compose stack và schema/seed MySQL; seed demo idempotent.
- Storefront/catalog, tìm kiếm cơ bản, chi tiết sản phẩm và giỏ client-side.
- Đăng ký/đăng nhập, role guard, checkout COD/mô phỏng, coupon, order history/detail/cancel.
- Giá và stock kiểm tra ở backend; create/cancel transaction ghi payment, inventory và status history.
- Admin dashboard metrics/chart, danh sách/tìm kiếm đơn, cập nhật trạng thái.
- Trang đặt hàng Google Form tùy chọn, thanh toán thông tin, liên hệ; cấu hình qua env.
- Cải thiện security dependency audit, order validation, authorization và responsive CSS.

## Còn trong backlog

1. CRUD danh mục/brand/coupon/review/inventory, lịch sử khách/chi tiết đơn và báo cáo sâu hơn.
2. Profile edit, address book, wishlist, persistent cart, quên mật khẩu.
3. Review submit chỉ sau khi giao/hoàn tất, rating UI, moderation.
4. Catalog filter/sort/pagination UI; related products, quantity control, buy now.
5. Dark mode, newsletter, About/FAQ/policy pages và upload.
6. Cổng thanh toán thử nghiệm thật, webhook và kiểm thử end-to-end provider.
7. Mở rộng seed ít nhất 20 sản phẩm có thông số và nội dung đồng nhất.
8. Hardening production: cookie HttpOnly/CSRF/CSP, logging/monitoring, backup/restore drill, load/accessibility QA.

Xem [PROJECT_STATUS.md](../PROJECT_STATUS.md) và [TEST_REPORT.md](../TEST_REPORT.md) để biết phạm vi đã xác minh.