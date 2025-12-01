import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // 1. Hàm xin quyền (Giữ nguyên)
    async function registerForPushNotificationsAsync() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Quyền thông báo bị từ chối!');
        return;
      }
    }

    registerForPushNotificationsAsync();

    // 2. Lắng nghe sự kiện bấm thông báo
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data && data.cartId) {
        console.log("Bấm thông báo Cart ID:", data.cartId);
        
        router.push({
          pathname: '/list/[id]',
          // --- SỬA LỖI 1: Ép kiểu sang String ---
          // TypeScript yêu cầu params URL phải là chuỗi
          params: { id: String(data.cartId) } 
        });
      }
    });

    // Cleanup khi thoát
    return () => {
      // --- SỬA LỖI 2: Dùng .remove() trực tiếp ---
      // Hàm Notifications.removeNotificationSubscription đã bị bỏ
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="list/[id]" options={{ title: 'Chi tiết' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}