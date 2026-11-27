# TECHSTORE — cửa hàng thiết bị công nghệ

Đồ án thương mại điện tử với giao diện React, API Express và cơ sở dữ liệu MySQL/MariaDB. XAMPP cung cấp MySQL và phpMyAdmin; Node.js chạy giao diện phát triển và API. **Cần cài Node.js 20+ và XAMPP.**

| Thành phần | Công nghệ |
|---|---|
| Giao diện | React 19, Vite, Tailwind CSS 4, React Router, Chart.js |
| API | Node.js, Express, JWT, bcryptjs |
| Cơ sở dữ liệu | MySQL/MariaDB của XAMPP, quản lý bằng phpMyAdmin |

## Chạy trên Windows

1. Mở XAMPP Control Panel và bấm **Start** ở dòng **MySQL**. Apache không cần bật khi chạy chế độ phát triển.
2. Chạy `start-xampp.bat`. Lần đầu, script cài các gói Node.js và tạo database `techstore_db` cùng dữ liệu mẫu.
3. Mở `http://localhost:5173`.

Hoặc chạy thủ công tại thư mục dự án:

```powershell
Copy-Item backend/.env.example backend/.env  # chỉ cần làm lần đầu
npm install
npm run db:setup
npm run dev
```

Vite chạy giao diện ở cổng `5173` và chuyển các yêu cầu `/api` tới Express ở cổng `5000`.

### Nạp database bằng phpMyAdmin

Mở `http://localhost/phpmyadmin` → **Import/Nhập** → chọn `database/techstore.sql` → **Thực hiện**. Không cần chạy `npm run db:setup` nếu đã nhập file SQL.

### Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | `admin@techstore.vn` | `Admin123!` |
| Khách hàng | `khach@techstore.vn` | `Khach123!` |

## Cấu hình

Thiết lập kết nối database trong `backend/.env`. Mặc định tương thích với XAMPP mới cài:

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=techstore_db
PORT=5000
JWT_SECRET=doi-chuoi-nay-thanh-mot-chuoi-ngau-nhien-dai-tren-32-ky-tu
```

Nếu đã đặt mật khẩu cho MySQL `root` hoặc đổi cổng MySQL trong XAMPP, cập nhật `DB_PASSWORD` hoặc `DB_PORT` tương ứng. `start-xampp.bat` tạo `backend/.env` từ mẫu khi chưa có.

Thông tin cửa hàng và liên kết thanh toán tùy chọn nằm trong `frontend/.env` (mẫu tại `frontend/.env.example`). Vite đọc các giá trị này lúc chạy hoặc build.

## Chạy bản build

```powershell
npm run build
npm start
```

Express phục vụ giao diện đã build và API tại `http://localhost:5000`. Đây là cách chạy bản build cục bộ; chế độ phát triển dùng `npm run dev`.

## Xử lý sự cố

| Vấn đề | Cách xử lý |
|---|---|
| Không kết nối được MySQL | Bật MySQL trong XAMPP, rồi kiểm tra `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` trong `backend/.env`. |
| `ER_ACCESS_DENIED_ERROR` | Kiểm tra tài khoản hoặc mật khẩu MySQL. XAMPP thường dùng `root` không mật khẩu. |
| `ECONNREFUSED` | MySQL chưa chạy hoặc đang dùng cổng khác; đồng bộ cổng trong `my.ini` và `backend/.env`. |
| Chưa có database hoặc bảng | Chạy `npm run db:setup` hoặc nhập `database/techstore.sql` trong phpMyAdmin. |
| Muốn tạo lại dữ liệu từ đầu | Chạy `npm run db:reset`; lệnh sẽ yêu cầu xác nhận và xóa database `techstore_db`. |
| Ảnh sản phẩm không hiện | Ảnh mẫu lấy từ Unsplash nên cần Internet. Ảnh tự thêm có thể dùng URL HTTPS. |

## Cấu trúc

```text
start-xampp.bat       khởi động chế độ phát triển trên Windows
database/techstore.sql schema và dữ liệu mẫu cho MySQL/MariaDB
backend/              Express API, database setup và cấu hình
frontend/             ứng dụng React/Vite
docs/API.md            danh sách API
docs/DATABASE.md       mô tả schema
```

Tài liệu: [API](docs/API.md) · [Database](docs/DATABASE.md) · [Hướng dẫn sử dụng](USER_GUIDE.md).

## Ghi chú

- Giá, tồn kho, coupon và trạng thái đơn được xác thực ở backend; tạo và hủy đơn cập nhật dữ liệu trong transaction.
- Đơn hàng yêu cầu khách đăng nhập. Giỏ của khách chưa đăng nhập được lưu trên trình duyệt.
- Sản phẩm ngừng bán được lưu lại để giữ lịch sử đơn hàng và nhật ký kho.
- Phương thức thanh toán mô phỏng không kết nối cổng thanh toán thật.
