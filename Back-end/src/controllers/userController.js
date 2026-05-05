import User from '../models/userModel.js';
import Follow from '../models/followModel.js';
import Post from '../models/postModel.js';
import Appeal from '../models/appealModel.js';
import {
  getMediaUrl,
  uploadImageToCloudinary,
  buildLocalMediaUrl,
  isCloudinaryConfigured,
} from '../middleware/upload.js';
import { cacheDelPattern } from '../utils/cache.js';
import { getIo } from '../socket/index.js';

/* ─────────────────────────────────────────────────────────────
   Helper: serialize profile with privacy rules
   isOwn = true  → trả toàn bộ (trang cá nhân)
   isOwn = false → ẩn field theo privacy settings
───────────────────────────────────────────────────────────────*/
function serializeProfile(user, isOwn = false) {
  const p = user.profile || {};
  const pv = p.privacy || {};

  return {
    bio:      p.bio || '',
    birthday: (isOwn || pv.showBirthday) ? (p.birthday ? p.birthday.toISOString() : null) : undefined,
    hometown: (isOwn || pv.showHometown)  ? (p.hometown || '') : undefined,
    phone:    (isOwn || pv.showPhone)     ? (p.phone    || '') : undefined,
    // email handled separately below
    ...(isOwn ? { privacy: pv } : {}),
  };
}

