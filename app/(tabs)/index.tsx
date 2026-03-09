import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookApi } from '../../src/api/book';
import { transactionApi } from '../../src/api/transaction';
import type { Transaction } from '../../src/types';
import colors from '../../constants/colors';
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh';
import { PullIndicator } from '../../src/components/PullIndicator';

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

// ─── 한국 공휴일 ──────────────────────────────────────────────────────────────

/** 고정 공휴일 (매년 동일) */
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '새해',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '크리스마스',
};

/** 음력 기반 공휴일 (연도별 양력 변환 - 2024~2027) */
const LUNAR_HOLIDAYS: Record<string, Record<string, string>> = {
  '2024': {
    '02-09': '설날 연휴', '02-10': '설날', '02-11': '설날 연휴', '02-12': '대체공휴일',
    '04-10': '부처님오신날',
    '09-16': '추석 연휴', '09-17': '추석', '09-18': '추석 연휴',
  },
  '2025': {
    '01-28': '설날 연휴', '01-29': '설날', '01-30': '설날 연휴',
    '05-05': '부처님오신날',
    '10-05': '추석 연휴', '10-06': '추석', '10-07': '추석 연휴', '10-08': '대체공휴일',
  },
  '2026': {
    '02-16': '설날 연휴', '02-17': '설날', '02-18': '설날 연휴',
    '05-24': '부처님오신날',
    '09-24': '추석 연휴', '09-25': '추석', '09-26': '추석 연휴',
  },
  '2027': {
    '02-06': '설날 연휴', '02-07': '설날', '02-08': '설날 연휴', '02-09': '대체공휴일',
    '05-13': '부처님오신날',
    '09-14': '추석 연휴', '09-15': '추석', '09-16': '추석 연휴',
  },
};

/** 특정 날짜의 공휴일 이름 반환 (없으면 null) */
function getHolidayName(year: number, month: number, day: number): string | null {
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const fixed = FIXED_HOLIDAYS[mmdd];
  if (fixed) return fixed;
  const lunar = LUNAR_HOLIDAYS[String(year)]?.[mmdd];
  return lunar ?? null;
}

