# Báo Cáo Kỹ Thuật: Thuật Toán & Tối Ưu Hiệu Năng SafeLink

Tài liệu này tổng hợp các thuật toán cốt lõi và các phương pháp tối ưu hóa hiệu năng đang được áp dụng thực tế trong mã nguồn của hệ thống SafeLink.

## 1. Thuật Toán Cốt Lõi

### 1.1. Thuật toán Đề xuất Bài viết (Feed Recommendation Algorithm)
**Mục đích**: Cá nhân hóa bảng tin (feed) của người dùng dựa trên mức độ ưu tiên và vị trí địa lý, đảm bảo người dùng thấy các cảnh báo khẩn cấp sớm nhất.
**Vị trí Code**: `Back-end/src/controllers/postController.js` (hàm `getRecommendedFeed`)

**Nguyên lý hoạt động (5 Tầng Ưu Tiên)**:
Thuật toán phân chia không gian hiển thị (ví dụ 20 bài viết/trang) thành 5 tầng theo thứ tự ưu tiên giảm dần:
- **Tầng 1 (Cảnh báo SOS - Ưu tiên tuyệt đối):** Các bài viết có `postType = "sos"` và chưa hết thời hạn 24 giờ. Hệ thống không giới hạn số lượng bài cho tầng này.
- **Tầng 2 (Bạn bè - 40% slots):** Ưu tiên hiển thị bài viết của những người đang follow lẫn nhau (mutual-follow).
- **Tầng 3 (Gần đây - 20% slots):** Dựa vào tọa độ (latitude, longitude) người dùng gửi lên, lấy các bài đăng trong bán kính `10km`. Sử dụng `PostGIS` (`ST_Distance`) để tối ưu việc tìm kiếm trong không gian.
- **Tầng 4 (Nổi bật - 20% slots):** Lấy các bài viết có `score` cao nhất chưa xuất hiện (Điểm = Tổng Like - Tổng Dislike).
- **Tầng 5 (Mới nhất - Các slots còn lại):** Lấp đầy các chỗ trống bằng những bài viết mới đăng theo thời gian thực.

---

### 1.2. Thuật toán Không gian (Geospatial) - Khoảng cách Haversine
**Mục đích**: Tính toán khoảng cách đường chim bay giữa người dùng và các địa điểm khẩn cấp hoặc đội tình nguyện để có thể gợi ý những địa điểm gần nhất.
**Vị trí Code**: 
- `Back-end/src/controllers/volunteerController.js` (hàm `haversine` và `getNearbyVolunteers`)
- `Back-end/src/controllers/directoryController.js` (hàm `getNearbyDirectories`)
- Tích hợp tính toán tự động bằng PostgreSQL / PostGIS tại `Back-end/src/config/postgresConfig.js` (hàm `ST_Distance`).

**Công thức Toán học (Haversine Formula)**:
Giả sử có hai tọa độ: Điểm 1 $(lat_1, lng_1)$ và Điểm 2 $(lat_2, lng_2)$, với $R = 6371$ km là bán kính Trái Đất.
1. **Chuyển đổi độ sang radian:**
   $$ \Delta lat = (lat_2 - lat_1) \cdot \frac{\pi}{180} $$
   $$ \Delta lng = (lng_2 - lng_1) \cdot \frac{\pi}{180} $$
2. **Tính hệ số $a$:**
   $$ a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos\left(lat_1 \cdot \frac{\pi}{180}\right) \cdot \cos\left(lat_2 \cdot \frac{\pi}{180}\right) \cdot \sin^2\left(\frac{\Delta lng}{2}\right) $$
3. **Tính khoảng cách ($d$):**
   $$ d = 2 \cdot R \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right) $$

