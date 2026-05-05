import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useGlobalSocket } from '../../hooks/useGlobalSocket';

export function Layout() {
  const [sidebarCollapsed] = useState(false);
  
  // Kích hoạt lắng nghe Socket.IO toàn cục
  useGlobalSocket();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Header />
        
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
