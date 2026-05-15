import { apiRequest } from '../lib/axiosClient';

export interface DashboardStats {
  stats: {
    totalUsers: number;
    totalUsersChange: number;
    sosReports: number;
    sosReportsChange: number;
    violationReports: number;
    violationReportsChange: number;
    pendingVolunteers: number;
    pendingVolunteersChange: number;
  };
  chartData: {
    date: string;
    visits: number;
    posts: number;
  }[];
  recentReports: {
    id: string;
    postContent: string;
    reportCount: number;
    reportedAt: string;
    reason: string;
  }[];
}

export const dashboardApi = {
  getStats: () => {
    return apiRequest.get<DashboardStats>('/dashboard/stats');
  },
};
