export type AgencyType =
  | "csgt"
  | "pccc"
  | "canh_sat"
  | "benh_vien"
  | "cuu_thuong"
  | "sua_xe_cap_cuu"
  | "ho_tro_sos"

export type AgencyStatus = "active" | "pending" | "rejected";

export interface Agency {
  _id: string;
  name: string;
  phone: string;
  address: string;
  province: string;
  district?: string;
  ward?: string;
  type: AgencyType;
  lat: number;
  lng: number;
  note?: string;
  status: AgencyStatus;
  distanceKm?: number;
  createdAt?: string;
}

export interface ContributePayload {
  name: string;
  phone: string;
  address: string;
  province: string;
  district?: string;
  ward?: string;
  type: AgencyType;
  lat: number;
  lng: number;
  note?: string;
}

export const AGENCY_TYPE_LABELS: Record<AgencyType, string> = {
  csgt:           "CSGT",
  pccc:           "PCCC",
  canh_sat:       "Công An",
  benh_vien:      "Bệnh Viện",
  cuu_thuong:     "Cấp Cứu",
  sua_xe_cap_cuu: "Sửa Xe CĐ",
  ho_tro_sos:     "Hỗ Trợ SOS",
};

export const AGENCY_TYPE_COLORS: Record<AgencyType, string> = {
  csgt:           "#1565C0",
  pccc:           "#B71C1C",
  canh_sat:       "#1B5E20",
  benh_vien:      "#0277BD",
  cuu_thuong:     "#E65100",
  sua_xe_cap_cuu: "#5D4037",
  ho_tro_sos:     "#6A1B9A",
};

/** Icon dùng trong badge & chip (emoji cho đơn giản & cross-platform) */
export const AGENCY_TYPE_ICONS: Record<AgencyType, string> = {
  csgt:           "🚔",
  pccc:           "🚒",
  canh_sat:       "👮",
  benh_vien:      "🏥",
  cuu_thuong:     "🚑",
  sua_xe_cap_cuu: "🔧",
  ho_tro_sos:     "🆘",
  khac:           "📍",
};

/**
 * Ionicons name tương ứng với từng loại đơn vị — dùng trong AgencyCard header icon
 * để có vẻ chuyên nghiệp hơn emoji đơn thuần.
 */
export const AGENCY_TYPE_IONICONS: Record<AgencyType, string> = {
  csgt:           "car-sport",
  pccc:           "flame",
  canh_sat:       "shield-checkmark",
  benh_vien:      "medical",
  cuu_thuong:     "medkit",
  sua_xe_cap_cuu: "build",
  ho_tro_sos:     "hand-left"
};

/**
 * Mapping SOS category → danh sách AgencyType nên hiển thị trên bản đồ.
 * Dùng cho tính năng "hiện đơn vị hỗ trợ sau khi gửi SOS".
 */
export const SOS_CATEGORY_TO_AGENCY_TYPES: Record<string, AgencyType[]> = {
  fire:           ["pccc"],
  traffic:        ["csgt", "cuu_thuong"],
  landslide:      ["pccc", "cuu_thuong"],
  robbery:        ["canh_sat"],
  medical:        ["benh_vien", "cuu_thuong"],
  flood:          ["pccc", "cuu_thuong"],
  sos_support:    ["ho_tro_sos"],
  vehicle_repair: ["sua_xe_cap_cuu"],
  other:          ["csgt", "pccc", "canh_sat", "benh_vien", "cuu_thuong", "sua_xe_cap_cuu", "ho_tro_sos"],
};
