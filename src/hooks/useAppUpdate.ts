import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6시간

export function useAppUpdate() {
  const [showUpdate, setShowUpdate] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  const applyUpdate = useCallback(() => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    let intervalId: ReturnType<typeof setInterval>;

    const showLocalUpdateNotification = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification('가계부 업데이트', {
          body: '새 버전이 준비되었습니다. 앱을 열어 업데이트해주세요!',
          icon: '/app-icon-192.png',
          badge: '/app-icon-192.png',
        });
      });
    };

    const onWaiting = (sw: ServiceWorker) => {
      waitingWorkerRef.current = sw;
      setShowUpdate(true);
      showLocalUpdateNotification();
    };

    navigator.serviceWorker.ready.then((registration) => {
      // 이미 waiting 중인 SW가 있으면 바로 표시
      if (registration.waiting) {
        onWaiting(registration.waiting);
      }

      // 새 SW가 설치 완료되어 waiting 상태가 되면 감지
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            onWaiting(newWorker);
          }
        });
      });

      // 6시간마다 업데이트 체크
      intervalId = setInterval(() => {
        registration.update();
      }, UPDATE_CHECK_INTERVAL);
    });

    // controllerchange 발생 시 페이지 리로드
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return { showUpdate, applyUpdate };
}
