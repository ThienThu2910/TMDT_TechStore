# TECHSTORE — Online Technology Store

Ứng dụng thương mại điện tử thiết bị công nghệ gồm frontend React/Vite và REST API Express/MySQL. Kho mã hiện đã có giao diện cửa hàng responsive, luồng duyệt sản phẩm, giỏ hàng, xác thực, đặt/hủy đơn hàng có transaction và dashboard quản trị cơ bản.

## Công nghệ

- Frontend: React 18, Vite, React Router, Axios, Bootstrap 5, Lucide, Chart.js dependency.
- Backend: Node.js, Express, JWT, bcrypt, express-validator, MySQL2, Helmet, rate limit.
- Database: MySQL 8, InnoDB, schema và seed.

## Chạy bằng Docker Compose (Windows PowerShell)

Cần Docker Desktop đang chạy và Docker Compose v2. Từ thư mục gốc dự án:

```powershell
Copy-Item .env.example .env
notepad .env
```

Đổi `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` và `JWT_SECRET` trong `.env` thành giá trị riêng. `DB_PASSWORD` phải giống `MYSQL_PASSWORD`. Compose bắt buộc các giá trị này nên sẽ báo lỗi nếu chưa cấu hình.

```powershell
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Kiểm tra API và kết nối DB: http://localhost:5000/api/health
- MySQL: `localhost:3306`, database `techstore_db`; đăng nhập bằng `MYSQL_USER` và `MYSQL_PASSWORD` trong `.env`.

Compose tự mount `database/techstore.sql` vào cơ chế init của MySQL. SQL chỉ chạy khi named volume database được tạo lần đầu và còn rỗng. Dữ liệu sau đó được lưu trong volume `techstore_mysql_data`, không bị ghi đè khi restart hoặc rebuild. Backend chờ healthcheck của MySQL; Vite chạy `0.0.0.0` trong container nhưng gọi API qua `http://localhost:5000/api` trên trình duyệt máy host. Frontend và backend bind-mount source code để thuận tiện phát triển.

```powershell
# Theo dõi log riêng
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f frontend

# Restart các service
docker compose restart

# Dừng và xóa container/network (giữ database volume)
docker compose down
```

`docker compose down -v` sẽ xóa named volume MySQL và có thể làm mất toàn bộ dữ liệu database. Chỉ dùng khi chủ động muốn xóa sạch dữ liệu demo. Compose không chạy seed tự động. Seed hiện tại dùng `TRUNCATE` các bảng; chỉ chạy trên dữ liệu demo mới hoặc sau khi đã backup, tuyệt đối không chạy trên database cần giữ:

```powershell
docker compose exec backend npm run seed
```

Có thể kết nối bằng MySQL Workbench tới `127.0.0.1:3306` với thông tin trong `.env`. Chưa cấu hình phpMyAdmin.

### Import và backup database an toàn

Import schema thủ công chỉ cần thiết nếu volume đã được khởi tạo trước khi schema được thêm/cập nhật. Không import schema lần nữa lên DB có dữ liệu. Trước khi thay đổi database hiện có, tạo backup:

```powershell
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > techstore-backup.sql
```

Với volume DB mới, file `database/techstore.sql` đã được import tự động. Nếu cần phục hồi, dùng MySQL Workbench hoặc nhập file backup vào database đã chuẩn bị sau khi dừng thao tác ghi.

### Xử lý lỗi thường gặp

- Compose yêu cầu biến môi trường: kiểm tra đã copy `.env.example` thành `.env`, không để trống biến bắt buộc và chạy lệnh từ thư mục gốc.
- Cổng 3306/5000/5173 đang được dùng: dừng ứng dụng đang giữ cổng hoặc đổi vế trái của port mapping trong `docker-compose.yml` (API URL phải trùng cổng host mới).
- Backend chưa healthy: xem `docker compose logs -f db backend`; kiểm tra thông tin DB trong `.env` và chờ MySQL hoàn tất lần khởi tạo đầu tiên.
- Đã có volume cũ, schema mới không được áp dụng: init SQL không chạy lại trên volume có dữ liệu. Backup trước, sau đó áp dụng migration có chủ đích; không dùng `down -v` nếu muốn giữ dữ liệu.
- Frontend không gọi API: kiểm tra `VITE_API_URL=http://localhost:5000/api`, sau đó rebuild frontend bằng `docker compose build frontend` và `docker compose up -d frontend`.
- bcrypt build lỗi: xem log build. Image dựa trên `node:22-alpine` cài dependency trong container; đảm bảo Docker Desktop có mạng để tải npm packages.

### Chạy cục bộ không Docker

Yêu cầu Node.js 20+, npm 10+ và MySQL 8. Tạo DB bằng `database/techstore.sql`, cấu hình `backend/.env` theo `backend/.env.example` (DB_HOST là `localhost`, PORT có thể để 5000), rồi chạy:

```powershell
npm install
npm run seed -w backend
npm run dev
```

Frontend tại http://localhost:5173, API tại http://localhost:5000/api. Build frontend: `npm run build`.

## Tài khoản demo

- Admin: `admin@techstore.vn` / `Admin123!`
- Khách hàng: `khach@techstore.vn` / `Khach123!`
- Mã giảm giá seed: `TECH10`, `WELCOME500`

Tài khoản và mật khẩu demo được tạo bởi seed dành cho môi trường trình bày; hãy đổi thông tin trước khi triển khai thật. Không dùng JWT secret mẫu trong môi trường thực.

## Chức năng hiện có

- Cửa hàng responsive, danh mục, tìm kiếm/lọc cơ bản, chi tiết sản phẩm, giá/đánh giá từ API.
- Giỏ hàng phía trình duyệt, cập nhật số lượng và tổng tiền.
- Đăng ký/đăng nhập JWT, role customer/admin, mật khẩu bcrypt.
- Checkout COD/mô phỏng; API tính lại giá, kiểm tra kho và coupon, lưu snapshot giá, payment, lịch sử và trừ kho nguyên tử trong transaction.
- Xem/hủy đơn của chính khách hàng; hoàn kho trong transaction khi hủy hợp lệ.
- Admin dashboard API, danh sách đơn và cập nhật trạng thái qua API.
- SQL schema chứa 19 bảng nghiệp vụ, index, khóa ngoại và dữ liệu seed cơ bản.

## Cấu trúc

```text
frontend/src/{components,pages,layouts,services,context}
backend/src/{config,controllers,middlewares,routes,utils}
database/techstore.sql
docs/{API,DATABASE,PROJECT_PLAN}.md
```

## Tiến độ và giới hạn hiện tại

Đây là nền tảng chạy được và các luồng đầu tiên, chưa phải toàn bộ phạm vi trong master brief. Admin CRUD sản phẩm/danh mục/thương hiệu/khách hàng/coupon/review, địa chỉ tài khoản, wishlist, review API, upload Multer, cart được lưu DB, so sánh, pagination UI, dashboard biểu đồ Chart.js, và seed 20 sản phẩm/đơn hàng mẫu còn trong backlog. Cần chạy schema và seed trên MySQL cài tại máy trước khi API hoạt động; môi trường hiện tại không có lệnh `mysql` sẵn có.
