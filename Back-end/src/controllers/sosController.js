import Post from "../models/postModel.js";
import User from "../models/userModel.js";
import SOSConnection from "../models/sosConnectionModel.js";
import { isCloudinaryConfigured, uploadImageToCloudinary, getMediaUrl } from "../middleware/upload.js";
import { sendSOSNotification, sendSOSAdminNotification } from "../services/notificationService.js";
import { cacheDelPattern } from "../utils/cache.js";
import { savePostLocation, deletePostLocation } from "../config/postgresConfig.js";

// Khoảng cách (km) dùng công thức Haversine
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─────────────────────────────────────────────────────────────
   POST /api/sos
   Body: FormData { category, description, radius, latitude, longitude, address, images[] }
───────────────────────────────────────────────────────────────*/
export const createSOS = async (req, res) => {
  try {
    const {
      category = "other",
      description = "",
      radius = 1000,
      latitude,
      longitude,
      address = "",
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Cần cung cấp vị trí GPS để gửi SOS." });
    }

    // Upload ảnh (nếu có)
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (isCloudinaryConfigured && file.buffer) {
          const result = await uploadImageToCloudinary(file.buffer, "sos");
          images.push({
            url: result.url,
            thumbnail: result.thumbnail,
            medium: result.medium,
            large: result.large,
            publicId: result.publicId,
          });
        } else if (file.path) {
          images.push({ url: getMediaUrl(req, file.path) });
        }
      }
    }

    // Tạo SOS post
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const post = await Post.create({
      author: req.user._id,
      content: description,
      images,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
      },
      visibility: "public",
      postType: "sos",
      sosCategory: category,
      sosRadius: parseInt(radius),
      sosStatus: "active",
      sosExpiresAt: expiresAt,
    });

    // Populate author để trả về
    await post.populate("author", "name avatar email");

    // ── Đồng bộ tọa độ sang PostgreSQL/PostGIS ─────────────────────
    // Giúp các tính năng GIS (findNearbyPostIds, ST_DWithin...) hoạt động với SOS
    try {
      await savePostLocation(
        post._id.toString(),
        req.user._id.toString(),
        parseFloat(latitude),
        parseFloat(longitude),
        address || null
      );
    } catch (gisErr) {
      // Không crash luồng chính nếu PostgreSQL lỗi
      console.warn("⚠️ Không thể đồng bộ SOS vào PostgreSQL:", gisErr.message);
    }

    // Xóa cache feed (SOS nên xuất hiện ngay)
    cacheDelPattern("feed:");
    cacheDelPattern("recommended:");

    // ── Tìm users xung quanh trong bán kính sosRadius ──────────────
    // Lấy tất cả user active có push token và lastKnownLocation
    const nearbyUsers = await User.find({
      _id: { $ne: req.user._id },
      status: "active",
      expoPushToken: { $exists: true, $ne: null },
      "lastKnownLocation.latitude": { $exists: true },
    })
      .select("expoPushToken lastKnownLocation name")
      .lean();

    const radiusKm = parseInt(radius) / 1000;
    const nearbyTokens = nearbyUsers
      .filter((u) => {
        const dist = haversineKm(
          parseFloat(latitude),
          parseFloat(longitude),
          u.lastKnownLocation.latitude,
          u.lastKnownLocation.longitude
        );
        return dist <= radiusKm;
      })
      .map((u) => u.expoPushToken)
      .filter(Boolean);

    // ── Lấy token của admin và moderator ─────────────────────────
    const staffUsers = await User.find({
      role: { $in: ["admin", "moderator"] },
      expoPushToken: { $exists: true, $ne: null },
    })
      .select("expoPushToken")
      .lean();

    const staffTokens = staffUsers.map((u) => u.expoPushToken).filter(Boolean);

    // ── Gửi push notification không block response ─────────────────
    const sosData = {
      category,
      authorName: post.author.name,
      postId: post._id.toString(),
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), address },
    };

    // Fire and forget
    Promise.all([
      nearbyTokens.length > 0
        ? sendSOSNotification(nearbyTokens, sosData)
        : Promise.resolve(),
      staffTokens.length > 0
        ? sendSOSAdminNotification(staffTokens, sosData)
        : Promise.resolve(),
    ]).catch((err) => console.error("Push notification error:", err.message));

    // Emit Socket.IO event for Real-time Map
    try {
      import("../socket/index.js").then(({ getIo }) => {
        getIo().emit("newSOS", {
          id: post._id,
          author: post.author,
          category: post.sosCategory,
          description: post.content,
          images: post.images,
          location: post.location,
          radius: post.sosRadius,
          sosStatus: post.sosStatus,
          expiresAt: post.sosExpiresAt,
          createdAt: post.createdAt,
        });
      });
    } catch (e) {
      console.warn("Socket newSOS error:", e);
    }

    return res.status(201).json({
      message: "Đã gửi tín hiệu SOS thành công.",
      post: {
        id: post._id,
        author: post.author,
        category: post.sosCategory,
        description: post.content,
        images: post.images,
        location: post.location,
        radius: post.sosRadius,
        sosStatus: post.sosStatus,
        expiresAt: post.sosExpiresAt,
        createdAt: post.createdAt,
      },
      notified: {
        nearby: nearbyTokens.length,
        staff: staffTokens.length,
      },
    });
  } catch (err) {
    console.error("createSOS error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/sos/active
   Trả về danh sách SOS đang active (cho bản đồ)
   Query: ?lat=&lon=&radius= (km, optional filter)
───────────────────────────────────────────────────────────────*/
export const getActiveSOS = async (req, res) => {
  try {
    const { lat, lon, radius = 50 } = req.query; // radius km

    const sosPosts = await Post.find({
      postType: "sos",
      sosStatus: "active",
      status: "active",
    })
      .select("author content location sosCategory sosRadius sosStatus sosExpiresAt createdAt images")
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Filter theo khoảng cách nếu có tọa độ
    let filtered = sosPosts;
    if (lat && lon) {
      filtered = sosPosts.filter((p) => {
        if (!p.location?.latitude || !p.location?.longitude) return true;
        const dist = haversineKm(
          parseFloat(lat),
          parseFloat(lon),
          p.location.latitude,
          p.location.longitude
        );
        return dist <= parseFloat(radius);
      });
    }

    return res.json({
      sos: filtered.map((p) => ({
        id: p._id,
        author: p.author,
        category: p.sosCategory,
        description: p.content,
        images: p.images,
        location: p.location,
        radius: p.sosRadius,
        sosStatus: p.sosStatus,
        expiresAt: p.sosExpiresAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/sos/:id/resolve
   Đánh dấu SOS đã được giải quyết (author / admin / mod)
───────────────────────────────────────────────────────────────*/
export const resolveSOS = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user;

    const post = await Post.findById(id);
    if (!post || post.postType !== "sos") {
      return res.status(404).json({ message: "Không tìm thấy SOS." });
    }

    const isOwner = post.author.toString() === me._id.toString();
    const isStaff = me.role === "admin" || me.role === "moderator";

    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Không có quyền resolve SOS này." });
    }

    post.sosStatus = "resolved";
    post.sosResolvedBy = me._id;
    post.status = "deleted"; // Ẩn khỏi feed bình thường
    await post.save();

    // ── Cập nhật tất cả connections sang resolved ──────────────
    await SOSConnection.updateMany(
      { sosId: id, status: { $in: ["accepted", "pending"] } },
      { status: "resolved" }
    );

    // ── Xóa tọa độ khỏi PostgreSQL/PostGIS ────────────────────────
    try {
      await deletePostLocation(id);
    } catch (gisErr) {
      console.warn("⚠️ Không thể xóa SOS khỏi PostgreSQL:", gisErr.message);
    }

    cacheDelPattern("feed:");

    // Emit Socket.IO event for Real-time Map
    try {
      import("../socket/index.js").then(({ getIo }) => {
        getIo().emit("sosResolved", { id });
      });
    } catch (e) {
      console.warn("Socket sosResolved error:", e);
    }

    return res.json({ message: "Đã đánh dấu SOS hoàn tất.", sosStatus: "resolved" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/users/me/location
   Cập nhật vị trí hiện tại của user (gọi khi app mở / foreground)
   Body: { latitude, longitude }
───────────────────────────────────────────────────────────────*/
export const updateUserLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Cần latitude và longitude." });
    }

    await User.findByIdAndUpdate(req.user._id, {
      "lastKnownLocation.latitude": parseFloat(latitude),
      "lastKnownLocation.longitude": parseFloat(longitude),
      "lastKnownLocation.updatedAt": new Date(),
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/users/me/push-token
   Lưu Expo Push Token
   Body: { token }
───────────────────────────────────────────────────────────────*/
export const updatePushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required." });

    await User.findByIdAndUpdate(req.user._id, { expoPushToken: token });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/sos/admin/all
   Trả về danh sách tất cả SOS cho AdminWeb
   Query: ?status=active|resolved|expired|all & search= & page= & limit=
───────────────────────────────────────────────────────────────*/
export const getAllSOSAdmin = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    
    const filter = { postType: "sos" };
    
    // Filter theo sosStatus (active, resolved, expired)
    if (status && status !== 'all') {
      filter.sosStatus = status;
    }
    
    if (search) {
      filter.$or = [
        { content: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Post.find(filter)
        .populate("author", "name email avatar phone")
        .populate("sosResolvedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Post.countDocuments(filter),
    ]);

    // Gắn danh sách người hỗ trợ (accepted connections) cho mỗi SOS
    const sosIds = items.map(i => i._id);
    const connections = await SOSConnection.find({
      sosId: { $in: sosIds },
      status: { $in: ["accepted", "pending", "resolved"] },
    })
      .populate("helperId", "name email avatar phone")
      .lean();

    // Gom connections theo sosId
    const connMap = {};
    for (const c of connections) {
      const key = c.sosId.toString();
      if (!connMap[key]) connMap[key] = [];
      connMap[key].push({
        _id: c._id,
        helper: c.helperId,
        status: c.status,
        createdAt: c.createdAt,
      });
    }

    // Gắn vào từng item
    const enrichedItems = items.map(item => ({
      ...item,
      helpers: connMap[item._id.toString()] || [],
    }));

    return res.json({
      message: "Lấy danh sách SOS thành công",
      data: enrichedItems,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE /api/sos/:id
   Xóa (mềm) SOS bởi Admin
───────────────────────────────────────────────────────────────*/
export const deleteSOSAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findById(id);
    if (!post || post.postType !== "sos") {
      return res.status(404).json({ message: "Không tìm thấy tín hiệu SOS này." });
    }

    post.status = "deleted"; // Xóa mềm
    post.deletedAt = new Date();
    await post.save();

    // ── Cập nhật tất cả connections sang resolved ──────────────
    await SOSConnection.updateMany(
      { sosId: id, status: { $in: ["accepted", "pending"] } },
      { status: "resolved" }
    );

    // Xóa vị trí khỏi hệ thống Postgres GIS để không hiển thị nữa
    try {
      await deletePostLocation(id);
    } catch (gisErr) {
      console.warn("⚠️ Không thể xóa SOS khỏi PostgreSQL:", gisErr.message);
    }

    cacheDelPattern("feed:");
    
    // Xóa khỏi map realtime
    try {
      import("../socket/index.js").then(({ getIo }) => {
        getIo().emit("sosResolved", { id }); // Tái sử dụng event này để xóa marker trên map
      });
    } catch (e) {
      console.warn("Socket sosResolved error:", e);
    }

    return res.json({ message: "Đã xóa (ẩn) tín hiệu SOS thành công." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
