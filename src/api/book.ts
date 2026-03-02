import apiClient from './client';
import { useAuthStore } from '../stores/authStore';
import type {
  ApiResult,
  Book,
  BookWithRole,
  BookMember,
  BookUpdateRequest,
  BookJoinRequest,
} from '../types';

export const bookApi = {
  getMyBook: () => {
    const selectedBookId = useAuthStore.getState().selectedBookId;
    const params = selectedBookId ? { bookId: selectedBookId } : {};
    return apiClient.get<ApiResult<Book>>('/api/books/my', { params });
  },

  getMyBooks: () =>
    apiClient.get<ApiResult<BookWithRole[]>>('/api/books/my/all'),

  update: (id: number, data: BookUpdateRequest) =>
    apiClient.put<ApiResult<Book>>(`/api/books/${id}`, data),

  regenerateInviteCode: (id: number) =>
    apiClient.post<ApiResult<Book>>(`/api/books/${id}/invite-code`),

  delete: (id: number) =>
    apiClient.delete<ApiResult<null>>(`/api/books/${id}`),

  join: (data: BookJoinRequest) =>
    apiClient.post<ApiResult<Book>>('/api/books/join', data),

  getMembers: (id: number) =>
    apiClient.get<ApiResult<BookMember[]>>(`/api/books/${id}/members`),

  leaveOrRemoveMember: (bookId: number, memberId: number) =>
    apiClient.delete<ApiResult<null>>(`/api/books/${bookId}/members/${memberId}`),
};
