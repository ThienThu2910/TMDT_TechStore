# TECHSTORE — web bán hàng thiết bị công nghệ

Đồ án môn Thương mại điện tử. Giao diện React (thiết kế Figma "Dark Tech Editorial", có chế độ sáng/tối), backend Express, dữ liệu lưu trong **MySQL của XAMPP** (không còn Docker).

| Thành phần | Công nghệ |
|---|---|
| Giao diện | React 19 · Vite · Tailwind CSS v4 · React Router · Chart.js |
| API | Node.js · Express · JWT · bcryptjs |
| Cơ sở dữ liệu | MySQL / MariaDB trong XAMPP (quản lý bằng phpMyAdmin) |

## Chức năng

**Khách hàng**: trang chủ động (hero, danh mục, so sánh, đánh giá thật) · danh sách sản phẩm có tìm kiếm không dấu, lọc theo danh mục / thương hiệu / giá / còn hàng / đang giảm, sắp xếp, phân trang · chi tiết sản phẩm (thư viện ảnh, thông số, sản phẩm liên quan, **đánh giá sau khi mua**) · giỏ hàng + mini-cart · yêu thích (đồng bộ vào tài khoản) · đăng ký / đăng nhập · thanh toán có **mã giảm giá**, COD hoặc chuyển khoản mô phỏng · lịch sử, chi tiết và **hủy đơn** · command palette `Ctrl K`.

**Quản trị** (`/admin`): tổng quan doanh thu (biểu đồ 7 ngày / 4 tuần, trạng thái đơn) · quản lý đơn hàng theo luồng *chờ xác nhận → đã xác nhận → đang giao → đã giao* · **thêm / sửa / ngừng bán sản phẩm** (có ghi nhật ký kho) · khách hàng (khóa / mở khóa) · mã giảm giá.

**Giao diện**: sáng/tối có hiệu ứng lan tròn (theo hệ điều hành nếu chưa chọn) · chuyển trang bằng View Transitions (ảnh sản phẩm "bay" sang trang chi tiết, header đứng yên) · gợn sóng khi bấm nút · hiệu ứng bay vào giỏ, pháo giấy khi đặt hàng, tim nở khi yêu thích · tôn trọng `prefers-reduced-motion` · dùng được bằng bàn phím.

## Chạy với XAMPP (Windows)

1. Cài **Node.js 20+** (bản LTS) tại https://nodejs.org và **XAMPP**.
2. Mở **XAMPP Control Panel** → bấm **Start** ở dòng **MySQL** (không cần bật Apache).
3. Chạy file **`start-xampp.bat`** (nhấp đúp). File này sẽ: kiểm tra MySQL → `npm install` lần đầu → tạo database + dữ liệu mẫu → mở `http://localhost:5173`.

Hoặc làm tay trong terminal tại thư mục dự án:

```bash
npm install
npm run db:setup     # tạo database techstore_db + bảng + dữ liệu mẫu (chạy lại nhiều lần vẫn an toàn)
npm run dev          # giao diện http://localhost:5173 , API http://localhost:5000
```

### Cách khác để nạp dữ liệu: phpMyAdmin
Mở `http://localhost/phpmyadmin` → tab **Nhập (Import)** → chọn `database/techstore.sql` → **Thực hiện**. Sau đó xem toàn bộ dữ liệu ở database `techstore_db`.

### Tài khoản demo
| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | `admin@techstore.vn` | `Admin123!` |
| Khách hàng | `khach@techstore.vn` | `Khach123!` |

### Chạy một cổng (giống bản triển khai)
```bash
npm run build && npm start      # mở http://localhost:5000 — Express phục vụ luôn giao diện đã build
```

## Cấu hình
`backend/.env` (đã có sẵn, mặc định khớp XAMPP vừa cài):

```
DB_HOST=127.0.0.1   DB_PORT=3306   DB_USER=root   DB_PASSWORD=   DB_NAME=techstore_db
PORT=5000           JWT_SECRET=...  (đổi thành chuỗi ngẫu nhiên khi đưa lên môi trường thật)
```
Nếu bạn đã đặt mật khẩu cho `root` trong XAMPP, điền vào `DB_PASSWORD`.

## Xử lý sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Trang hiện "Chưa kết nối được dữ liệu cửa hàng" | MySQL chưa bật (Start trong XAMPP) hoặc chưa nhập database. Làm theo 3 bước ngay trên màn hình đó. |
| `ECONNREFUSED` khi `db:setup` | MySQL chưa chạy, hoặc XAMPP dùng cổng khác 3306 → sửa `DB_PORT`. |
| `ER_ACCESS_DENIED_ERROR` | Sai `DB_USER` / `DB_PASSWORD` trong `backend/.env`. |
| MySQL trong XAMPP không Start được | Cổng 3306 đang bị MySQL khác chiếm (ví dụ MySQL Server cài riêng). Tắt dịch vụ đó hoặc đổi cổng trong `my.ini` của XAMPP rồi sửa `DB_PORT`. |
| Muốn xóa sạch dữ liệu làm lại | `npm run db:reset` (hỏi xác nhận) hoặc Drop database `techstore_db` trong phpMyAdmin rồi nhập lại. |
| Ảnh sản phẩm không hiện | Ảnh mẫu lấy từ Unsplash nên cần Internet; ảnh sản phẩm tự thêm có thể dùng bất kỳ link `http(s)://` hoặc `/đường-dẫn`. |

## Cấu trúc thư mục

```
techstore/
├─ start-xampp.bat          chạy nhanh trên Windows
├─ database/techstore.sql   cấu trúc bảng + dữ liệu mẫu (nhập bằng phpMyAdmin hoặc npm run db:setup)
├─ backend/                 Express API  (src/controllers, services, routes, middlewares; scripts/setup-db.js)
├─ frontend/                giao diện React (src/pages, components.tsx, store.tsx, api.ts, index.css)
└─ docs/                    API.md, DATABASE.md
```

Tài liệu thêm: [`docs/API.md`](docs/API.md) · [`docs/DATABASE.md`](docs/DATABASE.md).

## Ghi chú thiết kế

- **Giá và tồn kho luôn do máy chủ quyết định**: khi đặt hàng, backend đọc lại giá từ MySQL, khóa dòng sản phẩm (`SELECT … FOR UPDATE`) trong một transaction nên hai người mua cùng lúc không thể bán vượt tồn kho. Hủy đơn tự hoàn kho và trả lại lượt dùng mã giảm giá.
- Đơn hàng gắn với tài khoản (cần đăng nhập để thanh toán); giỏ hàng của khách vãng lai lưu trong trình duyệt và được giữ nguyên sau khi đăng nhập.
- Doanh thu trên trang quản trị chỉ tính đơn **đã giao**. Sản phẩm không xóa cứng mà chuyển sang "ngừng bán" để giữ lịch sử đơn hàng và kho.
- Dùng `bcryptjs` (thuần JavaScript) thay cho `bcrypt` để cài trên Windows không cần công cụ biên dịch.
