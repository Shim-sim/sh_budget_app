import apiClient from './client';
import type {
  ApiResult,
  Transaction,
  TransactionCreateRequest,
  TransactionUpdateRequest,
  TransactionListParams,
} from '../types';

export const transactionApi = {
  create: (data: TransactionCreateRequest) =>
    apiClient.post<ApiResult<Transaction>>('/api/transactions', data),

  getAll: (params: TransactionListParams) =>
    apiClient.get<ApiResult<Transaction[]>>('/api/transactions', { params }),

  getById: (id: number, bookId: number) =>
    apiClient.get<ApiResult<Transaction>>(`/api/transactions/${id}`, { params: { bookId } }),

  update: (id: number, bookId: number, data: TransactionUpdateRequest) =>
    apiClient.put<ApiResult<Transaction>>(`/api/transactions/${id}`, data, { params: { bookId } }),

  delete: (id: number, bookId: number) =>
    apiClient.delete<ApiResult<null>>(`/api/transactions/${id}`, { params: { bookId } }),
};
