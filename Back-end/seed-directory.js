/**
 * Seed script: node seed-directory.js
 * Chạy sau khi server khởi động để nạp dữ liệu mẫu vào DB
 */
import mongoose from "mongoose";
import Directory from "./src/models/directoryModel.js";

const SEED_DATA = [
  { name: "Phòng CSGT Công an Tỉnh Đồng Nai", phone: "02513829123", address: "161 Phạm Văn Thuận, Tam Hiệp, Biên Hòa, Đồng Nai", province: "Đồng Nai", district: "Biên Hòa", ward: "Tam Hiệp", type: "csgt", lat: 10.953, lng: 106.865 },
  { name: "Đội TTKS Cao tốc số 7", phone: "0283829123", address: "71 Huỳnh Thúc Kháng, Bến Thành, Quận 1, TP HCM", province: "TP HCM", district: "Quận 1", ward: "Bến Thành", type: "csgt", lat: 10.777, lng: 106.700 },
  { name: "Phòng Cảnh sát PCCC Bình Dương", phone: "02742223456", address: "12 Lê Lợi, Phú Cường, Thủ Dầu Một, Bình Dương", province: "Bình Dương", district: "Thủ Dầu Một", ward: "Phú Cường", type: "pccc", lat: 10.980, lng: 106.652 },
  { name: "Bệnh viện Thống Nhất TP HCM", phone: "02838415454", address: "1 Lý Thường Kiệt, Tân Bình, TP HCM", province: "TP HCM", district: "Tân Bình", ward: "Phường 7", type: "benh_vien", lat: 10.778, lng: 106.671 },
  { name: "Cấp cứu 115 Đồng Nai", phone: "115", address: "Trung tâm Y tế Biên Hòa, Đồng Nai", province: "Đồng Nai", district: "Biên Hòa", ward: "Tân Tiến", type: "cuu_thuong", lat: 10.961, lng: 106.845 },
  { name: "Công an Phường Bến Nghé", phone: "02838299999", address: "114 Đinh Tiên Hoàng, Bến Nghé, Quận 1, TP HCM", province: "TP HCM", district: "Quận 1", ward: "Bến Nghé", type: "canh_sat", lat: 10.774, lng: 106.704 },
  { name: "Phòng CSGT Công an Bình Thuận", phone: "02523822017", address: "288 Trần Hưng Đạo, Phan Thiết, Bình Thuận", province: "Bình Thuận", district: "Phan Thiết", ward: "Phú Thủy", type: "csgt", lat: 10.929, lng: 108.102 },
  { name: "Bệnh viện Chợ Rẫy", phone: "02838554137", address: "201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP HCM", province: "TP HCM", district: "Quận 5", ward: "Phường 12", type: "benh_vien", lat: 10.755, lng: 106.665 },
  { name: "Cảnh sát PCCC Quận 9 TP HCM", phone: "02838968114", address: "Xa lộ Hà Nội, Long Bình, TP Thủ Đức, TP HCM", province: "TP HCM", district: "TP Thủ Đức", ward: "Long Bình", type: "pccc", lat: 10.845, lng: 106.796 },
  { name: "Bệnh viện Đa khoa Đồng Nai", phone: "02513822740", address: "4 Phan Chu Trinh, Quyết Thắng, Biên Hòa, Đồng Nai", province: "Đồng Nai", district: "Biên Hòa", ward: "Quyết Thắng", type: "benh_vien", lat: 10.947, lng: 106.845 },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/safelink");
  console.log("Connected to MongoDB");

  let created = 0;
  for (const data of SEED_DATA) {
    const exists = await Directory.findOne({ name: data.name }).lean();
    if (!exists) {
      await Directory.create({ ...data, status: "active" });
      created++;
    }
  }
  console.log(`✅ Seeded ${created} directory entries (${SEED_DATA.length - created} already existed)`);
  await mongoose.disconnect();
}

seed().catch(console.error);
