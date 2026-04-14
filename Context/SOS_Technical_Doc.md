# 🆘 SOS Feature — Tài liệu kỹ thuật đầy đủ

> **Dự án:** SafeLink  
> **Tác giả tài liệu:** Antigravity AI  
> **Cập nhật:** 2026-04-14 (v1.1)  
> **Trạng thái:** ✅ Hoàn thành và đang hoạt động

---

## 1. Tổng quan chức năng

Chức năng SOS cho phép người dùng gửi **tín hiệu khẩn cấp** kèm vị trí GPS và hình ảnh hiện trường. Hệ thống tự động:
- Gửi push notification đến các user lân cận trong bán kính chỉ định
- Thông báo riêng cho admin/moderator
- Hiển thị marker trên bản đồ thời gian thực
- Tự động hết hạn sau 24 giờ
- Ưu tiên hiện ở đầu news feed

---

## 2. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────┐
│                      FRONT-END                           │
│                                                          │
│  SOSButton (nút nổi)                                     │
│      │ Ấn giữ / nhấn                                     │
│      ▼                                                   │
│  SOSModal (form điền thông tin)                          │
│      │ Submit FormData                                   │
│      ▼                                                   │
│  sosApi.ts ──── POST /api/sos ──────────────────────────►│
│                                                          │
│  SOSMap ────── GET /api/sos/active (mỗi 30s) ──────────►│
│      │ Ấn marker                                         │
│      ▼                                                   │
│  Bottom Panel                                            │
│  ├── Xem bài viết → /post/[id]                          │
│  └── Chỉ đường → Google Maps / Apple Maps               │
│                                                          │
│  PostCard (feed)                                         │
│  └── Banner "🆘 TÍN HIỆU KHẨN CẤP · 🔥 Hỏa hoạn"      │
└──────────────────────────────────────────────────────────┘
                          │
                     HTTPS REST
                          │
┌──────────────────────────────────────────────────────────┐
│                      BACK-END                            │
│                                                          │
│  sosRoutes.js                                            │
│  ├── GET  /api/sos/active        (public)                │
│  ├── POST /api/sos               (auth + upload)         │
│  ├── PATCH /api/sos/:id/resolve  (auth)                  │
│  ├── PATCH /api/sos/me/location  (auth)                  │
│  └── PATCH /api/sos/me/push-token(auth)                  │
│                                                          │
│  sosController.js                                        │
│  ├── createSOS → Haversine → sendSOSNotification        │
│  ├── getActiveSOS → filter by radius                    │
│  ├── resolveSOS                                          │
│  ├── updateUserLocation                                  │
│  └── updatePushToken                                     │
│                                                          │
│  notificationService.js                                  │
│  └── POST https://exp.host/--/api/v2/push/send           │
│                                                          │
│  sosCleanupService.js                                    │
│  └── setInterval(5min) → expire posts > 24h             │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Thư viện sử dụng

### Front-end

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|---------|
| `expo-notifications` | SDK 54 | Nhận push notification, lấy Expo Push Token |
| `expo-device` | SDK 54 | Kiểm tra thiết bị thật/giả lập |
| `expo-constants` | SDK 54 | Lấy project ID cho Expo Go |
| `expo-location` | SDK 54 | Lấy tọa độ GPS hiện tại |
| `expo-image-picker` | SDK 54 | Chọn ảnh từ thư viện |
| `expo-camera` | SDK 54 | Chụp ảnh trực tiếp |
| `react-native-maps` | Latest | Bản đồ, Marker, Circle |
| `expo-router` | v4 | Navigation đến /post/[id] |
| `react-native` `Linking` | Built-in | Mở Google Maps / Apple Maps |
| `react-native` `Animated` | Built-in | Animation bottom panel |

### Back-end

| Thư viện | Mục đích |
|----------|---------|
| `express` | REST API framework |
| `mongoose` | ODM cho MongoDB |
| `multer` | Parse multipart FormData, buffer ảnh |
| `node-fetch` / built-in `fetch` | Gọi Expo Push API |
| `cloudinary` (tùy chọn) | Upload và optimize ảnh |

---

## 4. Luồng hoạt động chi tiết

### 4.1 Gửi SOS (User → Server)

