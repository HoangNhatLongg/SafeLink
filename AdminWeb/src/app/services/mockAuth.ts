import { User } from '../types';

// Mock user data for development
export const mockAdminUser: User = {
  id: 'admin-1',
  name: 'Admin SafeLink',
  email: 'admin@safelink.com',
  role: 'admin',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
  createdAt: '2026-01-01',
  isActive: true,
};

export const mockModeratorUser: User = {
  id: 'mod-1',
  name: 'Moderator SafeLink',
  email: 'moderator@safelink.com',
  role: 'moderator',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mod',
  createdAt: '2026-01-15',
  isActive: true,
};

// Mock login function - simulate API call
export const mockLogin = async (email: string, password: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simple mock authentication
  if (email === 'admin@safelink.com' && password === 'admin') {
    return {
      success: true,
      data: {
        user: mockAdminUser,
        token: 'mock-admin-token-' + Date.now(),
      },
    };
  }

  if (email === 'mod@safelink.com' && password === 'mod') {
    return {
      success: true,
      data: {
        user: mockModeratorUser,
        token: 'mock-mod-token-' + Date.now(),
      },
    };
  }

  throw new Error('Email hoặc mật khẩu không đúng');
};