/* ─────────────────────────────────────────────────────────────
   GET /api/users/me
───────────────────────────────────────────────────────────────*/
export const getCurrentUser = async (req, res) => {
  try {
    const u = req.user;
    const [followersCount, followingCount, postsCount] = await Promise.all([
      Follow.countDocuments({ following: u._id }),
      Follow.countDocuments({ follower:  u._id }),
      Post.countDocuments({ author: u._id, status: 'active' }),
    ]);

    return res.json({
      user: {
        id:    u._id,
        name:  u.name,
        email: u.email,
        avatar: u.avatar || '',
        cover: u.cover || '',
        authType: u.authType,
        role:   u.role,
        status: u.status,
        followersCount,
        followingCount,
        postsCount,
        profile: serializeProfile(u, true),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/users/me/avatar
   Body: FormData (avatar: file)
───────────────────────────────────────────────────────────────*/
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh đại diện." });
    }

    let newUrl;
    if (isCloudinaryConfigured && req.file.buffer) {
      // Upload lên Cloudinary: tạo 2 size cho avatar
      //   thumbnail (200x200) → dùng trong comment, feed
      //   medium (400x400)   → dùng trong profile
      const result = await uploadImageToCloudinary(req.file.buffer, 'avatars');
      // Ghi đè URL bằng nhỏ hơn (400px crop square) cho avatar
      newUrl = result.medium || result.url;
    } else {
      // Local fallback
      newUrl = getMediaUrl(req, req.file.path);
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    user.avatar = newUrl;
    await user.save();

    // Xóa cache user-related
    cacheDelPattern(`feed:`);

    return res.json({
      message: "Cập nhật ảnh đại diện thành công.",
      avatar: newUrl,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('updateAvatar error:', err);
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/users/me/cover
   Body: FormData (cover: file)
───────────────────────────────────────────────────────────────*/
export const updateCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh bìa." });
    }

    let newUrl;
    if (isCloudinaryConfigured && req.file.buffer) {
      // Cover: 1200px wide là đủ đẹp trên cả desktop
      const result = await uploadImageToCloudinary(req.file.buffer, 'covers');
      newUrl = result.large || result.medium || result.url;
    } else {
      newUrl = getMediaUrl(req, req.file.path);
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    user.cover = newUrl;
    await user.save();

    return res.json({
      message: "Cập nhật ảnh bìa thành công.",
      cover: newUrl,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        cover: user.cover,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('updateCover error:', err);
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/users/me
   Body: { name, avatar, cover, bio, birthday, hometown, phone, privacy }
───────────────────────────────────────────────────────────────*/
export const updateCurrentUser = async (req, res) => {
  try {
    const { name, avatar, cover, bio, birthday, hometown, phone, privacy } = req.body;

    const hasField = [name, avatar, cover, bio, birthday, hometown, phone, privacy]
      .some((v) => v !== undefined);
    if (!hasField) {
      return res.status(400).json({ message: 'Gửi ít nhất một trường cần cập nhật.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    if (name !== undefined) {
      const t = String(name).trim();
      if (!t) return res.status(400).json({ message: 'Tên không được để trống.' });
      user.name = t.slice(0, 200);
    }
    if (avatar !== undefined) {
      user.avatar = String(avatar).trim().slice(0, 2000);
    }
    if (cover !== undefined) {
      user.cover = String(cover).trim().slice(0, 2000);
    }

    // Đảm bảo profile sub-doc tồn tại
    if (!user.profile) user.profile = {};

    if (bio      !== undefined) user.profile.bio      = String(bio).trim().slice(0, 500);
    if (birthday !== undefined) user.profile.birthday = birthday ? new Date(birthday) : null;
    if (hometown !== undefined) user.profile.hometown = String(hometown).trim().slice(0, 100);
    if (phone    !== undefined) user.profile.phone    = String(phone).trim().slice(0, 20);

    if (privacy && typeof privacy === 'object') {
      if (!user.profile.privacy) user.profile.privacy = {};
      const keys = ['showBirthday', 'showHometown', 'showPhone', 'showEmail'];
      keys.forEach((k) => {
        if (typeof privacy[k] === 'boolean') user.profile.privacy[k] = privacy[k];
      });
    }

    user.markModified('profile');
    await user.save();

    return res.json({
      message: 'Đã cập nhật hồ sơ.',
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        avatar: user.avatar || '',
        cover: user.cover || '',
        authType: user.authType,
        role:   user.role,
        profile: serializeProfile(user, true),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/users/:id/profile   (xem profile người khác)
   Auth optional — nếu có token thì biết isFollowing
───────────────────────────────────────────────────────────────*/
export const getUserProfile = async (req, res) => {
  try {
    const targetId = req.params.id;
    const viewerId = req.user?._id;          // có thể undefined nếu chưa đăng nhập

    const u = await User.findById(targetId).select(
      'name avatar cover email profile role status createdAt'
    );
    if (!u || u.status === 'banned') {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const [followersCount, followingCount, postsCount, isFollowing] = await Promise.all([
      Follow.countDocuments({ following: targetId }),
      Follow.countDocuments({ follower:  targetId }),
      Post.countDocuments({ author: targetId, visibility: 'public', status: 'active' }),
      viewerId
        ? Follow.exists({ follower: viewerId, following: targetId }).then(Boolean)
        : Promise.resolve(false),
    ]);

    const pv = u.profile?.privacy || {};

    return res.json({
      user: {
        id:     u._id,
        name:   u.name,
        avatar: u.avatar || '',
        cover:  u.cover || '',
        role:   u.role,
        followersCount,
        followingCount,
        postsCount,
        isFollowing,
        profile: serializeProfile(u, false),
        // email chỉ hiển thị nếu user cho phép
        email: pv.showEmail ? u.email : undefined,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
/* ─────────────────────────────────────────────────────────────
   GET /api/users/suggestions
   Đề xuất người nên theo dõi dựa trên:
   1. Cùng quê quán (hometown)
   2. Mạng lưới chung: Người A follow fan của mình (fan follow A -> A là người tốt)
   3. Người B follow mình, ta chưa follow -> đề xuất
   Loại trừ: bản thân, những người đã theo dõi
───────────────────────────────────────────────────────────────*/
export const getSuggestedUsers = async (req, res) => {
  try {
    const me = req.user;
    const meId = me._id;
    const limit = Math.min(30, parseInt(req.query.limit) || 20);

    // 1. Lấy danh sách những người mình đang follow (để loại trừ)
    const alreadyFollowing = await Follow.find({ follower: meId }).select('following').lean();
    const alreadyFollowingIds = alreadyFollowing.map(f => f.following.toString());

    // Tập loại trừ: chính mình + người đã follow
    const excludeIds = [meId.toString(), ...alreadyFollowingIds];

    // Dùng Map để tích điểm: userId -> { score, reasons }
    const scoreMap = new Map();

    const addScore = (userId, points, reason) => {
      const key = userId.toString();
      if (excludeIds.includes(key)) return;
      if (!scoreMap.has(key)) scoreMap.set(key, { score: 0, reasons: [] });
      const entry = scoreMap.get(key);
      entry.score += points;
      if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
    };

    // ──── Tín hiệu 1: Mạng lưới chung ────
    // Lấy những người đang follow mình (các "fan" của mình)
    const myFollowers = await Follow.find({ following: meId }).select('follower').lean();
    const myFollowerIds = myFollowers.map(f => f.follower);

    if (myFollowerIds.length > 0) {
      // Những người mà các fan của mình cũng đang follow (A theo dõi fan của mình)
      const mutualConnections = await Follow.find({
        follower: { $in: myFollowerIds },
        following: { $nin: [meId] },
      }).select('following').lean();

      mutualConnections.forEach(f => {
        addScore(f.following, 3, 'Mạng lưới chung');
      });
    }

    // ──── Tín hiệu 2: Fan của mình chưa được follow lại ────
    myFollowers.forEach(f => {
      addScore(f.follower, 1, 'Đang theo dõi bạn');
    });

    // ──── Tín hiệu 3: Cùng quê quán ────
    const myHometown = me.profile?.hometown;
    if (myHometown && myHometown.trim()) {
      const sameHometown = await User.find({
        _id: { $nin: excludeIds },
        status: 'active',
        'profile.hometown': { $regex: myHometown.trim(), $options: 'i' },
      }).select('_id').lean();

      sameHometown.forEach(u => {
        addScore(u._id, 2, 'Cùng quê quán');
      });
    }

    // Nếu không có tín hiệu nào, đề xuất ngẫu nhiên những người active
    if (scoreMap.size < 5) {
      const randomUsers = await User.find({
        _id: { $nin: excludeIds },
        status: 'active',
      }).select('_id').limit(20).lean();
      randomUsers.forEach(u => addScore(u._id, 0, 'Có thể biết'));
    }

    // Sắp xếp theo điểm giảm dần, lấy top 'limit' người
    const sortedIds = [...scoreMap.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([id]) => id);

    if (sortedIds.length === 0) {
      return res.json({ suggestions: [] });
    }

    // Fetch thông tin chi tiết users
    const users = await User.find({ _id: { $in: sortedIds } })
      .select('name avatar cover profile.hometown role')
      .lean();

    // Đếm followers và annotate reasons
    const suggestionsWithMeta = await Promise.all(
      users.map(async (u) => {
        const followersCount = await Follow.countDocuments({ following: u._id });
        const entry = scoreMap.get(u._id.toString());
        return {
          _id: u._id,
          name: u.name,
          avatar: u.avatar || '',
          hometown: u.profile?.hometown || null,
          role: u.role,
          followersCount,
          isFollowedByMe: false, // đã loại trừ người đang follow rồi
          reasons: entry?.reasons || [],
        };
      })
    );

    // Sort lại theo score sau khi có đủ thông tin
    suggestionsWithMeta.sort((a, b) => {
      const sa = scoreMap.get(a._id.toString())?.score ?? 0;
      const sb = scoreMap.get(b._id.toString())?.score ?? 0;
      return sb - sa;
    });

    return res.json({ suggestions: suggestionsWithMeta });
  } catch (err) {
    console.error('getSuggestedUsers error:', err);
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/users/admin/all
   Dành cho Admin/Moderator: Lấy toàn bộ danh sách users
   Query: ?search=&role=&page=&limit=
───────────────────────────────────────────────────────────────*/
export const getAllUsersAdmin = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    if (role && role !== 'all') {
      filter.role = role;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    // Map `status` sang `isActive` cho Frontend khớp cấu trúc cũ
    const mappedItems = items.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      isActive: u.status !== 'banned',
    }));

    return res.json({
      message: "Thành công",
      data: mappedItems,
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
   PATCH /api/users/admin/:id/role
   Dành cho Admin: Cập nhật chức vụ
───────────────────────────────────────────────────────────────*/
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // admin, moderator, user

    // Validate role
    if (!['admin', 'moderator', 'user'].includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ." });
    }

    // Không cho phép tự đổi quyền của mình
    if (req.user._id.toString() === id) {
      return res.status(403).json({ message: "Bạn không thể tự thay đổi quyền của chính mình." });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    targetUser.role = role;
    await targetUser.save();

    return res.json({ message: `Đã thay đổi quyền thành ${role}.` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/users/admin/:id/status
   Dành cho Admin/Moderator: Khóa/Mở khóa tài khoản
───────────────────────────────────────────────────────────────*/
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, banReason, banDuration } = req.body;
    // banDuration: number (ngày), null/0 = vĩnh viễn

    // Không tự khóa mình
    if (req.user._id.toString() === id) {
      return res.status(403).json({ message: "Bạn không thể tự khóa tài khoản của mình." });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // Nếu người thực hiện là moderator, chỉ được khóa/mở khóa 'user'
    if (req.user.role === 'moderator' && targetUser.role !== 'user') {
      return res.status(403).json({ message: "Moderator chỉ có quyền khóa tài khoản người dùng bình thường." });
    }

    if (isActive) {
      // Mở khóa
      targetUser.status = 'active';
      targetUser.banReason = null;
      targetUser.banExpiresAt = null;
    } else {
      // Khóa tài khoản
      targetUser.status = 'banned';
      targetUser.banReason = banReason || 'Vi phạm quy định cộng đồng';
      if (banDuration && banDuration > 0) {
        targetUser.banExpiresAt = new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000);
      } else {
        targetUser.banExpiresAt = null; // Khóa vĩnh viễn
      }
    }
    await targetUser.save();

    // Emit socket event để đẩy user đang online ra ngay lập tức
    if (!isActive) {
      try {
        const io = getIo();
        io.to(id).emit('forceBanned', {
          banReason: targetUser.banReason,
          banExpiresAt: targetUser.banExpiresAt,
        });
      } catch (e) {
        console.warn('Socket emit forceBanned failed:', e.message);
      }
    }

    return res.json({ message: isActive ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/users/admin/appeals
   Dành cho Admin/Moderator: Lấy danh sách khiếu nại
───────────────────────────────────────────────────────────────*/
export const getAppeals = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status !== 'all') filter.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Appeal.find(filter)
        .populate('userId', 'name email avatar')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Appeal.countDocuments(filter),
    ]);

    return res.json({
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/users/admin/appeals/:id
   Dành cho Admin/Moderator: Duyệt/Từ chối khiếu nại
───────────────────────────────────────────────────────────────*/
export const reviewAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminReply } = req.body; // action: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: "Hành động không hợp lệ." });
    }

    const appeal = await Appeal.findById(id);
    if (!appeal) {
      return res.status(404).json({ message: "Không tìm thấy khiếu nại." });
    }

    appeal.status = action;
    appeal.adminReply = adminReply || '';
    appeal.reviewedBy = req.user._id;
    appeal.reviewedAt = new Date();
    await appeal.save();

    // Nếu duyệt khiếu nại -> mở khóa tài khoản
    if (action === 'approved') {
      await User.findByIdAndUpdate(appeal.userId, {
        status: 'active',
        banReason: null,
        banExpiresAt: null,
      });
    }

    return res.json({ message: action === 'approved' ? "Đã chấp nhận khiếu nại và mở khóa tài khoản." : "Đã từ chối khiếu nại." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

