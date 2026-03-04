import apiClient from './client';
import type { ApiResult } from '../types';

export const pushApi = {
  getVapidKey: () =>
    apiClient.get<ApiResult<string>>('/api/push/vapid-key'),

  subscribe: (subscription: { endpoint: string; p256dh: string; auth: string }) =>
    apiClient.post<ApiResult<null>>('/api/push/subscribe', subscription),

  unsubscribe: (endpoint: string) =>
    apiClient.post<ApiResult<null>>('/api/push/unsubscribe', { endpoint }),
};
