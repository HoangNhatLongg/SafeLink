# AI CONTEXT — SafeLink Project

> Cập nhật: 2026-04-14
> Mục đích: Cung cấp ngữ cảnh đầy đủ cho AI assistant khi làm việc với dự án này.

---

## 1. TỔNG QUAN DỰ ÁN

**Tên dự án:** SafeLink — Hệ thống chia sẻ thông tin cứu hộ

**Mô tả:**
Mạng xã hội tập trung vào an toàn cộng đồng, cho phép người dùng đăng tải, tìm kiếm và chia sẻ thông tin cứu hộ trong các tình huống khẩn cấp. Tích hợp: cảnh báo SOS realtime, định vị GIS, hệ thống mạng xã hội (bài viết, like, comment, follow), kiểm duyệt nội dung, và thư viện kỹ năng sơ cấp cứu.

---

## 2. TECH STACK

### Frontend
| Công nghệ | Chi tiết |
|-----------|---------|
| **React Native** | Expo SDK ~54 |
| **TypeScript** | ~5.9 |
| **Expo Router** | ~6.0 (file-based routing) |
| **Ngôn ngữ** | Tiếng Việt (i18next + react-i18next) |
| **State** | useState/useCallback/useFocusEffect (React hooks thuần) |
| **HTTP Client** | fetch gốc, wrapper `apiFetch` tự viết tại `features/api/http.ts` |
| **Media** | expo-image-picker, expo-av, expo-video |
| **Maps** | react-native-maps |
| **Auth lưu trữ** | AsyncStorage |

### Backend
| Công nghệ | Chi tiết |
|-----------|---------|
| **Node.js** | Express ^5 (ES Modules) |
| **MongoDB** | mongoose ^9 — dữ liệu xã hội (User, Post, Comment, Like, Follow, Report, OTP, AuthToken) |
| **PostgreSQL** | pg ^8 + PostGIS — lưu vị trí GPS bài viết (`post_locations`) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs, Token whitelist trong MongoDB |
| **OAuth** | Passport.js (Google OAuth2, Facebook) |
| **Email** | Nodemailer — OTP xác thực |
| **Upload** | Multer — ảnh + video (lưu vào `../uploads/`) |
| **Port** | 5000 (default) |
| **IP Dev** | `192.168.1.185:5000` (đổi trong `constants/api.ts` khi thay mạng) |

---

## 3. CẤU TRÚC THƯ MỤC

