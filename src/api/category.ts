import apiClient from './client';
import type {
  ApiResult,
  Category,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from '../types';

export const categoryApi = {
  getAll: (bookId: number) =>
    apiClient.get<ApiResult<Category[]>>('/api/categories', { params: { bookId } }),

  create: (data: CategoryCreateRequest) =>
    apiClient.post<ApiResult<Category>>('/api/categories', data),

  update: (id: number, bookId: number, data: CategoryUpdateRequest) =>
    apiClient.put<ApiResult<Category>>(`/api/categories/${id}`, data, { params: { bookId } }),

  delete: (id: number, bookId: number) =>
    apiClient.delete<ApiResult<null>>(`/api/categories/${id}`, { params: { bookId } }),
};
