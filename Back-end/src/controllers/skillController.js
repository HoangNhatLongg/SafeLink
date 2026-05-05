import Skill from "../models/skillModel.js";
import {
  uploadImageToCloudinary,
  deleteFromCloudinary,
  isCloudinaryConfigured,
  buildLocalMediaUrl,
} from "../middleware/upload.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  so_cap_cuu: "Sơ Cấp Cứu",
  pccc: "PCCC",
  thien_tai: "Thiên Tai",
  an_toan_dien: "An Toàn Điện",
  tai_nan: "Tai Nạn",
  tam_ly: "Tâm Lý",
  khac: "Khác",
};

// ─── GET /api/skills — Danh sách kỹ năng (public) ─────────────────────────────
export async function getSkills(req, res) {
  try {
    const { category, difficulty, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { status: "active" };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    // Tìm kiếm full-text nếu có từ khóa
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const [items, total] = await Promise.all([
      Skill.find(filter)
        .select("title summary category coverImage difficulty duration viewCount tags createdAt")
        .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Skill.countDocuments(filter),
    ]);

    res.json({
      message: "Lấy danh sách kỹ năng thành công",
      data: items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getSkills error:", err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách kỹ năng" });
  }
}

// ─── GET /api/skills/:id — Chi tiết kỹ năng (public) ─────────────────────────
export async function getSkillDetail(req, res) {
  try {
    const skill = await Skill.findOne({ _id: req.params.id, status: "active" })
      .populate("submittedBy", "name avatar")
      .lean();

    if (!skill) {
      return res.status(404).json({ error: "Không tìm thấy kỹ năng" });
    }

    res.json({ message: "Lấy chi tiết kỹ năng thành công", data: skill });
  } catch (err) {
    console.error("getSkillDetail error:", err);
    res.status(500).json({ error: "Lỗi server khi lấy chi tiết kỹ năng" });
  }
}

// ─── POST /api/skills/:id/view — Tăng lượt xem (public) ──────────────────────
export async function incrementView(req, res) {
  try {
    await Skill.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ message: "Đã ghi nhận lượt xem" });
  } catch (err) {
    // Không trả error — lượt xem không quan trọng
    res.json({ message: "Đã ghi nhận lượt xem" });
  }
}

// ─── POST /api/skills/contribute — Đóng góp kỹ năng (JWT required) ───────────
export async function contributeSkill(req, res) {
  try {
    const {
      title, summary, category, difficulty, duration, videoUrl, tags,
    } = req.body;

    // Validation cơ bản
    if (!title || !category) {
      return res.status(400).json({ error: "Tiêu đề và danh mục là bắt buộc" });
    }
    const validCategories = ["so_cap_cuu", "pccc", "thien_tai", "an_toan_dien", "tai_nan", "tam_ly", "khac"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Danh mục không hợp lệ" });
    }

    // Parse các bước từ JSON string (vì gửi qua FormData)
    let parsedSteps = [];
    if (req.body.steps) {
      try {
        parsedSteps = JSON.parse(req.body.steps);
      } catch {
        return res.status(400).json({ error: "Dữ liệu các bước không hợp lệ" });
      }
    }

    // Xử lý ảnh bìa
    let coverImage = undefined;
    const coverFile = req.files?.find((f) => f.fieldname === "coverImage");
    if (coverFile) {
      if (isCloudinaryConfigured) {
        const result = await uploadImageToCloudinary(coverFile.buffer, "skills/covers");
        coverImage = { url: result.medium || result.url, publicId: result.publicId };
      } else {
        coverImage = { url: buildLocalMediaUrl(req, coverFile.path) };
      }
    }

    // Xử lý ảnh cho từng bước
    const stepsWithImages = await Promise.all(
      parsedSteps.map(async (step, stepIdx) => {
        const stepImages = req.files?.filter(
          (f) => f.fieldname === `step_${stepIdx}_image`
        ) || [];

        const uploadedImages = await Promise.all(
          stepImages.map(async (file) => {
            if (isCloudinaryConfigured) {
              const result = await uploadImageToCloudinary(file.buffer, "skills/steps");
              return { url: result.medium || result.url, publicId: result.publicId };
            } else {
              return { url: buildLocalMediaUrl(req, file.path) };
            }
          })
        );

        return {
          order: step.order ?? stepIdx + 1,
          title: step.title || `Bước ${stepIdx + 1}`,
          content: step.content || "",
          images: uploadedImages,
        };
      })
    );

    // Parse tags
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch {
        parsedTags = [];
      }
    }

    const skill = await Skill.create({
      title: title.trim(),
      summary: summary?.trim(),
      category,
      difficulty: difficulty || "co_ban",
      duration: duration?.trim(),
      videoUrl: videoUrl?.trim(),
      coverImage,
      steps: stepsWithImages,
      tags: parsedTags,
      status: "pending", // Luôn là pending — chờ moderator duyệt
      submittedBy: req.user._id,
    });

    res.status(201).json({
      message: "Đóng góp kỹ năng thành công. Đang chờ kiểm duyệt.",
      data: { _id: skill._id, title: skill.title },
    });
  } catch (err) {
    console.error("contributeSkill error:", err);
    res.status(500).json({ error: "Lỗi server khi đóng góp kỹ năng" });
  }
}