```
SafeLink/
├── Back-end/
│   ├── server.js              # Entry: kết nối MongoDB + PostgreSQL, start server
│   ├── src/
│   │   ├── app.js             # Express setup, mount routes
│   │   ├── config/
│   │   │   ├── db.js          # MongoDB connect
│   │   │   ├── passport.js    # Google + Facebook OAuth
│   │   │   └── postgresConfig.js # Pool pg, initGISTable, CRUD post_locations
│   │   ├── models/            # Mongoose schemas
│   │   │   ├── userModel.js
│   │   │   ├── postModel.js
│   │   │   ├── commentModel.js
│   │   │   ├── likeModel.js
│   │   │   ├── followModel.js
│   │   │   ├── reportModel.js
│   │   │   ├── otpModel.js
│   │   │   ├── authTokenModel.js
│   │   │   └── directoryModel.js  # Danh bạ khẩn cấp (Haversine, status: active|pending|rejected)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── postController.js   # CRUD, like, dislike, save, hide, share, report, feed, nearby, recommended
│   │   │   ├── commentController.js
│   │   │   ├── followController.js
│   │   │   ├── userController.js   # Profile, avatar, cover, suggestions
│   │   │   ├── moderationController.js
│   │   │   ├── searchController.js
│   │   │   ├── directoryController.js  # Directory CRUD + Haversine nearby + review
│   │   │   └── volunteerController.js  # Volunteer CRUD: register, getAll, nearby, pending, review, my
│   │   ├── routes/
│   │   │   ├── authRoutes.js       # /api/auth
│   │   │   ├── postRoutes.js       # /api/posts
│   │   │   ├── commentRoutes.js    # /api/comments
│   │   │   ├── followRoutes.js     # /api/users/:id/follow|followers|following
│   │   │   ├── userRoutes.js       # /api/users
│   │   │   ├── moderationRoutes.js # /api/moderation
│   │   │   ├── searchRoutes.js     # /api/search
│   │   │   ├── directoryRoutes.js  # /api/directory
│   │   │   └── volunteerRoutes.js  # /api/volunteers
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   # verifyToken, optionalAuth
│   │   │   ├── roleMiddleware.js   # requireRole (moderator/admin)
│   │   │   └── upload.js           # Multer: uploadPostMedia, uploadAvatarMedia, uploadCoverMedia
│   │   ├── services/
│   │   │   ├── authService.js      # issueAuthToken, OTP logic
│   │   │   ├── emailService.js     # Gửi OTP qua email
│   │   │   └── geocodeService.js   # Reverse geocode từ lat/lng
│   │   └── utils/
│   └── assets/
│
├── Front-end/
│   ├── app/
│   │   ├── _layout.tsx            # Root Stack: session expired handler, màn hình toàn app
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx        # Tab navigator
│   │   │   ├── index.tsx          # Tab Home: Feed bài viết (FlatList, phân trang)
│   │   │   ├── sos.tsx            # Tab SOS
│   │   │   ├── directory.tsx      # Tab Danh bạ cứu hộ (không cần đăng nhập)
│   │   │   ├── skills.tsx         # Tab Thư viện kỹ năng
│   │   │   └── menu.tsx           # Tab Menu (Settings, Logout...)
│   │   ├── auth/
│   │   │   └── verify-otp.tsx     # OTP xác thực đăng ký
│   │   ├── post/
│   │   │   └── [id].tsx           # Chi tiết bài viết + comments
│   │   ├── user/
│   │   │   └── [id].tsx           # Xem profile người dùng khác
│   │   ├── create-post.tsx        # Tạo/sửa bài (ảnh, video, vị trí, hashtag)
│   │   ├── profile.tsx            # Trang cá nhân của tôi
│   │   ├── followers-list.tsx     # Danh sách followers/following
│   │   ├── search.tsx             # Global search (users + posts + hashtags)
│   │   ├── saved-posts.tsx        # Bài đã lưu
│   │   ├── nearby.tsx             # Bài viết gần vị trí (PostGIS)
│   │   ├── moderation.tsx         # Báo cáo vi phạm
│   │   ├── directory-moderation.tsx # Admin duyệt đóng góp danh bạ
│   │   ├── volunteer-moderation.tsx # Admin duyệt đăng ký đội tình nguyện
│   │   ├── register-volunteer.tsx # Route đăng ký làm đội cứu hộ
│   │   ├── saved-directory.tsx    # Quản lý danh bạ đã lưu offline
│   │   ├── privacy.tsx            # Cài đặt quyền riêng tư
│   │   ├── login.tsx / register.tsx
│   │   └── oauth.tsx              # OAuth callback handler
│   │
│   ├── features/
│   │   ├── api/
│   │   │   └── http.ts            # apiFetch (Bearer token, timeout 5 phút), parseJson, ApiError
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── services/          # authApi.ts
│   │   │   └── utils/storage.ts   # getToken, saveToken, clearSession, getUserJson, saveUserJson
│   │   ├── social/
│   │   │   ├── PostCard.tsx       # Card bài viết (like, dislike, comment, save, hide, share, report)
│   │   │   ├── CreatePostBox.tsx
│   │   │   ├── MediaGrid.tsx      # Grid ảnh/video responsive
│   │   │   ├── ImageGrid.tsx / ImageGridPreview.tsx
│   │   │   ├── VideoPlayer.tsx / VideoFullscreen.tsx
│   │   │   ├── ImageViewerModal.tsx
│   │   │   ├── BreakingNewsTicker.tsx
│   │   │   ├── LayoutPicker.tsx
│   │   │   ├── mapPost.ts         # mapApiPostToUi (API → UI type)
│   │   │   ├── videoVisibilityStore.ts # Pause video ngoài viewport
│   │   │   ├── utils/
│   │   │   └── services/
│   │   │       └── postsApi.ts    # Tất cả call API liên quan bài viết, follow, search
│   │   ├── user/
│   │   │   └── services/userApi.ts
│   │   ├── moderation/
│   │   ├── emergency/
│   │   │   ├── AgencyCard.tsx     # Card đơn vị (call, bookmark, directions)
│   │   │   ├── FilterBar.tsx      # Bộ lọc mode/search/type/province
│   │   │   ├── MapSection.tsx     # Bản đồ với Callout 220px cố định
│   │   │   ├── ContributeModal.tsx# Form đóng góp danh bạ chính thức
│   │   │   ├── RegisterVolunteerModal.tsx # Form đăng ký đội tình nguyện
│   │   │   ├── directoryApi.ts    # API calls (timeout 8s, fetchWithTimeout)
│   │   │   ├── volunteerApi.ts    # API calls đăng ký tình nguyện
│   │   │   ├── volunteerTypes.ts  # Types + labels + icons + colors
│   │   │   ├── offlineStorage.ts  # AsyncStorage: saved + cache
│   │   │   ├── agencyData.ts      # 25 built-in fallback entries (SĐT thật)
│   │   │   ├── locationService.ts # expo-location GPS
│   │   │   └── types.ts           # Agency, AgencyType, ContributePayload
│   │   └── SOS/
│   │       ├── MapSection.tsx
│   │       ├── agencyData.ts
│   │       └── locationService.ts
│   │
│   ├── constants/
│   │   ├── api.ts                 # API_BASE = 'http://<IP>:5000'  ← đổi IP khi thay mạng
│   │   └── theme.ts
│   ├── components/                # Shared UI components
│   ├── hooks/
│   ├── locales/                   # i18n translations
│   ├── data/
│   └── assets/
│
├── Context/
│   └── AI_Context.md              # File này
└── uploads/                       # Media uploads (ảnh/video bài viết)
```

