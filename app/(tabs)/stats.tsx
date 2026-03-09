import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookApi } from '../../src/api/book';
import { assetApi } from '../../src/api/asset';
import { statisticsApi } from '../../src/api/statistics';
import colors from '../../constants/colors';

// ─── 유틸 ────────────────────────────────────────────────────────────────────

const parseYearMonth = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-').map(Number);
  return { year: y, month: m };
};

const formatKoreanMonth = (yyyymm: string) => {
  const { year, month } = parseYearMonth(yyyymm);
  return `${year}년 ${month}월`;
};

const changeMonth = (yyyymm: string, delta: number) => {
  const { year, month } = parseYearMonth(yyyymm);
  const d = new Date(year, month - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

// ─── 가로 바 ─────────────────────────────────────────────────────────────────

function BarRow({ label, amount, max, color }: { label: string; amount: number; max: number; color: string }) {
  const ratio = max > 0 ? Math.min(amount / max, 1) : 0;
  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-sm text-text-secondary">{label}</Text>
        <Text className="text-sm font-semibold text-text-primary">{amount.toLocaleString()}원</Text>
      </View>
      <View className="h-2.5 bg-border rounded-full overflow-hidden">
        <View className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

// ─── 통계 화면 ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  const { data: book } = useQuery({
    queryKey: ['book'],
    queryFn: () => bookApi.getMyBook().then((r) => r.data.data),
  });

  const params = book?.id
    ? { bookId: book.id, ...parseYearMonth(selectedMonth) }
    : null;

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['stats-summary', params],
    queryFn: () => statisticsApi.getMonthlySummary(params!).then((r) => r.data.data),
    enabled: !!params,
  });

  const { data: categoryData, isLoading: catLoading } = useQuery({
    queryKey: ['stats-category', params],
    queryFn: () => statisticsApi.getCategoryStats(params!).then((r) => r.data.data),
    enabled: !!params,
  });

  const { data: memberData } = useQuery({
    queryKey: ['stats-member', params],
    queryFn: () => statisticsApi.getMemberContribution(params!).then((r) => r.data.data),
    enabled: !!params,
  });

  // 총 자산: 양수 자산만 합산 (음수 부채 미포함)
  const { data: assets = [] } = useQuery({
    queryKey: ['assets', book?.id],
    queryFn: () => assetApi.getAll(book!.id).then((r) => r.data.data),
    enabled: !!book?.id,
  });
  const totalAssets = useMemo(
    () => assets.filter((a) => a.balance >= 0).reduce((sum, a) => sum + a.balance, 0),
    [assets],
  );

  const isLoading = summaryLoading || catLoading;
  const maxBar = Math.max(summary?.totalIncome ?? 0, summary?.totalExpense ?? 0, 1);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* 헤더 + 월 선택 */}
      <View className="px-6 pt-2 pb-2">
        <Text className="text-2xl font-bold text-text-primary mb-3">통계</Text>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setSelectedMonth((m) => changeMonth(m, -1))} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-text-primary">
            {formatKoreanMonth(selectedMonth)}
          </Text>
          <TouchableOpacity onPress={() => setSelectedMonth((m) => changeMonth(m, 1))} hitSlop={12}>
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* 수입 / 지출 카드 */}
          <View className="flex-row gap-3 mt-3 mb-4">
            <View className="flex-1 bg-card rounded-2xl border border-border px-4 py-4">
              <Text className="text-xs text-text-muted mb-1">수입</Text>
              <Text className="text-lg font-bold" style={{ color: colors.income }}>
                +{(summary?.totalIncome ?? 0).toLocaleString()}원
              </Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl border border-border px-4 py-4">
              <Text className="text-xs text-text-muted mb-1">지출</Text>
              <Text className="text-lg font-bold" style={{ color: colors.expense }}>
                -{(summary?.totalExpense ?? 0).toLocaleString()}원
              </Text>
            </View>
          </View>

          {/* 순수익 + 총 자산 */}
          <View className="flex-row gap-3 mb-5">
            <View
              className="flex-1 rounded-2xl px-4 py-4"
              style={{
                backgroundColor: (summary?.netIncome ?? 0) >= 0 ? colors.primaryMuted : '#FEF2F2',
              }}
            >
              <Text className="text-xs text-text-secondary mb-1">순수익</Text>
              <Text
                className="text-lg font-bold"
                style={{ color: (summary?.netIncome ?? 0) >= 0 ? colors.primary : colors.expense }}
              >
                {(summary?.netIncome ?? 0) >= 0 ? '+' : ''}
                {(summary?.netIncome ?? 0).toLocaleString()}원
              </Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl border border-border px-4 py-4">
              <Text className="text-xs text-text-muted mb-1">총 자산</Text>
              <Text className="text-lg font-bold text-text-primary">
                {totalAssets.toLocaleString()}원
              </Text>
            </View>
          </View>

          {/* 수입 vs 지출 바 */}
          <View className="bg-card rounded-2xl border border-border px-5 py-5 mb-4">
            <Text className="text-base font-bold text-text-primary mb-4">수입 vs 지출</Text>
            <BarRow label="수입" amount={summary?.totalIncome ?? 0} max={maxBar} color={colors.income} />
            <BarRow label="지출" amount={summary?.totalExpense ?? 0} max={maxBar} color={colors.expense} />
          </View>

          {/* 카테고리별 지출 */}
          {(categoryData?.categories?.length ?? 0) > 0 && (
            <View className="bg-card rounded-2xl border border-border px-5 py-5 mb-4">
              <Text className="text-base font-bold text-text-primary mb-4">카테고리별 지출</Text>
              {categoryData!.categories.map((cat, idx) => (
                <View
                  key={cat.categoryId}
                  className={`py-3 ${idx < categoryData!.categories.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-sm text-text-primary font-medium">{cat.categoryName}</Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-text-muted">{cat.percentage.toFixed(1)}%</Text>
                      <Text className="text-sm font-semibold" style={{ color: colors.expense }}>
                        -{cat.totalAmount.toLocaleString()}원
                      </Text>
                    </View>
                  </View>
                  <View className="h-1.5 bg-border rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${cat.percentage}%`, backgroundColor: colors.expense }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 멤버별 기여도 */}
          {(memberData?.length ?? 0) > 1 && (
            <View className="bg-card rounded-2xl border border-border px-5 py-5 mb-4">
              <Text className="text-base font-bold text-text-primary mb-4">멤버별 기여도</Text>
              {memberData!.map((member, idx) => (
                <View
                  key={member.memberId}
                  className={`py-3 ${idx < memberData!.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <Text className="text-sm font-medium text-text-primary mb-2">
                    {member.memberNickname}
                  </Text>
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-xs text-text-muted mb-1">
                        수입 {member.incomePercentage.toFixed(0)}%
                      </Text>
                      <View className="h-1.5 bg-border rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${member.incomePercentage}%`, backgroundColor: colors.income }}
                        />
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-text-muted mb-1">
                        지출 {member.expensePercentage.toFixed(0)}%
                      </Text>
                      <View className="h-1.5 bg-border rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${member.expensePercentage}%`, backgroundColor: colors.expense }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {!summary && (
            <View className="items-center py-12">
              <Text className="text-text-muted text-base">이번달 거래 내역이 없어요</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
