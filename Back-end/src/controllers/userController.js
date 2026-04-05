import User from "../models/userModel.js";

export const getCurrentUser = async (req, res) => {
  try {
    const u = req.user;
    return res.json({
      user: {
        id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || "",
        authType: u.authType,
        role: u.role,
        status: u.status,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateCurrentUser = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    if (name === undefined && avatar === undefined) {
      return res.status(400).json({ message: "Gửi ít nhất một trường: name hoặc avatar." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    if (name !== undefined) {
      const t = String(name).trim();
      if (!t) return res.status(400).json({ message: "Tên không được để trống." });
      user.name = t.slice(0, 200);
    }
    if (avatar !== undefined) {
      user.avatar = String(avatar).trim().slice(0, 2000);
    }

    await user.save();
    return res.json({
      message: "Đã cập nhật hồ sơ.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
        authType: user.authType,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