---

## 4. DATABASE SCHEMA (MongoDB)

### User
```js
{
  name, email (unique, required), password (bcrypt), authType: 'local|google|facebook',
  googleId, facebookId,
  role: 'user|moderator|admin',  status: 'active|banned',
  avatar, cover,
  profile: { bio, birthday, hometown, phone, privacy: { showBirthday, showHometown, showPhone, showEmail, showFollowers, showFollowing } },
  devices: [{ deviceId, pushToken, isTrusted, lastLogin }],
  failedLoginAttempts, lockUntil,
  timestamps
}
```

### Post
```js
{
  author (ref User), content (max 5000), tags: [String],
  images: [{ url, filename }], videos: [{ url, filename }],
  location: { latitude, longitude, address },
  visibility: 'public|friends|private',
  postType: 'normal|sos',  sosExpiresAt,
  likesCount, dislikesCount, score (= likes - dislikes), commentsCount, sharesCount,
  savedBy: [userId], hiddenBy: [userId],
  status: 'active|deleted|flagged',
  timestamps
}
// Indexes: {status,createdAt}, {status,score}, {author,status,createdAt}, {postType,status,createdAt}
```

### Comment
```js
{ post (ref Post), author (ref User), content, parentComment, likesCount, status, timestamps }
```

### Like
```js
{ user, target (post|comment id), targetType: 'Post|Comment', reactionType: 'like|dislike', timestamps }
```

### Follow
```js
{ follower (ref User), following (ref User), timestamps }
// unique index: { follower, following }
```

### Report
```js
{ reporter, targetPost, reason: 'spam|inappropriate|misinformation|harassment|violence|copyright|other',
  description, status: 'pending|reviewed|dismissed', timestamps }
```

### OTP
```js
{ email, otp, type: 'register|forgot', expiresAt (TTL), pendingUserData }
```

### AuthToken (whitelist)
```js
{ userId, token, authType, createdAt (TTL) }
```

### PostgreSQL — post_locations
```sql
post_id VARCHAR UNIQUE, user_id VARCHAR,
latitude DOUBLE, longitude DOUBLE,
location GEOGRAPHY(POINT, 4326),   -- PostGIS
address TEXT, created_at TIMESTAMPTZ
-- Index: GIST(location) cho ST_DWithin
```

