import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User } from '../types';
import { apiRequest } from '../lib/axiosClient';

interface LoginResponse {
  token: string;
  user: User;
  requireOtp?: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          let deviceId = localStorage.getItem('safelink_device_id');
          if (!deviceId) {
            deviceId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : 'web-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('safelink_device_id', deviceId);
          }

          const response = await apiRequest.post<LoginResponse>('/auth/login', { 
            email, 
            password,
            deviceId 
          });
          
          if (response.requireOtp) {
            return { requireOtp: true };
          }

          const { user, token } = response;

          if (user.role !== 'admin' && user.role !== 'moderator') {
            throw new Error('Tài khoản không có quyền truy cập hệ thống quản trị.');
          }

          localStorage.setItem('safelink_token', token);
          localStorage.setItem('safelink_user', JSON.stringify(user));

          set({
            user,
            token,
            isAuthenticated: true,
          });
          return { success: true };
        } catch (error: any) {
          console.error('Login failed:', error);
          
          // Xử lý trường hợp backend trả về 403 khi thiết bị mới cần OTP
          if (error.response?.status === 403 && error.response?.data?.requireOtp) {
            return { requireOtp: true };
          }
          
          if (error.response && error.response.data && error.response.data.message) {
            throw new Error(error.response.data.message);
          }
          throw error;
        }
      },

      verifyOtp: async (email: string, otpCode: string) => {
        try {
          const deviceId = localStorage.getItem('safelink_device_id');
          const response = await apiRequest.post<LoginResponse>('/auth/verify-device', { 
            email, 
            otpCode,
            deviceId 
          });

          const { user, token } = response;

          if (user.role !== 'admin' && user.role !== 'moderator') {
            throw new Error('Tài khoản không có quyền truy cập hệ thống quản trị.');
          }

          localStorage.setItem('safelink_token', token);
          localStorage.setItem('safelink_user', JSON.stringify(user));

          set({
            user,
            token,
            isAuthenticated: true,
          });
        } catch (error: any) {
          console.error('OTP Verification failed:', error);
          if (error.response && error.response.data && error.response.data.message) {
            throw new Error(error.response.data.message);
          }
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('safelink_token');
        localStorage.removeItem('safelink_user');
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'safelink-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);