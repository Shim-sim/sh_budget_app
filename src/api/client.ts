import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// 로컬 백엔드 주소 (추후 환경변수로 분리)
const BASE_URL = 'http://localhost:8080';

export const SECURE_STORE_KEY = {
  MEMBER_ID: 'member_id',
} as const;

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청마다 SecureStore에서 memberId 꺼내서 헤더에 주입
apiClient.interceptors.request.use(async (config) => {
  const memberId = await SecureStore.getItemAsync(SECURE_STORE_KEY.MEMBER_ID);
  if (memberId) {
    config.headers['X-Member-Id'] = memberId;
  }
  return config;
});

// 응답 에러 공통 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message ?? '알 수 없는 오류가 발생했습니다.';
    return Promise.reject({ status, message });
  }
);

export default apiClient;
