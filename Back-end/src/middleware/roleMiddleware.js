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
