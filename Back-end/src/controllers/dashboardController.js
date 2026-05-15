import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import Report from "../models/reportModel.js";
import Volunteer from "../models/volunteerModel.js";

/**
 * Tính toán tỷ lệ phần trăm thay đổi
 */
const calculateChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Lấy dữ liệu tổng (Total)
    const [
      totalUsers,
      previousTotalUsers, // số người dùng đến thời điểm 7 ngày trước
      sosReports,
      previousSosReports,
      violationReports,
      previousViolationReports,
      pendingVolunteers,
      previousPendingVolunteers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $lt: sevenDaysAgo } }),
      
      Post.countDocuments({ postType: "sos", status: "active" }),
      Post.countDocuments({ postType: "sos", status: "active", createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }), // đếm số mới tạo tuần trước

      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "pending", createdAt: { $lt: sevenDaysAgo } }),

      Volunteer.countDocuments({ status: "pending" }),
      Volunteer.countDocuments({ status: "pending", createdAt: { $lt: sevenDaysAgo } })
    ]);

    // Tính new post 7 days ago
    const newSosReportsThisWeek = await Post.countDocuments({ postType: "sos", status: "active", createdAt: { $gte: sevenDaysAgo } });

    // Tính phần trăm tăng trưởng
    const stats = {
      totalUsers,
      totalUsersChange: calculateChange(totalUsers, previousTotalUsers),
      sosReports: newSosReportsThisWeek, // SOS reports usually means recent sos created
      sosReportsChange: calculateChange(newSosReportsThisWeek, previousSosReports),
      violationReports,
      violationReportsChange: calculateChange(violationReports, previousViolationReports),
      pendingVolunteers,
      pendingVolunteersChange: calculateChange(pendingVolunteers, previousPendingVolunteers),
    };

    // 2. Dữ liệu biểu đồ 30 ngày (Aggregation)
    // Lấy số User mới tạo theo từng ngày
    const usersByDay = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Lấy số Post mới tạo theo từng ngày
    const postsByDay = await Post.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Gộp dữ liệu biểu đồ
    const chartDataMap = {};
    // Tạo 30 ngày trống
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
      chartDataMap[key] = { date: displayDate, visits: 0, posts: 0 };
    }

    usersByDay.forEach(u => {
      if (chartDataMap[u._id]) chartDataMap[u._id].visits = u.count;
    });

    postsByDay.forEach(p => {
      if (chartDataMap[p._id]) chartDataMap[p._id].posts = p.count;
    });

    const chartData = Object.values(chartDataMap);

    // 3. 5 Báo cáo vi phạm gần nhất
    const recentReportsRaw = await Report.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("post", "content")
      .lean();

    const recentReports = recentReportsRaw.map(r => ({
      id: r._id,
      postContent: r.post?.content || "Nội dung bài viết không hiển thị (hoặc chỉ có ảnh).",
      reportCount: 1, // Để đơn giản, gán là 1 vì hiện tại mỗi report là độc lập (có thể thay đổi nếu gom nhóm báo cáo)
      reportedAt: r.createdAt,
      reason: r.reason
    }));

    return res.json({
      stats,
      chartData,
      recentReports
    });

  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
