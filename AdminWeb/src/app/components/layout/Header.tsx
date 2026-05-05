import { Bell, Moon, Sun, Search, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router';

export function Header() {
  const { user, logout } = useAuthStore();
  const { notifications, markAllAsRead, markAsRead } = useNotificationStore();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    // Kiểm tra theme từ localStorage hoặc system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm..."
              className="pl-9 bg-background"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="font-semibold text-sm">Thông Báo Mới</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-muted-foreground" onClick={markAllAsRead}>
                    Đánh dấu đã đọc
                  </Button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Không có thông báo mới
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem 
                      key={notif.id} 
                      className={`flex flex-col items-start p-3 gap-1 cursor-pointer border-b last:border-0 ${!notif.isRead ? 'bg-red-50/50' : ''}`}
                      onClick={() => markAsRead(notif.id)}
                      asChild
                    >
                      <Link to="/sos">
                        <div className="flex items-center gap-2 w-full">
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                          <span className="font-semibold text-sm line-clamp-1 flex-1">SOS từ {notif.authorName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: vi })}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-4">
                          Loại: {getSOSCategoryText(notif.category)}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback>
                    {user?.name ? getInitials(user.name) : 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <div className="text-sm">{user?.name || 'Admin'}</div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email || 'admin@safelink.com'}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Tài Khoản</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Hồ Sơ Cá Nhân</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Đăng Xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function getSOSCategoryText(cat: string) {
  const map: Record<string, string> = {
    fire: 'Cháy nổ',
    landslide: 'Sạt lở',
    traffic: 'Tai nạn giao thông',
    robbery: 'Trộm cướp',
    medical: 'Cấp cứu y tế',
    flood: 'Lụt lội',
    sos_support: 'Đội SOS',
    vehicle_repair: 'Sửa xe',
    other: 'Khác',
  };
  return map[cat] || 'Khác';
}