```
1. User ấn SOSButton (nút đỏ nổi, kéo được)
2. SOSModal mở → User chọn:
   - Category (Hỏa hoạn / Sạt lở / Tai nạn / ...)
   - Mô tả tình huống
   - Bán kính cảnh báo (500m → 10km)
   - Ảnh hiện trường (camera hoặc thư viện)
3. Location được lấy tự động từ expo-location
4. Submit → FormData gửi POST /api/sos
5. Server:
   a. Validate GPS bắt buộc
   b. Upload ảnh lên Cloudinary (nếu cấu hình) hoặc local
   c. Tạo Post với postType="sos", sosStatus="active" → lưu vào **MongoDB**
   d. **Đồng bộ tọa độ GPS sang PostgreSQL/PostGIS** (bảng `post_locations`)
   e. Lấy tất cả user có push token + lastKnownLocation
   f. Tính khoảng cách Haversine từng user → lọc trong bán kính
   g. Gửi push notification (fire-and-forget, không block response)
   h. Xóa cache feed để SOS hiện ngay
   i. Trả về { post, notified: { nearby, staff } }
```

### 4.2 Xem bản đồ SOS

```
1. User mở tab SOS → SOSMap render
2. GET /api/sos/active?lat=X&lon=Y&radius=50
3. Server trả về danh sách SOS trong 50km
4. Mỗi SOS hiển thị:
   - Marker hình tam giác đỏ ⚠️
   - Circle bán kính mờ đỏ
5. Auto-refresh mỗi 30 giây
6. User ấn marker → Bottom Panel trượt lên:
   - Tên category + emoji
   - Tên tác giả
   - Mô tả (tối đa 3 dòng)
   - Địa chỉ
   - Nút 🔴 "Xem bài viết" → navigate /post/[id]
   - Nút 🔵 "Chỉ đường" → mở app bản đồ
```

### 4.3 Nhận cảnh báo (Push Notification)

```
1. App khởi động → registerForPushNotificationsAsync()
2. Lấy ExpoPushToken → PATCH /api/sos/me/push-token
3. App cập nhật location định kỳ → PATCH /api/sos/me/location
4. Khi có SOS mới trong khu vực:
   - Server gửi POST https://exp.host/--/api/v2/push/send
   - Thiết bị nhận notification với title/body/data
   - User tap notification → điều hướng đến bài SOS
```

### 4.4 Hiển thị trong Feed

```
- getFeed() sort postType: -1 (SOS luôn lên đầu)
- PostCard nhận biết postType === 'sos':
  - Card có viền đỏ + shadow đỏ
  - Banner "🆘 TÍN HIỆU KHẨN CẤP · 🔥 Hỏa hoạn"
  - Nội dung và ảnh hiện trường bình thường
```

### 4.5 Kết thúc SOS

```
- Manual: Author / Admin / Moderator gọi PATCH /api/sos/:id/resolve
  → sosStatus = "resolved", status = "deleted" (ẩn khỏi feed)
- Auto: sosCleanupService chạy mỗi 5 phút
  → Tìm SOS có sosExpiresAt < now → đánh dấu resolved
```

---

## 5. Code quan trọng

### 5.1 Haversine — Tìm user trong bán kính

```javascript
// Back-end: sosController.js
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Lọc user trong bán kính sosRadius
const nearbyTokens = nearbyUsers
  .filter((u) => haversineKm(lat, lon,
    u.lastKnownLocation.latitude,
    u.lastKnownLocation.longitude) <= radiusKm)
  .map((u) => u.expoPushToken);
```

### 5.2 Expo Push Notification — Batch 100/request

```javascript
// Back-end: notificationService.js
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

for (const batch of batches) {          // batches: chunks of 100 tokens
  const messages = batch.map((token) => ({
    to: token,
    title: `🆘 ${categoryLabel} GẦN BẠN!`,
    body: `${authorName} báo cáo sự cố...`,
    data: { type: "sos_alert", postId, category, latitude, longitude },
    sound: "default",
    priority: "high",
    channelId: "sos",
  }));
  await fetch(EXPO_PUSH_URL, { method: "POST", body: JSON.stringify(messages) });
}
```

