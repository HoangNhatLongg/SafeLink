import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// Base URL của Backend API
const BASE_URL = 'http://localhost:5000/api';

// Tạo Axios instance
export const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Tự động gắn JWT Token vào mỗi request
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('safelink_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - Xử lý lỗi toàn cục
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error: AxiosError) => {
    // Xử lý lỗi 401 - Unauthorized (Token hết hạn)
    if (error.response?.status === 401) {
      localStorage.removeItem('safelink_token');
      localStorage.removeItem('safelink_user');
      window.location.href = '/login';
    }

    // Xử lý lỗi 403 - Forbidden (Không có quyền)
    if (error.response?.status === 403) {
      console.error('Access denied: Insufficient permissions');
    }

    return Promise.reject(error);
  }
);

// Helper function để gọi API
export const apiRequest = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    axiosClient.get<T, T>(url, config),
  
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    axiosClient.post<T, T>(url, data, config),
  
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    axiosClient.put<T, T>(url, data, config),
  
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    axiosClient.patch<T, T>(url, data, config),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    axiosClient.delete<T, T>(url, config),
};

export default axiosClient;
