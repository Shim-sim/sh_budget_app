import apiClient from './client';
import type {
  ApiResult,
  Asset,
  AssetSummary,
  AssetCreateRequest,
  AssetUpdateRequest,
} from '../types';

export const assetApi = {
  // bookId는 query param, body에는 name/balance/ownerMemberId만
  create: (bookId: number, data: AssetCreateRequest) =>
    apiClient.post<ApiResult<Asset>>('/api/assets', data, { params: { bookId } }),

  getAll: (bookId: number) =>
    apiClient.get<ApiResult<Asset[]>>('/api/assets', { params: { bookId } }),

  getById: (bookId: number, id: number) =>
    apiClient.get<ApiResult<Asset>>(`/api/assets/${id}`, { params: { bookId } }),

  // bookId는 query param
  update: (bookId: number, id: number, data: AssetUpdateRequest) =>
    apiClient.put<ApiResult<Asset>>(`/api/assets/${id}`, data, { params: { bookId } }),

  delete: (bookId: number, id: number) =>
    apiClient.delete<ApiResult<null>>(`/api/assets/${id}`, { params: { bookId } }),

  getTotal: (bookId: number) =>
    apiClient.get<ApiResult<AssetSummary>>('/api/assets/total', { params: { bookId } }),
};
