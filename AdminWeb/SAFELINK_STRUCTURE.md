# SafeLink Admin Dashboard - Cấu Trúc Dự Án

## 📁 Cấu Trúc Thư Mục

```
/src
  /app
    /components
      /ui                          # Shadcn UI components
        - button.tsx               # Component Button
        - card.tsx                 # Component Card
        - input.tsx                # Component Input
        - badge.tsx                # Component Badge
        - table.tsx                # Component Table
        - avatar.tsx               # Component Avatar
        - dropdown-menu.tsx        # Component Dropdown Menu
      
      /layout                      # Layout components
        - Sidebar.tsx              # Sidebar navigation (có thể thu gọn/mở rộng)
        - Header.tsx               # Header với search, theme toggle, notifications, user menu
        - Layout.tsx               # Main layout wrapper
      
      /dashboard                   # Dashboard-specific components
        - StatCard.tsx             # Card hiển thị thống kê số liệu
        - ActivityChart.tsx        # Biểu đồ hoạt động (Line Chart)
        - RecentReports.tsx        # Danh sách báo cáo vi phạm gần đây
    
    /pages                         # Các trang chính
      - Dashboard.tsx              # Trang tổng quan (Homepage)
      - UserManagement.tsx         # Quản lý người dùng
      - VolunteerModeration.tsx    # Duyệt đội cứu hộ / tình nguyện viên
      (các trang khác sẽ được implement tương tự)
    
    /lib                           # Utilities
      - utils.ts                   # Helper functions (cn, formatDate, etc.)
      - axiosClient.ts             # Axios instance với JWT interceptor
    
    /stores                        # Zustand stores
      - authStore.ts               # Authentication state management
    
    /services                      # API services & mock data
      - mockAuth.ts                # Mock authentication service
    
    /types                         # TypeScript type definitions
      - index.ts                   # All TypeScript interfaces & types
    
    - App.tsx                      # Root component với React Query & Router
    - routes.tsx                   # React Router configuration
  
  /styles
    - theme.css                    # Tailwind theme & CSS variables (dark mode support)
    - fonts.css                    # Font imports
```

---

## 🔧 Tech Stack

- **Framework**: ReactJS (Vite)
- **Language**: TypeScript
- **Routing**: React Router v7 (Data Mode)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query) + Axios
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Styling**: TailwindCSS v4
- **Icons**: Lucide React
- **Charts**: Recharts

---

## 🚀 Cách Chạy Dự Án

1. Cài đặt dependencies:
```bash
npm install
# hoặc
pnpm install
```

2. Chạy development server:
```bash
npm run dev
```

3. Build production:
```bash
npm run build
```

---

## 🔐 Authentication

### Mock Users (Development)

Để test nhanh, hệ thống sẽ tự động đăng nhập với tài khoản Admin khi load lần đầu.

**Admin Account:**
- Email: `admin@safelink.com`
- Password: `admin`
- Role: `admin` (toàn quyền)

**Moderator Account:**
- Email: `mod@safelink.com`
- Password: `mod`
- Role: `moderator` (quyền hạn chế)

### Kết Nối Backend Thực

Khi kết nối với backend thực tại `http://localhost:5000/api`:

1. Mở file `/src/app/stores/authStore.ts`
2. Thay thế `mockLogin` bằng `apiRequest.post`
3. Comment hoặc xóa phần `initializeAuth()` để tắt auto-login
4. Tạo trang Login riêng nếu cần

---

## 📄 Các Trang Chính

### 1. Dashboard (/)
- **Chức năng**: Trang tổng quan hiển thị các số liệu thống kê quan trọng
- **Components**:
  - StatCard: 4 card thống kê (Tổng người dùng, SOS, Vi phạm, Đội cứu hộ chờ duyệt)
  - ActivityChart: Biểu đồ hoạt động 30 ngày
  - RecentReports: 5 báo cáo vi phạm mới nhất

### 2. Quản Lý Người Dùng (/users)
- **Chức năng**: Quản lý tài khoản, phân quyền, khóa/mở khóa người dùng
- **Features**:
  - Tìm kiếm người dùng
  - Lọc theo role (Admin/Moderator/User)
  - Phân quyền (chuyển User → Moderator)
  - Ban/Unban tài khoản

### 3. Duyệt Đội Cứu Hộ (/volunteers) - **ADMIN ONLY**
- **Chức năng**: Xét duyệt đơn đăng ký đội cứu hộ & tình nguyện viên
- **Features**:
  - Hiển thị dạng card grid
  - Xem ảnh xác minh, thông tin liên hệ, GPS
  - Duyệt (Approve) hoặc Từ chối (Reject) với lý do
  - Phân loại: Miễn phí / Có phí