### Volunteer (MongoDB)
```js
{
  unitName (required, max 200),
  unitType: 'sua_xe|doi_sos|ho_tro_lu|cuu_nan|y_te_tn|van_chuyen|on_dinh|khac',
  entityKind: 'individual|group',
  contactName (required, max 100),
  phone (required), address (required), province (required),
  district, ward,
  lat, lng (required),
  description (max 2000), serviceArea (max 500), availableTime (max 200), note,
  verificationImages: [{ url, publicId?, filename? }],  // tối đa 5 ảnh
  status: 'pending|active|rejected',  // default: 'pending'
  submittedBy (ref User), reviewedBy (ref User), reviewedAt, rejectReason,
  timestamps
}
// Indexes: {unitType,status}, {province,district}, {lat,lng}, text {unitName,description}
```

### Skill (MongoDB)
```js
{
  title (required, max 200), summary (max 500),
  category: 'so_cap_cuu|pccc|thien_tai|an_toan_dien|tai_nan|tam_ly|khac',
  coverImage: { url, publicId },         // Ảnh bìa card
  videoUrl: String,                      // YouTube link (embed khi xem online)
  steps: [{
    order: Number,
    title: String,
    content: String (max 3000),
    images: [{ url, publicId }],         // Ảnh minh họa từng bước
  }],
  tags: [String], difficulty: 'co_ban|trung_binh|nang_cao',
  duration: String,                      // VD: "5-10 phút"
  status: 'active|pending|rejected',     // default: 'pending'
  submittedBy (ref User), reviewedBy (ref User), reviewedAt, rejectReason,
  viewCount: Number,
  timestamps
}
// Indexes: {status,category}, {status,createdAt}, text index {title,summary,tags}
```

---

## 5. API ENDPOINTS

### Auth — `/api/auth`
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| POST | `/register-request` | Gửi OTP đăng ký | Không |
| POST | `/register-verify` | Xác minh OTP, tạo user | Không |
| POST | `/login` | Đăng nhập local | Không |
| POST | `/verify-device` | OTP xác thực thiết bị lạ | Không |
| POST | `/forgot-password` | Gửi OTP reset mật khẩu | Không |
| POST | `/reset-password` | Đặt lại mật khẩu | Không |
| POST | `/logout` | Xóa token khỏi whitelist | JWT |
| GET | `/google` → `/google/callback` | OAuth Google | - |
| GET | `/facebook` → `/facebook/callback` | OAuth Facebook | - |

### Posts — `/api/posts` (yêu cầu JWT)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Feed chuẩn (phân trang, lọc theo authorId) |
| POST | `/` | Tạo bài viết (FormData: content, tags, images, videos, lat, lng, postType) |
| GET | `/saved` | Bài đã lưu |
| GET | `/nearby` | Bài gần vị trí (PostGIS, params: lat, lng, radius) |
| GET | `/recommended` | Feed đề xuất 5 tầng (SOS → Friends → Nearby → Top → Remaining) |
| GET | `/:id` | Chi tiết bài |
| PUT | `/:id` | Sửa bài (FormData) |
| DELETE | `/:id` | Xóa bài |
| POST | `/:id/like` | Like (toggle) |
| POST | `/:id/dislike` | Dislike (toggle) |
| POST | `/:id/save` | Lưu/bỏ lưu |
| POST | `/:id/hide` | Ẩn/bỏ ẩn |
| POST | `/:id/share` | Chia sẻ |
| POST | `/:id/report` | Báo cáo |
| GET | `/:id/comments` | Lấy comments |
| POST | `/:id/comments` | Thêm comment |

### Comments — `/api/comments` (JWT)
- CRUD comment, reply, reactions