**Code mô phỏng trong hệ thống:**
```javascript
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

---

### 1.3. Thuật toán Gợi ý và Tìm kiếm (Global Search & Tags)
**Mục đích**: Gợi ý xu hướng tìm kiếm và cho phép tìm từ khóa trên toàn hệ thống.
**Vị trí Code**: `Back-end/src/controllers/searchController.js`

- **Trending Tags (Gợi ý Hashtag)**: Sử dụng **MongoDB Aggregation Pipeline**. Hệ thống quét mảng `tags` của tất cả bài viết, gộp (group) các thẻ giống nhau, đếm tần suất (`$sum: 1`) và sắp xếp giảm dần để trả về Top 10 Trending Tags.
- **Global Search**: Sử dụng **Regular Expression (Regex)** kết hợp mệnh đề `$or` để tìm kiếm chuỗi linh hoạt, không phân biệt hoa thường (`$options: "i"`) trên nhiều bộ sưu tập cùng lúc (Users, Posts, Locations).

---

## 2. Phương Pháp Tối Ưu Hiệu Năng Hệ Thống (Performance Optimizations)

### 2.1. Tối Ưu Database & Query (Mongoose / MongoDB)
- **Sử dụng đối tượng cơ bản (`.lean()`)**: Đính kèm hàm `.lean()` ở các API truy xuất danh sách (GET). Phương pháp này loại bỏ quá trình khởi tạo các Document Object nặng nề của Mongoose, chỉ trả về trực tiếp định dạng POJO (Plain Old JavaScript Objects). Giúp tăng tốc độ truy vấn và giảm cực mạnh lượng tiêu thụ RAM của Node.js.
  - *Vị trí Code*: Xuyên suốt `userController.js`, `postController.js`, `volunteerController.js`.
- **Thực thi đa luồng ảo (`Promise.all`)**: Khi một API cần tổng hợp nhiều dữ liệu độc lập (ví dụ: vừa lấy danh sách bài viết vừa đếm số lượng tổng, hoặc check số followers/following), hệ thống đóng gói các tác vụ vào `Promise.all` để chạy song song luồng I/O thay vì `await` tuần tự từng tác vụ.
- **Đánh chỉ mục dữ liệu (Database Indexes)**:
  - **Compound Indexes:** Tối ưu hóa việc quét dữ liệu dựa trên tần suất sắp xếp như cấu trúc `{ status: 1, createdAt: -1 }` hoặc `{ author: 1, status: 1, createdAt: -1 }` (`models/postModel.js`, `models/followModel.js`).
  - **TTL Indexes (Time-To-Live):** Phục vụ cơ chế Soft Delete. Bài viết khi bị xóa chỉ bị đổi trạng thái sang `deleted` (giúp tránh việc lock Database). TTL Index của Mongo (`{ deletedAt: 1 }, { expireAfterSeconds: 2592000 }`) sẽ hoạt động ngầm để tự động xoá hẳn bài viết sau 30 ngày.

### 2.2. Tối Ưu Phân Phối Dữ Liệu & Bộ Nhớ (Caching)
- **Hệ thống In-Memory Cache**: Tự xây dựng module cache lưu trữ thẳng trên RAM của Server với cơ chế thời gian sống (TTL). Hàm `withCache` áp dụng **Cache-Aside Pattern** (Kiểm tra RAM -> Nếu rỗng (Miss) -> Gọi DB -> Ghi vào RAM -> Trả về kết quả).
  - *Vị trí Code*: `Back-end/src/utils/cache.js`
- **Cache Invalidation (Dọn dẹp tự động)**: Khi có sự kiện phát sinh SOS mới hoặc người dùng tương tác, server tự động xoá các cache lỗi thời thông qua Regex (ví dụ: `cacheDelPattern("feed:")`), đảm bảo Bảng tin luôn đảm bảo tính Real-time.
  - *Vị trí Code*: Đầu các API thêm/xóa/sửa tại `sosController.js` và `postController.js`.

### 2.3. Tối Ưu Băng Thông Mạng và Tĩnh (Network & CDN)
- **Cache-Control Headers**: Server chủ động gửi kèm HTTP Header `Cache-Control: private, max-age=15, stale-while-revalidate=30` cho API danh sách bảng tin. Cho phép ứng dụng client hoặc mạng trung gian lưu trữ tạm 15-30 giây, giúp chống sập server khi lượng người dùng tải lại trang đồng loạt (DDoS tự nhiên).
- **Tối ưu hình ảnh/video (WebP & Immutable URL)**:
  - Toàn bộ ảnh được upload lên đi qua một Middleware xử lý, nén và tự động chuyển về định dạng **WebP** để giảm tối đa dung lượng tệp mà không làm giảm chất lượng nhận diện của mắt thường.
  - Ảnh trên Cloudinary được trả về là Immutable (với tham số Tag phiên bản `v=...`). Cơ chế này giúp các trình duyệt tự tin lưu trữ bộ đệm hình ảnh này vĩnh viễn (lên tới 1 năm) mà không gửi request hỏi lại server.
  - *Vị trí Code*: `Back-end/src/middleware/upload.js`
