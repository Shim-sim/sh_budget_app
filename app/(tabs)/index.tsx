import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookApi } from '../../src/api/book';
import { transactionApi } from '../../src/api/transaction';
import type { Transaction } from '../../src/types';
import colors from '../../constants/colors';

// ─── 유틸 ───────────────────────────────────────────────────────────────────

const formatMonth = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatKoreanMonth = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-');
  return `${y}년 ${parseInt(m)}월`;
};

const formatAmount = (n: number) => n.toLocaleString();

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
};

// ─── 거래 아이템 ─────────────────────────────────────────────────────────────

function TransactionItem({ tx, isLast }: { tx: Transaction; isLast: boolean }) {
  const iconName =
    tx.type === 'INCOME' ? 'arrow-down' :
    tx.type === 'EXPENSE' ? 'arrow-up' : 'swap-horizontal';

  const iconBg =
    tx.type === 'INCOME' ? colors.primaryMuted :
    tx.type === 'EXPENSE' ? '#FEF2F2' : '#FFFBEB';

  const iconColor =
    tx.type === 'INCOME' ? colors.income :
    tx.type === 'EXPENSE' ? colors.expense : colors.transfer;

  const amountPrefix =
    tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '';

  const subText =
    tx.type === 'TRANSFER'
      ? `${tx.fromAssetName} → ${tx.toAssetName}`
      : tx.assetName ?? '';

  const label =
    tx.memo ||
    (tx.type === 'TRANSFER' ? '이체' : tx.type === 'INCOME' ? '수입' : '지출');

  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? 'border-b border-border' : ''
      }`}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons name={iconName as any} size={16} color={iconColor} />
      </View>

      <View className="flex-1">
        <Text className="text-text-primary text-sm font-medium" numberOfLines={1}>
          {label}
        </Text>
        {subText ? (
          <Text className="text-text-muted text-xs mt-0.5">{subText}</Text>
        ) : null}
      </View>

      <Text className="text-sm font-semibold" style={{ color: iconColor }}>
        {amountPrefix}{formatAmount(tx.amount)}원
      </Text>
    </View>
  );
}

// ─── 홈 화면 ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [selectedMonth, setSelectedMonth] = useState(() => formatMonth(new Date()));

  // 가계부 조회
  const { data: book } = useQuery({
    queryKey: ['book'],
    queryFn: () => bookApi.getMyBook().then((r) => r.data.data),
  });

  // 거래 내역 조회
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', book?.id, selectedMonth],
    queryFn: () =>
      transactionApi
        .getAll({ bookId: book!.id, month: selectedMonth })
        .then((r) => r.data.data),
    enabled: !!book?.id,
  });

  // 월 이동
  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    setSelectedMonth(formatMonth(new Date(y, m - 1 + delta)));
  };

  // 월별 요약
  const summary = useMemo(
    () =>
      transactions.reduce(
        (acc, tx) => {
          if (tx.type === 'INCOME') acc.income += tx.amount;
          else if (tx.type === 'EXPENSE') acc.expense += tx.amount;
          return acc;
        },
        { income: 0, expense: 0 }
      ),
    [transactions]
  );

  // 날짜별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    for (const tx of sorted) {
      const list = map.get(tx.date) ?? [];
      map.set(tx.date, [...list, tx]);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [transactions]);

  const net = summary.income - summary.expense;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* 월 선택 */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
        <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">
          {formatKoreanMonth(selectedMonth)}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 요약 카드 */}
      <View className="mx-6 mb-5 bg-primary rounded-3xl px-5 py-4">
        <View className="flex-row justify-between mb-3">
          <View>
            <Text className="text-white/60 text-xs mb-1">수입</Text>
            <Text className="text-white text-lg font-bold">
              +{formatAmount(summary.income)}원
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-white/60 text-xs mb-1">지출</Text>
            <Text className="text-white text-lg font-bold">
              -{formatAmount(summary.expense)}원
            </Text>
          </View>
        </View>
        <View className="h-px bg-white/20 mb-3" />
        <View className="flex-row justify-between items-center">
          <Text className="text-white/60 text-sm">순수익</Text>
          <Text className="text-white text-base font-semibold">
            {net >= 0 ? '+' : ''}{formatAmount(net)}원
          </Text>
        </View>
      </View>

      {/* 거래 내역 */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : grouped.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-1">
          <Text className="text-text-muted text-base">거래 내역이 없어요</Text>
          <Text className="text-text-muted text-sm">아래 + 버튼으로 추가해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.date}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="mb-4">
              <Text className="text-sm text-text-secondary font-medium mb-2">
                {formatDate(item.date)}
              </Text>
              <View className="bg-card rounded-2xl overflow-hidden border border-border">
                {item.items.map((tx, idx) => (
                  <TransactionItem
                    key={tx.id}
                    tx={tx}
                    isLast={idx === item.items.length - 1}
                  />
                ))}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