### Users — `/api/users` (JWT / optional)
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/me` | Thông tin tôi | JWT |
| PATCH | `/me` | Cập nhật profile | JWT |
| POST | `/me/avatar` | Upload ảnh đại diện | JWT |
| POST | `/me/cover` | Upload ảnh bìa | JWT |
| GET | `/suggestions` | Gợi ý người theo dõi | JWT |
| GET | `/:id/profile` | Xem profile người khác | Optional |
| POST | `/:id/follow` | Follow | JWT |
| DELETE | `/:id/follow` | Unfollow | JWT |
| GET | `/:id/followers` | Danh sách người theo dõi | JWT |
| GET | `/:id/following` | Danh sách đang theo dõi | JWT |

### Search — `/api/search` (JWT)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Global search users + posts (params: q, type, page, limit) |
| GET | `/tags/suggest` | Gợi ý hashtag (params: q) |

### Moderation — `/api/moderation` (Moderator/Admin)
- Quản lý báo cáo, duyệt/từ chối bài viết

### Directory — `/api/directory` (Public / Moderator)
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/` | Danh sách (params: province, district, type, search, page, limit) | Không |
| GET | `/nearby` | Gần vị trí Haversine (params: lat, lng, radius=5km) | Không |
| POST | `/contribute` | Đóng góp mới (status=pending) | Optional JWT |
| GET | `/pending` | Danh sách chờ duyệt | Moderator |
| PATCH | `/:id/review` | Duyệt/Từ chối (body: action, rejectReason) | Moderator |

### Skills — `/api/skills` (Public / JWT / Moderator)
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/` | Danh sách (params: category, difficulty, search, page, limit) | Không |
| GET | `/pending` | Danh sách chờ duyệt | Moderator |
| POST | `/contribute` | Đóng góp kỹ năng mới (FormData: title, steps, ảnh, ...) | JWT |
| GET | `/:id` | Chi tiết kỹ năng (đầy đủ steps + ảnh) | Không |
| POST | `/:id/view` | Tăng lượt xem | Không |
| PATCH | `/:id/review` | Duyệt/Từ chối (body: action, rejectReason) | Moderator |

### Volunteers — `/api/volunteers` (Public / JWT / Admin)
| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/` | Danh sách đội tình nguyện đã duyệt (params: province, district, unitType, search) | Không |
| GET | `/nearby` | Gần vị trí (params: lat, lng, radius=10) | Không |
| POST | `/register` | Đăng ký làm đội tình nguyện (FormData + ảnh xác minh) | JWT |
| GET | `/my` | Xem đơn đăng ký của chính mình | JWT |
| GET | `/pending` | Danh sách chờ duyệt | Admin |
| PATCH | `/:id/review` | Duyệt/Từ chối (body: action, rejectReason) | Admin |

---

## 6. LUỒNG XỬ LÝ CHÍNH

### Authentication Flow
1. User nhập email → backend gửi OTP email
2. Xác minh OTP → tạo User + cấp JWT token
3. Token được lưu vào DB (whitelist) và AsyncStorage (client)
4. Mỗi request gửi `Authorization: Bearer <token>`
5. Backend verify JWT + kiểm tra whitelist + lấy user từ DB
6. Thiết bị lạ → yêu cầu OTP bổ sung (2FA)
7. Token hết hạn → `onSessionExpired` alert → redirect `/login`

### Feed & Recommendation (5 tầng)
```
Tier 1: SOS posts (postType='sos', còn hạn)
Tier 2: Bài của người đang follow
Tier 3: Bài gần vị trí GPS (PostGIS ST_DWithin)
Tier 4: Bài điểm cao nhất (score = likes - dislikes)
Tier 5: Các bài còn lại
```
- Bài hidden/deleted bị loại khỏi feed
- Phân trang: page + limit, trả về `meta.tiers` thống kê từng tier

### Post Upload Flow
- Client gửi `FormData` (ảnh/video + metadata)
- Multer lưu file vào `uploads/` (max 200MB video, 20MB ảnh)
- Backend lưu vị trí vào PostgreSQL (PostGIS) nếu có lat/lng
- Timeout frontend: **5 phút** (đủ cho video lớn qua Wi-Fi)

### Follow System
- Bảng `follows`: follower → following
- Unfollow = xóa document
- Khi xem profile người khác: `optionalAuth` check `isFollowing`

---

## 7. CODING RULES

- **TypeScript strict** phía Frontend
- **ES Modules** (`import/export`) phía Backend (type: "module")
- Tách rõ **controller / service / middleware** — không viết business logic trong controller
- API luôn trả JSON: `{ message, data? }` hoặc `{ error }`
- Xử lý lỗi nhất quán: try/catch trong controller, trả status code phù hợp
- Upload media: dùng `uploadPostMiddleware` bắt lỗi Multer rõ ràng (400 thay vì 500)
- Frontend: dùng `apiFetch` + `parseJson` — không dùng axios trực tiếp
- Comments trong code: Tiếng Việt
- Tên biến/function: tiếng Anh (camelCase)

