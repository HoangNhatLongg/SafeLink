import { apiRequest } from '../lib/axiosClient';
import { DirectoryEntry, PaginatedResponse, DirectoryStatus } from '../types';

export interface DirectoryQueryParams {
  page?: number;
  limit?: number;
  status?: DirectoryStatus | 'all';
  search?: string;
}

export const directoryApi = {
  // Lấy danh sách danh bạ (dành cho Admin)
  getAll: (params?: DirectoryQueryParams) => {
    return apiRequest.get<PaginatedResponse<DirectoryEntry>>('/directory/all', { params });
  },

  // Thêm danh bạ mới (trạng thái active)
  create: (data: Partial<DirectoryEntry>) => {
    return apiRequest.post<{ message: string; item: DirectoryEntry }>('/directory', data);
  },

  // Cập nhật danh bạ
  update: (id: string, data: Partial<DirectoryEntry>) => {
    return apiRequest.put<{ message: string; item: DirectoryEntry }>(`/directory/${id}`, data);
  },

  // Xóa danh bạ
  delete: (id: string) => {
    return apiRequest.delete<{ message: string }>(`/directory/${id}`);
  },

  // Duyệt / Từ chối danh bạ đang chờ
  review: (id: string, action: 'approve' | 'reject', rejectReason?: string) => {
    return apiRequest.patch<{ message: string; item: DirectoryEntry }>(`/directory/${id}/review`, { action, rejectReason });
  }
};
