// Kiểu dữ liệu cho Thư Viện Kỹ Năng

export type SkillCategory =
  | "so_cap_cuu"
  | "pccc"
  | "thien_tai"
  | "an_toan_dien"
  | "tai_nan"
  | "tam_ly"
  | "khac";

export type SkillDifficulty = "co_ban" | "trung_binh" | "nang_cao";
export type SkillStatus = "active" | "pending" | "rejected";

export interface SkillImage {
  url: string;
  publicId?: string;
}

export interface SkillStep {
  order: number;
  title: string;
  content: string;
  images: SkillImage[];
}

// Đủ dữ liệu để hiển thị card (danh sách)
export interface SkillSummary {
  _id: string;
  title: string;
  summary?: string;
  category: SkillCategory;
  coverImage?: SkillImage;
  difficulty: SkillDifficulty;
  duration?: string;
  viewCount: number;
  tags: string[];
  createdAt: string;
}

// Đầy đủ để hiển thị chi tiết + lưu offline
export interface Skill extends SkillSummary {
  videoUrl?: string;
  steps: SkillStep[];
  status: SkillStatus;
  submittedBy?: { name: string; avatar?: string };
  reviewedAt?: string;
  rejectReason?: string;
}

// Payload đóng góp kỹ năng
export interface ContributeStep {
  order: number;
  title: string;
  content: string;
  // images gán qua FormData riêng: step_N_image
}

export interface ContributeSkillPayload {
  title: string;
  summary?: string;
  category: SkillCategory;
  difficulty: SkillDifficulty;
  duration?: string;
  videoUrl?: string;
  tags?: string[];
  steps: ContributeStep[];
}

// Nhãn hiển thị
export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  so_cap_cuu: "Sơ Cấp Cứu",
  pccc: "PCCC",
  thien_tai: "Thiên Tai",
  an_toan_dien: "An Toàn Điện",
  tai_nan: "Tai Nạn",
  tam_ly: "Tâm Lý",
  khac: "Khác",
};

export const CATEGORY_ICONS: Record<SkillCategory, string> = {
  so_cap_cuu: "🩺",
  pccc: "🔥",
  thien_tai: "⛰️",
  an_toan_dien: "⚡",
  tai_nan: "🚗",
  tam_ly: "🧠",
  khac: "📋",
};

export const DIFFICULTY_LABELS: Record<SkillDifficulty, string> = {
  co_ban: "Cơ bản",
  trung_binh: "Trung bình",
  nang_cao: "Nâng cao",
};

export const DIFFICULTY_COLORS: Record<SkillDifficulty, string> = {
  co_ban: "#4CAF50",
  trung_binh: "#FF9800",
  nang_cao: "#F44336",
};
