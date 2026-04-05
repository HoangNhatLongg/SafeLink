import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
});

/**
 * Khởi tạo extension PostGIS và bảng post_locations
 */
export const initGISTable = async () => {
  const client = await pool.connect();
  try {
    // Bật extension PostGIS (cần PostgreSQL có cài PostGIS)
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // Bảng lưu vị trí GPS của bài viết
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_locations (
        id            SERIAL PRIMARY KEY,
        post_id       VARCHAR(255) NOT NULL UNIQUE,
        user_id       VARCHAR(255) NOT NULL,
        latitude      DOUBLE PRECISION NOT NULL,
        longitude     DOUBLE PRECISION NOT NULL,
        location      GEOGRAPHY(POINT, 4326) NOT NULL,
        address       TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Index GIS để truy vấn không gian nhanh
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_post_locations_geo
        ON post_locations USING GIST (location);
    `);

    console.log("✅ PostgreSQL / PostGIS initialized");
  } catch (err) {
    console.error("❌ PostgreSQL init error:", err.message);
  } finally {
    client.release();
  }
};

/**
 * Lưu vị trí bài viết vào PostgreSQL
 */
export const savePostLocation = async (postId, userId, lat, lng, address = null) => {
  const query = `
    INSERT INTO post_locations (post_id, user_id, latitude, longitude, location, address)
    VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6)
    ON CONFLICT (post_id) DO UPDATE
      SET latitude = $3, longitude = $4,
          location = ST_SetSRID(ST_MakePoint($5, $4), 4326),
          address = $6;
  `;
  await pool.query(query, [postId, userId, lat, lng, lng, address]);
};

/**
 * Lấy vị trí bài viết theo postId
 */
export const getPostLocation = async (postId) => {
  const result = await pool.query(
    `SELECT post_id, user_id, latitude, longitude, address, created_at
     FROM post_locations WHERE post_id = $1`,
    [postId]
  );
  return result.rows[0] || null;
};

/**
 * Lấy vị trí nhiều bài viết cùng lúc
 */
export const getPostLocations = async (postIds) => {
  if (!postIds.length) return {};
  const result = await pool.query(
    `SELECT post_id, latitude, longitude, address
     FROM post_locations
     WHERE post_id = ANY($1::varchar[])`,
    [postIds]
  );
  // Trả về object { postId: locationData }
  return result.rows.reduce((acc, row) => {
    acc[row.post_id] = row;
    return acc;
  }, {});
};

/**
 * Xóa vị trí khi bài viết bị xóa
 */
export const deletePostLocation = async (postId) => {
  await pool.query(`DELETE FROM post_locations WHERE post_id = $1`, [postId]);
};

/**
 * Tìm bài viết gần vị trí hiện tại (bán kính mét)
 */
export const findNearbyPostIds = async (lat, lng, radiusMeters = 5000, limit = 50) => {
  const result = await pool.query(
    `SELECT post_id, latitude, longitude, address,
            ST_Distance(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance_m
     FROM post_locations
     WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
     ORDER BY distance_m ASC
     LIMIT $4`,
    [lat, lng, radiusMeters, limit]
  );
  return result.rows;
};

export default pool;
