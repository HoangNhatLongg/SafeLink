import { apiRequest } from '../lib/axiosClient';
import { SOSPost, SOSStatus, PaginatedResponse } from '../types';

export interface SOSQueryParams {
  status?: SOSStatus | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export const sosApi = {
  getAll: (params: SOSQueryParams) => {
    return apiRequest.get<{ message: string; data: SOSPost[]; meta: any }>('/sos/admin/all', { params }).then(res => ({
      items: res.data,
      total: res.meta.total,
      page: res.meta.page,
      pageSize: res.meta.limit,
      totalPages: res.meta.totalPages
    }));
  },

  resolve: (id: string) => {
    return apiRequest.patch<{ message: string }>(`/sos/${id}/resolve`);
  },

  delete: (id: string) => {
    return apiRequest.delete<{ message: string }>(`/sos/${id}`);
  },
};
