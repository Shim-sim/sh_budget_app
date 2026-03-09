import apiClient from './client';
import type { ApiResult, RecurringTransaction, RecurringCreateRequest } from '../types';

export const recurringApi = {
  create: (data: RecurringCreateRequest) =>
    apiClient.post<ApiResult<RecurringTransaction>>('/api/recurring-transactions', data),

  getAll: (bookId: number) =>
    apiClient.get<ApiResult<RecurringTransaction[]>>('/api/recurring-transactions', { params: { bookId } }),

  delete: (id: number) =>
    apiClient.delete<ApiResult<null>>(`/api/recurring-transactions/${id}`),
};