---

## 8. SECURITY

| Cơ chế | Mô tả |
|--------|-------|
| JWT | Access token, lưu whitelist trong MongoDB (AuthToken) |
| OTP | Đăng ký + thiết bị lạ + quên mật khẩu (Nodemailer, TTL tự động xóa) |
| bcryptjs | Hash password |
| Token revocation | Logout xóa AuthToken khỏi DB |
| Account lock | failedLoginAttempts + lockUntil |
| Role-based | `requireRole('moderator'|'admin')` middleware |
| Banned check | Middleware trả 403 nếu `user.status === 'banned'` |
| Multer limits | File size + MIME type kiểm tra |
| CORS | Đang để mở (development) — cần restrict production |

---

## 9. FRONTEND PATTERNS

### HTTP Client (`features/api/http.ts`)
```ts
apiFetch(path, options, skipAuth?)  // Tự thêm Bearer token, timeout 5 phút
parseJson<T>(res)                   // Parse JSON + throw ApiError nếu !res.ok
ApiError { message, status }        // Lỗi có HTTP status
setSessionExpiredHandler(fn)        // Đăng ký callback khi 401
```

### Storage (`features/auth/utils/storage.ts`)
```ts
getToken() / saveToken() / clearSession()
getUserJson() / saveUserJson()     // Cache user info local
```

### Posts API (`features/social/services/postsApi.ts`)
```ts
fetchFeed(page, limit, authorId?)
fetchRecommendedFeed(page, limit, lat?, lng?, radius?)
fetchNearby(lat, lng, radius, limit)
fetchSavedPosts(page, limit)
fetchPost(id)
createPostFormData(form: FormData)
updatePostFormData(id, form)
deletePost(id)
likePost(id) / dislikePost(id)
toggleSavePost(id) / toggleHidePost(id)
sharePost(id) / reportPost(id, reason, description?)
fetchComments(postId, page, limit)
addComment(postId, content)
followUser(userId) / unfollowUser(userId)
fetchFollowers(userId, search, page, limit)
fetchFollowing(userId, search, page, limit)
fetchGlobalSearch(q, type, page, limit)
fetchTagSuggestions(q)
```

### Navigation (Expo Router file-based)
```
(tabs)/index             → Home Feed
(tabs)/sos               → SOS
(tabs)/directory         → Danh bạ khẩn cấp
(tabs)/skills            → Thư viện kỹ năng
(tabs)/menu              → Menu
create-post              → Tạo bài viết (stack modal)
post/[id]                → Chi tiết bài
user/[id]                → Profile người dùng
profile                  → Profile của tôi
search                   → Tìm kiếm toàn cục
saved-posts              → Bài đã lưu
saved-directory          → Danh bạ đã lưu (offline)
skill/[id]               → Chi tiết kỹ năng (việt kèm ảnh offline)
saved-skills             → Kỹ năng đã lưu offline
skill-moderation         → Duyệt đóng góp kỹ năng (Moderator)
nearby                   → Bài viết gần đây
followers-list           → Followers/Following
moderation               → Duyệt báo cáo bài viết
directory-moderation     → Duyệt đóng góp danh bạ (Moderator)
privacy                  → Quyền riêng tư
auth/verify-otp          → OTP xác thực
oauth                    → OAuth callback
```

### Directory API (`features/emergency/directoryApi.ts`)
```ts
fetchDirectory({ province?, district?, type?, search?, page?, limit? })
// → dùng fetchWithTimeout (8s) thay vì apiFetch
fetchNearbyDirectory({ lat, lng, radius?, type? })
contributeDirectory(payload: ContributePayload)
fetchPendingDirectory()                          // Moderator
reviewDirectoryItem(id, action, rejectReason?)   // Moderator
```

### Skills API (`features/skills/skillsApi.ts`)
```ts
fetchSkills({ category?, difficulty?, search?, page?, limit? })
// → dùng fetchWithTimeout (8s) — public, không cần token
fetchSkillDetail(id)
incrementSkillView(id)
contributeSkill(formData: FormData)  // JWT required
fetchPendingSkills(page?)            // Moderator
reviewSkill(id, action, rejectReason?)  // Moderator
```

