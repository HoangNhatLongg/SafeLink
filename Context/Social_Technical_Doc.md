# Mạng Xã Hội SafeLink — Tài liệu kỹ thuật

> Cập nhật: 2026-04-14  
> Phạm vi: Toàn bộ tính năng mạng xã hội (Posts, Comments, Likes, Follow, Search, Profile, Moderation)

---

## 1. TỔNG QUAN

SafeLink tích hợp một mạng xã hội tập trung vào **an toàn cộng đồng**, cho phép người dùng:

| Nhóm tính năng | Mô tả |
|---|---|
| **Bài viết** | Đăng text + ảnh + video, có vị trí GPS, hashtag, loại bài (normal / SOS) |
| **Tương tác** | Like, Dislike, Bình luận (reply nesting), Lưu, Ẩn, Chia sẻ, Báo cáo |
| **Feed** | Feed chuẩn + Feed đề xuất 5 tầng (SOS → Friends → Nearby → TopScore → All) |
| **Follow** | Theo dõi / bỏ theo dõi người dùng |
| **Tìm kiếm** | Global search: users + posts + hashtag suggestions |
| **Profile** | Xem & chỉnh sửa hồ sơ, ảnh đại diện, ảnh bìa, privacy |
| **Kiểm duyệt** | Moderator/Admin duyệt báo cáo vi phạm |

---

## 2. KIẾN TRÚC

```
┌───────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│                                                               │
│  app/(tabs)/index.tsx        ← Feed chính                    │
│  app/post/[id].tsx           ← Chi tiết bài + comments       │
│  app/create-post.tsx         ← Tạo / sửa bài                │
│  app/profile.tsx             ← Profile của tôi               │
│  app/user/[id].tsx           ← Profile người dùng khác       │
│  app/search.tsx              ← Tìm kiếm toàn cục            │
│  app/saved-posts.tsx         ← Bài đã lưu                   │
│  app/nearby.tsx              ← Bài viết gần GPS              │
│  app/followers-list.tsx      ← Danh sách followers/following │
│  app/moderation.tsx          ← Admin duyệt báo cáo           │
│                                                               │
│  features/social/                                             │
│   ├── PostCard.tsx           ← Card bài viết (tất cả actions)│
│   ├── CommentItem.tsx        ← Comment item (like + reply)   │
│   ├── CreatePostBox.tsx      ← Quick-create box trong feed   │
│   ├── MediaGrid.tsx          ← Grid ảnh/video responsive     │
│   ├── ImageGrid.tsx          ← Grid ảnh layout động          │
│   ├── ImageGridPreview.tsx   ← Preview khi tạo bài           │
│   ├── VideoPlayer.tsx        ← Video player inline            │
│   ├── VideoFullscreen.tsx    ← Video fullscreen               │
│   ├── ImageViewerModal.tsx   ← Phóng to ảnh                  │
│   ├── BreakingNewsTicker.tsx ← Ticker tin khẩn cấp           │
│   ├── LayoutPicker.tsx       ← Chọn layout ảnh               │
│   ├── mapPost.ts             ← mapApiPostToUi()              │
│   ├── videoVisibilityStore.ts← Pause video khi out-of-view   │
│   └── services/postsApi.ts   ← Tất cả HTTP calls             │
└───────────────────────────────────────────────────────────────┘
                    │ HTTP (apiFetch + Bearer JWT)
                    ▼
┌───────────────────────────────────────────────────────────────┐
│                         BACKEND                               │
│                                                               │
│  /api/posts          ← postController.js                     │
│  /api/comments       ← commentController.js                  │
│  /api/users          ← userController.js + followController  │
│  /api/search         ← searchController.js                   │
│  /api/moderation     ← moderationController.js               │
└───────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
     MongoDB                       PostgreSQL (PostGIS)
  (User, Post,                  post_locations
   Comment, Like,               (lat, lng, GIST index)
   Follow, Report,
   OTP, AuthToken)
```

---

## 3. DATABASE SCHEMA

