import apiClient from './client';
import type { ApiResult, AuthTokens, LoginRequest, RegisterRequest, RefreshRequest } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResult<AuthTokens>>('/api/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<ApiResult<AuthTokens>>('/api/auth/register', data),

  refresh: (data: RefreshRequest) =>
    apiClient.post<ApiResult<AuthTokens>>('/api/auth/refresh', data),
};