// ─── GET /api/skills/pending — Danh sách chờ duyệt (Moderator) ───────────────
export async function getPendingSkills(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [items, total] = await Promise.all([
      Skill.find({ status: "pending" })
        .populate("submittedBy", "name avatar email")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Skill.countDocuments({ status: "pending" }),
    ]);

    res.json({
      message: "Lấy danh sách chờ duyệt thành công",
      data: items,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error("getPendingSkills error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
}

// ─── PATCH /api/skills/:id/review — Duyệt/Từ chối (Moderator) ────────────────
export async function reviewSkill(req, res) {
  try {
    const { action, rejectReason } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "action phải là 'approve' hoặc 'reject'" });
    }
    if (action === "reject" && !rejectReason?.trim()) {
      return res.status(400).json({ error: "Vui lòng cung cấp lý do từ chối" });
    }

    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ error: "Không tìm thấy kỹ năng" });
    if (skill.status !== "pending") {
      return res.status(400).json({ error: "Kỹ năng này đã được xử lý rồi" });
    }

    skill.status = action === "approve" ? "active" : "rejected";
    skill.reviewedBy = req.user._id;
    skill.reviewedAt = new Date();
    if (action === "reject") skill.rejectReason = rejectReason.trim();

    await skill.save();

    if (action === "approve") {
      try {
        import("../socket/index.js").then(({ getIo }) => {
          getIo().emit("newSkill", skill);
        });
      } catch (e) {
        console.warn("Socket newSkill error:", e);
      }
    }

    res.json({
      message: action === "approve" ? "Đã duyệt kỹ năng" : "Đã từ chối kỹ năng",
      data: { _id: skill._id, status: skill.status },
    });
  } catch (err) {
    console.error("reviewSkill error:", err);
    res.status(500).json({ error: "Lỗi server khi xử lý duyệt" });
  }
}

// ─── GET /api/skills/admin/all — Lấy toàn bộ (Admin/Moderator) ───────────────
export async function getAllSkills(req, res) {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const [items, total] = await Promise.all([
      Skill.find(filter)
        .populate("submittedBy", "name email avatar")
        .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Skill.countDocuments(filter),
    ]);

    res.json({
      message: "Lấy danh sách thành công",
      data: items,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error("getAllSkills error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
}

// ─── POST /api/skills/admin — Thêm trực tiếp kỹ năng (Admin/Moderator) ───────
export async function adminCreateSkill(req, res) {
  try {
    const { title, summary, category, difficulty, duration, videoUrl, tags, status } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: "Tiêu đề và danh mục là bắt buộc" });
    }

    let parsedSteps = [];
    if (req.body.steps) {
      try { parsedSteps = JSON.parse(req.body.steps); } catch {}
    }

    let coverImage = undefined;
    const coverFile = req.files?.find((f) => f.fieldname === "coverImage");
    if (coverFile) {
      if (isCloudinaryConfigured) {
        const result = await uploadImageToCloudinary(coverFile.buffer, "skills/covers");
        coverImage = { url: result.medium || result.url, publicId: result.publicId };
      } else {
        coverImage = { url: buildLocalMediaUrl(req, coverFile.path) };
      }
    }

    const stepsWithImages = await Promise.all(
      parsedSteps.map(async (step, stepIdx) => {
        const stepImages = req.files?.filter((f) => f.fieldname === `step_${stepIdx}_image`) || [];
        const uploadedImages = await Promise.all(
          stepImages.map(async (file) => {
            if (isCloudinaryConfigured) {
              const result = await uploadImageToCloudinary(file.buffer, "skills/steps");
              return { url: result.medium || result.url, publicId: result.publicId };
            } else {
              return { url: buildLocalMediaUrl(req, file.path) };
            }
          })
        );

        return {
          order: step.order ?? stepIdx + 1,
          title: step.title || `Bước ${stepIdx + 1}`,
          content: step.content || "",
          images: uploadedImages,
        };
      })
    );

    let parsedTags = [];
    if (tags) {
      try { parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags); } catch {}
    }

    const skill = await Skill.create({
      title: title.trim(),
      summary: summary?.trim(),
      category,
      difficulty: difficulty || "co_ban",
      duration: duration?.trim(),
      videoUrl: videoUrl?.trim(),
      coverImage,
      steps: stepsWithImages,
      tags: parsedTags,
      status: status || "active",
      submittedBy: req.user._id,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    });

    if (skill.status === "active") {
      try {
        import("../socket/index.js").then(({ getIo }) => {
          getIo().emit("newSkill", skill);
        });
      } catch (e) {}
    }

    res.status(201).json({ message: "Thêm kỹ năng thành công.", data: skill });
  } catch (err) {
    console.error("adminCreateSkill error:", err);
    res.status(500).json({ error: "Lỗi server khi thêm kỹ năng" });
  }
}

