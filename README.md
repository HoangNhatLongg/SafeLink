# 🛡️ SafeLink — Ứng dụng Hỗ trợ Khẩn cấp & Kết nối Cộng đồng

SafeLink là hệ thống hỗ trợ khẩn cấp dành cho cộng đồng, giúp người dùng nhanh chóng tìm kiếm danh bạ cứu hộ, phát tín hiệu SOS, kết nối với đội tình nguyện, và chia sẻ kiến thức sơ cấp cứu.

---

## 📋 Mục Lục

- [Tổng Quan Hệ Thống](#-tổng-quan-hệ-thống)
- [Yêu Cầu Cài Đặt](#-yêu-cầu-cài-đặt)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
- [Cấu Hình Biến Môi Trường](#-cấu-hình-biến-môi-trường)
- [Khởi Chạy Hệ Thống](#-khởi-chạy-hệ-thống)
- [Scripts Tiện Ích](#-scripts-tiện-ích)
- [Triển Khai với Docker](#-triển-khai-với-docker)
- [API Endpoints](#-api-endpoints)
- [Tính Năng Chính](#-tính-năng-chính)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)

---

## 🏗 Tổng Quan Hệ Thống

SafeLink được thiết kế theo kiến trúc **3 thành phần** (Three-Tier):

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Front-end     │    │   Back-end      │    │   AdminWeb      │
│  (Mobile App)   │◄──►│  (REST API)     │◄──►│  (Dashboard)    │
│  React Native   │    │  Express.js     │    │  React + Vite   │
│  Expo SDK 54    │    │  Socket.IO      │    │  TailwindCSS    │
└─────────────────┘    └────────┬────────┘    └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │                       │
              ┌─────▼─────┐         ┌──────▼──────┐
              │  MongoDB  │         │  Cloudinary │
              │  (NoSQL)  │         │  (Storage)  │
              └───────────┘         └─────────────┘
```

| Thành phần | Mô tả |
|------------|-------|
| **Front-end** | Ứng dụng di động (iOS/Android) viết bằng React Native + Expo |
| **Back-end** | RESTful API server, WebSocket (Socket.IO) cho chat & SOS realtime |
| **AdminWeb** | Giao diện quản trị dành cho Admin và Moderator |

---

## 📦 Yêu Cầu Cài Đặt

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---------|---------------------|---------|
| **Node.js** | v18+ | Khuyến nghị v20 hoặc v22 |
| **npm** | v9+ | Đi kèm Node.js |
| **MongoDB** | v6+ | Hoặc sử dụng MongoDB Atlas (cloud) |
| **Git** | Bất kỳ | Để clone repo |
| **Expo CLI** | Mới nhất | Cài qua `npm install -g expo-cli` |
| **Expo Go** | Mới nhất | Cài trên điện thoại từ App Store / Google Play |

---

## 📂 Cấu Trúc Dự Án

```
SafeLink/
├── Back-end/                   # API Server (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Cấu hình Passport, DB
│   │   ├── controllers/        # Logic xử lý từng tính năng
│   │   ├── middleware/         # Auth, role, upload middleware
│   │   ├── models/             # MongoDB schemas (Mongoose)
│   │   ├── routes/             # Định tuyến API
│   │   ├── scripts/            # Scripts tiện ích (seed, sync)
│   │   └── app.js              # Express app entry
│   ├── server.js               # Khởi tạo HTTP + Socket.IO
│   ├── .env                    # Biến môi trường (tạo thủ công)
│   └── package.json
│
├── Front-end/                  # Mobile App (React Native + Expo)
│   ├── app/                    # Expo Router screens
│   │   ├── (tabs)/             # Tab chính: Trang chủ, Danh bạ, SOS, Kỹ năng, Menu
│   │   ├── chat/               # Màn hình chat SOS
│   │   └── user/               # Trang cá nhân
│   ├── features/               # Các module tính năng
│   │   ├── emergency/          # Danh bạ, lọc, đóng góp, bản đồ
│   │   ├── SOS/                # SOS Map, phát tín hiệu
│   │   ├── chat/               # Chat API, tin nhắn
│   │   └── api/                # HTTP client chung
│   ├── constants/              # API_BASE và các hằng số
│   └── package.json
│
├── AdminWeb/                   # Web Dashboard (React + Vite)
│   ├── src/app/
│   │   ├── pages/              # Các trang quản trị
│   │   ├── services/           # API services (axios)
│   │   ├── components/         # UI components (shadcn/ui)
│   │   └── stores/             # Zustand state management
│   └── package.json
│
├── docker-compose.yml          # Docker orchestration
└── README.md                   # File này
```

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Clone dự án

```bash
git clone https://github.com/HoangNhatLongg/SafeLink.git
cd SafeLink
```

### 2. Cài đặt dependencies cho từng thành phần

```bash
# Back-end
cd Back-end
npm install

# Front-end (Mobile)
cd ../Front-end
npm install

# AdminWeb (Dashboard)
cd ../AdminWeb
npm install
```

### 3. Cấu hình biến môi trường (xem mục bên dưới)

### 4. Chạy scripts khởi tạo dữ liệu (xem mục Scripts Tiện Ích)

---

## ⚙ Cấu Hình Biến Môi Trường

Tạo file `.env` trong thư mục `Back-end/` với nội dung sau:

```env
# ─── Database ────────────────────────────────────
MONGO_URI=mongodb://localhost:27017/safelink

# ─── JWT ─────────────────────────────────────────
JWT_SECRET=your_jwt_secret_key_here

# ─── Cloudinary (Lưu trữ ảnh) ───────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ─── Email (Gửi OTP) ────────────────────────────
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# ─── Google OAuth ────────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ─── Facebook OAuth ─────────────────────────────
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# ─── Server ─────────────────────────────────────
PORT=5000
CLIENT_URL=http://localhost:5173
```

### Cấu hình IP cho Mobile App

Mở file `Front-end/constants/api.ts` và đổi IP thành IP máy tính của bạn (cùng mạng WiFi với điện thoại):

```ts
export const API_BASE = 'http://192.168.x.x:5000';
```

> **Mẹo:** Chạy `ipconfig` (Windows) hoặc `ifconfig` (Mac/Linux) để tìm IP cục bộ.

### Cấu hình API URL cho AdminWeb

Mở file `AdminWeb/src/app/lib/axiosClient.ts` và đảm bảo `baseURL` trỏ đúng backend:

```ts
baseURL: 'http://localhost:5000/api'
```

---

## ▶ Khởi Chạy Hệ Thống

Mở **3 terminal** riêng biệt và chạy lần lượt:

### Terminal 1 — Back-end API

```bash
cd Back-end
npm run dev
```

> Server sẽ chạy tại `http://localhost:5000`

### Terminal 2 — AdminWeb Dashboard

```bash
cd AdminWeb
npm run dev
```

> Dashboard sẽ mở tại `http://localhost:5173`

### Terminal 3 — Mobile App (Expo)

```bash
cd Front-end
npm start
```

> Quét mã QR bằng Expo Go trên điện thoại để mở ứng dụng.

---

## 🔧 Scripts Tiện Ích

Các scripts nằm trong `Back-end/src/scripts/`, chạy từ thư mục `Back-end/`:

### Đồng bộ dữ liệu hành chính Việt Nam

```bash
node src/scripts/syncProvinces.js
```

Tải toàn bộ danh sách Tỉnh/Thành phố và Phường/Xã từ [Vietnam Provinces Open API v2](https://provinces.open-api.vn) và lưu vào MongoDB. Script hoạt động theo cơ chế **upsert** (cập nhật nếu đã có, tạo mới nếu chưa) và tự động **xóa** các tỉnh không còn tồn tại trong API.

> **Khi nào cần chạy lại?** Mỗi khi cấu trúc hành chính Việt Nam có thay đổi (sáp nhập tỉnh, đổi tên xã...).

### Khởi tạo dữ liệu kỹ năng sơ cấp cứu

```bash
node src/scripts/seedSkills.js
```

Tạo sẵn các bài hướng dẫn kỹ năng sơ cấp cứu cơ bản vào database.

---

## 🐳 Triển Khai với Docker

Nếu muốn chạy toàn bộ hệ thống bằng Docker:

```bash
# Từ thư mục gốc SafeLink/
docker-compose up -d
```

Các services sẽ được khởi tạo:

| Service | Port | Mô tả |
|---------|------|-------|
| **MongoDB** | 27017 | Cơ sở dữ liệu |
| **Back-end** | 5000 | API Server |
| **AdminWeb** | 8080 | Dashboard quản trị |
| **Front-end** | 8081 | Expo Dev Server |

Dừng hệ thống:

```bash
docker-compose down
```

---

## 📡 API Endpoints

Base URL: `http://localhost:5000/api`

### Xác thực (Auth)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/register` | Đăng ký tài khoản |
| POST | `/auth/login` | Đăng nhập |
| POST | `/auth/verify-otp` | Xác thực OTP |
| POST | `/auth/forgot-password` | Quên mật khẩu |
| GET | `/auth/google` | Đăng nhập Google |
| GET | `/auth/facebook` | Đăng nhập Facebook |

### Bài viết (Posts)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/posts` | Lấy danh sách bài viết |
| POST | `/posts` | Đăng bài mới |
| PUT | `/posts/:id` | Cập nhật bài viết |
| DELETE | `/posts/:id` | Xóa bài viết |

### Danh bạ khẩn cấp (Directory)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/directory` | Lấy danh sách danh bạ |
| GET | `/directory/nearby` | Tìm danh bạ gần vị trí |
| POST | `/directory/contribute` | Đóng góp danh bạ mới |
| PATCH | `/directory/:id/review` | Duyệt/từ chối danh bạ |

### SOS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/sos` | Phát tín hiệu SOS |
| GET | `/sos/active` | Lấy SOS đang hoạt động |
| PATCH | `/sos/:id/resolve` | Đánh dấu đã giải quyết |

### Hành chính (Provinces)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/provinces` | Lấy danh sách tỉnh + phường/xã |
| POST | `/provinces` | Thêm tỉnh mới (Admin) |
| PUT | `/provinces/:id` | Cập nhật tỉnh (Admin) |
| DELETE | `/provinces/:id` | Xóa tỉnh (Admin) |

### Kỹ năng sơ cấp cứu (Skills)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/skills` | Lấy danh sách kỹ năng |
| POST | `/skills` | Thêm kỹ năng (Admin) |

### Tình nguyện viên (Volunteers)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/volunteers` | Lấy danh sách đội tình nguyện |
| POST | `/volunteers/register` | Đăng ký tình nguyện |
| PATCH | `/volunteers/:id/review` | Duyệt đội tình nguyện (Admin) |

### Dashboard

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/dashboard/stats` | Thống kê tổng quan hệ thống |

---

## ✨ Tính Năng Chính

### 📱 Ứng Dụng Di Động (Front-end)

| Tính năng | Mô tả |
|-----------|-------|
| **Trang chủ** | Bảng tin cộng đồng, đăng bài, bình luận, thích |
| **Danh bạ khẩn cấp** | Tra cứu Công an, Bệnh viện, PCCC... theo tỉnh/phường, lọc theo loại, tìm gần nhất trên bản đồ |
| **SOS** | Phát tín hiệu SOS khẩn cấp, ghim vị trí trên bản đồ realtime, chat cứu hộ |
| **Kỹ năng sơ cấp cứu** | Thư viện hướng dẫn sơ cấp cứu kèm hình ảnh/video |
| **Đóng góp danh bạ** | Người dùng đề xuất thêm địa điểm cứu hộ mới |
| **Đa ngôn ngữ** | Hỗ trợ Tiếng Việt & Tiếng Anh (i18next) |

### 🖥️ Trang Quản Trị (AdminWeb)

| Trang | Mô tả |
|-------|-------|
| **Tổng Quan** | Dashboard thống kê người dùng, bài viết, SOS |
| **Quản Lý Người Dùng** | Xem, cấm, mở cấm tài khoản |
| **Duyệt Đội Cứu Hộ** | Phê duyệt đăng ký tình nguyện viên |
| **Duyệt Danh Bạ** | Kiểm duyệt danh bạ do cộng đồng đóng góp |
| **Quản Lý SOS** | Giám sát các tín hiệu SOS realtime |
| **Quản Lý Tỉnh/Xã** | Thêm, sửa, xóa cấu trúc hành chính |
| **Thư Viện Kỹ Năng** | Quản lý bài hướng dẫn sơ cấp cứu |
| **Báo Cáo Vi Phạm** | Xử lý các báo cáo vi phạm |
| **Quản Lý Khiếu Nại** | Xem xét khiếu nại từ người dùng bị cấm |

---

## 🛠 Công Nghệ Sử Dụng

### Back-end

| Công nghệ | Mục đích |
|------------|----------|
| **Express.js v5** | Web framework |
| **MongoDB + Mongoose** | Cơ sở dữ liệu NoSQL |
| **Socket.IO** | Chat & SOS realtime |
| **JWT** | Xác thực token |
| **Passport.js** | OAuth (Google, Facebook) |
| **Cloudinary** | Lưu trữ ảnh/video |
| **Nodemailer** | Gửi email OTP |
| **express-rate-limit** | Chống spam API |

### Front-end (Mobile)

| Công nghệ | Mục đích |
|------------|----------|
| **React Native** | Framework ứng dụng di động |
| **Expo SDK 54** | Toolchain & native modules |
| **Expo Router** | File-based navigation |
| **react-native-maps** | Bản đồ |
| **Socket.IO Client** | Realtime communication |
| **i18next** | Đa ngôn ngữ |
| **AsyncStorage** | Cache dữ liệu offline |

### AdminWeb (Dashboard)

| Công nghệ | Mục đích |
|------------|----------|
| **React 18** | UI library |
| **Vite** | Build tool |
| **TailwindCSS 4** | Styling |
| **shadcn/ui + Radix UI** | Component library |
| **TanStack Query** | Data fetching & caching |
| **Zustand** | State management |
| **Recharts** | Biểu đồ thống kê |
| **Sonner** | Toast notifications |

---

## 👥 Tác Giả

- **Hoàng Nhật Long** — [GitHub](https://github.com/HoangNhatLongg)

---

## 📄 Giấy Phép

Dự án này được phát triển phục vụ mục đích nghiên cứu khoa học.
