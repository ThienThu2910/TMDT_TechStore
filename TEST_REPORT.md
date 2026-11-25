# TECHSTORE — Báo cáo kiểm thử QA

Ngày kiểm thử: 2026-11-25  
Môi trường: website tại http://localhost:5173, API tại http://localhost:5000/api, Docker Compose + MySQL 8. Kiểm thử mua hàng dùng dữ liệu tổng hợp và COD local; không dùng cổng thanh toán thật hoặc dữ liệu khách hàng thật.

## Kết quả tổng quan

| Hạng mục | Kết quả có bằng chứng |
|---|---|
| Frontend production build | Đạt — Vite build thành công |
| Backend tests | Đạt — 4/4 tests |
| Docker Compose config | Đạt — config hợp lệ |
| MySQL/backend | Đạt — cả hai container báo healthy sau khi restart frontend/backend |
| GET /api/health | Đạt — trình duyệt nhận JSON success=true |
| GET /api/products?limit=20&sort=popular | Đạt — 6 sản phẩm; API trả sales_count, rating=0 và review_count=0 |
| Browser console | Không có warning/error được ghi nhận ở lần đọc cuối |
| Kiểm thử giao diện thực tế | Đã thực hiện trên trình duyệt, gồm khách hàng, quản trị, responsive |

## Chức năng đã kiểm tra

| Trang/luồng | Thao tác và kết quả |
|---|---|
| Trang chủ / | Kiểm tra banner, nhóm danh mục, sản phẩm, liên kết điều hướng và nội dung ưu đãi. Sau sửa, mức ưu đãi hiển thị 12%, khớp mức giảm tối đa trong catalog đang hoạt động. |
| Catalog /products | Mở danh mục Laptop; tìm iPhone và Dell; kiểm tra sắp xếp giá tăng dần; kiểm tra sort=popular; kiểm tra trang sale=true. |
| Chi tiết /product/1 | Mở sản phẩm, kiểm tra giá, trạng thái chưa có đánh giá và thêm vào giỏ. |
| Giỏ hàng /cart | Thêm sản phẩm, kiểm tra tổng tiền; tăng/giảm số lượng; xóa sản phẩm; cuối cùng giỏ thử nghiệm được dọn trống. Accessible tree xác nhận tên nút tăng, giảm và xóa. |
| Tài khoản /account | Đăng ký tài khoản QA tổng hợp, đăng nhập và đăng xuất; đăng nhập Admin để kiểm tra quyền. Màn hình đăng nhập sau sửa không còn in thông tin đăng nhập mẫu. |
| Checkout /checkout | Kiểm tra mã coupon sai và TECH10; tạo đơn COD local #3 với subtotal 25.990.000₫, giảm 2.599.000₫, tổng 23.391.000₫. Trang chi tiết đơn hiển thị sản phẩm, số lượng, người nhận, trạng thái và tổng. |
| Quyền truy cập đơn hàng | Khách thường truy cập /admin bị từ chối; kiểm tra khách không xem được đơn của tài khoản khác. |
| Admin /admin | Đăng nhập, đọc metrics và đơn gần đây; xác nhận trạng thái rỗng doanh thu hiện thông báo thay vì vùng biểu đồ trắng. |
| Admin /admin/orders | Mở danh sách đơn; chuyển đơn thử nghiệm pending → confirmed → cancelled; giao diện báo trạng thái mới. |
| Admin /admin/products | Tìm sản phẩm QA, tạo và sửa sản phẩm, điều chỉnh tồn kho rồi hoàn nguyên, lưu trạng thái ngừng bán. Sản phẩm thử id 13 được khôi phục archived, giá 89.000₫, giá niêm yết 129.000₫, tồn kho 5. |
| Admin /admin/customers | Tìm tài khoản QA, khóa rồi mở khóa; trạng thái cuối active. |
| Trang thông tin | Mở /dat-hang, /thanh-toan, /lien-he và đường dẫn không tồn tại. Form Google chưa cấu hình có trang thông báo và đường dẫn checkout dự phòng; COD hoạt động, MoMo/VNPay/PayPal hiển thị chưa cấu hình; trang 404 hoạt động. |
| Responsive | Thử các viewport 320, 390, 562, 768, 1280 và 1440 px. Không thấy tràn ngang toàn trang; trên mobile menu hoạt động, bảng admin cuộn trong khung riêng. |

## Lỗi tìm thấy, đã sửa và kiểm tra lại

