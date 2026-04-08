#PROJECT OVERVIEW

Tên dự án: Hệ thống chia sẻ thông tin cứu hộ

Mô tả:
Hệ thống cho phép người dùng đăng tải, tìm kiếm và chia sẻ thông tin cứu hộ trong các tình huống khẩn cấp. Hỗ trợ thông báo SOS realtime, quản lý danh bạ cứu hộ, chia sẻ thư viện kỹ năng sơ cấp cứu và hệ thống kiểm duyệt nội dung.

#SYSTEM MODULES

1. Mobile App
   Giao diện người dùng
   Giao diện đăng ký/đăng nhập. Áp dụng cho các liên quan đến mạng xã hội. Xem bài đăng, đăng bài, tìm kiếm, like, share, bình luận, tìm kiếm bài viết. Cài đặt trang cá nhân.
   Tra cứu cứu hộ. Quét vị trí hiện tại hoặc tìm kiếm thủ công. (Không cần đăng nhập)
   Gửi SOS khẩn cấp (Không cần đăng nhập)
   Mạng xã hội (đăng bài). Xem bài viết, đăng, xóa, sửa bài viết. Like, share, bình luận, tìm kiếm bài viết.
   Thư viện kỹ năng (Không cần đăng nhập)
   Trang tổng hợp tin tức mới (Không cần đăng nhập)
   Nhận thông báo realtime
   Cài đặt hệ thống và tài khoản

2. Backend
   API hệ thống
   Xử lý logic nghiệp vụ
   Xử lý dữ liệu GIS (vị trí)
   Xử lý spam và lọc nội dung
   Phân loại bài đăng (khẩn cấp / thường)
   Tích hợp AI xử lý nội dung

3. Admin Web
   Quản lý người dùng
   Quản lý danh bạ cứu hộ
   Kiểm duyệt bài đăng
   Quản lý thư viện kỹ năng
   Phân quyền (Admin / Moderator)
   Khóa / mở tài khoản

4. Kiểm thử & Triển khai
   Kiểm thử chức năng
   Kiểm thử hiệu năng
   Triển khai thử nghiệm
   Thu thập feedback
   Đánh giá hệ thống

#TECH STACK

Frontend:

React Native (Expo)
TypeScript

Backend:

Node.js (Express)

Database:

MongoDB - Lưu trữ dữ liệu mạng xã hội, bài viết, người dùng, thư viện kỹ năng.
PostgreSQL - Lưu trữ dữ liệu danh bạ cứu hộ, thông tin cứu hộ, dữ liệu bản đồ GIS

Realtime:

WebSocket / Firebase

#CORE FEATURES
Đăng nhập / đăng ký
Đăng bài cứu hộ
Phân loại bài đăng (khẩn cấp / thường)
Tìm kiếm cứu hộ theo vị trí
Gửi SOS realtime
Danh bạ cứu hộ
Kiểm duyệt nội dung
Thư viện kỹ năng
Cài đặt hệ thống

#USER ROLES
User (người dùng)
Moderator (kiểm duyệt)
Admin (quản trị)

#MAIN FLOWS

1. SOS Flow
   User gửi SOS
   Backend xử lý vị trí (GIS)
   Gửi thông báo realtime đến người gần nhất
   Hiển thị trên Mobile App

2. Social Flow
   User đăng bài
   Backend xử lý AI (phân loại)
   Nếu hợp lệ thì hiển thị lên Moblie app
   Nếu không hợp lệ thì hiển thị lên Admin Web chờ kiểm duyệt

3. Admin Flow
   Admin đăng nhập
   Admin kiểm duyệt bài đăng
   Admin quản lý danh bạ cứu hộ
   Admin quản lý thư viện kỹ năng
   Admin phân quyền (Admin / Moderator)
   Admin khóa / mở tài khoản
   Admin quản lý danh sách tài khoản

#API MODULES
/auth → đăng nhập, đăng ký
/post → bài đăng
/sos → SOS
/user → người dùng
/admin → quản trị
/rescue → danh bạ cứu hộ

#DATABASE DESIGN
User:
email
name
password
role

#CURRENT ISSUES

#RECENT CHANGES

#CODING RULES
TypeScript strict
Tách controller / service / repository
Không viết business logic trong controller
API phải có validate input
Xử lý lỗi thống nhất

#SECURITY REQUIREMENTS
Rate limit API
Xác thực JWT
Validate input
Chống spam
Phân quyền rõ ràng
Xác thực 2FA với thiết bị lạ

#ROADMAP
Tối ưu realtime
Nâng cấp AI phân loại
Thêm push notification
Triển khai production