### Skills Offline Storage (`features/skills/skillsOfflineStorage.ts`)
```ts
saveSkill(skill)        // Download toàn bộ ảnh về expo-file-system, không save video
removeSkill(id)         // Xóa ảnh local + entry AsyncStorage
getSavedSkills()
isSkillSaved(id)
clearAllSavedSkills()   // Xóa toàn bộ skills_images/
cacheSkillsList(items) / getCachedSkillsList() / isCacheValid(cache)
```

### Offline Storage (`features/emergency/offlineStorage.ts`)
```ts
saveAgency(agency) / removeAgency(id) / getSavedAgencies()
isAgencySaved(id) / clearAllSavedAgencies()
cacheDirectoryData(items) / getCachedDirectory() / isCacheValid(cache)
```

---

## 10. CONFIGURATION

### Đổi IP backend
File: `Front-end/constants/api.ts`
```ts
export const API_BASE = 'http://<IP_MÁY_BACKEND>:5000';
```

### Backend .env
```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
POSTGRES_URI=postgresql://...  # optional (PostGIS)
EMAIL_USER=...
EMAIL_PASS=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
OAUTH_SUCCESS_REDIRECT=...
```

---

## 11. TRẠNG THÁI HIỆN TẠI

### Đã hoàn thành ✅
- Hệ thống Auth: đăng ký/đăng nhập OTP, Google/Facebook OAuth, JWT whitelist, 2FA thiết bị lạ, Quên mật khẩu
- CRUD bài viết (text + ảnh + video), hỗ trợ ảnh/video đồng thời
- PostCard: like, dislike, save, hide, share, report, comments (like + reply)
- Feed phân trang (infinite scroll)
- Feed đề xuất 5 tầng (SOS → Friends → Nearby → TopScore → Remaining)
- Bài viết theo vị trí (PostGIS ST_DWithin)
- Hệ thống Follow/Unfollow, danh sách followers/following
- Global Search: tìm kiếm users và posts
- Gợi ý hashtag (tag suggestions)
- Profile người dùng: xem, sửa, avatar, cover, privacy settings
- Trang bài viết đã lưu
- Kiểm duyệt (Moderation): duyệt/từ chối báo cáo bài viết
- Video upload với timeout 5 phút
- Camera capture trực tiếp khi tạo bài
- i18n (Tiếng Việt)
- **Danh bạ khẩn cấp (Directory)** — tải từ API, filter local, offline cache, bookmark, bản đồ, đóng góp, admin duyệt
  - 3 nguồn dữ liệu: MongoDB API → AsyncStorage cache → Built-in 25 entries
  - Filter client-side: type chip + search bar (không gọi API lại)
  - Callout bản đồ: width 220px cố định (fix clipped bug)
  - Màn hình quản lý danh bạ đã lưu (`/saved-directory`)
  - Màn hình duyệt đóng góp cho Moderator (`/directory-moderation`)
- **Đăng ký Đội Cứu Hộ / Tình Nguyện** — mới! Đăng ký làm đội hỗ trợ cộng đồng
  - 8 loại: Vá/Sửa xe, Đội SOS, Hỗ trợ lũ lụt, Cứu nạn, Y tế TN, Vận chuyển, Ổn định, Khác
  - Đăng ký cá nhân hoặc nhóm/tổ chức
  - Upload tối đa 5 ảnh xác minh (CMND, ảnh đội, phương tiện...)
  - Model riêng (volunteerModel.js) tách biệt khỏi Directory chính thức
  - Admin duyệt riêng tại `/volunteer-moderation`
  - Nguyên tắc xét duyệt: chỉ Admin (không phải Moderator)
  - Hiển thị trong tab "Tình nguyện" ở tab Danh Bạ
  - Menu: “Đăng ký làm đội cứu hộ” ở mọi user đã đăng nhập
  - Chuẩn bị kết nối với SOS (sẽ phát triển sau)
