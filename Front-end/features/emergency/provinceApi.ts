import { API_BASE } from "@/constants/api";

export interface Province {
  _id: string;
  name: string;
  wards: string[];
}

export const fetchProvinces = async (): Promise<Province[]> => {
  const res = await fetch(`${API_BASE}/api/provinces`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
};

export const sortWards = (wards: string[]): string[] => {
  const phuongs: string[] = [];
  const xas: string[] = [];
  const others: string[] = [];

  wards.forEach((w) => {
    const lower = w.toLowerCase();
    if (lower.startsWith("phường ")) phuongs.push(w);
    else if (lower.startsWith("xã ")) xas.push(w);
    else others.push(w);
  });

  // Sort by the name part
  phuongs.sort((a, b) => a.substring(7).localeCompare(b.substring(7), 'vi'));
  xas.sort((a, b) => a.substring(3).localeCompare(b.substring(3), 'vi'));
  others.sort((a, b) => a.localeCompare(b, 'vi'));

  return [...phuongs, ...xas, ...others];
};
