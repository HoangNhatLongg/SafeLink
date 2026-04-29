Tổng kết: Phân Quyền & Quản Lý Danh Bạ Cứu Hộ
Hệ thống SafeLink Admin đã được nâng cấp mạnh mẽ với hai luồng tính năng quan trọng:

1. Bảo Vệ Tuyến Đường (Auth Guard)
IMPORTANT

Toàn bộ các trang (ngoại trừ trang Đăng nhập) giờ đây đã được bảo vệ hoàn toàn. Bất kỳ ai truy cập trực tiếp vào hệ thống (hoặc khi token hết hạn) đều sẽ tự động bị điều hướng về trang Đăng Nhập.

ProtectedRoute: Thành phần bảo vệ được tích hợp sâu vào bộ định tuyến routes.tsx.
Kiểm tra Phân quyền: Ngay cả khi có token, hệ thống cũng kiểm tra bắt buộc người dùng phải có chức vụ admin hoặc moderator mới được phép truy cập.
2. Quản Lý Danh Bạ Khẩn Cấp (Directory Moderation)
Giao diện quản lý danh bạ đã được thiết kế lại toàn diện, hỗ trợ đầy đủ các thao tác CRUD và kiểm duyệt đóng góp từ người dùng:

TIP

Trải nghiệm cao cấp (Premium UX):

Sử dụng Tabs để lọc danh sách nhanh chóng theo trạng thái: Chờ duyệt, Đang hoạt động, Đã từ chối, và Tất cả.
Form Thêm/Sửa được thiết kế tối ưu hóa diện tích hiển thị (2 cột), có kiểm tra dữ liệu bắt buộc.
Các hộp thoại xác nhận (Modal) giúp giảm thiểu thao tác xóa hoặc từ chối nhầm lẫn.
Các Chức Năng Nổi Bật:
Duyệt/Từ Chối: Admin có thể duyệt nhanh hoặc từ chối (kèm lý do) đối với các danh bạ do người dân đóng góp.
Thêm Mới Trực Tiếp: Admin có thể trực tiếp thêm danh bạ vào hệ thống với trạng thái Active ngay lập tức, bỏ qua bước chờ duyệt.
Chỉnh Sửa: Cập nhật thông tin chi tiết (Đặc biệt ưu tiên sửa nhanh Vĩ độ và Kinh độ) mà không cần phải rời khỏi trang.
Tìm Kiếm Mở Rộng: Tìm kiếm mượt mà qua thanh công cụ theo Tên cơ sở, Số điện thoại hoặc Địa chỉ.
Backend Đã Cập Nhật
Hệ thống API backend đã được bổ sung các endpoint mới để phục vụ quản trị:

GET /api/directory/all (Lấy dữ liệu thô toàn bộ bảng).
POST /api/directory (Thêm trực tiếp).
PUT /api/directory/:id (Sửa đổi mọi trường dữ liệu).
DELETE /api/directory/:id (Xóa bỏ hoàn toàn khỏi DB).