/** 달력 셀용 금액 축약: 1억 미만은 콤마 표기, 1억 이상은 억 단위 */
const formatCalendarAmount = (n: number): string => {
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억`;
  return n.toLocaleString();
};

// ─── 캘린더 뷰 ───────────────────────────────────────────────────────────────

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function CalendarView({
  yyyymm,
  dailyExpense,
  dailyIncome,
  dailyTransfer,
  onSelectDate,
  selectedDate,
}: {
  yyyymm: string;
  dailyExpense: Map<number, number>;
  dailyIncome: Map<number, number>;
  dailyTransfer: Map<number, number>;
  onSelectDate: (day: number) => void;
  selectedDate: number | null;
}) {
  const [year, month] = yyyymm.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDate = today.getDate();

  // 해당 월의 공휴일 맵 (day → name)
  const holidayMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const name = getHolidayName(year, month, d);
      if (name) map.set(d, name);
    }
    return map;
  }, [year, month, daysInMonth]);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View className="mx-6 mb-3 bg-card rounded-2xl border border-border overflow-hidden">
      {/* 요일 헤더 */}
      <View className="flex-row border-b border-border">
        {WEEKDAYS.map((day, i) => (
          <View key={day} className="flex-1 items-center py-1.5">
            <Text
              className="font-medium"
              style={{
                fontSize: 10,
                color: i === 0 ? colors.expense : i === 6 ? '#3B82F6' : colors.textSecondary,
              }}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 날짜 격자 */}
      {weeks.map((week, wi) => (
        <View key={wi} className={`flex-row ${wi < weeks.length - 1 ? 'border-b border-border' : ''}`}>
          {week.map((day, di) => {
            const income = day ? dailyIncome.get(day) ?? 0 : 0;
            const expense = day ? dailyExpense.get(day) ?? 0 : 0;
            const transfer = day ? dailyTransfer.get(day) ?? 0 : 0;
            const isToday = isCurrentMonth && day === todayDate;
            const isSelected = day === selectedDate;
            const holiday = day ? holidayMap.get(day) : null;
            const isSunday = di === 0;
            const isSaturday = di === 6;
            const isHolidayOrSunday = !!holiday || isSunday;

            return (
              <TouchableOpacity
                key={di}
                className="flex-1 items-center py-1 px-0.5"
                style={{
                  backgroundColor: isSelected ? colors.primaryMuted : 'transparent',
                  minHeight: 48,
                }}
                onPress={() => day && onSelectDate(day)}
                disabled={!day}
                activeOpacity={0.7}
              >
                {/* 날짜 숫자 */}
                <View
                  className="w-5 h-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: isToday ? colors.primary : 'transparent' }}
                >
                  <Text
                    className="font-medium"
                    style={{
                      fontSize: 11,
                      color: isToday
                        ? colors.white
                        : isHolidayOrSunday
                        ? colors.expense
                        : isSaturday
                        ? '#3B82F6'
                        : day
                        ? colors.textPrimary
                        : 'transparent',
                    }}
                  >
                    {day ?? ''}
                  </Text>
                </View>

                {/* 공휴일 이름 */}
                {holiday && (
                  <Text
                    className="text-center leading-tight"
                    style={{ color: colors.expense, fontSize: 7, marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {holiday}
                  </Text>
                )}
                {/* 수입 */}
                {income > 0 && (
                  <Text
                    className="text-center leading-tight"
                    style={{ color: colors.income, fontSize: 8, marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {formatCalendarAmount(income)}
                  </Text>
                )}
                {/* 지출 */}
                {expense > 0 && (
                  <Text
                    className="text-center leading-tight"
                    style={{ color: colors.expense, fontSize: 8 }}
                    numberOfLines={1}
                  >
                    {formatCalendarAmount(expense)}
                  </Text>
                )}
                {/* 이체 */}
                {transfer > 0 && (
                  <Text
                    className="text-center leading-tight"
                    style={{ color: colors.transfer, fontSize: 8 }}
                    numberOfLines={1}
                  >
                    {formatCalendarAmount(transfer)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── 거래 아이템 ─────────────────────────────────────────────────────────────

function TransactionItem({ tx, isLast, onPress }: { tx: Transaction; isLast: boolean; onPress: () => void }) {
  const iconName =
    tx.type === 'INCOME' ? 'arrow-down' :
    tx.type === 'EXPENSE' ? 'arrow-up' : 'swap-horizontal';
  const iconBg =
    tx.type === 'INCOME' ? colors.primaryMuted :
    tx.type === 'EXPENSE' ? '#FEF2F2' : '#FFFBEB';
  const iconColor =
    tx.type === 'INCOME' ? colors.income :
    tx.type === 'EXPENSE' ? colors.expense : colors.transfer;
  const amountPrefix = tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '';
  const subText =
    tx.type === 'TRANSFER'
      ? `${tx.fromAssetName} → ${tx.toAssetName}`
      : tx.assetName ?? '';
  const label =
    tx.memo || (tx.type === 'TRANSFER' ? '이체' : tx.type === 'INCOME' ? '수입' : '지출');

  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-3.5 ${!isLast ? 'border-b border-border' : ''}`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons name={iconName as any} size={16} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-text-primary text-sm font-medium" numberOfLines={1}>{label}</Text>
        {subText ? <Text className="text-text-muted text-xs mt-0.5">{subText}</Text> : null}
      </View>
      <Text className="text-sm font-semibold" style={{ color: iconColor }}>
        {amountPrefix}{formatAmount(tx.amount)}원
      </Text>
    </TouchableOpacity>
  );
}