### 5.3 Đăng ký Push Token — Graceful fallback

```typescript
// Front-end: notificationSetup.ts
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;  // Simulator an toàn
  try {
    // Xin quyền → lấy token
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch (e: any) {
    console.warn("⚠️ Không lấy được Push Token:", e.message);
    return null;   // Không crash app
  }
}
```

### 5.4 Mở bản đồ chỉ đường — Cross-platform

```typescript
// Front-end: SOSMap.tsx
async function openDirections(lat: number, lng: number) {
  const googleAppUrl = Platform.OS === "android"
    ? `google.navigation:q=${lat},${lng}`
    : `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  const appleUrl = `maps://?daddr=${lat},${lng}&dirflg=d`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (Platform.OS === "android") {
    const canGoogle = await Linking.canOpenURL(googleAppUrl);
    await Linking.openURL(canGoogle ? googleAppUrl : googleUrl);
  } else {
    // iOS: Google Maps app → Apple Maps → web fallback
    ...
  }
}
```

### 5.5 Auto-cleanup SOS sau 24 giờ

```javascript
// Back-end: sosCleanupService.js
export function startSOSCleanupJob() {
  setInterval(async () => {
    const expired = await Post.updateMany(
      { postType: "sos", sosStatus: "active", sosExpiresAt: { $lt: new Date() } },
      { sosStatus: "resolved", status: "deleted" }
    );
    if (expired.modifiedCount > 0)
      console.log(`🧹 Expired ${expired.modifiedCount} SOS posts`);
  }, 5 * 60 * 1000); // mỗi 5 phút
}
```

### 5.6 Marker SOS — onSelect thay onPress (iOS fix)

```tsx
// Front-end: SOSMap.tsx
<Marker
  coordinate={{ latitude: sos.location.latitude, longitude: sos.location.longitude }}
  onPress={(e) => { e.stopPropagation(); handleMarkerPress(sos); }}
  onSelect={() => handleMarkerPress(sos)}   // iOS dùng onSelect
  tracksViewChanges={false}                  // Tắt re-render không cần thiết
>
```

### 5.7 Đồng bộ tọa độ SOS sang PostgreSQL/PostGIS

```javascript
// Back-end: sosController.js — sau Post.create()
try {
  await savePostLocation(
    post._id.toString(),
    req.user._id.toString(),
    parseFloat(latitude),
    parseFloat(longitude),
    address || null
  );
} catch (gisErr) {
  // Không crash luồng chính nếu PostgreSQL lỗi
  console.warn("⚠️ Không thể đồng bộ SOS vào PostgreSQL:", gisErr.message);
}
```

### 5.8 Xóa GIS record khi Resolve SOS

```javascript
// Back-end: sosController.js — trong resolveSOS()
post.sosStatus = "resolved";
post.status = "deleted";
await post.save();

// Xóa khỏi bảng post_locations để không ảnh hưởng kết quả GIS search
try {
  await deletePostLocation(id);
} catch (gisErr) {
  console.warn("⚠️ Không thể xóa SOS khỏi PostgreSQL:", gisErr.message);
}
```



## 6. Database Schema — Các trường SOS

### Post Model (thêm vào)

```javascript
// Kiểu SOS của bài
postType:    { type: String, enum: ["normal", "sos"], default: "normal" },
sosCategory: { type: String, enum: ["fire","landslide","traffic","robbery","medical","flood","other"] },
sosRadius:   { type: Number, default: 1000 },     // mét
sosStatus:   { type: String, enum: ["active","resolved"], default: "active" },
sosExpiresAt:{ type: Date },                       // now + 24h
sosResolvedBy: { type: ObjectId, ref: "User" },
```

### User Model (thêm vào)

```javascript
expoPushToken: { type: String },   // Expo Push Token của thiết bị
lastKnownLocation: {
  latitude:  { type: Number },
  longitude: { type: Number },
  updatedAt: { type: Date },
},
```

---

## 7. API Endpoints

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/sos/active` | ❌ Public | Danh sách SOS đang active (cho map) |
| `POST` | `/api/sos` | ✅ Bearer | Tạo SOS mới (FormData + ảnh) |
| `PATCH` | `/api/sos/:id/resolve` | ✅ Bearer | Đánh dấu SOS đã giải quyết |
| `PATCH` | `/api/sos/me/location` | ✅ Bearer | Cập nhật vị trí GPS của user |
| `PATCH` | `/api/sos/me/push-token` | ✅ Bearer | Lưu Expo Push Token |

