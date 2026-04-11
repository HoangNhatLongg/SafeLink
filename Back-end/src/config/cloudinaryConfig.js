/**
 * Cloudinary Configuration
 * ─────────────────────────────────────────────
 * Lưu ảnh trên cloud, CDN tự động, không serve từ backend
 *
 * Setup:
 *  1. Tạo tài khoản tại https://cloudinary.com (miễn phí 25GB)
 *  2. Lấy Cloud Name, API Key, API Secret từ Dashboard
 *  3. Thêm vào .env:
 *     CLOUDINARY_CLOUD_NAME=xxx
 *     CLOUDINARY_API_KEY=xxx
 *     CLOUDINARY_API_SECRET=xxx
 */

import { v2 as cloudinary } from "cloudinary";

const isConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // luôn dùng HTTPS
  });
  console.log("✅ Cloudinary configured");
} else {
  console.warn("⚠️  Cloudinary not configured — falling back to local disk storage");
}

export { cloudinary, isConfigured as isCloudinaryConfigured };