### Post
```js
{
  author: ObjectId (ref User, required),
  content: String (max 5000),
  tags: [String],                          // hashtags
  images: [{ url, filename }],
  videos: [{ url, filename }],
  location: { latitude, longitude, address },
  visibility: 'public' | 'friends' | 'private',
  postType: 'normal' | 'sos',
  sosCategory: 'fire' | 'landslide' | 'traffic' | 'robbery' | 'medical' | 'flood' | 'other',
  sosExpiresAt: Date,                      // tự hết hạn sau 24h
  likesCount, dislikesCount,
  score: Number,                           // = likesCount - dislikesCount (index)
  commentsCount, sharesCount,
  savedBy: [ObjectId],
  hiddenBy: [ObjectId],
  status: 'active' | 'deleted' | 'flagged',
  timestamps
}
// Indexes: {status,createdAt}, {status,score}, {author,status}, {postType,status,sosExpiresAt}
```

### Comment
```js
{
  post: ObjectId (ref Post),
  author: ObjectId (ref User),
  content: String,
  parentComment: ObjectId (ref Comment),   // null = top-level, non-null = reply
  likesCount: Number,
  status: 'active' | 'deleted',
  timestamps
}
```

### Like (dùng chung cho Post và Comment)
```js
{
  user: ObjectId (ref User),
  target: ObjectId,                        // postId hoặc commentId
  targetType: 'Post' | 'Comment',
  reactionType: 'like' | 'dislike',
  timestamps
}
// unique index: { user, target, targetType }
```

### Follow
```js
{
  follower: ObjectId (ref User),
  following: ObjectId (ref User),
  timestamps
}
// unique index: { follower, following }
```

### Report
```js
{
  reporter: ObjectId (ref User),
  targetPost: ObjectId (ref Post),
  reason: 'spam' | 'inappropriate' | 'misinformation' | 'harassment' | 'violence' | 'copyright' | 'other',
  description: String,
  status: 'pending' | 'reviewed' | 'dismissed',
  timestamps
}
```

### PostgreSQL — post_locations
```sql
post_id     VARCHAR UNIQUE,
user_id     VARCHAR,
latitude    DOUBLE PRECISION,
longitude   DOUBLE PRECISION,
location    GEOGRAPHY(POINT, 4326),   -- PostGIS, dùng ST_DWithin
address     TEXT,
created_at  TIMESTAMPTZ
-- Index: GIST(location)
```

---

## 4. API ENDPOINTS

### Posts — `/api/posts`

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/` | Feed chuẩn (page, limit, authorId?) | JWT |
| GET | `/recommended` | Feed đề xuất 5 tầng | JWT |
| GET | `/saved` | Bài đã lưu | JWT |
| GET | `/nearby` | Bài gần GPS (lat, lng, radius) | JWT |
| POST | `/` | Tạo bài (FormData) | JWT |
| GET | `/:id` | Chi tiết bài | JWT |
| PUT | `/:id` | Sửa bài (FormData) | JWT (chủ bài) |
| DELETE | `/:id` | Xóa bài | JWT (chủ bài / mod) |
| POST | `/:id/like` | Toggle like | JWT |
| POST | `/:id/dislike` | Toggle dislike | JWT |
| POST | `/:id/save` | Toggle lưu | JWT |
| POST | `/:id/hide` | Toggle ẩn | JWT |
| POST | `/:id/share` | Đếm chia sẻ | JWT |
| POST | `/:id/report` | Báo cáo vi phạm | JWT |
| GET | `/:id/comments` | Danh sách comment (page, limit) | JWT |
| POST | `/:id/comments` | Thêm comment / reply | JWT |

### Comments — `/api/comments`

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| POST | `/:id/like` | Toggle like comment | JWT |
| GET | `/:id/replies` | Lấy replies của comment | JWT |
| PUT | `/:id` | Sửa comment | JWT (chủ comment) |
| DELETE | `/:id` | Xóa comment | JWT (chủ / mod) |

### Users — `/api/users`

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/me` | Thông tin tôi | JWT |
| PATCH | `/me` | Cập nhật profile | JWT |
| POST | `/me/avatar` | Upload avatar | JWT |
| POST | `/me/cover` | Upload ảnh bìa | JWT |
| GET | `/suggestions` | Gợi ý follow | JWT |
| GET | `/:id/profile` | Profile người dùng | Optional |
| POST | `/:id/follow` | Follow | JWT |
| DELETE | `/:id/follow` | Unfollow | JWT |
| GET | `/:id/followers` | Danh sách followers | JWT |
| GET | `/:id/following` | Danh sách following | JWT |

### Search — `/api/search`

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/` | Tìm users + posts (q, type, page, limit) | JWT |
| GET | `/tags/suggest` | Gợi ý hashtag (q) | JWT |

### Moderation — `/api/moderation`

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/reports` | Danh sách báo cáo pending | Moderator |
| PATCH | `/reports/:id` | Duyệt / dismiss báo cáo | Moderator |
| DELETE | `/posts/:id` | Xóa bài vi phạm | Moderator |

