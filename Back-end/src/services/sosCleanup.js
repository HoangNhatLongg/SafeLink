/**
 * SOS Auto-Cleanup Job
 * Chạy mỗi 5 phút, tự động expire SOS sau 24h
 * Không cần Redis/BullMQ — dùng setInterval đơn giản
 */

import Post from "../models/postModel.js";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 phút
const SOS_TTL_HOURS = 24;

let cleanupTimer = null;

export function startSOSCleanupJob() {
  console.log("🕐 SOS cleanup job started (runs every 5 minutes)");

  const run = async () => {
    try {
      const cutoff = new Date(Date.now() - SOS_TTL_HOURS * 60 * 60 * 1000);

      const result = await Post.updateMany(
        {
          postType: "sos",
          sosStatus: "active",
          createdAt: { $lte: cutoff },
        },
        {
          $set: {
            sosStatus: "expired",
            status: "deleted", // Ẩn khỏi feed
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ SOS expired: ${result.modifiedCount} posts (>${SOS_TTL_HOURS}h old)`);
      }
    } catch (err) {
      console.error("❌ SOS cleanup error:", err.message);
    }
  };

  // Chạy ngay lập tức lần đầu
  run();

  // Lên lịch mỗi 5 phút
  cleanupTimer = setInterval(run, CLEANUP_INTERVAL_MS);

  return cleanupTimer;
}

export function stopSOSCleanupJob() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log("🛑 SOS cleanup job stopped");
  }
}
