// ==================== AUTH & USER ====================
export type UserRole = 'admin' | 'moderator' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success?: boolean; requireOtp?: boolean }>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

// ==================== DASHBOARD ====================
export interface DashboardStats {
  totalUsers: number;
  totalUsersChange: number;
  sosReports: number;
  sosReportsChange: number;
  violationReports: number;
  violationReportsChange: number;
  pendingVolunteers: number;
  pendingVolunteersChange: number;
}

export interface ChartData {
  date: string;
  visits: number;
  posts: number;
}

// ==================== VOLUNTEERS ====================
export type VolunteerType = 'sua_xe' | 'doi_sos' | 'ho_tro_lu' | 'cuu_nan' | 'y_te_tn' | 'van_chuyen' | 'on_dinh' | 'khac';
export type VolunteerServiceType = 'free' | 'paid' | 'negotiable';
export type VolunteerStatus = 'pending' | 'active' | 'rejected';

export interface Volunteer {
  _id: string;
  unitName: string;
  unitType: VolunteerType;
  entityKind: 'individual' | 'group';
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
  serviceType: VolunteerServiceType;
  priceNote?: string;
  verificationImages: Array<{
    url: string;
    publicId?: string;
    filename?: string;
  }>;
  status: VolunteerStatus;
  submittedBy?: {
    _id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    avatar?: string;
  };
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectReason?: string;
}

export type DirectoryCategory = 'csgt' | 'pccc' | 'canh_sat' | 'benh_vien' | 'cuu_thuong' | 'khac';
export type DirectoryStatus = 'pending' | 'active' | 'rejected';

export interface DirectoryEntry {
  _id: string;
  name: string;
  type: DirectoryCategory;
  phone: string;
  address: string;
  province: string;
  district?: string;
  ward?: string;
  lat: number;
  lng: number;
  note?: string;
  status: DirectoryStatus;
  submittedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  reviewedAt?: string;
  rejectReason?: string;
}

// ==================== SKILL LIBRARY ====================
export type SkillStatus = 'pending' | 'published' | 'rejected';

export interface SkillArticle {
  id: string;
  title: string;
  content: string; // HTML content
  thumbnail?: string;
  images: string[];
  category: string;
  tags: string[];
  author: string;
  status: SkillStatus;
  submittedAt: string;
  publishedAt?: string;
  views: number;
}

// ==================== REPORTS & MODERATION ====================
export type ReportReason = 'spam' | 'harassment' | 'violence' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Post {
  id: string;
  content: string;
  images: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  reportCount: number;
}

export interface Report {
  id: string;
  postId: string;
  post: Post;
  reason: ReportReason;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: ReportStatus;
}

// ==================== API RESPONSES ====================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== FILTERS & PARAMS ====================
export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}
