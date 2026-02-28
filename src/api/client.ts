import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// 로컬 백엔드 주소
// - PC 브라우저: localhost 사용
// - 폰 브라우저/실제 기기: Mac의 로컬 IP 사용 (같은 Wi-Fi 필요)
const DEV_MACHINE_IP = '192.168.45.129';

function getBaseUrl() {
  if (!__DEV__) {
    return 'http://localhost:8080'; // TODO: 배포 시 실제 백엔드 URL로 변경
  }
  if (Platform.OS !== 'web') {
    return `http://${DEV_MACHINE_IP}:8080`;
  }
  // 웹: 브라우저의 hostname 기반으로 자동 결정
  // PC에서 localhost로 접속 → localhost:8080
  // 폰에서 192.168.x.x로 접속 → 192.168.x.x:8080
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:8080`;
}

const BASE_URL = getBaseUrl();

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

// 요청마다 storage에서 memberId 꺼내서 헤더에 주입
apiClient.interceptors.request.use(async (config) => {
  const memberId = await storage.getItem(SECURE_STORE_KEY.MEMBER_ID);
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
