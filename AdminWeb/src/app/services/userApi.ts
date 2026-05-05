import { apiRequest } from '../lib/axiosClient';
import { User, UserRole } from '../types';

export interface UserQueryParams {
  search?: string;
  role?: UserRole | 'all';
  page?: number;
  limit?: number;
}

export interface BanPayload {
  isActive: boolean;
  banReason?: string;
  banDuration?: number | null; // số ngày, null = vĩnh viễn
}

export interface Appeal {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminReply: string;
  reviewedBy?: { _id: string; name: string };
  reviewedAt?: string;
  createdAt: string;
}

export const userApi = {
  getAll: (params: UserQueryParams) => {
    return apiRequest.get<{ message: string; data: User[]; meta: any }>('/users/admin/all', { params }).then(res => ({
      items: res.data,
      total: res.meta.total,
      page: res.meta.page,
      pageSize: res.meta.limit,
      totalPages: res.meta.totalPages
    }));
  },

  updateRole: (id: string, role: UserRole) => {
    return apiRequest.patch<{ message: string }>(`/users/admin/${id}/role`, { role });
  },

  updateStatus: (id: string, payload: BanPayload) => {
    return apiRequest.patch<{ message: string }>(`/users/admin/${id}/status`, payload);
  },

  getAppeals: (params: { status?: string; page?: number; limit?: number }) => {
    return apiRequest.get<{ data: Appeal[]; meta: any }>('/users/admin/appeals', { params });
  },

  reviewAppeal: (id: string, action: 'approved' | 'rejected', adminReply?: string) => {
    return apiRequest.patch<{ message: string }>(`/users/admin/appeals/${id}`, { action, adminReply });
  },
};
