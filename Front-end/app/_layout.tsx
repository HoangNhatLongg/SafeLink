import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from "react-i18next";
import 'react-native-reanimated';
import '../i18n';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { setSessionExpiredHandler } from '@/features/api/http';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/features/SOS/notificationSetup';
import { uploadPushToken, updateLocation } from '@/features/SOS/sosApi';
import { getToken } from '@/features/auth/utils/storage';
import * as Location from 'expo-location';

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
    responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'sos_alert' && data.postId) {
        router.push({ pathname: '/post/[id]', params: { id: data.postId } });
      }
    });

    return () => {
      if (responseListener) {
        responseListener.remove();
      }
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
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}