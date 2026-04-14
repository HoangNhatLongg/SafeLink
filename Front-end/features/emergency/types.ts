export type AgencyType = "csgt" | "pccc" | "canh_sat" | "benh_vien" | "cuu_thuong" | "khac";
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
  csgt:      "CSGT",
  pccc:      "PCCC",
  canh_sat:  "Công An",
  benh_vien: "Bệnh Viện",
  cuu_thuong:"Cấp Cứu",
  khac:      "Khác",
};

export const AGENCY_TYPE_COLORS: Record<AgencyType, string> = {
  csgt:      "#1565C0",
  pccc:      "#B71C1C",
  canh_sat:  "#1B5E20",
  benh_vien: "#0277BD",
  cuu_thuong:"#E65100",
  khac:      "#616161",
};

export const AGENCY_TYPE_ICONS: Record<AgencyType, string> = {
  csgt:      "🚔",
  pccc:      "🚒",
  canh_sat:  "👮",
  benh_vien: "🏥",
  cuu_thuong:"🚑",
  khac:      "📍",
};