---

## 8. Điểm nổi bật ✅

| # | Điểm nổi bật | Chi tiết |
|---|-------------|---------|
| 1 | **Không cần backend push server riêng** | Dùng Expo Push API miễn phí, không cần Firebase FCM |
| 2 | **Proximity alert chính xác** | Haversine formula tính khoảng cách cầu, không phải bounding box vuông |
| 3 | **Fire-and-forget notifications** | Không block HTTP response trong khi gửi notification |
| 4 | **Cross-platform navigation** | Tự động chọn Google Maps (Android), fallback Apple Maps (iOS) |
| 5 | **Graceful degradation** | Simulator không có Push Token → không crash app |
| 6 | **Auto-expire 24h** | Background job dọn SOS cũ, không để rác trong DB |
| 7 | **Feed priority sort** | SOS luôn lên đầu bảng tin |
| 8 | **Cache invalidation** | Xóa cache ngay khi tạo SOS → feed hiện thời gian thực |
| 9 | **iOS Marker fix** | Dùng `onSelect` thay `onPress` để marker hoạt động đúng trên iOS |
| 10 | **Dual-database sync** | Nội dung bài → MongoDB; Tọa độ GIS → PostgreSQL/PostGIS (phân tách trách nhiệm rõ ràng) |
| 11 | **GIS cleanup on resolve** | Khi SOS kết thúc, tọa độ bị xóa khỏi PostgreSQL để giữ bảng GIS sạch và chính xác |

---

## 9. Hạn chế & Cải tiến có thể làm ⚠️

| # | Hạn chế | Nguyên nhân | Hướng cải tiến |
|---|---------|------------|----------------|
| 1 | **Location chỉ cập nhật khi app mở** | Không có background location tracking | Dùng `expo-location` `startLocationUpdatesAsync` (cần permissions đặc biệt) |
| 2 | **Expo Push API giới hạn** | Free tier có rate limit | Nâng lên Expo paid hoặc tích hợp FCM/APNs trực tiếp |
| 3 | **Không có real-time map** | Dùng polling 30s thay WebSocket | Tích hợp Socket.io để map update tức thì |
| 4 | **Filter SOS bằng CPU** | Haversine tính JavaScript phía server | Dùng MongoDB `$geoNear` + 2dsphere index để DB tự filter |
| 5 | **Không resolve SOS từ app** | Chưa có nút "Đánh dấu đã xử lý" trong UI | Thêm nút resolve trong PostCard cho author/admin |
| 6 | **Không có SOS history** | Khi resolve → status="deleted" | Tạo endpoint `/api/sos/history` |
| 7 | **Ảnh SOS xem lại được** | Bài đã resolve nhưng ảnh vẫn trên Cloudinary | Thêm cleanup Cloudinary khi expire |

---

## 10. Cấu trúc file

```
Front-end/
├── features/SOS/
│   ├── SOSButton.tsx          # Nút nổi kéo được, pulse animation
│   ├── SOSModal.tsx           # Form gửi SOS (category, mô tả, ảnh, radius)
│   ├── SOSMap.tsx             # Bản đồ markers + bottom panel
│   ├── sosApi.ts              # API client (fetchActiveSOS, createSOS, ...)
│   └── notificationSetup.ts  # Đăng ký Push Token, handler foreground
├── features/social/
│   ├── PostCard.tsx           # Hiển thị banner SOS trong feed
│   └── mapPost.ts             # FeedPostUi type (postType, sosCategory)
└── app/(tabs)/sos.tsx         # Tab bản đồ SOS

Back-end/src/
├── controllers/sosController.js     # Logic chính (Haversine, notifications)
├── routes/sosRoutes.js              # Endpoint mapping
├── services/notificationService.js  # Expo Push API wrapper
└── services/sosCleanupService.js    # Auto-expire cron job
```

---

*Tài liệu này được tạo tự động bởi Antigravity AI — 2026-04-14*
