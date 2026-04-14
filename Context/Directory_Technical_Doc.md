# Directory Feature — Tài liệu kỹ thuật

> Cập nhật: 2026-04-14  
> Tính năng: Danh Bạ Khẩn Cấp (Emergency Directory)

---

## 1. TỔNG QUAN

Tính năng **Danh Bạ Khẩn Cấp** cho phép người dùng:
- Xem danh sách các đơn vị khẩn cấp (CSGT, PCCC, Công An, Bệnh Viện, Cấp Cứu, Khác)
- Lọc theo vị trí gần nhất (bán kính 5km), theo tỉnh/quận, hoặc tìm kiếm tên/địa chỉ
- Gọi điện hoặc sao chép số điện thoại trực tiếp
- Mở chỉ đường trên Google Maps / Apple Maps
- Lưu đơn vị để xem khi không có mạng (offline)
- Đóng góp thông tin mới → kiểm duyệt bởi admin/moderator

Tính năng **không yêu cầu đăng nhập** (ngoại trừ đóng góp thông tin).

---

## 2. KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Expo)                         │
│                                                             │
│  app/(tabs)/directory.tsx          ← Màn hình chính         │
│  app/saved-directory.tsx           ← Quản lý đã lưu         │
│  app/directory-moderation.tsx      ← Admin duyệt đóng góp  │
│                                                             │
│  features/emergency/                                        │
│   ├── AgencyCard.tsx               ← Card đơn vị            │
│   ├── FilterBar.tsx                ← Bộ lọc + tìm kiếm     │
│   ├── MapSection.tsx               ← Bản đồ + Callout       │
│   ├── ContributeModal.tsx          ← Form đóng góp          │
│   ├── directoryApi.ts              ← HTTP calls             │
│   ├── offlineStorage.ts            ← AsyncStorage           │
│   ├── agencyData.ts                ← Built-in fallback data │
│   ├── locationService.ts           ← Lấy GPS               │
│   └── types.ts                     ← TypeScript types       │
└─────────────────────────────────────────────────────────────┘
              │ HTTP (fetch + timeout 8s)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Express)                        │
│                                                             │
│  src/routes/directoryRoutes.js     ← /api/directory        │
│  src/controllers/directoryController.js                     │
│  src/models/directoryModel.js      ← MongoDB schema        │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────┐
│    MongoDB      │
│  Collection:    │
│  directories    │
└─────────────────┘
```

---

## 3. DATABASE MODEL

### `directoryModel.js` — MongoDB

```js
{
  name: String (required),
  phone: String (required),
  address: String (required),
  province: String (required),
  district: String,
  ward: String,
  type: enum ['csgt','pccc','canh_sat','benh_vien','cuu_thuong','khac'],
  lat: Number (required),
  lng: Number (required),
  status: enum ['active','pending','rejected'],  // default: 'active'
  note: String,     // ghi chú của người đóng góp
  addedBy: ObjectId (ref: User),  // nullable (đóng góp cộng đồng)
  timestamps: true
}
```

**Lưu ý:** Không dùng GeoJSON index — tính toán khoảng cách bằng Haversine formula trong controller (nhẹ, không cần PostGIS).

---

## 4. API ENDPOINTS

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| `GET` | `/api/directory` | Lấy danh sách (filter: province, district, type, search, page, limit) | Không |
| `GET` | `/api/directory/nearby` | Lấy gần vị trí (params: lat, lng, radius=5) | Không |
| `POST` | `/api/directory/contribute` | Đóng góp thông tin mới (status=pending) | JWT (optional) |
| `GET` | `/api/directory/pending` | Xem danh sách chờ duyệt | Moderator |
| `PATCH` | `/api/directory/:id/review` | Duyệt / Từ chối (body: {action, rejectReason}) | Moderator |

### Response format (`GET /api/directory`)
```json
{
  "items": [ { "_id", "name", "phone", "address", "province", "district", "ward", "type", "lat", "lng", "status" } ],
  "total": 25,
  "page": 1,
  "limit": 200
}
```

---

## 5. LUỒNG DỮ LIỆU

### 5.1 Tải danh sách (3 tầng ưu tiên)

```
loadData() được gọi
       │
       ├─ fetchDirectory / fetchNearbyDirectory (timeout 8s)
       │       │
       │   Thành công ──→ setAllAgencies(result.items)
       │                  cacheDirectoryData(items)  ← lưu AsyncStorage
       │                  setIsOffline(false)
       │       │
       │   Thất bại ──→ getCachedDirectory()
       │                   │
       │              Có cache < 1h ──→ setAllAgencies(cache.items)
       │                               setIsOffline(false)  [im lặng]
       │                   │
       │              Có cache > 1h ──→ setAllAgencies(cache.items)
       │                               setIsOffline(true) + banner
       │                   │
       │              Không cache ──→  setAllAgencies(FALLBACK_AGENCIES)
       │                               setIsOffline(false)  [im lặng]
       ▼