- **SOS Khẩn cấp** — gửi tín hiệu SOS kèm GPS, ảnh, phân loại sự cố; bản đồ realtime; push notification
  - Nút SOS nổi (draggable), ấn giữ → SOSModal (form phân loại + ảnh)
  - Bản đồ SOSMap: hiển thị marker SOS active trong bán kính, cập nhật 30s/lần
  - Ấn marker → Bottom Panel: xem bài viết / chỉ đường Google Maps
  - PostCard: banner "🆘 TÍN HIỆU KHẨN CẤP · [loại sự cố]" cho bài SOS
  - Backend: tự hết hạn sau 24h, Haversine notify users lân cận, ưu tiên đầu feed
  - Phân loại: 🔥 Hỏa hoạn, ⛰️ Sạt lở, 🚗 Tai nạn, 🚨 Cướp giật, 🏥 Y tế, 🌊 Lũ lụt, ⚠️ Khác
  - Tài liệu chi tiết: `Context/SOS_Technical_Doc.md`
- **Thư viện kỹ năng (Skills)** — danh sách kỹ năng an toàn cộng đồng
  - Danh mục: Sơ cấp cứu, PCCC, Thiên tai, An toàn điện, Tai nạn, Tâm lý, Khác
  - Grid 2 cột SkillCard: ảnh bìa, badge danh mục/độ khó, bookmark
  - Tìm kiếm + filter danh mục (online: server, offline: client-side)
  - Chi tiết kỹ năng: video YouTube WebView (online), các bước + ảnh minh họa
  - **Offline**: download toàn bộ ảnh (cover + step images) vào expo-file-system
  - Video không save offline — chỉ xem khi có kết nối
  - Đóng góp kỹ năng: yêu cầu JWT, gửi FormData (có ảnh), chờ moderator duyệt
  - Màn hình `/saved-skills`: quản lý kỹ năng đã lưu offline
  - Màn hình `/skill-moderation`: Moderator duyệt/từ chối đóng góp

### Chưa hoàn thành / Đang phát triển 🔧
- Push Notification (chưa tích hợp FCM/APNS)
- Admin Web (chưa xây dựng)
- Rate limiting API
- WebSocket / Realtime notifications
- AI phân loại nội dung
- Production deployment
- Directory: seed thêm dữ liệu thật vào MongoDB
- Skills: seed dữ liệu mẫu cho các danh mục

---

## 12. ROADMAP

1. **SOS Realtime** — WebSocket, notify người gần nhất
2. **Push Notification** — FCM/APNS cho bài SOS
3. **Thư viện kỹ năng** — CRUD bài từ Admin
4. **Admin Web** — Dashboard kiểm duyệt, quản lý user
5. **AI phân loại** — Tự động detect bài vi phạm
6. **Rate Limit** — Express rate-limiter
7. **Production** — Docker, CI/CD, nginx, HTTPS
---

## 13. LƯU Ý QUAN TRỌNG

- Backend dùng `npm start` (node thường, **KHÔNG có hot reload**). Sau khi sửa code backend **PHẢI restart** server. Dùng `npm run dev` (nodemon) trong development.
- `directoryApi.ts` dùng `fetchWithTimeout` (raw fetch + 8s timeout), **KHÔNG** dùng `apiFetch` — vì directory là public API, không cần Bearer token.
- `skillsApi.ts` tương tự: dùng `fetchWithTimeout` cho public endpoints (GET list/detail), dùng `apiFetch` cho contribute/pending/review.
- Filter theo `type` trong directory là **client-side** hoàn toàn, không gọi API lại.
- Skills offline: ảnh được download về `documentDirectory/skills_images/` qua `expo-file-system`. Video **không** được lưu offline.
- Route thứ tự trong skillRoutes: `/pending` và `/contribute` phải đặt **TRƯỚC** `/:id` để Express không match lầm vào dynamic param.
- Callout trong `react-native-maps` **phải** có `width` cố định (không dùng `tooltip` prop) để tránh bị clipped.
- Banner "dữ liệu cũ" chỉ hiện khi có cache > 1 giờ. Mock/built-in data không kích hoạt banner.
- AI_Context.md có file chi tiết kỹ thuật ở `Context/Directory_Technical_Doc.md` và `Context/Skill_Library_Technical_Doc.md`.
- Cập nhật: 2026-04-15
