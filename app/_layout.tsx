import '../global.css';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { pushApi } from '../src/api/push';
import { subscribeToPush } from '../src/utils/pushNotification';

function useRegisterServiceWorker() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(async (reg) => {
          console.log('SW registered:', reg.scope);
          // 이미 알림 허용 상태면 자동 재구독 (토큰 갱신)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              const vapidRes = await pushApi.getVapidKey();
              await subscribeToPush(vapidRes.data.data);
            } catch (e) {
              console.warn('Auto re-subscribe failed:', e);
            }
          }
        })
        .catch((err) => console.warn('SW registration failed:', err));
    }
  }, []);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  useRegisterServiceWorker();

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="transaction/new"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
