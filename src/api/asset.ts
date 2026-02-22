import apiClient from './client';
import type {
  ApiResult,
  Asset,
  AssetSummary,
  AssetCreateRequest,
  AssetUpdateRequest,
} from '../types';

export const assetApi = {
  create: (data: AssetCreateRequest) =>
    apiClient.post<ApiResult<Asset>>('/api/assets', data),

  getAll: (bookId: number) =>
    apiClient.get<ApiResult<Asset[]>>('/api/assets', { params: { bookId } }),

  getById: (id: number) =>
    apiClient.get<ApiResult<Asset>>(`/api/assets/${id}`),

  update: (id: number, data: AssetUpdateRequest) =>
    apiClient.put<ApiResult<Asset>>(`/api/assets/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResult<null>>(`/api/assets/${id}`),

  getTotal: (bookId: number) =>
    apiClient.get<ApiResult<AssetSummary>>('/api/assets/total', { params: { bookId } }),
};
