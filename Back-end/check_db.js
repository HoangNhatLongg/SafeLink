import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import Directory from './src/models/directoryModel.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    const count = await Directory.countDocuments();
    console.log("Total directories:", count);
    
    if (count === 0) {
      console.log("Seeding data...");
      await Directory.create([
        {
          name: "Bệnh viện Đa khoa Tỉnh",
          phone: "0234567890",
          address: "123 Lê Lợi",
          province: "Hà Nội",
          type: "benh_vien",
          lat: 21.028511,
          lng: 105.804817,
          status: "active"
        },
        {
          name: "Trạm Cứu hỏa Quận 1",
          phone: "114",
          address: "456 Trần Hưng Đạo",
          province: "TP.HCM",
          type: "pccc",
          lat: 10.762622,
          lng: 106.660172,
          status: "active"
        },
        {
          name: "Đồn Cảnh Sát Cầu Giấy",
          phone: "113",
          address: "789 Xuân Thủy",
          province: "Hà Nội",
          district: "Cầu Giấy",
          type: "canh_sat",
          lat: 21.037814,
          lng: 105.781313,
          status: "pending"
        }
      ]);
      console.log("Seeded 3 directories");
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
