import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookApi } from '../../src/api/book';
import { transactionApi } from '../../src/api/transaction';
import colors from '../../constants/colors';

// ─── 유틸 ────────────────────────────────────────────────────────────────────

const formatMonth = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const formatKoreanMonth = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-');
  return `${y}년 ${parseInt(m)}월`;
};

const changeMonth = (yyyymm: string, delta: number) => {
  const [y, m] = yyyymm.split('-').map(Number);
  return formatMonth(new Date(y, m - 1 + delta));
};

// ─── 가로 바 차트 ─────────────────────────────────────────────────────────────

function BarRow({
  label,
  amount,
  max,
  color,
}: {
  label: string;
  amount: number;
  max: number;
  color: string;
}) {
  const ratio = max > 0 ? amount / max : 0;
  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-sm text-text-secondary">{label}</Text>
        <Text className="text-sm font-semibold text-text-primary">
          {amount.toLocaleString()}원
        </Text>
      </View>
      <View className="h-2.5 bg-border rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${ratio * 100}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

// ─── 통계 화면 ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(() => formatMonth(new Date()));

  const { data: book } = useQuery({
    queryKey: ['book'],
    queryFn: () => bookApi.getMyBook().then((r) => r.data.data),
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', book?.id, selectedMonth],
    queryFn: () =>
      transactionApi
        .getAll({ bookId: book!.id, month: selectedMonth })
        .then((r) => r.data.data),
    enabled: !!book?.id,
  });

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.type === 'INCOME') acc.income += tx.amount;
        else if (tx.type === 'EXPENSE') acc.expense += tx.amount;
        else acc.transfer += tx.amount;
        return acc;
      },
      { income: 0, expense: 0, transfer: 0 }
    );
  }, [transactions]);

  const net = summary.income - summary.expense;
  const maxBar = Math.max(summary.income, summary.expense, 1);

  // 지출 내역 날짜별 정렬 (최근순 상위 5개)
  const recentExpenses = useMemo(() => {
    return [...transactions]
      .filter((tx) => tx.type === 'EXPENSE')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* 월 선택 */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
        <Text className="text-2xl font-bold text-text-primary">통계</Text>
      </View>
      <View className="flex-row items-center justify-between px-6 mb-4">
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 수입/지출 요약 카드 */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-card rounded-2xl border border-border px-4 py-4">
              <Text className="text-xs text-text-muted mb-1">수입</Text>
              <Text className="text-lg font-bold" style={{ color: colors.income }}>
                +{summary.income.toLocaleString()}원
              </Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl border border-border px-4 py-4">
              <Text className="text-xs text-text-muted mb-1">지출</Text>
              <Text className="text-lg font-bold" style={{ color: colors.expense }}>
                -{summary.expense.toLocaleString()}원
              </Text>
            </View>
          </View>

          {/* 순수익 카드 */}
          <View
            className="rounded-2xl px-5 py-4 mb-5"
            style={{ backgroundColor: net >= 0 ? colors.primaryMuted : '#FEF2F2' }}
          >
            <Text className="text-sm text-text-secondary mb-1">이번달 순수익</Text>
            <Text
              className="text-2xl font-bold"
              style={{ color: net >= 0 ? colors.primary : colors.expense }}
            >
              {net >= 0 ? '+' : ''}{net.toLocaleString()}원
            </Text>
          </View>

          {/* 수입 vs 지출 바 */}
          <View className="bg-card rounded-2xl border border-border px-5 py-5 mb-4">
            <Text className="text-base font-bold text-text-primary mb-4">수입 vs 지출</Text>
            <BarRow label="수입" amount={summary.income} max={maxBar} color={colors.income} />
            <BarRow label="지출" amount={summary.expense} max={maxBar} color={colors.expense} />
            {summary.transfer > 0 && (
              <BarRow label="이체" amount={summary.transfer} max={maxBar} color={colors.transfer} />
            )}
          </View>

          {/* 거래 건수 */}
          <View className="bg-card rounded-2xl border border-border px-5 py-5 mb-4">
            <Text className="text-base font-bold text-text-primary mb-4">거래 건수</Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-text-primary">{transactions.length}</Text>
                <Text className="text-xs text-text-muted mt-1">전체</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold" style={{ color: colors.income }}>
                  {transactions.filter((t) => t.type === 'INCOME').length}
                </Text>
                <Text className="text-xs text-text-muted mt-1">수입</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold" style={{ color: colors.expense }}>
                  {transactions.filter((t) => t.type === 'EXPENSE').length}
                </Text>
                <Text className="text-xs text-text-muted mt-1">지출</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold" style={{ color: colors.transfer }}>
                  {transactions.filter((t) => t.type === 'TRANSFER').length}
                </Text>
                <Text className="text-xs text-text-muted mt-1">이체</Text>
              </View>
            </View>
          </View>

          {/* 최근 지출 TOP 5 */}
          {recentExpenses.length > 0 && (
            <View className="bg-card rounded-2xl border border-border px-5 py-5">
              <Text className="text-base font-bold text-text-primary mb-4">최근 지출</Text>
              {recentExpenses.map((tx, idx) => (
                <View
                  key={tx.id}
                  className={`flex-row justify-between items-center py-2.5 ${
                    idx < recentExpenses.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-sm text-text-primary font-medium" numberOfLines={1}>
                      {tx.memo || tx.assetName || '지출'}
                    </Text>
                    <Text className="text-xs text-text-muted mt-0.5">{tx.date}</Text>
                  </View>
                  <Text className="text-sm font-semibold" style={{ color: colors.expense }}>
                    -{tx.amount.toLocaleString()}원
                  </Text>
                </View>
              ))}
            </View>
          )}

          {transactions.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-text-muted text-base">이번달 거래 내역이 없어요</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