---

## 5. LUỒNG XỬ LÝ CHÍNH

### 5.1 Tạo bài viết

```
CreatePostBox (feed) hoặc create-post.tsx (full screen)
       │
       ├── Chọn ảnh / video (expo-image-picker)
       │       └── hoặc chụp camera trực tiếp
       ├── Nhập nội dung + hashtag
       ├── Chọn vị trí (expo-location → lat/lng)
       ├── Chọn loại (normal / SOS + phân loại)
       └── Chọn visibility (public / friends / private)
              │
              ▼
       createPostFormData(FormData)
       POST /api/posts — Multer xử lý file
              │
       Backend:
       ├── Lưu Post vào MongoDB
       ├── Nếu có lat/lng → lưu vào PostgreSQL post_locations
       └── Nếu SOS → set sosExpiresAt = now + 24h
              │
              ▼
       Feed tự refresh
```

### 5.2 Feed đề xuất 5 tầng

```
GET /api/posts/recommended?lat=&lng=&page=&limit=
              │
       Backend (postController.getRecommendedFeed):
              │
       Tier 1 ── SOS posts còn hạn (sosExpiresAt > now) ─────────────────┐
              │                                                             │
       Tier 2 ── Bài của users đang follow (Follow collection) ───────────┤
              │                                                             │
       Tier 3 ── Bài gần GPS (PostGIS ST_DWithin) ──────────────────────┤
              │                                                             ├─ Merge, dedup, paginate
       Tier 4 ── Bài score cao nhất (score = likes - dislikes) ──────────┤
              │                                                             │
       Tier 5 ── Các bài còn lại ──────────────────────────────────────── ┘
              │
       Trả về: { posts[], meta: { tiers: { sos, friends, nearby, top, all } } }
              │
       Frontend: FlatList infinite scroll
       ├── onEndReached → loadMore() → page + 1
       └── refreshControl → page = 1
```

### 5.3 Like / Dislike

```
Ấn ❤️ / 👎 trên PostCard
       │
       ▼
likePost(id) / dislikePost(id)
POST /api/posts/:id/like
       │
Backend:
├── Tìm Like record hiện có (user + target + targetType)
├── Nếu cùng reaction → XÓA (toggle off)
├── Nếu khác reaction → CẬP NHẬT reaction
└── Nếu chưa có → TẠO MỚI
       │
├── Tính lại likesCount / dislikesCount trên Post
└── Cập nhật score = likesCount - dislikesCount

Frontend: Optimistic update (cập nhật UI ngay, không chờ API)
```

### 5.4 Comments

```
Xem bài → post/[id].tsx
       │
GET /api/posts/:id/comments?page=&limit=
       │
CommentItem
├── Hiển thị avatar, tên, nội dung, thời gian
├── Nút ❤️ Like comment → POST /api/comments/:id/like (toggle)
├── Nút Trả lời → mở Reply input + tag @username
└── Nút "Xem thêm X trả lời" → GET /api/comments/:id/replies

Thêm comment top-level:
POST /api/posts/:id/comments { content }

Thêm reply:
POST /api/posts/:id/comments { content, parentComment: commentId }
```

### 5.5 Follow

```
Xem profile → user/[id].tsx
├── GET /api/users/:id/profile → { ...user, isFollowing, followersCount, followingCount }
├── Nút [Follow] → POST /api/users/:id/follow
└── Nút [Following] → DELETE /api/users/:id/follow (unfollow)

Danh sách:
→ followers-list.tsx
├── Tab Followers: GET /api/users/:id/followers?search=&page=&limit=
└── Tab Following: GET /api/users/:id/following?search=&page=&limit=
```

### 5.6 Tìm kiếm

```
search.tsx
       │
       ├── Thanh tìm kiếm → debounce 500ms
       ├── Tab [Tất cả] [Người dùng] [Bài viết]
       ├── GET /api/search?q=&type=all|user|post&page=&limit=
       └── GET /api/search/tags/suggest?q= → chip gợi ý hashtag
              │
       Kết quả:
       ├── UserCard → navigate user/[userId]
       └── PostCard → navigate post/[postId]
```

### 5.7 Báo cáo & Kiểm duyệt