- **Lưu ý**: Chỉ `admin` mới thấy menu này (role-based rendering)

### 4. Duyệt Danh Bạ (/directory)
- Xét duyệt thông tin đồn cảnh sát, bệnh viện, PCCC do người dùng đóng góp
- (Placeholder - chưa implement)

### 5. Thư Viện Kỹ Năng (/skills)
- Quản lý bài viết cẩm nang an toàn, PCCC, thoát hiểm
- Preview HTML content trước khi duyệt
- (Placeholder - chưa implement)

### 6. Báo Cáo Vi Phạm (/reports)
- Kiểm duyệt bài đăng/comment bị báo cáo
- Xóa bài, cảnh cáo, hoặc mark as safe
- (Placeholder - chưa implement)

---

## 🎨 UI/UX Features

### Dark Mode
- Toggle tự động lưu preference vào localStorage
- Icon Sun/Moon ở Header
- Theme system dựa trên CSS variables

### Sidebar
- Thu gọn/mở rộng với animation
- Role-based navigation (ẩn menu theo quyền)
- Active state highlighting

### Responsive Design
- Mobile-friendly (breakpoints: md, lg)
- Grid system tự động adjust
- Sidebar collapsible cho màn hình nhỏ

---

## 🔌 API Integration

### Axios Client Configuration

File: `/src/app/lib/axiosClient.ts`

**Features:**
- Base URL: `http://localhost:5000/api`
- Tự động gắn JWT token vào mọi request
- Auto-redirect khi token expired (401)
- Error handling toàn cục

**Usage:**
```typescript
import { apiRequest } from '../lib/axiosClient';

// GET request
const users = await apiRequest.get<User[]>('/users');

// POST request
const response = await apiRequest.post('/volunteers/approve', {
  volunteerId: '123',
  approvedBy: 'admin-id',
});
```

### API Endpoints (Backend cần implement)

```
POST   /api/auth/login              # Đăng nhập
GET    /api/dashboard/stats         # Thống kê dashboard
GET    /api/users                   # Danh sách người dùng
PATCH  /api/users/:id/role          # Phân quyền
PATCH  /api/users/:id/ban           # Khóa tài khoản

GET    /api/volunteers              # Danh sách đội cứu hộ
POST   /api/volunteers/:id/approve  # Duyệt đội cứu hộ
POST   /api/volunteers/:id/reject   # Từ chối đội cứu hộ

GET    /api/directory               # Danh bạ khẩn cấp
GET    /api/skills                  # Thư viện kỹ năng
GET    /api/reports                 # Báo cáo vi phạm
```

---

## 🛠️ Các Bước Tiếp Theo

### Implement các trang còn lại:
1. **DirectoryModeration**: Tương tự VolunteerModeration
2. **SkillLibrary**: Cần HTML preview component
3. **ReportModeration**: Table với filter theo mức độ nghiêm trọng

### Tích hợp Backend thực:
1. Tạo API services trong `/src/app/services/`
2. Sử dụng React Query hooks (`useQuery`, `useMutation`)
3. Xóa mock data

### Thêm features:
1. Toast notifications (đã có Sonner)
2. Loading states & skeletons
3. Pagination cho tables
4. Image upload & preview
5. Form validation (React Hook Form)
6. Export data (CSV/Excel)

---

## 📝 Coding Standards

- **Component naming**: PascalCase (`UserManagement.tsx`)
- **Function naming**: camelCase (`handleApprove`)
- **CSS**: Tailwind utility classes only (no custom CSS)
- **Type safety**: Tất cả props phải có TypeScript types
- **Error handling**: Try-catch cho async operations
- **Comments**: Tiếng Việt cho business logic, English cho technical

---

## 🐛 Troubleshooting

### Dark mode không hoạt động
- Kiểm tra `localStorage.getItem('theme')`
- Verify `document.documentElement.classList.contains('dark')`

### API calls không có token
- Check `localStorage.getItem('safelink_token')`
- Verify Axios interceptor trong axiosClient.ts

### Router không hoạt động
- Đảm bảo đã wrap App với `<RouterProvider>`
- Check route paths trong routes.tsx

---

**Lưu ý**: Đây là version MVP. Nhiều trang chỉ là placeholder và cần được implement đầy đủ theo yêu cầu nghiệp vụ thực tế.