// ─── PUT /api/skills/:id — Cập nhật kỹ năng (Admin/Moderator) ────────────────
export async function updateSkill(req, res) {
  try {
    const { id } = req.params;
    const { title, summary, category, difficulty, duration, videoUrl, tags, status, keptImages } = req.body;

    const skill = await Skill.findById(id);
    if (!skill) return res.status(404).json({ error: "Không tìm thấy kỹ năng" });

    if (title) skill.title = title.trim();
    if (summary !== undefined) skill.summary = summary.trim();
    if (category) skill.category = category;
    if (difficulty) skill.difficulty = difficulty;
    if (duration !== undefined) skill.duration = duration.trim();
    if (videoUrl !== undefined) skill.videoUrl = videoUrl.trim();
    if (status) skill.status = status;

    if (tags) {
      try { skill.tags = Array.isArray(tags) ? tags : JSON.parse(tags); } catch {}
    }

    // Cover Image
    const coverFile = req.files?.find((f) => f.fieldname === "coverImage");
    if (coverFile) {
      // Xóa ảnh cũ nếu có
      if (skill.coverImage?.publicId) {
        await deleteFromCloudinary(skill.coverImage.publicId).catch(() => {});
      }
      if (isCloudinaryConfigured) {
        const result = await uploadImageToCloudinary(coverFile.buffer, "skills/covers");
        skill.coverImage = { url: result.medium || result.url, publicId: result.publicId };
      } else {
        skill.coverImage = { url: buildLocalMediaUrl(req, coverFile.path) };
      }
    }

    // Steps
    if (req.body.steps) {
      let parsedSteps = [];
      try { parsedSteps = JSON.parse(req.body.steps); } catch {}

      let parsedKeptImages = {};
      if (keptImages) {
         try { parsedKeptImages = JSON.parse(keptImages); } catch {} // { step_0: [{url, publicId}], step_1: [] }
      }

      const stepsWithImages = await Promise.all(
        parsedSteps.map(async (step, stepIdx) => {
          // Các ảnh giữ lại từ ảnh cũ
          const kept = parsedKeptImages[`step_${stepIdx}`] || [];
          
          // Các ảnh upload mới
          const stepImages = req.files?.filter((f) => f.fieldname === `step_${stepIdx}_image`) || [];
          const uploadedImages = await Promise.all(
            stepImages.map(async (file) => {
              if (isCloudinaryConfigured) {
                const result = await uploadImageToCloudinary(file.buffer, "skills/steps");
                return { url: result.medium || result.url, publicId: result.publicId };
              } else {
                return { url: buildLocalMediaUrl(req, file.path) };
              }
            })
          );

          return {
            order: step.order ?? stepIdx + 1,
            title: step.title || `Bước ${stepIdx + 1}`,
            content: step.content || "",
            images: [...kept, ...uploadedImages],
          };
        })
      );
      
      skill.steps = stepsWithImages;
    }

    await skill.save();
    res.json({ message: "Cập nhật kỹ năng thành công", data: skill });
  } catch (err) {
    console.error("updateSkill error:", err);
    res.status(500).json({ error: "Lỗi server khi cập nhật kỹ năng" });
  }
}

// ─── DELETE /api/skills/:id — Xóa kỹ năng (Admin/Moderator) ──────────────────
export async function deleteSkill(req, res) {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ error: "Không tìm thấy kỹ năng" });

    if (skill.coverImage?.publicId) {
      await deleteFromCloudinary(skill.coverImage.publicId).catch(() => {});
    }
    for (const step of skill.steps) {
      for (const img of step.images) {
        if (img.publicId) await deleteFromCloudinary(img.publicId).catch(() => {});
      }
    }

    await Skill.deleteOne({ _id: skill._id });
    res.json({ message: "Đã xóa kỹ năng" });
  } catch (err) {
    console.error("deleteSkill error:", err);
    res.status(500).json({ error: "Lỗi server khi xóa kỹ năng" });
  }
}
