# TECHSTORE — ghi chú kiến trúc

Cập nhật: 2026-11-27.

Ứng dụng hiện dùng React 19 + Vite cho giao diện, Express/Node.js cho API và MySQL/MariaDB của XAMPP cho dữ liệu. Chạy phát triển bằng `start-xampp.bat` hoặc `npm run dev`; XAMPP cần bật MySQL. Apache không tham gia vào luồng này. Dự án vẫn cần Node.js 20+.

`backend/.env.example` là mẫu cấu hình API và database. `frontend/.env.example` là mẫu các thông tin hiển thị/cấu hình giao diện. Dữ liệu mẫu cùng schema nằm trong `database/techstore.sql`.

Hướng dẫn chạy hiện hành nằm trong [README.md](README.md). Báo cáo kiểm thử ngày 2026-11-25 là ghi nhận lịch sử từ cấu hình cũ và không xác nhận cấu hình XAMPP hiện tại.
