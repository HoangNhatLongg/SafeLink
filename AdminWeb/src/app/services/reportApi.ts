import { apiRequest } from '../lib/axiosClient';

export interface Report {
  _id: string;
  post: {
    _id: string;
    content: string;
    images: { url: string; publicId?: string }[];
    videos: { url: string; publicId?: string }[];
    author?: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    status: string;
  };
  reporter: {
    _id: string;
    name: string;
    email: string;
  };
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  createdAt: string;
}

export const reportApi = {
  getReports: (params: { status?: string; page?: number; limit?: number }) => {
    return apiRequest.get<{ reports: Report[]; pagination: any }>('/moderation/reports', { params });
  },

  updateReport: (id: string, status: 'pending' | 'reviewed' | 'dismissed' | 'actioned', flagPost: boolean = false, restorePost: boolean = false) => {
    return apiRequest.patch<{ message: string; report: Report }>(`/moderation/reports/${id}`, { status, flagPost, restorePost });
  },
};
