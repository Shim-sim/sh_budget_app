import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// 프로덕션 백엔드 URL (Azure VM)
const PROD_API_URL = 'http://52.141.61.227';

// API Key (2인 전용 앱이므로 빌드타임 하드코딩)
const API_KEY = 'sh-budget-2025-secret-key';

// 로컬 백엔드 주소
// - PC 브라우저: localhost 사용
// - 폰 브라우저/실제 기기: Mac의 로컬 IP 사용 (같은 Wi-Fi 필요)
const DEV_MACHINE_IP = '192.168.45.129';

function getBaseUrl() {
  if (!__DEV__) {
    return PROD_API_URL;
  }
  if (Platform.OS !== 'web') {
    return `http://${DEV_MACHINE_IP}:8080`;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:8080`;
}

const BASE_URL = getBaseUrl();

export const SECURE_STORE_KEY = {
  MEMBER_ID: 'member_id',
  SELECTED_BOOK_ID: 'selected_book_id',
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청마다 Bearer 토큰 주입 (없으면 기존 X-Member-Id 폴백)
apiClient.interceptors.request.use(async (config) => {
  const accessToken = await storage.getItem(SECURE_STORE_KEY.ACCESS_TOKEN);
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    // JWT 미전환 기간 폴백: 기존 memberId 헤더
    const memberId = await storage.getItem(SECURE_STORE_KEY.MEMBER_ID);
    if (memberId) {
      config.headers['X-Member-Id'] = memberId;
    }
  }
  config.headers['X-Api-Key'] = API_KEY;
  return config;
});

// 토큰 갱신 중복 방지
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// 응답 에러 처리 + 401 시 자동 토큰 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // 401이고, 이미 재시도한 요청이 아니며, refresh 요청 자체가 아닌 경우
    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/api/auth/')) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = await storage.getItem(SECURE_STORE_KEY.REFRESH_TOKEN);
          if (!refreshToken) {
            return Promise.reject({ status, message: '로그인이 필요합니다.' });
          }

          const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken }, {
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
          });

          const tokens = res.data.data;
          await storage.setItem(SECURE_STORE_KEY.ACCESS_TOKEN, tokens.accessToken);
          await storage.setItem(SECURE_STORE_KEY.REFRESH_TOKEN, tokens.refreshToken);

          isRefreshing = false;
          onRefreshed(tokens.accessToken);

          originalRequest.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
          return apiClient(originalRequest);
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
          // refresh 실패 → 로그아웃 처리 (스토리지 클리어)
          await storage.deleteItem(SECURE_STORE_KEY.ACCESS_TOKEN);
          await storage.deleteItem(SECURE_STORE_KEY.REFRESH_TOKEN);
          await storage.deleteItem(SECURE_STORE_KEY.MEMBER_ID);
          await storage.deleteItem(SECURE_STORE_KEY.SELECTED_BOOK_ID);
          return Promise.reject({ status: 401, message: '세션이 만료되었습니다. 다시 로그인해주세요.' });
        }
      }

      // 이미 갱신 중이면 큐에 등록
      return new Promise((resolve) => {
        addRefreshSubscriber((newToken: string) => {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    const message = error.response?.data?.message ?? '알 수 없는 오류가 발생했습니다.';
    return Promise.reject({ status, message });
  }
);

export default apiClient;
