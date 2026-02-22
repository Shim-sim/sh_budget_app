import apiClient from './client';
import type { ApiResult, Member, MemberCreateRequest, MemberUpdateRequest } from '../types';

export const memberApi = {
  create: (data: MemberCreateRequest) =>
    apiClient.post<ApiResult<Member>>('/api/members', data),

  getById: (id: number) =>
    apiClient.get<ApiResult<Member>>(`/api/members/${id}`),

  update: (id: number, data: MemberUpdateRequest) =>
    apiClient.put<ApiResult<Member>>(`/api/members/${id}`, data),
};
