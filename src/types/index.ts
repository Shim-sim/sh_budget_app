// ─── 공통 API 응답 래퍼 ───────────────────────────────────────────────────────
export interface ApiResult<T> {
  status: number;
  message: string;
  data: T;
}

// ─── Member ───────────────────────────────────────────────────────────────────
export interface Member {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberCreateRequest {
  email: string;
  nickname: string;
}

export interface MemberUpdateRequest {
  nickname: string;
  profileImageUrl?: string | null;
}

// ─── Book ─────────────────────────────────────────────────────────────────────
export interface Book {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookWithRole {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  role: 'OWNER' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
}

export interface BookMember {
  memberId: number;
  nickname: string;
  profileImageUrl: string | null;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
}

export interface BookUpdateRequest {
  name: string;
}

export interface BookJoinRequest {
  inviteCode: string;
}

// ─── Asset ────────────────────────────────────────────────────────────────────
export interface Asset {
  id: number;
  bookId: number;
  name: string;
  balance: number;
  ownerMemberId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetSummary {
  totalBalance: number;
}

export interface AssetCreateRequest {
  name: string;
  balance: number;
  ownerMemberId?: number | null;
}

export interface AssetUpdateRequest {
  name: string;
  balance: number;
  ownerMemberId?: number | null;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  bookId: number;
  name: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
}

export interface CategoryCreateRequest {
  bookId: number;
  name: string;
}

export interface CategoryUpdateRequest {
  name: string;
}

// ─── Transaction ──────────────────────────────────────────────────────────────
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Transaction {
  id: number;
  bookId: number;
  type: TransactionType;
  amount: number;
  date: string;
  memo: string | null;
  createdBy: number;
  createdByNickname: string;
  createdAt: string;
  updatedAt: string;
  // INCOME / EXPENSE
  assetId?: number;
  assetName?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  // TRANSFER
  fromAssetId?: number;
  fromAssetName?: string;
  toAssetId?: number;
  toAssetName?: string;
}

export interface TransactionCreateRequest {
  bookId: number;
  type: TransactionType;
  amount: number;
  date: string;
  memo?: string;
  // INCOME / EXPENSE
  assetId?: number;
  categoryId?: number;
  // TRANSFER
  fromAssetId?: number;
  toAssetId?: number;
}

export interface TransactionUpdateRequest {
  amount: number;
  date: string;
  memo?: string;
  // INCOME / EXPENSE
  assetId?: number;
  categoryId?: number;
  // TRANSFER
  fromAssetId?: number;
  toAssetId?: number;
}

export interface TransactionListParams {
  bookId: number;
  month?: string;       // YYYY-MM
  type?: TransactionType;
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface MonthlySummary {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  totalAssets: number;
}

export interface CategoryStatistics {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface CategoryStatisticsResponse {
  year: number;
  month: number;
  totalExpense: number;
  categories: CategoryStatistics[];
}

export interface MemberContribution {
  memberId: number;
  memberNickname: string;
  totalIncome: number;
  totalExpense: number;
  incomePercentage: number;
  expensePercentage: number;
}

export interface StatisticsParams {
  bookId: number;
  year: number;
  month: number;
}
