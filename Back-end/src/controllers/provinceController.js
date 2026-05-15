import Province from "../models/provinceModel.js";

// Lấy danh sách toàn bộ Tỉnh/Xã (Public)
export const getAllProvinces = async (req, res) => {
  try {
    const provinces = await Province.find().sort({ name: 1 });
    return res.json({
      message: "Thành công",
      data: provinces
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin Thêm Tỉnh
export const createProvince = async (req, res) => {
  try {
    const { name, wards } = req.body;
    if (!name) return res.status(400).json({ message: "Tên tỉnh không được để trống" });

    const existing = await Province.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Tỉnh này đã tồn tại" });
    }

    const province = new Province({
      name,
      wards: Array.isArray(wards) ? wards : []
    });

    await province.save();
    return res.status(201).json({ message: "Thêm tỉnh thành công", data: province });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin Sửa Tỉnh (Cập nhật tên hoặc danh sách Phường/Xã)
export const updateProvince = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, wards } = req.body;

    const province = await Province.findById(id);
    if (!province) {
      return res.status(404).json({ message: "Không tìm thấy tỉnh" });
    }

    if (name) province.name = name;
    if (Array.isArray(wards)) province.wards = wards;

    await province.save();
    return res.json({ message: "Cập nhật thành công", data: province });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin Xóa Tỉnh
export const deleteProvince = async (req, res) => {
  try {
    const { id } = req.params;
    const province = await Province.findByIdAndDelete(id);
    if (!province) {
      return res.status(404).json({ message: "Không tìm thấy tỉnh" });
    }
    return res.json({ message: "Đã xóa tỉnh" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
