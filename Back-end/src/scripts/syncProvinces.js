/**
 * Script đồng bộ dữ liệu hành chính từ https://provinces.open-api.vn (API v2)
 * API v2 đã flatten sẵn: Tỉnh → Phường/Xã (không qua Huyện) — khớp hệ thống 2 cấp.
 *
 * Cách chạy: node src/scripts/syncProvinces.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env từ thư mục Back-end
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import Province from "../models/provinceModel.js";

const API_V2 = "https://provinces.open-api.vn/api/v2";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} từ ${url}`);
  return res.json();
}

async function syncProvinces() {
  console.log("🔗 Đang kết nối MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Đã kết nối MongoDB");

  // Bước 1: Lấy danh sách tỉnh/thành (depth=1 — chỉ tên, chưa có wards)
  console.log("\n📡 Đang tải danh sách tỉnh/thành từ API v2...");
  const provinces = await fetchJson(`${API_V2}/?depth=1`);
  console.log(`   → Tìm thấy ${provinces.length} tỉnh/thành`);

  let totalWards = 0;
  let processedCount = 0;

  for (const prov of provinces) {
    processedCount++;
    const provinceName = prov.name;
    const provinceCode = prov.code;

    // Bước 2: Lấy chi tiết tỉnh với depth=2 (API v2 trả thẳng mảng wards)
    process.stdout.write(`   [${processedCount}/${provinces.length}] ${provinceName}...`);

    const detail = await fetchJson(`${API_V2}/p/${provinceCode}?depth=2`);
    const wards = (detail.wards || []).map((w) => w.name);

    totalWards += wards.length;
    console.log(` ${wards.length} phường/xã`);

    // Bước 3: Upsert vào MongoDB (cập nhật nếu đã có, tạo mới nếu chưa)
    await Province.findOneAndUpdate(
      { name: provinceName },
      { name: provinceName, wards },
      { upsert: true, new: true }
    );

    // Delay nhẹ để không spam API
    await new Promise((r) => setTimeout(r, 100));
  }

  // Bước 4: Xóa các tỉnh trong DB mà API không còn trả về
  const apiProvinceNames = provinces.map((p) => p.name);
  const deleted = await Province.deleteMany({ name: { $nin: apiProvinceNames } });
  if (deleted.deletedCount > 0) {
    console.log(`\n🗑️  Đã xóa ${deleted.deletedCount} tỉnh không còn tồn tại trong API.`);
  }

  console.log(`\n🎉 Hoàn tất! Đã đồng bộ ${processedCount} tỉnh/thành với tổng ${totalWards} phường/xã.`);

  await mongoose.disconnect();
  console.log("🔌 Đã ngắt kết nối MongoDB.");
  process.exit(0);
}

syncProvinces().catch((err) => {
  console.error("❌ Lỗi:", err.message);
  process.exit(1);
});
