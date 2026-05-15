import Report from "../models/reportModel.js";
import Post from "../models/postModel.js";

/**
 * GET /api/moderation/reports?status=pending&page=1&limit=20
 */
export const listReports = async (req, res) => {
  try {
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && ["pending", "reviewed", "dismissed", "actioned"].includes(status)) {
      filter.status = status;
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "post", populate: { path: "author", select: "name email avatar" } })
        .populate("reporter", "name email")
        .populate("reviewedBy", "name email")
        .lean(),
      Report.countDocuments(filter),
    ]);

    return res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("listReports:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * PATCH /api/moderation/reports/:id
 * Body: { status: "pending"|"reviewed"|"dismissed"|"actioned", flagPost?: boolean, restorePost?: boolean }
 */
export const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, flagPost, restorePost } = req.body;

    if (!["pending", "reviewed", "dismissed", "actioned"].includes(status)) {
      return res.status(400).json({ message: "status phải là pending, reviewed, dismissed hoặc actioned." });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo." });

    report.status = status;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    if (flagPost && status === "actioned") {
      await Post.findByIdAndUpdate(report.post, { status: "flagged" });
    } else if (restorePost) {
      await Post.findByIdAndUpdate(report.post, { status: "active" });
    }

    const populated = await Report.findById(report._id)
      .populate({ path: "post", populate: { path: "author", select: "name email avatar" } })
      .populate("reporter", "name email")
      .populate("reviewedBy", "name email")
      .lean();

    return res.json({ message: "Đã cập nhật báo cáo.", report: populated });
  } catch (err) {
    console.error("updateReport:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};
