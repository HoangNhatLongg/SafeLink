import { apiRequest } from '../lib/axiosClient';

export interface Province {
  _id: string;
  name: string;
  wards: string[];
}

export const provinceApi = {
  getAll: async (): Promise<Province[]> => {
    const res = await apiRequest.get<{ message: string; data: Province[] }>('/provinces');
    return res.data;
  },
  
  create: async (data: { name: string; wards: string[] }): Promise<Province> => {
    const res = await apiRequest.post<{ message: string; data: Province }>('/provinces', data);
    return res.data;
  },

  update: async (id: string, data: { name?: string; wards?: string[] }): Promise<Province> => {
    const res = await apiRequest.put<{ message: string; data: Province }>(`/provinces/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest.delete<{ message: string }>(`/provinces/${id}`);
  },
};