useEffect([allAgencies, selectedType, search])
       │
       └─ filter client-side → setAgencies(filtered)
                                ↓
                          FlatList + MapSection
```

### 5.2 Filter client-side

```
allAgencies (toàn bộ từ server/cache/built-in)
       │
       ├─ Lọc theo type (selectedType)     → exact match
       └─ Lọc theo search (input text)     → name | address | phone (case-insensitive)
              ↓
         agencies  →  hiển thị trên FlatList + MapSection
```

### 5.3 Lọc theo mode

| Mode | Hành vi |
|------|---------|
| `all` | `fetchDirectory({limit:200})` → tất cả |
| `nearby` | `fetchNearbyDirectory({lat,lng,radius:5})` → Haversine 5km |
| `location` | `fetchDirectory({province,district})` → lọc theo địa bàn |

---

## 6. LUỒNG FILTER BAR

```
FilterBar
├── Nút mode: [Tất cả] [Gần tôi 5km] [Lọc vị trí]
│       ↓ setMode() → trigger loadData()
│
├── Thanh tìm kiếm: typing → debounce 400ms → filter client-side
│
├── Chip loại: [Tất cả][CSGT][PCCC][Công An][Bệnh Viện][Cấp Cứu][Khác]
│       ↓ setSelectedType() → filter client-side (không gọi API)
│
└── (mode=location) Picker Tỉnh → Picker Quận/Huyện
        ↓ setSelectedProvince/District() → trigger loadData()
```

**Quan trọng:** Filter theo `type` được xử lý **client-side** (không gọi API lại). Điều này đảm bảo filter hoạt động ngay cả khi dùng cached data hoặc built-in data.

---

## 7. LUỒNG CALLOUT TRÊN BẢN ĐỒ

```
MapSection
└── Marker (mỗi agency)
        │
        └── Callout (width cố định 220px — bắt buộc để không bị clip)
                ├── Icon loại + Tên đơn vị
                ├── Địa chỉ
                └── Nút "Nhấn để chỉ đường"
                        │
                        └── openDirections(lat, lng, name)
                                ├── iOS: maps://app?daddr=...
                                └── Android: google.navigation:q=...
```

**Lỗi đã gặp & fix:** `tooltip` prop trên `<Callout>` không tự đo được kích thước → bị clipped. Fix bằng cách bỏ `tooltip`, dùng Standard Callout với `style={{ width: 220 }}` cố định.

---

## 8. LUỒNG AGENCY CARD

```
AgencyCard
│
├── [Biểu tượng loại + màu]   [Khoảng cách?]   [🔖 Bookmark]
│                                                      │
│                                     toggleSave() → saveAgency() / removeAgency()
│                                     AsyncStorage key: safelink_saved_directory
│
├── Tên (ấn vào → Modal chỉ đường)
│                   └── openDirections() → Google/Apple Maps
│
├── 📍 Địa chỉ
├── 🗺 Tỉnh / Quận / Phường
└── 📞 Số điện thoại (ấn vào)
        │
        ├── iOS: ActionSheetIOS → [Gọi ngay | Sao chép]
        └── Android: Alert → [Gọi ngay | Sao chép]
```

---

## 9. LUỒNG LƯU OFFLINE

### AsyncStorage keys
| Key | Nội dung | Hết hạn |
|-----|----------|---------|
| `safelink_saved_directory` | Danh sách đơn vị đã bookmark | Không hết hạn |
| `safelink_directory_cache` | Toàn bộ dữ liệu từ server | Hiển thị banner sau 1h |

### Màn hình Saved Directory (`/saved-directory`)
```
Header: "Danh bạ đã lưu"  |  Nút "Xoá hết"
Info Banner: "Có thể xem offline"