// ─── 홈 화면 ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => formatMonth(new Date()));
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { pullDistance, refreshing, pulling, handlers } = usePullToRefresh(
    useCallback(async () => { await queryClient.invalidateQueries(); }, [queryClient])
  );

  const { data: book } = useQuery({
    queryKey: ['book'],
    queryFn: () => bookApi.getMyBook().then((r) => r.data.data),
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', book?.id, selectedMonth],
    queryFn: () =>
      transactionApi.getAll({ bookId: book!.id, month: selectedMonth }).then((r) => r.data.data),
    enabled: !!book?.id,
  });

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    setSelectedMonth(formatMonth(new Date(y, m - 1 + delta)));
    setSelectedDay(null);
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

  // 일별 지출/수입 합산 Map
  const dailyExpense = useMemo(() => {
    const map = new Map<number, number>();
    transactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        const day = parseInt(t.date.split('-')[2], 10);
        map.set(day, (map.get(day) ?? 0) + t.amount);
      });
    return map;
  }, [transactions]);

  const dailyIncome = useMemo(() => {
    const map = new Map<number, number>();
    transactions
      .filter((t) => t.type === 'INCOME')
      .forEach((t) => {
        const day = parseInt(t.date.split('-')[2], 10);
        map.set(day, (map.get(day) ?? 0) + t.amount);
      });
    return map;
  }, [transactions]);

  const dailyTransfer = useMemo(() => {
    const map = new Map<number, number>();
    transactions
      .filter((t) => t.type === 'TRANSFER')
      .forEach((t) => {
        const day = parseInt(t.date.split('-')[2], 10);
        map.set(day, (map.get(day) ?? 0) + t.amount);
      });
    return map;
  }, [transactions]);

  // 날짜별 그룹핑
  const todayDay = new Date().getDate();
  const isCurrentMonth = selectedMonth === formatMonth(new Date());

  const grouped = useMemo(() => {
    let filtered: Transaction[];

    if (viewMode === 'calendar') {
      // 달력 뷰: 선택된 날짜 or 오늘 날짜의 거래만
      const targetDay = selectedDay ?? (isCurrentMonth ? todayDay : null);
      filtered = targetDay
        ? transactions.filter((t) => parseInt(t.date.split('-')[2], 10) === targetDay)
        : [];
    } else {
      // 목록 뷰: 해당 월 전체 거래
      filtered = [...transactions];
    }

    const map = new Map<string, Transaction[]>();
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    for (const tx of sorted) {
      const list = map.get(tx.date) ?? [];
      map.set(tx.date, [...list, tx]);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [transactions, selectedDay, viewMode, isCurrentMonth, todayDay]);

  const net = summary.income - summary.expense;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']} {...handlers}>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pulling={pulling} />
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
            <View className="mx-6 mb-4 bg-primary rounded-3xl px-5 py-4">
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

            {/* 뷰 전환 토글 */}
            <View className="flex-row mx-6 mb-3 bg-card rounded-2xl p-1 border border-border">
              {(['calendar', 'list'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 ${
                    viewMode === mode ? 'bg-primary' : ''
                  }`}
                  onPress={() => { setViewMode(mode); setSelectedDay(null); }}
                >
                  <Ionicons
                    name={mode === 'calendar' ? 'calendar-outline' : 'list-outline'}
                    size={14}
                    color={viewMode === mode ? colors.white : colors.textSecondary}
                  />
                  <Text
                    className={`text-sm font-semibold ${
                      viewMode === mode ? 'text-white' : 'text-text-secondary'
                    }`}
                  >
                    {mode === 'calendar' ? '달력' : '목록'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 캘린더 */}
            {viewMode === 'calendar' && (
              <CalendarView
                yyyymm={selectedMonth}
                dailyExpense={dailyExpense}
                dailyIncome={dailyIncome}
                dailyTransfer={dailyTransfer}
                selectedDate={selectedDay}
                onSelectDate={(day) =>
                  setSelectedDay((prev) => (prev === day ? null : day))
                }
              />
            )}

            {/* 선택된 날짜 표시 (달력 뷰) */}
            {viewMode === 'calendar' && (() => {
              const displayDay = selectedDay ?? (isCurrentMonth ? todayDay : null);
              if (!displayDay) return null;
              const dateStr = `${selectedMonth}-${String(displayDay).padStart(2, '0')}`;
              return (
                <View className="flex-row items-center justify-between px-6 mb-2">
                  <Text className="text-sm font-semibold text-text-primary">
                    {formatDate(dateStr)}
                    {!selectedDay && isCurrentMonth ? ' (오늘)' : ''}
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      className="flex-row items-center gap-1 bg-primary rounded-lg px-2.5 py-1"
                      onPress={() => router.push(`/transaction/new?date=${dateStr}`)}
                    >
                      <Ionicons name="add" size={14} color={colors.white} />
                      <Text className="text-white text-xs font-semibold">추가</Text>
                    </TouchableOpacity>
                    {selectedDay && (
                      <TouchableOpacity onPress={() => setSelectedDay(null)}>
                        <Text className="text-text-muted text-xs">오늘로</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })()}

            {isLoading && (
              <View className="items-center py-8">
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </>
        }
        renderItem={({ item }) =>
          !isLoading ? (
            <View className="px-6 mb-4">
              <Text className="text-sm text-text-secondary font-medium mb-2">
                {formatDate(item.date)}
              </Text>
              <View className="bg-card rounded-2xl overflow-hidden border border-border">
                {item.items.map((tx, idx) => (
                  <TransactionItem
                    key={tx.id}
                    tx={tx}
                    isLast={idx === item.items.length - 1}
                    onPress={() => router.push(`/transaction/edit?id=${tx.id}&bookId=${tx.bookId}`)}
                  />
                ))}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-8 gap-1">
              <Text className="text-text-muted text-base">
                {viewMode === 'calendar'
                  ? '오늘 거래 내역이 없어요'
                  : '이번 달 거래 내역이 없어요'}
              </Text>
              <Text className="text-text-muted text-sm">아래 + 버튼으로 추가해보세요</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