```
PostCard → [⋯] → Báo cáo
       │
POST /api/posts/:id/report { reason, description }
→ Tạo Report (status: pending)

moderation.tsx (Moderator/Admin)
       │
GET /api/moderation/reports
       │
ModerationCard
├── [Dismiss] → PATCH /api/moderation/reports/:id { action: 'dismiss' }
└── [Xóa bài] → DELETE /api/moderation/posts/:id
                  → Post.status = 'deleted', Report.status = 'reviewed'
```

### 5.8 Profile & Upload ảnh

```
profile.tsx
       │
GET /api/users/me → hiển thị thông tin
       │
├── Sửa bio/thông tin → PATCH /api/users/me
├── Upload avatar:
│       │ Chọn ảnh (expo-image-picker)
│       └── POST /api/users/me/avatar (FormData: avatar)
│              └── Multer → lưu uploads/ → cập nhật user.avatar URL
└── Upload ảnh bìa:
        └── POST /api/users/me/cover (FormData: cover)

Privacy settings (privacy.tsx):
PATCH /api/users/me { profile: { privacy: { showBirthday, showPhone, ... } } }
```

---

## 6. POSTCARD — Chi tiết component

PostCard là component trung tâm, hiển thị trong nhiều màn hình:

```
PostCard
│
├── [SOS Banner] — nếu postType === 'sos' → hiện "🆘 TÍN HIỆU KHẨN CẤP · [loại]"
│
├── Header: Avatar + Tên + Thời gian + [⋯ Menu]
│       └── Menu: Sửa bài / Xóa bài / Ẩn bài / Báo cáo
│
├── Content: Text + hashtag (ấn → search)
│
├── MediaGrid: ảnh/video
│       ├── ≤ 4 ảnh: layout động (1, 2, 3, 4 ảnh)
│       ├── > 4 ảnh: grid + overlay "+N"
│       └── Video: autoplay khi in-viewport (videoVisibilityStore)
│
├── Location: địa chỉ (nếu có)
│
└── Action Bar:
    ├── ❤️ Like (count) — optimistic update
    ├── 👎 Dislike (count)
    ├── 💬 Comment (count) → navigate post/[id]
    ├── 🔗 Share
    └── 🔖 Save
```

### Video Visibility
`videoVisibilityStore.ts` dùng Zustand-like store để track video nào đang in-viewport. Chỉ 1 video tự động play tại một thời điểm. Video ngoài viewport bị pause tự động.

---

## 7. MEDIA UPLOAD

### Giới hạn
| Loại | Kích thước tối đa |
|------|-----------------|
| Ảnh | 20 MB / ảnh |
| Video | 200 MB / video |
| Số lượng | Nhiều ảnh + nhiều video / bài |

### Flow
```
Client (FormData):
  content, tags[], lat?, lng?, postType?, sosCategory?,
  images[]: File[], videos[]: File[]
         │
    POST /api/posts (Content-Type: multipart/form-data)
         │
    Multer middleware:
    ├── Lưu file vào disk: uploads/posts/
    ├── Kiểm tra MIME type
    └── Kiểm tra file size
         │
    postController.createPost:
    ├── Lưu Post (MongoDB) với { images[], videos[] }
    └── Nếu lat/lng → INSERT vào PostgreSQL post_locations
```

### Timeout
Frontend `apiFetch` timeout: **5 phút** (300,000ms) — đủ cho video lớn qua Wi-Fi chậm.

---

## 8. FEED PAGINATION

Feed sử dụng infinite scroll với FlatList:

```ts
// State:
const [posts, setPosts] = useState([]);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

// Khi scroll đến cuối:
onEndReached → loadMore()
  → fetchRecommendedFeed(page + 1, limit)
  → setPosts(prev => [...prev, ...newPosts])

// Pull-to-refresh:
refreshControl.onRefresh → page = 1, posts = []
```

Response metadata:
```json
{
  "posts": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "hasMore": true,
    "tiers": { "sos": 2, "friends": 5, "nearby": 3, "top": 8, "all": 132 }
  }
}
```

---

## 9. POSTSAPI — Danh sách hàm

File: `features/social/services/postsApi.ts`

