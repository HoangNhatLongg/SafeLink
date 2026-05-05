import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import VolunteerModeration from './pages/VolunteerModeration';
import DirectoryModeration from './pages/DirectoryModeration';
import SkillModeration from './pages/SkillModeration';
import SosModeration from './pages/SosModeration';
import AppealManagement from './pages/AppealManagement';
import Login from './pages/Login';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Removed DirectoryModeration placeholder



function ReportModeration() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Báo Cáo Vi Phạm</h1>
        <p className="text-muted-foreground mt-1">
          Kiểm duyệt các bài đăng và bình luận bị báo cáo vi phạm
        </p>
      </div>
      <div className="text-center py-12 text-muted-foreground">
        Trang đang được phát triển...
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-xl text-muted-foreground">Không tìm thấy trang</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: 'users', Component: UserManagement },
      { path: 'volunteers', Component: VolunteerModeration },
      { path: 'directory', Component: DirectoryModeration },
      { path: 'skills', Component: SkillModeration },
      { path: 'sos', Component: SosModeration },
      { path: 'appeals', Component: AppealManagement },
      { path: 'reports', Component: ReportModeration },
      { path: '*', Component: NotFound },
    ],
  },
]);
