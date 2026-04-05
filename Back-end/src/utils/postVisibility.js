import Follow from "../models/followModel.js";
import Post from "../models/postModel.js";

/** Danh sách ObjectId user mà viewer có quan hệ bạn bè (theo dõi lẫn nhau). */
export async function getFriendAuthorIds(viewerId) {
  const [followingIds, followerIds] = await Promise.all([
    Follow.find({ follower: viewerId }).distinct("following"),
    Follow.find({ following: viewerId }).distinct("follower"),
  ]);
  const followerSet = new Set(followerIds.map((id) => id.toString()));
  return followingIds.filter((id) => followerSet.has(id.toString()));
}

export function canViewerSeePost(post, viewerId, friendAuthorIds) {
  const vid = viewerId.toString();
  const aid = (post.author?._id ?? post.author).toString();
  if (post.visibility === "public") return true;
  if (post.visibility === "private") return aid === vid;
  if (post.visibility === "friends") {
    return aid === vid || friendAuthorIds.some((id) => id.toString() === aid);
  }
  return false;
}

/** Điều kiện Mongo cho feed chính (mọi tác giả). */
export function feedVisibilityMatch(viewerId, friendAuthorIds) {
  return {
    $or: [
      { visibility: "public" },
      { visibility: "private", author: viewerId },
      {
        visibility: "friends",
        $or: [{ author: viewerId }, { author: { $in: friendAuthorIds } }],
      },
    ],
  };
}

/** Điều kiện bổ sung khi xem bài của một user (profile). */
export function authorProfileVisibilityMatch(authorIdStr, viewerIdStr, friendAuthorIds) {
  if (authorIdStr === viewerIdStr) return null;
  const isMutual = friendAuthorIds.some((id) => id.toString() === authorIdStr);
  return {
    $or: [
      { visibility: "public" },
      ...(isMutual ? [{ visibility: "friends" }] : []),
    ],
  };
}

/** Bài active, chưa ẩn với viewer, và viewer được phép xem theo visibility. */
export async function findActivePostVisibleToUser(postId, userId) {
  const post = await Post.findOne({
    _id: postId,
    status: "active",
    hiddenBy: { $nin: [userId] },
  }).lean();
  if (!post) return null;
  const friendAuthorIds = await getFriendAuthorIds(userId);
  if (!canViewerSeePost(post, userId, friendAuthorIds)) return null;
  return post;
}
