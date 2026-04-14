import Directory from "../models/directoryModel.js";

// Haversine distance (km)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GET /api/directory
 * Query: province, district, type, search, page, limit
 */
export const getDirectory = async (req, res) => {
  try {
    const { province, district, type, search, page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const lmt = Math.min(100, parseInt(limit) || 50);

    const filter = { status: "active" };
    if (province) filter.province = new RegExp(province, "i");
    if (district) filter.district = new RegExp(district, "i");
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { address: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      Directory.find(filter).sort({ name: 1 }).skip(skip).limit(lmt).lean(),
      Directory.countDocuments(filter),
    ]);

    return res.json({ items, total, page: parseInt(page), limit: lmt });
  } catch (err) {
    console.error("getDirectory error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/directory/nearby
 * Query: lat, lng, radius (km, default 5), type
 */
export const getNearbyDirectory = async (req, res) => {
  try {
    const { lat, lng, radius = 5, type } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: "Cần truyền lat và lng." });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = Math.min(50, parseFloat(radius));

    // Bounding box để filter nhanh trước (~ radius/111 degrees)
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((userLat * Math.PI) / 180));

    const filter = {
      status: "active",
      lat: { $gte: userLat - latDelta, $lte: userLat + latDelta },
      lng: { $gte: userLng - lngDelta, $lte: userLng + lngDelta },
    };
    if (type) filter.type = type;

    const candidates = await Directory.find(filter).lean();

    // Lọc chính xác bằng Haversine và tính khoảng cách
    const nearby = candidates
      .map((item) => ({
        ...item,
        distanceKm: haversine(userLat, userLng, item.lat, item.lng),
      }))
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ items: nearby, total: nearby.length });
  } catch (err) {
    console.error("getNearbyDirectory error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * POST /api/directory/contribute
 * Body: name, phone, address, province, district, ward, type, lat, lng, note
 */
export const contributeDirectory = async (req, res) => {
  try {
    const { name, phone, address, province, district, ward, type, lat, lng, note } = req.body;

    if (!name || !phone || !address || !province || !lat || !lng) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    const item = await Directory.create({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      province: province.trim(),
      district: district?.trim(),
      ward: ward?.trim(),
      type: type || "khac",
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      note: note?.trim(),
      status: "pending",
      submittedBy: req.user?._id || null,
    });

    return res.status(201).json({
      message: "Đóng góp đã được gửi đi và đang chờ kiểm duyệt.",
      item,
    });
  } catch (err) {
    console.error("contributeDirectory error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/directory/pending  (Admin/Moderator only)
 */
export const getPendingDirectory = async (req, res) => {
  try {
    const items = await Directory.find({ status: "pending" })
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ items, total: items.length });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * PATCH /api/directory/:id/review  (Admin/Moderator only)
 * Body: action ("approve"|"reject"), rejectReason?
 */
export const reviewDirectory = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectReason } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "action phải là 'approve' hoặc 'reject'." });
    }

    const item = await Directory.findById(id);
    if (!item) return res.status(404).json({ message: "Không tìm thấy mục." });

    item.status = action === "approve" ? "active" : "rejected";
    item.reviewedBy = req.user._id;
    item.reviewedAt = new Date();
    if (action === "reject" && rejectReason) item.rejectReason = rejectReason.trim();
    await item.save();

    return res.json({ message: action === "approve" ? "Đã duyệt." : "Đã từ chối.", item });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};
