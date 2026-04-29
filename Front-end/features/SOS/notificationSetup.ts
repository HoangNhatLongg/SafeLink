import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
    
    /**
     * Cấu hình cách hiển thị thông báo khi app đang ở foreground
     */
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn("Could not load expo-notifications", e);
  }
}

/**
 * Đăng ký Push Token cho Expo
 * Trả về token nếu thành công, null nếu thất bại
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Chỉ hỗ trợ thiết bị thật và không hỗ trợ Expo Go
  if (isExpoGo || !Device.isDevice) {
    console.log("ℹ️ Push Notifications chỉ hoạt động trên thiết bị thật và bản build Development.");
    return null;
  }

  if (!Notifications) return null;

  try {
    // Tạo notification channel cho Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("sos", {
        name: "Cảnh báo SOS",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
      });
    }

    // Xin quyền
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("⚠️ Quyền Push Notification bị từ chối.");
      return null;
    }

    // Lấy project ID từ app config (cần cho Expo Go / production)
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    console.log("📲 Expo Push Token:", token);
    return token;
  } catch (e: any) {
    // Không crash app — chỉ warn
    console.warn("⚠️ Không lấy được Push Token:", e.message);
    return null;
  }
}
