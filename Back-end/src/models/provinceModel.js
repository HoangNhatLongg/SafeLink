import mongoose from "mongoose";

const provinceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    wards: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

const Province = mongoose.model("Province", provinceSchema);
export default Province;
