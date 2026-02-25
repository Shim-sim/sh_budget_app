import apiClient from './client';
import type {
  ApiResult,
  MonthlySummary,
  CategoryStatisticsResponse,
  MemberContribution,
  StatisticsParams,
} from '../types';

export const statisticsApi = {
  getMonthlySummary: (params: StatisticsParams) =>
    apiClient.get<ApiResult<MonthlySummary>>('/api/statistics/monthly-summary', { params }),

  getCategoryStats: (params: StatisticsParams) =>
    apiClient.get<ApiResult<CategoryStatisticsResponse>>('/api/statistics/category', { params }),

  getMemberContribution: (params: StatisticsParams) =>
    apiClient.get<ApiResult<MemberContribution[]>>('/api/statistics/member-contribution', { params }),
};
