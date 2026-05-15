import { useQuery } from '@tanstack/react-query';
import { Users, AlertCircle, Flag, Heart } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { RecentReports } from '../components/dashboard/RecentReports';
import { dashboardApi } from '../services/dashboardApi';

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardApi.getStats(),
  });

  if (isLoading) {
    return <div className="p-8 text-center">Đang tải dữ liệu Dashboard...</div>;
  }

  if (isError || !data) {
    return <div className="p-8 text-center text-red-500">Đã xảy ra lỗi khi tải dữ liệu Dashboard.</div>;
  }

  const { stats, chartData, recentReports } = data;

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
          value={stats.totalUsers.toLocaleString('vi-VN')}
          change={stats.totalUsersChange}
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Báo SOS Mới (7 ngày)"
          value={stats.sosReports}
          change={stats.sosReportsChange}
          icon={AlertCircle}
          iconColor="text-red-600"
        />
        <StatCard
          title="Báo Cáo Vi Phạm Chờ Xử Lý"
          value={stats.violationReports}
          change={stats.violationReportsChange}
          icon={Flag}
          iconColor="text-orange-600"
        />
        <StatCard
          title="Đội Cứu Hộ Chờ Duyệt"
          value={stats.pendingVolunteers}
          change={stats.pendingVolunteersChange}
          icon={Heart}
          iconColor="text-green-600"
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LƯU Ý: Biểu đồ ActivityChart sẽ hiển thị số tài khoản mới tạo thay cho 'visits' */}
        <ActivityChart data={chartData} />
        <RecentReports reports={recentReports} />
      </div>
    </div>
  );
}
