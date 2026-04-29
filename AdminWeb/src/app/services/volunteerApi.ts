import { apiRequest } from '../lib/axiosClient';
import { Volunteer, PaginatedResponse, VolunteerStatus } from '../types';

export interface VolunteerQueryParams {
  status?: VolunteerStatus | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export const volunteerApi = {
  // Lấy toàn bộ danh sách đơn đăng ký tình nguyện (Admin)
  getAll: (params?: VolunteerQueryParams) => {
    return apiRequest.get<PaginatedResponse<Volunteer>>('/volunteers/all', { params });
  },

  // Lấy danh sách chờ duyệt (Admin)
  getPending: () => {
    return apiRequest.get<{ items: Volunteer[], total: number }>('/volunteers/pending');
  },

  // Cập nhật trạng thái duyệt (Admin)
  review: (id: string, action: 'approve' | 'reject', rejectReason?: string) => {
    return apiRequest.patch<{ message: string, item: Volunteer }>(`/volunteers/${id}/review`, {
      action,
      rejectReason,
    });
  },
};
