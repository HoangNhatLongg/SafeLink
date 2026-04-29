/**
 * Gọi sau verifyToken. Chỉ moderator / admin.
 */
export const requireModerator = (req, res, next) => {
  const role = req.user?.role;
  if (!["moderator", "admin"].includes(role)) {
    return res.status(403).json({ message: "Chỉ quản trị viên mới thực hiện được thao tác này." });
  }
  next();
};

/**
 * Gọi sau verifyToken. Chỉ admin (không bao gồm moderator).
 * Dùng cho các tác vụ nhạy cảm như duyệt đội tình nguyện.
 */
export const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (role !== "admin") {
    return res.status(403).json({ message: "Chỉ Admin mới thực hiện được thao tác này." });
  }
  next();
};
