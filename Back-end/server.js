import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import mongoose from "mongoose";
import "./src/config/passport.js";
import { initGISTable } from "./src/config/postgresConfig.js";

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

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));