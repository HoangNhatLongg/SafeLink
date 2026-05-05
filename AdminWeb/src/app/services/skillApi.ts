import { apiRequest } from '../lib/axiosClient';
import { Skill, SkillStatus, PaginatedResponse } from '../types';

export interface SkillQueryParams {
  status?: SkillStatus | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export const skillApi = {
  getAll: (params: SkillQueryParams) => {
    return apiRequest.get<{ message: string; data: Skill[]; meta: any }>('/skills/admin/all', { params }).then(res => ({
      items: res.data,
      total: res.meta.total,
      page: res.meta.page,
      pageSize: res.meta.limit,
      totalPages: res.meta.totalPages
    }));
  },

  getById: (id: string) => {
    return apiRequest.get<{ message: string; data: Skill }>(`/skills/${id}`).then(res => res.data);
  },

  create: (formData: FormData) => {
    return apiRequest.post<{ message: string; data: Skill }>('/skills/admin', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },

  update: (id: string, formData: FormData) => {
    return apiRequest.put<{ message: string; data: Skill }>(`/skills/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },

  delete: (id: string) => {
    return apiRequest.delete<{ message: string }>(`/skills/${id}`);
  },

  review: (id: string, action: 'approve' | 'reject', rejectReason?: string) => {
    return apiRequest.patch<{ message: string; data: Skill }>(`/skills/${id}/review`, { action, rejectReason }).then(res => res.data);
  },
};
