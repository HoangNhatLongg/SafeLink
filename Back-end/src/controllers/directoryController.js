import Directory from "../models/directoryModel.js";
import Volunteer from "../models/volunteerModel.js";

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
    const { province, district, ward, type, search, page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const lmt = Math.min(100, parseInt(limit) || 50);

    const filter = { status: "active" };
    if (province) filter.province = new RegExp(province, "i");
    if (district) filter.district = new RegExp(district, "i");
    if (ward) filter.ward = new RegExp(ward, "i");
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { address: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    const [directoryItems, total] = await Promise.all([
      Directory.find(filter).sort({ name: 1 }).skip(skip).limit(lmt).lean(),
      Directory.countDocuments(filter),
    ]);

    // Fetch and merge Volunteers
    const volFilter = { status: "active" };
    if (province) volFilter.province = new RegExp(province, "i");
    if (district) volFilter.district = new RegExp(district, "i");
    if (ward) volFilter.ward = new RegExp(ward, "i");
    if (type) volFilter.unitType = type;
    if (search) {
      volFilter.$or = [
        { unitName: new RegExp(search, "i") },
        { address: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }
    
    // Chỉ lấy volunteer cho trang 1 để tránh trùng lặp ở các trang sau
    let mappedVols = [];
    if (page === 1) {
      const volItems = await Volunteer.find(volFilter).lean();
      mappedVols = volItems.map(v => ({
        ...v,
        name: v.unitName,
        type: v.unitType,
        isVolunteer: true
      }));
    }

    const items = [...mappedVols, ...directoryItems];

    return res.json({ items, total: total + mappedVols.length, page: parseInt(page), limit: lmt });
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

    const volFilter = {
      status: "active",
      lat: { $gte: userLat - latDelta, $lte: userLat + latDelta },
      lng: { $gte: userLng - lngDelta, $lte: userLng + lngDelta },
    };
    if (type) volFilter.unitType = type;

    const [dirCandidates, volCandidates] = await Promise.all([
      Directory.find(filter).lean(),
      Volunteer.find(volFilter).lean()
    ]);

    const mappedVols = volCandidates.map(v => ({
      ...v,
      name: v.unitName,
      type: v.unitType,
      isVolunteer: true
    }));

    const candidates = [...dirCandidates, ...mappedVols];

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

/**
 * GET /api/directory/all (Admin/Moderator only)
 * Query: status, search, page, limit
 */
export const getAllDirectory = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const lmt = Math.min(100, parseInt(limit) || 50);

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { address: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      Directory.find(filter)
        .populate("submittedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lmt)
        .lean(),
      Directory.countDocuments(filter),
    ]);

    return res.json({ items, total, page: parseInt(page), limit: lmt });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * POST /api/directory (Admin/Moderator only)
 */
export const createDirectory = async (req, res) => {
  try {
    const { name, phone, address, province, district, ward, type, lat, lng, note, status } = req.body;

    if (!name || !phone || !address || !province || lat === undefined || lng === undefined) {
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
      status: status || "active",
      submittedBy: req.user?._id || null,
      reviewedBy: req.user?._id || null,
      reviewedAt: new Date()
    });

    try {
      import("../socket/index.js").then(({ getIo }) => {
        getIo().emit("newDirectory", item);
      });
    } catch (e) {
      console.warn("Socket newDirectory error:", e);
    }

    return res.status(201).json({ message: "Đã thêm danh bạ.", item });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * PUT /api/directory/:id (Admin/Moderator only)
 */
export const updateDirectory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, province, district, ward, type, lat, lng, note, status } = req.body;

    const item = await Directory.findById(id);
    if (!item) return res.status(404).json({ message: "Không tìm thấy danh bạ." });

    if (name !== undefined) item.name = name.trim();
    if (phone !== undefined) item.phone = phone.trim();
    if (address !== undefined) item.address = address.trim();
    if (province !== undefined) item.province = province.trim();
    if (district !== undefined) item.district = district.trim();
    if (ward !== undefined) item.ward = ward.trim();
    if (type !== undefined) item.type = type;
    if (lat !== undefined) item.lat = parseFloat(lat);
    if (lng !== undefined) item.lng = parseFloat(lng);
    if (note !== undefined) item.note = note.trim();
    if (status !== undefined) item.status = status;

    await item.save();
    return res.json({ message: "Cập nhật thành công.", item });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * DELETE /api/directory/:id (Admin/Moderator only)
 */
export const deleteDirectory = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Directory.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ message: "Không tìm thấy danh bạ." });
    
    return res.json({ message: "Đã xóa danh bạ." });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};
