import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveToken = async (token: string) => {
  await AsyncStorage.setItem("token", token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

export const removeToken = async () => {
  await AsyncStorage.removeItem("token");
};

const USER_KEY = "user_json";

export type StoredUser = {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  authType?: string;
  role?: string;
};

export const saveUserJson = async (user: StoredUser) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUserJson = async (): Promise<StoredUser | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

export const clearUserJson = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};

export const clearSession = async () => {
  await removeToken();
  await clearUserJson();
};

export const getDeviceId = async () => {
  let deviceId = await AsyncStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = "device-" + Math.random().toString(36).substring(2, 15);
    await AsyncStorage.setItem("device_id", deviceId);
  }
  return deviceId;
};