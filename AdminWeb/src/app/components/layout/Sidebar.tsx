import { Link, useLocation } from 'react-router';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  Users,
  Heart,
  BookOpen,
  Flag,
  Phone,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Tổng Quan',
    href: '/',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Quản Lý Người Dùng',
    href: '/users',
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: 'Duyệt Đội Cứu Hộ',
    href: '/volunteers',
    icon: <Heart className="h-5 w-5" />,
    adminOnly: true, // Chỉ admin mới thấy
  },
  {
    title: 'Duyệt Danh Bạ',
    href: '/directory',
    icon: <Phone className="h-5 w-5" />,
  },
  {
    title: 'Thư Viện Kỹ Năng',
    href: '/skills',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: 'Báo Cáo Vi Phạm',
    href: '/reports',
    icon: <Flag className="h-5 w-5" />,
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl">SafeLink</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('ml-auto', collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.title : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Role Badge */}
      {!collapsed && user && (
        <div className="border-t p-4">
          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
                )}
              />
              <span className="text-sm capitalize">
                {user.role === 'admin' ? 'Quản Trị Viên' : 'Người Kiểm Duyệt'}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
