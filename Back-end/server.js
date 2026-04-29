// Env được load bởi `--env-file=.env` flag trong package.json scripts
// (ESM: import hoạt động trước dotenv.config() nên không dùng dotenv thường được)

import app from "./src/app.js";
import mongoose from "mongoose";
import "./src/config/passport.js";
import { initGISTable } from "./src/config/postgresConfig.js";
import { startSOSCleanupJob } from "./src/services/sosCleanup.js";
import { initSocket } from "./src/socket/index.js";

const PORT = process.env.PORT || 5000;

// Khởi tạo PostgreSQL / PostGIS (không block nếu chưa cấu hình)
if (process.env.POSTGRES_URI) {
  initGISTable().catch((err) =>
    console.warn("⚠️  PostGIS init skipped:", err.message)
  );
} else {
  console.warn("⚠️  POSTGRES_URI chưa được cấu hình — GIS features bị tắt.");
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // Khởi tạo SOS cleanup job
    startSOSCleanupJob();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Khởi tạo Socket.IO
    initSocket(server);
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));