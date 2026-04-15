import mongoose from "mongoose";
import dotenv from "dotenv";
import Skill from "../models/skillModel.js";

dotenv.config({ path: "../../.env" });

const sampleSkills = [
  {
    title: "Sơ cứu hóc dị vật (Nghiệm pháp Heimlich)",
    summary: "Cách xử lý nhanh chóng khi có người bị nghẹn, hóc dị vật đường thở.",
    category: "so_cap_cuu",
    difficulty: "co_ban",
    duration: "5 phút",
    status: "active",
    steps: [
      {
        order: 1,
        title: "Xác định tình trạng",
        content: "Hỏi nạn nhân 'Bạn có bị nghẹn không?'. Nếu nạn nhân không thể nói, ho yếu hoặc khó thở, hãy bắt đầu sơ cứu.",
        images: []
      },
      {
        order: 2,
        title: "Vị trí đứng",
        content: "Đứng sau lưng nạn nhân, vòng hai tay ra phía trước ôm lấy bụng nạn nhân.",
        images: []
      },
      {
        order: 3,
        title: "Thực hiện đẩy bụng",
        content: "Nắm một bàn tay thành nắm đấm, đặt ngay trên rốn nạn nhân. Tay kia nắm lấy nắm đấm và thực hiện đẩy mạnh vào trong và hướng lên trên.",
        images: []
      }
    ],
    tags: ["nghẹn", "hóc", "heimlich", "sơ cứu"]
  },
  {
    title: "Sử dụng bình chữa cháy an toàn",
    summary: "Hướng dẫn các bước sử dụng bình chữa cháy bột hoặc khí để dập tắt đám cháy nhỏ.",
    category: "pccc",
    difficulty: "co_ban",
    duration: "10 phút",
    status: "active",
    steps: [
      {
        order: 1,
        title: "Rút chốt an toàn",
        content: "Giữ bình thẳng đứng và rút chốt chặn an toàn ở phần vòi xịt.",
        images: []
      },
      {
        order: 2,
        title: "Hướng vòi phun",
        content: "Hướng vòi phun vào gốc của ngọn lửa (không phải ngọn lửa bên trên).",
        images: []
      },
      {
        order: 3,
        title: "Bóp cò và quét",
        content: "Bóp mạnh mỏ vịt để xịt chất chữa cháy, đồng thời quét vòi phun qua lại cho đến khi lửa tắt hẳn.",
        images: []
      }
    ],
    tags: ["cháy", "bình chữa cháy", "pccc"]
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/safelink";
    await mongoose.connect(mongoUri);
    console.log("✅ Đã kết nối MongoDB để seed dữ liệu...");

    // Xóa dữ liệu cũ nếu muốn (tùy chọn)
    // await Skill.deleteMany({});

    await Skill.insertMany(sampleSkills);
    console.log("✅ Đã thêm 2 kỹ năng mẫu thành công!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi seed dữ liệu:", error);
    process.exit(1);
  }
}

seed();
