import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from "react-i18next";
import 'react-native-reanimated';
import '../i18n';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Alert, LogBox } from 'react-native';
import { setSessionExpiredHandler, setBannedHandler } from '@/features/api/http';
import { registerForPushNotificationsAsync } from '@/features/SOS/notificationSetup';
import { uploadPushToken, updateLocation } from '@/features/SOS/sosApi';
import { getToken, clearSession } from '@/features/auth/utils/storage';
import * as Location from 'expo-location';
import Constants, { ExecutionEnvironment } from "expo-constants";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// Ignore known push notification warning on Expo Go (SDK 53)
if (isExpoGo) {
  LogBox.ignoreLogs(['Android Push notifications']);
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    setSessionExpiredHandler((serverMessage) => {
      const lower = (serverMessage || "").toLowerCase();
      const isExpired =
        lower.includes("expired") ||
        lower.includes("hết hạn") ||
        lower.includes("invalid") ||
        lower.includes("not valid");
      const body = isExpired
        ? "Phiên đăng nhập đã hết hạn hoặc token không còn hiệu lực. Vui lòng đăng nhập lại."
        : serverMessage || "Vui lòng đăng nhập lại.";

      Alert.alert("Hết phiên đăng nhập", body, [
        { text: "Đóng", style: "cancel" },
        {
          text: t("login"),
          onPress: () => router.replace("/login"),
        },
      ]);
    });
    return () => setSessionExpiredHandler(null);
  }, [router, t]);

  // Khi tài khoản bị khóa (bắt từ API interceptor)
  useEffect(() => {
    setBannedHandler(async (info) => {
      await clearSession();
      Alert.alert(
        "🚫 Tài khoản đã bị khóa",
        `Lý do: ${info?.banReason || 'Vi phạm quy định'}\nThời hạn: ${info?.banExpiresAt ? new Date(info.banExpiresAt).toLocaleString('vi-VN') : 'Vĩnh viễn'}`,
        [{ text: "Đăng nhập lại", onPress: () => router.replace("/login") }]
      );
    });
    return () => setBannedHandler(null);
  }, [router]);

  // SOS & Notifications Setup
  useEffect(() => {
    let responseListener: any;

    (async () => {
      const token = await getToken();
      if (!token) return;

      // 1. Đăng ký Push Token
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        uploadPushToken(pushToken);
      }

      // 2. Cập nhật vị trí hiện tại lên server
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          updateLocation(loc.coords.latitude, loc.coords.longitude);
        }
      } catch (e) {
        console.warn('Layout location update error:', e);
      }
    })();

    // 3. Xử lý khi nhấn vào thông báo (ví dụ: chuyển đến bài bài SOS)
    if (!isExpoGo) {
      try {
        const Notifications = require('expo-notifications');
        responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;
          if (data?.type === 'sos_alert' && data.postId) {
            router.push({ pathname: '/post/[id]', params: { id: data.postId } });
          }
        });
      } catch (e) {
        console.warn("Could not setup notification listener", e);
      }
    }

    return () => {
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, [router]);

  // Global Real-time Socket Listeners
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { connectSocket, getSocket } = await import('@/features/chat/socketClient');
        const socket = await connectSocket();
        if (!active || !socket) return;

        socket.on('newPost', (post) => {
          // Alert.alert("Tin mới", "Có một bài viết mới vừa được đăng trên cộng đồng!");
        });

        socket.on('newSOS', (sos) => {
          Alert.alert("🚨 Cảnh báo khẩn cấp", `Có một tín hiệu SOS mới vừa được phát!`, [
            { text: "Đóng" },
            { text: "Xem trên bản đồ", onPress: () => router.push('/(tabs)/sos') }
          ]);
        });

        socket.on('newSkill', (skill) => {
          // Alert.alert("Kỹ năng mới", `Kỹ năng mới: ${skill.title} vừa được thêm.`);
        });

        socket.on('newDirectory', (dir) => {
          // Alert.alert("Danh bạ mới", `Địa điểm mới: ${dir.name} vừa được thêm vào danh bạ.`);
        });

        socket.on('volunteerApproved', () => {
          Alert.alert("✅ Chúc mừng", "Đơn đăng ký Đội Cứu Hộ của bạn đã được duyệt thành công! Bây giờ bạn đã có huy hiệu 🛡️ Đội Hỗ Trợ.");
        });

        socket.on('volunteerRejected', () => {
          Alert.alert("❌ Đơn bị từ chối", "Đơn đăng ký Đội Cứu Hộ của bạn đã bị từ chối. Vui lòng kiểm tra trạng thái để xem lý do và gửi yêu cầu mới.");
        });

        // Khi Admin khóa tài khoản: đẩy user ra ngay lập tức
        socket.on('forceBanned', async (data: any) => {
          await clearSession();
          Alert.alert(
            "🚫 Tài khoản đã bị khóa",
            `Lý do: ${data?.banReason || 'Vi phạm quy định'}\nThời hạn: ${data?.banExpiresAt ? new Date(data.banExpiresAt).toLocaleString('vi-VN') : 'Vĩnh viễn'}`,
            [{ text: "Đăng nhập lại", onPress: () => router.replace("/login") }]
          );
        });
      } catch (e) {
        console.warn("Global socket listener setup error", e);
      }
    })();

    return () => {
      active = false;
      import('@/features/chat/socketClient').then(({ getSocket }) => {
        const socket = getSocket();
        if (socket) {
          socket.off('newPost');
          socket.off('newSOS');
          socket.off('newSkill');
          socket.off('newDirectory');
          socket.off('volunteerApproved');
          socket.off('volunteerRejected');
          socket.off('forceBanned');
        }
      });
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-post"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Modal' }}
          />
          <Stack.Screen
            name="register"
            options={{
              title: t('register'),
              headerBackTitle: t('back'),
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              title: t('login'),
              headerBackTitle: t('back'),
            }}
          />
          <Stack.Screen
            name="auth/verify-otp"
            options={{
              title: t('verify'),
              headerBackTitle: t('back'),
            }}
          />
          <Stack.Screen
            name="post/[id]"
            options={{
              title: "Bài viết",
              headerBackTitle: t('back'),
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              title: "Trang cá nhân",
              headerBackTitle: t('back'),
            }}
          />
          <Stack.Screen
            name="saved-posts"
            options={{
              title: "Đã lưu",
              headerBackTitle: t('back'),
            }}
          />
          <Stack.Screen
            name="nearby"
            options={{
              title: "Gần đây",
              headerBackTitle: t('back'),
            }}
          />
          <Stack.Screen
            name="moderation"
            options={{
              title: "Báo cáo",
              headerBackTitle: t('back'),
            }}
          />
          <Stack.Screen name="oauth" options={{ title: "Đăng nhập", headerShown: false }} />
          <Stack.Screen
            name="privacy"
            options={{
              presentation: "modal",
              title: "Quyền riêng tư",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="user/[id]"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="search"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="followers-list"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="saved-directory"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="skill/[id]"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="saved-skills"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="skill-moderation"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="register-volunteer"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="chat-history"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}