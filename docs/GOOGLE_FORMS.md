# Đặt hàng qua Google Forms và Google Sheets

Trang `/dat-hang` có thể nhúng Google Form để khách gửi đơn. Google Form cần được liên kết với một Google Sheet riêng để nhóm quản lý phản hồi.

## Cấu hình

1. Tạo Google Form với các trường tối thiểu: họ tên, số điện thoại, địa chỉ, sản phẩm, số lượng, phương thức thanh toán và ghi chú.
2. Trong tab **Câu trả lời / Responses** của Google Form, chọn biểu tượng Google Sheets để tạo hoặc liên kết bảng tính. Giữ bảng tính ở chế độ riêng tư cho nhóm quản lý.
3. Công bố biểu mẫu cho người trả lời và sao chép URL công khai kết thúc bằng `/viewform`. Không dùng URL chỉnh sửa của chủ sở hữu.
4. Sao chép `frontend/.env.example` thành `frontend/.env`, rồi gán URL công khai:

   ```dotenv
   VITE_GOOGLE_ORDER_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/viewform
   ```

5. Khởi động lại Vite. Khi phát hành website, cấu hình cùng biến `VITE_GOOGLE_ORDER_FORM_URL` trong môi trường build của máy chủ.

Trang đặt hàng sẽ nhúng form và vẫn hiển thị nút mở form ở tab mới. Khi chưa cấu hình URL, khách hàng có thể dùng giỏ hàng và checkout nội bộ hiện có.

## Thông tin cửa hàng và liên kết tùy chọn

Các biến `VITE_STORE_PHONE`, `VITE_STORE_ADDRESS` và `VITE_SOCIAL_*_URL` điều khiển nội dung trang liên hệ. Thay URL mạng xã hội mẫu bằng hồ sơ thực trước khi công bố website.

Các biến `VITE_PAYMENT_MOMO_URL`, `VITE_PAYMENT_VNPAY_URL` và `VITE_PAYMENT_PAYPAL_URL` chỉ nhận URL thanh toán được nhà cung cấp cấp. Để trống nếu chưa kết nối cổng thanh toán. Giá trị có tiền tố `VITE_` được đưa vào mã frontend công khai; không đặt mật khẩu, khóa API riêng tư hoặc dữ liệu ngân hàng nhạy cảm ở đây.
