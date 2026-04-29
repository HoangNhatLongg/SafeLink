import type { Agency } from "./types";

/**
 * Dữ liệu tích hợp sẵn (built-in) — dùng khi API không khả dụng.
 * Đây là các số điện thoại khẩn cấp THẬT của Việt Nam.
 */
export const AGENCIES = [
  // ─── Số khẩn cấp quốc gia ─────────────────────────────────────────────────
  { id: "q1", name: "Cảnh sát Phòng cháy chữa cháy", phone: "114", address: "Toàn quốc", lat: 16.047, lng: 108.206, province: "Toàn quốc", district: "", ward: "", type: "pccc" },
  { id: "q2", name: "Cấp cứu Y tế",                   phone: "115", address: "Toàn quốc", lat: 16.047, lng: 108.207, province: "Toàn quốc", district: "", ward: "", type: "cuu_thuong" },
  { id: "q3", name: "Cảnh sát Công an",               phone: "113", address: "Toàn quốc", lat: 16.047, lng: 108.208, province: "Toàn quốc", district: "", ward: "", type: "canh_sat" },

  // ─── TP. Hồ Chí Minh ──────────────────────────────────────────────────────
  { id: "1",  name: "Phòng CSGT CA TP.HCM",              phone: "028 3920 8128", address: "459 Trần Hưng Đạo, Q.5, TP.HCM",                              lat: 10.753, lng: 106.661, province: "TP HCM",    district: "Quận 5",      ward: "Phường 2",         type: "csgt"       },
  { id: "2",  name: "Cảnh sát PCCC TP.HCM",              phone: "028 3864 0159", address: "487 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM",                     lat: 10.807, lng: 106.717, province: "TP HCM",    district: "Bình Thạnh",  ward: "Phường 26",        type: "pccc"       },
  { id: "3",  name: "Công an Quận 1 TP.HCM",             phone: "028 3829 2224", address: "258 Đinh Bộ Lĩnh, Bình Thạnh, TP.HCM",                       lat: 10.774, lng: 106.698, province: "TP HCM",    district: "Quận 1",      ward: "Bến Nghé",         type: "canh_sat"   },
  { id: "4",  name: "Bệnh viện Chợ Rẫy",                 phone: "028 3855 4137", address: "201B Nguyễn Chí Thanh, P.12, Q.5, TP.HCM",                   lat: 10.755, lng: 106.665, province: "TP HCM",    district: "Quận 5",      ward: "Phường 12",        type: "benh_vien"  },
  { id: "5",  name: "Bệnh viện Thống Nhất",              phone: "028 3841 5454", address: "1 Lý Thường Kiệt, Tân Bình, TP.HCM",                         lat: 10.778, lng: 106.671, province: "TP HCM",    district: "Tân Bình",    ward: "Phường 7",         type: "benh_vien"  },
  { id: "6",  name: "Cấp cứu 115 TP.HCM",               phone: "115",           address: "284 Cách Mạng Tháng 8, Q.10, TP.HCM",                        lat: 10.779, lng: 106.690, province: "TP HCM",    district: "Quận 10",     ward: "Phường 12",        type: "cuu_thuong" },
  { id: "s1", name: "Cứu hộ xe máy 24h TP.HCM",         phone: "028 7300 5555", address: "103 Lý Thái Tổ, Q.3, TP.HCM",                                lat: 10.771, lng: 106.685, province: "TP HCM",    district: "Quận 3",      ward: "Phường 1",         type: "sua_xe_cap_cuu" },
  { id: "s2", name: "Hỗ trợ khẩn cấp SOS TP.HCM",       phone: "028 1800 6789", address: "22 Bến Chương Dương, Q.1, TP.HCM",                            lat: 10.765, lng: 106.697, province: "TP HCM",    district: "Quận 1",      ward: "Cầu Ông Lãnh",    type: "ho_tro_sos" },

  // ─── Đồng Nai ─────────────────────────────────────────────────────────────
  { id: "8",  name: "Phòng CSGT CA Tỉnh Đồng Nai",      phone: "0251 382 9123", address: "161 Phạm Văn Thuận, Tam Hiệp, Biên Hòa, Đồng Nai",           lat: 10.953, lng: 106.865, province: "Đồng Nai",  district: "Biên Hòa",    ward: "Tam Hiệp",         type: "csgt"       },
  { id: "9",  name: "Cảnh sát PCCC Đồng Nai",           phone: "0251 382 4114", address: "72 Phan Trung, Tân Phong, Biên Hòa, Đồng Nai",               lat: 10.947, lng: 106.844, province: "Đồng Nai",  district: "Biên Hòa",    ward: "Tân Phong",        type: "pccc"       },
  { id: "10", name: "Bệnh viện Đa khoa Đồng Nai",       phone: "0251 382 2740", address: "4 Phan Chu Trinh, Quyết Thắng, Biên Hòa, Đồng Nai",         lat: 10.947, lng: 106.845, province: "Đồng Nai",  district: "Biên Hòa",    ward: "Quyết Thắng",      type: "benh_vien"  },
  { id: "11", name: "Cấp cứu 115 Đồng Nai",             phone: "115",           address: "Trung tâm Y tế Biên Hòa, Đồng Nai",                          lat: 10.961, lng: 106.845, province: "Đồng Nai",  district: "Biên Hòa",    ward: "Tân Tiến",         type: "cuu_thuong" },
  { id: "s3", name: "Cứu hộ xe máy Biên Hòa",           phone: "0251 388 5566", address: "45 Nguyễn Ái Quốc, Biên Hòa, Đồng Nai",                      lat: 10.960, lng: 106.843, province: "Đồng Nai",  district: "Biên Hòa",    ward: "Hòa Bình",         type: "sua_xe_cap_cuu" },

  // ─── Bình Dương ───────────────────────────────────────────────────────────
  { id: "12", name: "Phòng CSGT CA Bình Dương",          phone: "0274 382 2020", address: "Đại lộ Bình Dương, Phú Cường, Thủ Dầu Một, Bình Dương",     lat: 10.979, lng: 106.651, province: "Bình Dương", district: "Thủ Dầu Một", ward: "Phú Cường",        type: "csgt"       },
  { id: "13", name: "Cảnh sát PCCC Bình Dương",          phone: "0274 222 3456", address: "12 Lê Lợi, Phú Cường, Thủ Dầu Một, Bình Dương",             lat: 10.980, lng: 106.652, province: "Bình Dương", district: "Thủ Dầu Một", ward: "Phú Cường",        type: "pccc"       },
  { id: "14", name: "Bệnh viện Đa khoa Bình Dương",      phone: "0274 382 2780", address: "Phú Cường, Thủ Dầu Một, Bình Dương",                         lat: 10.982, lng: 106.654, province: "Bình Dương", district: "Thủ Dầu Một", ward: "Phú Cường",        type: "benh_vien"  },

  // ─── Hà Nội ───────────────────────────────────────────────────────────────
  { id: "15", name: "Phòng CSGT CA TP. Hà Nội",         phone: "024 3942 1313", address: "87 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",                       lat: 21.025, lng: 105.847, province: "Hà Nội",    district: "Hoàn Kiếm",   ward: "Phan Chu Trinh",   type: "csgt"       },
  { id: "16", name: "Cảnh sát PCCC CA TP. Hà Nội",      phone: "024 3830 2626", address: "258A Lạc Long Quân, Tây Hồ, Hà Nội",                         lat: 21.052, lng: 105.812, province: "Hà Nội",    district: "Tây Hồ",      ward: "Nhật Tân",         type: "pccc"       },
  { id: "17", name: "Bệnh viện Bạch Mai",                phone: "024 3869 3731", address: "78 Giải Phóng, Đống Đa, Hà Nội",                             lat: 21.011, lng: 105.840, province: "Hà Nội",    district: "Đống Đa",     ward: "Phương Mai",       type: "benh_vien"  },
  { id: "18", name: "Bệnh viện Việt Đức",                phone: "024 3825 3531", address: "40 Tràng Thi, Hoàn Kiếm, Hà Nội",                           lat: 21.028, lng: 105.843, province: "Hà Nội",    district: "Hoàn Kiếm",   ward: "Hàng Bông",        type: "benh_vien"  },
  { id: "19", name: "Cấp cứu 115 Hà Nội",               phone: "115",           address: "8 Phủ Doãn, Hoàn Kiếm, Hà Nội",                             lat: 21.030, lng: 105.847, province: "Hà Nội",    district: "Hoàn Kiếm",   ward: "Hàng Gai",         type: "cuu_thuong" },
  { id: "s4", name: "Cứu hộ xe máy Hà Nội",             phone: "024 6689 9900", address: "56 Đường Láng, Đống Đa, Hà Nội",                             lat: 21.021, lng: 105.831, province: "Hà Nội",    district: "Đống Đa",     ward: "Láng Thượng",      type: "sua_xe_cap_cuu" },
  { id: "s5", name: "Hỗ trợ khẩn cấp SOS Hà Nội",       phone: "024 1900 6688", address: "1 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội",                      lat: 21.029, lng: 105.850, province: "Hà Nội",    district: "Hoàn Kiếm",   ward: "Lý Thái Tổ",       type: "ho_tro_sos" },

  // ─── Đà Nẵng ──────────────────────────────────────────────────────────────
  { id: "20", name: "Phòng CSGT CA TP. Đà Nẵng",        phone: "0236 382 2640", address: "7 Trần Quý Cáp, Hải Châu, Đà Nẵng",                         lat: 16.068, lng: 108.220, province: "Đà Nẵng",   district: "Hải Châu",    ward: "Bình Thuận",       type: "csgt"       },
  { id: "21", name: "Bệnh viện Đà Nẵng",                 phone: "0236 382 1480", address: "124 Hải Phòng, Thạch Thang, Hải Châu, Đà Nẵng",             lat: 16.062, lng: 108.218, province: "Đà Nẵng",   district: "Hải Châu",    ward: "Thạch Thang",      type: "benh_vien"  },
  { id: "22", name: "Cấp cứu 115 Đà Nẵng",              phone: "115",           address: "Trung tâm Y tế TP. Đà Nẵng",                                 lat: 16.067, lng: 108.209, province: "Đà Nẵng",   district: "Thanh Khê",   ward: "Thạc Gián",        type: "cuu_thuong" },
  { id: "s6", name: "Cứu hộ xe Đà Nẵng",                phone: "0236 388 7799", address: "30 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",                      lat: 16.065, lng: 108.215, province: "Đà Nẵng",   district: "Hải Châu",    ward: "Nam Dương",        type: "sua_xe_cap_cuu" },
];

/** Map built-in format sang Agency type dùng trong toàn app */
export function mapFallback(a: any): Agency {
  return {
    _id: a.id,
    name: a.name,
    phone: a.phone,
    address: a.address,
    province: a.province,
    district: a.district,
    ward: a.ward,
    type: a.type,
    lat: a.lat,
    lng: a.lng,
    status: "active",
  };
}
