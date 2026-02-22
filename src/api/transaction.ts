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

  getById: (id: number) =>
    apiClient.get<ApiResult<Transaction>>(`/api/transactions/${id}`),

  update: (id: number, data: TransactionUpdateRequest) =>
    apiClient.put<ApiResult<Transaction>>(`/api/transactions/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResult<null>>(`/api/transactions/${id}`),
};
