export type FeedPostUi = {
  id: string;
  authorId?: string;
  username: string;
  avatar: string | number;
  reputation: number;
  location: string;
  time: string;
  title: string;
  hashtag: string;
  content: string;
  images?: string[];
  video?: string;
  likes: number;
  dislikes: number;
  commentsCount: number;
  shares: number;
  userReaction: "like" | "dislike" | null;
  isSaved: boolean;
  visibility?: string;
};

function formatRelative(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "Vừa xong";
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

const PLACEHOLDER_AVATAR = "https://i.pravatar.cc/150?img=12";

/** Chuẩn hóa document Post từ API → UI PostCard */
export function mapApiPostToUi(p: any): FeedPostUi {
  const author = p.author || {};
  const name = author.name || author.email || "Người dùng";
  const avatar =
    typeof author.avatar === "string" && author.avatar.trim()
      ? author.avatar
      : PLACEHOLDER_AVATAR;

  let locationStr = "—";
  if (p.distanceM != null && !Number.isNaN(Number(p.distanceM))) {
    const m = Number(p.distanceM);
    locationStr = m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  } else {
    const loc = p.location;
    if (typeof loc === "string") locationStr = loc;
    else if (loc?.address) locationStr = loc.address;
    else if (loc?.latitude != null && loc?.longitude != null) {
      locationStr = `${Number(loc.latitude).toFixed(3)}, ${Number(loc.longitude).toFixed(3)}`;
    }
  }

  const images = (p.images || []).map((x: any) => (typeof x === "string" ? x : x.url)).filter(Boolean);
  const videos = p.videos || [];
  const video = videos[0] ? (typeof videos[0] === "string" ? videos[0] : videos[0].url) : undefined;

  return {
    id: String(p._id || p.id),
    authorId: String(author._id || author.id || author),
    username: name,
    avatar,
    reputation: typeof p.score === "number" ? p.score : 0,
    location: locationStr,
    time: formatRelative(p.createdAt),
    title: "",
    hashtag: "",
    content: p.content || "",
    images: images.length ? images : undefined,
    video,
    likes: p.likesCount ?? 0,
    dislikes: p.dislikesCount ?? 0,
    commentsCount: p.commentsCount ?? 0,
    shares: p.sharesCount ?? 0,
    userReaction: p.userReaction ?? null,
    isSaved: !!p.isSaved,
    visibility: p.visibility,
  };
}