FlatList
└── AgencyCard (đầy đủ chức năng)
    └── Nút "Xoá khỏi danh sách lưu"

Empty state: hướng dẫn cách lưu
```

---

## 10. LUỒNG ĐÓNG GÓP

```
User ấn [Đóng góp] (header)
       │
       ▼
ContributeModal
├── Chọn loại (chip)
├── Tên, SĐT, Địa chỉ, Tỉnh/TP, Quận/Huyện, Phường/Xã
├── Tọa độ GPS (lat / lng)
└── Ghi chú
       │
       ▼
POST /api/directory/contribute
{ ...data, status: 'pending' }
       │
       ▼
Thông báo: "Đang chờ kiểm duyệt"
```

### Admin duyệt (`/directory-moderation`)
```
GET /api/directory/pending  (Moderator only)
       │
       ▼
FlatList các mục pending
├── [Từ chối] → PATCH :id/review { action: 'reject' }
└── [Duyệt]   → PATCH :id/review { action: 'approve' }
                      │
                      ▼
               status: 'active' → hiển thị công khai
```

---

## 11. BUILT-IN DATA (`agencyData.ts`)

Dữ liệu tích hợp sẵn trong app — **số điện thoại thật** của Việt Nam:
- Số hỏa tốc quốc gia: 113, 114, 115
- TP.HCM: CSGT, PCCC, Công An Q1, BV Chợ Rẫy, BV Thống Nhất, Cấp cứu 115
- Đồng Nai: CSGT, PCCC, BV Đa khoa Đồng Nai, Cấp cứu 115
- Bình Dương: CSGT, PCCC, BV Đa khoa Bình Dương
- Hà Nội: CSGT, PCCC, BV Bạch Mai, BV Việt Đức, Cấp cứu 115
- Đà Nẵng: CSGT, BV Đà Nẵng, Cấp cứu 115

**Mục đích:** Dùng khi API không khả dụng và không có cache. Không hiện banner offline.

---

## 12. FILES LIÊN QUAN

### Frontend
| File | Chức năng |
|------|-----------|
| `app/(tabs)/directory.tsx` | Màn hình chính — state management, load data, filter |
| `app/saved-directory.tsx` | Quản lý danh bạ đã lưu |
| `app/directory-moderation.tsx` | Admin duyệt đóng góp |
| `features/emergency/AgencyCard.tsx` | Card đơn vị (call, save, directions) |
| `features/emergency/FilterBar.tsx` | Bộ lọc mode/search/type/province |
| `features/emergency/MapSection.tsx` | Bản đồ với callout cố định 220px |
| `features/emergency/ContributeModal.tsx` | Form đóng góp thông tin |
| `features/emergency/directoryApi.ts` | API calls với timeout 8s |
| `features/emergency/offlineStorage.ts` | AsyncStorage: saved + cache |
| `features/emergency/agencyData.ts` | 25 bản built-in fallback |
| `features/emergency/locationService.ts` | expo-location GPS |
| `features/emergency/types.ts` | Agency, AgencyType, ContributePayload |

### Backend
| File | Chức năng |
|------|-----------|
| `src/models/directoryModel.js` | Mongoose schema |
| `src/controllers/directoryController.js` | CRUD + Haversine nearby + review |
| `src/routes/directoryRoutes.js` | Express router `/api/directory` |
| `seed-directory.js` | Seed 10 bản ghi mẫu vào MongoDB |

---

## 13. LƯU Ý TRIỂN KHAI

1. **QUAN TRỌNG:** Backend phải được **restart** sau khi thêm route mới (`npm start` không có hot reload). Dùng `npm run dev` (nodemon) trong môi trường dev.
2. **IP Config:** Đổi `API_BASE` trong `Front-end/constants/api.ts` khi đổi mạng.
3. **Seed database:** Chạy `node --env-file=.env seed-directory.js` một lần.
4. **Callout width:** Luôn set `width` cố định cho `<Callout>` trong react-native-maps để tránh bị clipped.
5. **Client-side filter:** Filter theo `type` và `search` luôn chạy client-side (không gọi API lại) để đảm bảo hoạt động với mọi nguồn dữ liệu.