```ts
// Feed
fetchFeed(page, limit, authorId?)
fetchRecommendedFeed(page, limit, lat?, lng?, radius?)
fetchNearby(lat, lng, radius, limit)
fetchSavedPosts(page, limit)
fetchPost(id)

// CRUD
createPostFormData(formData: FormData)
updatePostFormData(id, formData: FormData)
deletePost(id)

// Tương tác
likePost(id)            // toggle like
dislikePost(id)         // toggle dislike
toggleSavePost(id)      // toggle save
toggleHidePost(id)      // toggle hide
sharePost(id)           // tăng sharesCount
reportPost(id, reason, description?)

// Comments
fetchComments(postId, page, limit)
addComment(postId, content, parentCommentId?)
likeComment(commentId)
fetchCommentReplies(commentId, page, limit)

// Follow
followUser(userId)
unfollowUser(userId)
fetchFollowers(userId, search, page, limit)
fetchFollowing(userId, search, page, limit)

// Search
fetchGlobalSearch(q, type, page, limit)
fetchTagSuggestions(q)
```

---

## 10. USER API — Danh sách hàm

File: `features/user/services/userApi.ts`

```ts
fetchMe()
updateProfile(data)
uploadAvatar(formData: FormData)
uploadCover(formData: FormData)
fetchUserProfile(userId)
fetchSuggestedUsers()
```

---

## 11. MAPPOST — Chuyển đổi kiểu dữ liệu

File: `features/social/mapPost.ts`

```ts
mapApiPostToUi(apiPost: ApiPost): UiPost
```

Chuyển đổi response từ API sang format hiển thị trong PostCard:
- Format thời gian (timeAgo)
- Tính `isLiked`, `isDisliked`, `isSaved`, `isHidden` từ arrays
- Map `images[]`, `videos[]` sang format media

---

## 12. QUYỀN TRUY CẬP

| Tính năng             | Khách (chưa đăng nhập) | User | Moderator | Admin   |
|-----------------------|------------------------|------|-----------|---------|
| Xem feed              | ❌                     | ✅   | ✅        | ✅    |
| Đăng bài              | ❌                     | ✅   | ✅        | ✅    |
| Like/Comment          | ❌                     | ✅   | ✅        | ✅    |
| Sửa/Xóa bài của mình  | ❌                     | ✅   | ✅        | ✅    |
| Báo cáo bài           | ❌                     | ✅   | ✅        | ✅    |
| Duyệt báo cáo         | ❌                     | ❌   | ✅        | ✅    |
| Xóa bài bất kỳ        | ❌                     | ❌   | ✅        | ✅    |
| Xem profile người khác| ❌                     | ✅   | ✅        | ✅    |
| Follow                | ❌                     | ✅   | ✅        | ✅    |

---

## 13. FILES LIÊN QUAN

### Frontend
| File | Chức năng |
|------|-----------|
| `app/(tabs)/index.tsx` | Feed chính — FlatList infinite scroll |
| `app/post/[id].tsx` | Chi tiết bài viết + comments |
| `app/create-post.tsx` | Tạo / sửa bài viết |
| `app/profile.tsx` | Profile của tôi |
| `app/user/[id].tsx` | Profile người dùng khác |
| `app/search.tsx` | Global search |
| `app/saved-posts.tsx` | Bài đã lưu |
| `app/nearby.tsx` | Bài gần GPS |
| `app/followers-list.tsx` | Followers / Following |
| `app/moderation.tsx` | Admin duyệt báo cáo |
| `features/social/PostCard.tsx` | Card bài viết trung tâm |
| `features/social/CommentItem.tsx` | Comment item (like, reply) |
| `features/social/mapPost.ts` | API → UI type mapping |
| `features/social/services/postsApi.ts` | Tất cả HTTP calls social |
| `features/user/services/userApi.ts` | HTTP calls user/profile |

### Backend
| File | Chức năng |
|------|-----------|
| `src/models/postModel.js` | Mongoose schema Post |
| `src/models/commentModel.js` | Mongoose schema Comment |
| `src/models/likeModel.js` | Mongoose schema Like |
| `src/models/followModel.js` | Mongoose schema Follow |
| `src/models/reportModel.js` | Mongoose schema Report |
| `src/controllers/postController.js` | CRUD + Feed + Reactions |
| `src/controllers/commentController.js` | Comment CRUD + Like + Reply |
| `src/controllers/followController.js` | Follow/Unfollow |
| `src/controllers/userController.js` | Profile + Avatar + Cover |
| `src/controllers/searchController.js` | Search users/posts/tags |
| `src/controllers/moderationController.js` | Review reports |
| `src/config/postgresConfig.js` | PostGIS pool + initGISTable + CRUD |
| `src/middleware/upload.js` | Multer: post media, avatar, cover |