| Trang và thao tác tái hiện | Nguyên nhân | Sửa trong mã nguồn | Kiểm tra lại |
|---|---|---|---|
| Catalog và chi tiết sản phẩm: mở sản phẩm chưa có review | UI dùng giá trị mặc định 4.8 sao/24 lượt khi API trả rating/count bằng 0. | frontend/src/App.jsx: dùng dữ liệu review thực; hiện “Chưa có đánh giá” khi count bằng 0. | Catalog và /product/1 đều hiển thị “Chưa có đánh giá”; API trả rating=0, review_count=0. |
| /products?sale=true: mở mục Săn deal hot khi có sản phẩm giá thường | Query sale=true không được áp dụng làm điều kiện lọc. | frontend/src/App.jsx: lọc danh sách theo original_price > price. | Khi sản phẩm QA đang hoạt động ở giá thường 89.000₫, nó không xuất hiện trong kết quả sale; sau đó sản phẩm đã được lưu lại ở trạng thái archived. |
| /products?sort=popular: mở link sản phẩm phổ biến | State sắp xếp không khởi tạo từ query; dropdown thiếu lựa chọn phổ biến và API list không trả sales_count. | Đồng bộ dropdown với URL, thêm lựa chọn phổ biến; backend/src/controllers/productController.js trả sales_count. | URL giữ sort=popular, dropdown chọn Phổ biến; API trả sales_count; sort=price_asc chọn đúng và Sony WH-1000XM5 đứng đầu. |
| Trang chủ: so ưu đãi quảng cáo với mức giảm thật | Mức lên đến 30% bị hard-code trong khi catalog hiện tại cao nhất 12%. | frontend/src/App.jsx: tính mức giảm tối đa từ dữ liệu sản phẩm đang hiển thị. | Trang chủ hiện lên đến 12% và 12%. |
| /admin: không có đơn hoàn tất tạo vùng biểu đồ doanh thu trống | Không có trạng thái rỗng khi API không trả dữ liệu doanh thu theo tháng. | frontend/src/App.jsx và frontend/src/styles.css: thêm empty state dễ nhận biết. | Dashboard hiển thị thông báo chưa có doanh thu đã giao/hoàn tất; metrics và danh sách đơn vẫn hiện. |
| Màn hình đăng nhập: thông tin admin mẫu hiển thị công khai | Credential demo được viết cố định trong nội dung trang. | frontend/src/App.jsx: bỏ credential khỏi giao diện đăng nhập. | Sau đăng xuất, form chỉ có trường email/mật khẩu và không còn thông tin admin mẫu. |
| /cart: nút tăng/giảm/xóa thiếu tên trợ năng | Các nút chỉ có icon, không có accessible name. | frontend/src/App.jsx: thêm aria-label động theo tên sản phẩm. | Accessibility tree hiển thị “Giảm số lượng…”, “Tăng số lượng…” và “Xóa… khỏi giỏ hàng”. |

## Đối chiếu MySQL sau kiểm thử

- Đơn COD #3 đã được tạo đúng với subtotal 25.990.000, discount 2.599.000, total 23.391.000 và quantity 1; sau khi kiểm tra quy trình quản trị, trạng thái cuối là cancelled.
- Tồn kho MacBook Air trở về 12 sau khi hủy; TECH10.used_count trở về 0.
- Tài khoản QA còn active; sản phẩm QA id 13 ở archived, giá 89.000, giá niêm yết 129.000 và tồn kho 5.
- Các truy vấn MySQL chỉ đọc được dùng để xác nhận các giá trị trên.

## Chưa kiểm tra được hoặc còn giới hạn

- Không có cấu hình thanh toán MoMo/VNPay/PayPal hoặc Google Form bên ngoài; vì vậy không thể kiểm thử các luồng đó. COD local đã được kiểm tra.
- Chưa thực hiện Network waterfall/DevTools Network đầy đủ vì trình duyệt tích hợp không cung cấp panel đó. Đã đọc trực tiếp JSON từ health và products API, đồng thời kiểm tra browser console.
- Các mục giới thiệu, hệ thống cửa hàng, tuyển dụng, tin công nghệ, hướng dẫn mua hàng, chính sách và tra cứu đơn hàng ở footer chưa có route/href hoạt động để kiểm thử.
- Chưa kiểm tra email/SMS, upload ảnh, CRUD category/brand/coupon/review, gửi review, lưu wishlist lâu dài, sổ địa chỉ, phân trang, lọc khoảng giá/brand, toàn bộ vòng đời giao hàng, tải cao, kiểm thử bảo mật chuyên sâu hoặc nhiều trình duyệt.
- Map và mạng xã hội trỏ tới dịch vụ bên ngoài; chưa xác nhận nội dung/tài khoản đích.

## Kết luận cuối

Các luồng khách hàng và admin đã kiểm tra bằng thao tác trình duyệt. 7 lỗi giao diện/chức năng nêu trên đã được sửa, website đã được restart và các tình huống liên quan đã chạy lại. Build frontend thành công, 4/4 backend tests đạt, API health phản hồi thành công, browser console không ghi nhận warning/error tại lần kiểm tra cuối. Các giới hạn và tính năng chưa kiểm tra được được liệt kê riêng ở trên; không đánh dấu chúng là đạt.