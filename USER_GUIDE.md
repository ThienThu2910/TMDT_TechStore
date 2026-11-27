# Hướng dẫn sử dụng TECHSTORE

## Người mua

1. Mở http://localhost:5173, tìm kiếm hoặc duyệt danh mục.
2. Chọn **Thêm vào giỏ**, mở giỏ và điều chỉnh số lượng.
3. Tiến hành thanh toán. Đăng ký/đăng nhập trước khi đặt hàng.
4. Nhập người nhận, số điện thoại, địa chỉ và ghi chú. Có thể kiểm tra coupon ở phần tóm tắt; server sẽ xác thực lại giá, kho và mã khi tạo đơn.
5. Chọn COD hoặc **Thanh toán mô phỏng**. Mô phỏng không chuyển tiền và không kết nối MoMo/VNPay.
6. Sau khi tạo đơn, trang chi tiết cho biết trạng thái, sản phẩm, tổng tiền và lịch sử. Khách có thể hủy khi đơn còn chờ xác nhận/đã xác nhận; hủy sẽ hoàn kho và lượt coupon.
7. Mở **Tài khoản** để xem đơn trước đây và đăng xuất.

Các tài khoản seed dùng cho demo:

- Admin: `admin@techstore.vn` / `Admin123!`
- Khách: `khach@techstore.vn` / `Khach123!`

Đổi mật khẩu demo trước khi chia sẻ website ra ngoài máy local. Không nhập thông tin thẻ/payment thật.

## Quản trị viên

Đăng nhập admin rồi mở http://localhost:5173/admin để xem metrics và biểu đồ; mở http://localhost:5173/admin/orders để tìm đơn và cập nhật trạng thái theo quy tắc. Hủy ở đây chỉ khả dụng khi đơn còn chờ xác nhận/đã xác nhận. Mở http://localhost:5173/admin/products để tạo/sửa sản phẩm, chỉnh giá/tồn kho/thông số, nhập ảnh qua URL hoặc ngừng bán bằng trạng thái “Đã ngừng bán”. Mở http://localhost:5173/admin/customers để tìm khách và khóa/mở khóa tài khoản. CRUD danh mục/brand/coupon/review/kho và xem chi tiết lịch sử khách chưa được triển khai đầy đủ.

## Cấu hình cửa hàng

Thiết lập kết nối MySQL trong `backend/.env` (tạo từ `backend/.env.example`). Các hotline, địa chỉ, Google Form và URL thanh toán tùy chọn nằm trong `frontend/.env` (mẫu tại `frontend/.env.example`). Vite đọc các giá trị này lúc chạy hoặc build. URL thanh toán chỉ là liên kết tùy chọn; chúng không xác nhận thanh toán và không tích hợp webhook.
