import { Users, AlertCircle, Flag, Heart } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { RecentReports } from '../components/dashboard/RecentReports';

// Mock data - Trong production sẽ fetch từ API
const mockStats = {
  totalUsers: 12453,
  totalUsersChange: 12.5,
  sosReports: 234,
  sosReportsChange: -5.2,
  violationReports: 45,
  violationReportsChange: 8.3,
  pendingVolunteers: 18,
  pendingVolunteersChange: 15.0,
};

const mockChartData = Array.from({ length: 30 }, (_, i) => ({
  date: `${i + 1}/4`,
  visits: Math.floor(Math.random() * 5000) + 2000,
  posts: Math.floor(Math.random() * 200) + 50,
}));

const mockRecentReports = [
  {
    id: '1',
    postContent: 'Nội dung bài viết chứa ngôn từ không phù hợp và có tính chất spam quảng cáo...',
    reportCount: 23,
    reportedAt: '2026-04-15T10:30:00',
    reason: 'spam',
  },
  {
    id: '2',
    postContent: 'Bình luận có nội dung quấy rối, xúc phạm người khác trên nền tảng...',
    reportCount: 18,
    reportedAt: '2026-04-15T09:15:00',
    reason: 'harassment',
  },
  {
    id: '3',
    postContent: 'Hình ảnh bạo lực, gây sốc không phù hợp với cộng đồng...',
    reportCount: 15,
    reportedAt: '2026-04-15T08:45:00',
    reason: 'violence',
  },
  {
    id: '4',
    postContent: 'Nội dung không phù hợp với tiêu chuẩn cộng đồng SafeLink...',
    reportCount: 12,
    reportedAt: '2026-04-15T07:20:00',
    reason: 'inappropriate',
  },
  {
    id: '5',
    postContent: 'Thông tin sai sự thật, gây hoang mang trong cộng đồng...',
    reportCount: 10,
    reportedAt: '2026-04-14T23:30:00',
    reason: 'other',
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Tổng quan hệ thống SafeLink Admin
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Người Dùng"
          value={mockStats.totalUsers.toLocaleString('vi-VN')}
          change={mockStats.totalUsersChange}
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Báo SOS Tuần Này"
          value={mockStats.sosReports}
          change={mockStats.sosReportsChange}
          icon={AlertCircle}
          iconColor="text-red-600"
        />
        <StatCard
          title="Báo Cáo Vi Phạm"
          value={mockStats.violationReports}
          change={mockStats.violationReportsChange}
          icon={Flag}
          iconColor="text-orange-600"
        />
        <StatCard
          title="Đội Cứu Hộ Chờ Duyệt"
          value={mockStats.pendingVolunteers}
          change={mockStats.pendingVolunteersChange}
          icon={Heart}
          iconColor="text-green-600"
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityChart data={mockChartData} />
        <RecentReports reports={mockRecentReports} />
      </div>
    </div>
  );
}
