import '../global.css';
import { useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { pushApi } from '../src/api/push';
import { subscribeToPush } from '../src/utils/pushNotification';
import { useAppUpdate } from '../src/hooks/useAppUpdate';

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
  const { showUpdate, applyUpdate } = useAppUpdate();

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
      {showUpdate && (
        <View style={styles.updateBanner}>
          <Text style={styles.updateText}>새 버전이 있습니다</Text>
          <TouchableOpacity style={styles.updateButton} onPress={applyUpdate}>
            <Text style={styles.updateButtonText}>업데이트</Text>
          </TouchableOpacity>
        </View>
      )}
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  updateBanner: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: '#2D5A4F',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  updateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  updateButtonText: {
    color: '#2D5A4F',
    fontSize: 13,
    fontWeight: '700',
  },
});
