import Volunteer from "../models/volunteerModel.js";
import User from "../models/userModel.js";
import {
  uploadImageToCloudinary,
  deleteFromCloudinary,
  isCloudinaryConfigured,
  buildLocalMediaUrl,
} from "../middleware/upload.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * POST /api/volunteers/register
 * Body (FormData): unitName, unitType, entityKind, contactName, phone,
 *   address, province, district, ward, lat, lng,
 *   description, serviceArea, availableTime, note
 * Files: verificationImages (tối đa 5 ảnh)
 * Yêu cầu: JWT (verifyToken)
 */
export const registerVolunteer = async (req, res) => {
  try {
    const {
      unitName, unitType, entityKind, contactName,
      phone, address, province, district, ward,
      lat, lng, description, serviceArea, availableTime, note,
      serviceType, priceNote,
    } = req.body;

    // Validate bắt buộc
    if (!unitName || !unitType || !contactName || !phone || !address || !province || !lat || !lng) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ message: "Tọa độ GPS không hợp lệ." });
    }

    // Xử lý ảnh xác minh (tối đa 5 ảnh)
    const files = req.files || [];
    const verificationImages = [];

    for (const file of files) {
      if (isCloudinaryConfigured) {
        // Upload lên Cloudinary
        const result = await uploadImageToCloudinary(file.buffer, "volunteers");
        verificationImages.push({
          url: result.url,
          publicId: result.publicId,
        });
      } else {
        // Local disk fallback
        const url = buildLocalMediaUrl(req, file.path);
        verificationImages.push({ url, filename: file.filename });
      }
    }

    const entry = await Volunteer.create({
      unitName: unitName.trim(),
      unitType,
      entityKind: entityKind || "individual",
      contactName: contactName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      province: province.trim(),
      district: district?.trim() || undefined,
      ward: ward?.trim() || undefined,
      lat: latNum,
      lng: lngNum,
      description: description?.trim() || undefined,
      serviceArea: serviceArea?.trim() || undefined,
      availableTime: availableTime?.trim() || undefined,
      note: note?.trim() || undefined,
      serviceType: serviceType || "free",
      priceNote: priceNote?.trim() || undefined,
      verificationImages,
      status: "pending",
      submittedBy: req.user._id,
    });

    return res.status(201).json({
      message: "Đăng ký thành công! Đơn của bạn đang chờ quản trị viên xác nhận.",
      item: entry,
    });
  } catch (err) {
    console.error("registerVolunteer error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/volunteers
 * Public — lấy danh sách đơn vị tình nguyện đã duyệt
 * Query: province, district, unitType, search, page, limit
 */
export const getVolunteers = async (req, res) => {
  try {
    const { province, district, unitType, search, page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const lmt = Math.min(100, parseInt(limit) || 50);

    const filter = { status: "active" };
    if (province) filter.province = new RegExp(province, "i");
    if (district) filter.district = new RegExp(district, "i");
    if (unitType) filter.unitType = unitType;
    if (search) {
      filter.$or = [
        { unitName: new RegExp(search, "i") },
        { contactName: new RegExp(search, "i") },
        { address: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      Volunteer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lmt)
        .lean(),
      Volunteer.countDocuments(filter),
    ]);

    return res.json({ items, total, page: parseInt(page), limit: lmt });
  } catch (err) {
    console.error("getVolunteers error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/volunteers/nearby
 * Public — đơn vị tình nguyện gần vị trí (Haversine)
 * Query: lat, lng, radius (km, default 10)
 */
export const getNearbyVolunteers = async (req, res) => {
  try {
    const { lat, lng, radius = 10, unitType } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: "Cần truyền lat và lng." });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = Math.min(100, parseFloat(radius));

    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((userLat * Math.PI) / 180));

    const filter = {
      status: "active",
      lat: { $gte: userLat - latDelta, $lte: userLat + latDelta },
      lng: { $gte: userLng - lngDelta, $lte: userLng + lngDelta },
    };
    if (unitType) filter.unitType = unitType;

    const candidates = await Volunteer.find(filter).lean();
    const nearby = candidates
      .map((item) => ({
        ...item,
        distanceKm: haversine(userLat, userLng, item.lat, item.lng),
      }))
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ items: nearby, total: nearby.length });
  } catch (err) {
    console.error("getNearbyVolunteers error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/volunteers/pending  (Admin only)
 * Danh sách đăng ký chờ duyệt
 */
export const getPendingVolunteers = async (req, res) => {
  try {
    const items = await Volunteer.find({ status: "pending" })
      .populate("submittedBy", "name email avatar phoneNumber")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ items, total: items.length });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/volunteers/all  (Admin only)
 * Lấy toàn bộ danh sách đội tình nguyện để quản lý
 */
export const getAllVolunteersAdmin = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const lmt = Math.min(100, parseInt(limit) || 50);

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { unitName: new RegExp(search, "i") },
        { contactName: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
        { address: new RegExp(search, "i") }
      ];
    }

    const [items, total] = await Promise.all([
      Volunteer.find(filter)
        .populate("submittedBy", "name email avatar phoneNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lmt)
        .lean(),
      Volunteer.countDocuments(filter)
    ]);

    return res.json({ items, total, page: parseInt(page), limit: lmt });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * PATCH /api/volunteers/:id/review  (Admin only)
 * Body: action ("approve"|"reject"), rejectReason?
 */
export const reviewVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectReason } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "action phải là 'approve' hoặc 'reject'." });
    }

    const item = await Volunteer.findById(id);
    if (!item) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký." });

    item.status = action === "approve" ? "active" : "rejected";
    item.reviewedBy = req.user._id;
    item.reviewedAt = new Date();
    if (action === "reject" && rejectReason) {
      item.rejectReason = rejectReason.trim();
    }
    await item.save();

    // Nếu duyệt thành công, cập nhật tài khoản User thành "isVolunteer"
    if (action === "approve" && item.submittedBy) {
      await User.findByIdAndUpdate(item.submittedBy, { isVolunteer: true });
    }

    // Emit Socket.IO event cho người gửi
    if (item.submittedBy) {
      try {
        import("../socket/index.js").then(({ getIo }) => {
          const eventName = action === "approve" ? "volunteerApproved" : "volunteerRejected";
          getIo().to(item.submittedBy.toString()).emit(eventName, item);
        });
      } catch (e) {
        console.warn("Socket volunteer review error:", e);
      }
    }

    return res.json({
      message: action === "approve" ? "Đã duyệt đăng ký." : "Đã từ chối đăng ký.",
      item,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/volunteers/my  (JWT required)
 * Xem lại đơn đăng ký của chính mình
 */
export const getMyVolunteerRegistrations = async (req, res) => {
  try {
    const items = await Volunteer.find({ submittedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ items, total: items.length });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * PUT /api/volunteers/my  (JWT required)
 * Cập nhật thông tin đội cứu hộ đã được duyệt (chỉ chủ sở hữu)
 * Body (FormData): unitName, unitType, entityKind, contactName, phone,
 *   address, province, district, ward, lat, lng,
 *   description, serviceArea, availableTime, note, serviceType, priceNote
 * Files: verificationImages (tối đa 5 ảnh — optional, chỉ thay khi gửi mới)
 */
export const updateMyVolunteer = async (req, res) => {
  try {
    const item = await Volunteer.findOne({
      submittedBy: req.user._id,
      status: "active",
    });
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy đội cứu hộ đã duyệt của bạn." });
    }

    const {
      unitName, unitType, entityKind, contactName,
      phone, address, province, district, ward,
      lat, lng, description, serviceArea, availableTime, note,
      serviceType, priceNote,
    } = req.body;

    if (unitName !== undefined) item.unitName = unitName.trim();
    if (unitType !== undefined) item.unitType = unitType;
    if (entityKind !== undefined) item.entityKind = entityKind;
    if (contactName !== undefined) item.contactName = contactName.trim();
    if (phone !== undefined) item.phone = phone.trim();
    if (address !== undefined) item.address = address.trim();
    if (province !== undefined) item.province = province.trim();
    if (district !== undefined) item.district = district.trim();
    if (ward !== undefined) item.ward = ward.trim();
    if (lat !== undefined) item.lat = parseFloat(lat);
    if (lng !== undefined) item.lng = parseFloat(lng);
    if (description !== undefined) item.description = description.trim();
    if (serviceArea !== undefined) item.serviceArea = serviceArea.trim();
    if (availableTime !== undefined) item.availableTime = availableTime.trim();
    if (note !== undefined) item.note = note.trim();
    if (serviceType !== undefined) item.serviceType = serviceType;
    if (priceNote !== undefined) item.priceNote = priceNote.trim();

    // Upload ảnh xác minh mới (nếu có gửi)
    const files = req.files || [];
    if (files.length > 0) {
      const newImages = [];
      for (const file of files) {
        if (isCloudinaryConfigured) {
          const result = await uploadImageToCloudinary(file.buffer, "volunteers");
          newImages.push({ url: result.url, publicId: result.publicId });
        } else {
          const url = buildLocalMediaUrl(req, file.path);
          newImages.push({ url, filename: file.filename });
        }
      }
      item.verificationImages = newImages;
    }

    await item.save();

    return res.json({ message: "Cập nhật thông tin đội cứu hộ thành công.", item });
  } catch (err) {
    console.error("updateMyVolunteer error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};
