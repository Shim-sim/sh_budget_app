import apiClient from './client';
import type { ApiResult, Member, MemberCreateRequest, MemberUpdateRequest } from '../types';

export const memberApi = {
  create: (data: MemberCreateRequest) =>
    apiClient.post<ApiResult<Member>>('/api/members', data),

  getById: (id: number) =>
    apiClient.get<ApiResult<Member>>(`/api/members/${id}`),

  // 임시: 이메일로 회원 조회 (백엔드 JWT 인증 구현 전까지 사용)
  getByEmail: (email: string) =>
    apiClient.get<ApiResult<Member>>('/api/members/by-email', { params: { email } }),

  update: (id: number, data: MemberUpdateRequest) =>
    apiClient.put<ApiResult<Member>>(`/api/members/${id}`, data),
};
