/**
 * In-Memory Cache — NodeJS (Zero cost, no Redis needed)
 * ─────────────────────────────────────────────
 * Dùng Map với TTL tự quản lý.
 * Phù hợp ở giai đoạn đầu (<10k users).
 * Sau này có thể swap từng dòng sang Redis (interface giống nhau).
 *
 * Khi nào cần nâng lên Redis:
 *  - Deploy nhiều instance (in-memory không share)
 *  - > 50k users daily active
 *  - Cần cache persistence khi restart
 */

const store = new Map(); // key → { value, expiresAt }

/**
 * Đặt cache với TTL (giây)
 */
export const cacheSet = (key, value, ttlSeconds) => {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

/**
 * Lấy cache (null nếu không có hoặc đã hết hạn)
 */
export const cacheGet = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

/**
 * Xóa cache theo key chính xác
 */
export const cacheDel = (key) => {
  store.delete(key);
};

/**
 * Xóa cache theo prefix (pattern)
 * Ví dụ: cacheDelPattern("feed:") xóa tất cả cache bắt đầu bằng "feed:"
 */
export const cacheDelPattern = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

/**
 * Cache-aside helper: lấy từ cache, nếu miss thì gọi fetchFn rồi cache lại
 */
export const withCache = async (key, ttlSeconds, fetchFn) => {
  const cached = cacheGet(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  cacheSet(key, data, ttlSeconds);
  return data;
};

// Tự động dọn dẹp cache hết hạn mỗi 5 phút
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export default { cacheSet, cacheGet, cacheDel, cacheDelPattern, withCache };
