// ─── Kiểu dữ liệu Volunteer ──────────────────────────────────────────────────

export type VolunteerUnitType =
  | "sua_xe"      // 🔧 Vá/Sửa xe di động
  | "doi_sos"     // 🆘 Đội SOS tình nguyện
  | "ho_tro_lu"   // 🌊 Hỗ trợ lũ lụt / thiên tai
  | "cuu_nan"     // 🛟 Cứu nạn cứu hộ
  | "y_te_tn"     // ❤️ Y tế tình nguyện
  | "van_chuyen"  // 🚗 Hỗ trợ vận chuyển
  | "on_dinh"     // 🏠 Hỗ trợ ổn định cuộc sống
  | "khac";       // 🤝 Khác

export type EntityKind = "individual" | "group";
export type VolunteerStatus = "pending" | "active" | "rejected";

export interface VolunteerUnit {
  _id: string;
  unitName: string;
  unitType: VolunteerUnitType;
  entityKind: EntityKind;
  contactName: string;
  phone: string;
  address: string;
  province: string;
  district?: string;
  ward?: string;
  lat: number;
  lng: number;
  description?: string;
  serviceArea?: string;
  availableTime?: string;
  note?: string;
  serviceType: ServiceType;
  priceNote?: string;
  verificationImages?: { url: string; publicId?: string; filename?: string }[];
  status: VolunteerStatus;
  distanceKm?: number;
  submittedBy?: { _id: string; name: string; email: string; avatar?: string };
  reviewedAt?: string;
  rejectReason?: string;
  createdAt?: string;
}

export interface VolunteerRegisterPayload {
  unitName: string;
  unitType: VolunteerUnitType;
  entityKind: EntityKind;
  contactName: string;
  phone: string;
  address: string;
  province: string;
  district?: string;
  ward?: string;
  lat: number;
  lng: number;
  description?: string;
  serviceArea?: string;
  availableTime?: string;
  note?: string;
}

// ─── Labels, Icons, Colors ───────────────────────────────────────────────────

export const VOLUNTEER_TYPE_LABELS: Record<VolunteerUnitType, string> = {
  sua_xe:     "Vá/Sửa xe",
  doi_sos:    "Đội SOS",
  ho_tro_lu:  "Lũ lụt",
  cuu_nan:    "Cứu nạn",
  y_te_tn:    "Y tế",
  van_chuyen: "Vận chuyển",
  on_dinh:    "Ổn định đời sống",
  khac:       "Khác",
};

export const VOLUNTEER_TYPE_ICONS: Record<VolunteerUnitType, string> = {
  sua_xe:     "🔧",
  doi_sos:    "🆘",
  ho_tro_lu:  "🌊",
  cuu_nan:    "🛟",
  y_te_tn:    "❤️",
  van_chuyen: "🚗",
  on_dinh:    "🏠",
  khac:       "🤝",
};

export const VOLUNTEER_TYPE_COLORS: Record<VolunteerUnitType, string> = {
  sua_xe:     "#5D4037",
  doi_sos:    "#C62828",
  ho_tro_lu:  "#0277BD",
  cuu_nan:    "#00695C",
  y_te_tn:    "#AD1457",
  van_chuyen: "#4527A0",
  on_dinh:    "#558B2F",
  khac:       "#37474F",
};

export const ENTITY_KIND_LABELS: Record<EntityKind, string> = {
  individual: "Cá nhân",
  group:      "Nhóm / Tổ chức",
};

export const ALL_VOLUNTEER_TYPES = Object.keys(VOLUNTEER_TYPE_LABELS) as VolunteerUnitType[];

// ─── Loại dịch vụ: Miễn phí / Thu phí / Thỏa thuận ─────────────────────────

export type ServiceType = "free" | "paid" | "negotiable";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  free:        "Miễn phí",
  paid:        "Có thu phí",
  negotiable:  "Thỏa thuận",
};

export const SERVICE_TYPE_ICONS: Record<ServiceType, string> = {
  free:        "💚",
  paid:        "💰",
  negotiable:  "🤝",
};

export const SERVICE_TYPE_COLORS: Record<ServiceType, { bg: string; text: string; border: string }> = {
  free:       { bg: "#E8F5E9", text: "#2E7D32", border: "#4CAF50" },
  paid:       { bg: "#FFF3E0", text: "#E65100", border: "#FF9800" },
  negotiable: { bg: "#E3F2FD", text: "#1565C0", border: "#42A5F5" },
};

export const SERVICE_TYPE_DESC: Record<ServiceType, string> = {
  free:       "Hỗ trợ cộng đồng không thu bất kỳ chi phí nào",
  paid:       "Có thu phí dịch vụ — vui lòng thỏa thuận trước",
  negotiable: "Chi phí tùy tình huống, thỏa thuận với người yêu cầu",
};

export const ALL_SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];

