import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { assetApi } from '../../src/api/asset';
import { categoryApi } from '../../src/api/category';
import { transactionApi } from '../../src/api/transaction';
import { recurringApi } from '../../src/api/recurring';
import type { Asset, Category, TransactionType, RecurringTransaction } from '../../src/types';
import colors from '../../constants/colors';

// ─── 날짜 유틸 ───────────────────────────────────────────────────────────────

const toDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatDisplayDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
};

const changeDate = (dateStr: string, delta: number) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toDateString(d);
};

// ─── 커스텀 키패드 ───────────────────────────────────────────────────────────

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['00', '0', '⌫'],
];

function Numpad({ onPress, disabled }: { onPress: (key: string) => void; disabled?: boolean }) {
  return (
    <View style={{ opacity: disabled ? 0.3 : 1 }}>
      {KEYS.map((row, ri) => (
        <View key={ri} className="flex-row">
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              className="flex-1 items-center justify-center py-4 border-t border-r border-border bg-card"
              style={{ borderTopWidth: ri === 0 ? 1 : 0, borderRightWidth: 1 }}
              onPress={() => !disabled && onPress(key)}
              activeOpacity={disabled ? 1 : 0.6}
              disabled={disabled}
            >
              {key === '⌫' ? (
                <Ionicons name="backspace-outline" size={20} color={disabled ? colors.textMuted : colors.textPrimary} />
              ) : (
                <Text className={`text-xl font-medium ${disabled ? 'text-text-muted' : 'text-text-primary'}`}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── 자산 선택 모달 ──────────────────────────────────────────────────────────

function AssetPickerModal({
  visible, assets, selectedId, onSelect, onClose,
}: {
  visible: boolean; assets: Asset[]; selectedId: number | null;
  onSelect: (asset: Asset) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-card rounded-t-3xl px-6 pt-4 pb-10" style={{ maxHeight: '50%' }}>
        <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />
        <Text className="text-base font-bold text-text-primary mb-4">자산 선택</Text>
        {assets.length === 0 ? (
          <Text className="text-text-muted text-center py-8">등록된 자산이 없어요</Text>
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-row items-center justify-between py-3.5 border-b border-border"
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text className="text-text-primary text-base">{item.name}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-text-secondary text-sm">{item.balance.toLocaleString()}원</Text>
                  {selectedId === item.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── 카테고리 선택 모달 ──────────────────────────────────────────────────────

function CategoryPickerModal({
  visible, categories, selectedId, onSelect, onClose,
}: {
  visible: boolean; categories: Category[]; selectedId: number | null;
  onSelect: (category: Category) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-card rounded-t-3xl px-6 pt-4 pb-10" style={{ maxHeight: '50%' }}>
        <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />
        <Text className="text-base font-bold text-text-primary mb-4">카테고리 선택</Text>
        {categories.length === 0 ? (
          <Text className="text-text-muted text-center py-8">
            등록된 카테고리가 없어요{'\n'}설정에서 카테고리를 추가해주세요
          </Text>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-row items-center justify-between py-3.5 border-b border-border"
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text className="text-text-primary text-base">{item.name}</Text>
                {selectedId === item.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── 달력 날짜 선택 모달 ──────────────────────────────────────────────────────

function DatePickerModal({
  visible, selectedDate, onSelect, onClose,
}: {
  visible: boolean; selectedDate: string;
  onSelect: (dateStr: string) => void; onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(() => parseInt(selectedDate.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(selectedDate.split('-')[1]));

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const todayStr = toDateString(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  };

  const makeDateStr = (day: number) =>
    `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-card rounded-t-3xl px-5 pt-4 pb-8">
        <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={prevMonth} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text className="text-base font-bold text-text-primary">{viewYear}년 {viewMonth}월</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={12}>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View className="flex-row mb-1">
          {WEEKDAYS.map((w, i) => (
            <View key={i} className="flex-1 items-center py-1">
              <Text className={`text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-text-muted'}`}>{w}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {cells.map((day, idx) => {
            if (day === null) return <View key={`e-${idx}`} style={{ width: '14.28%', height: 40 }} />;
            const ds = makeDateStr(day);
            const isSelected = ds === selectedDate;
            const isToday = ds === todayStr;
            const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
            return (
              <TouchableOpacity
                key={day}
                style={{ width: '14.28%', height: 40 }}
                className="items-center justify-center"
                onPress={() => { onSelect(ds); onClose(); }}
              >
                <View className={`w-8 h-8 items-center justify-center rounded-full ${isSelected ? 'bg-primary' : ''}`}>
                  <Text className={`text-sm ${
                    isSelected ? 'text-white font-bold' :
                    isToday ? 'text-primary font-bold' :
                    dayOfWeek === 0 ? 'text-red-400' :
                    dayOfWeek === 6 ? 'text-blue-400' : 'text-text-primary'
                  }`}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

// ─── 메인 화면 ───────────────────────────────────────────────────────────────

export default function EditTransactionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, bookId } = useLocalSearchParams<{ id: string; bookId: string }>();
  const txId = Number(id);
  const txBookId = Number(bookId);

  const [txType, setTxType] = useState<TransactionType>('EXPENSE');
  const [amountStr, setAmountStr] = useState('0');
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [memo, setMemo] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [fromAsset, setFromAsset] = useState<Asset | null>(null);
  const [toAsset, setToAsset] = useState<Asset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [assetModal, setAssetModal] = useState<'single' | 'from' | 'to' | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState(1);
  const [recurringDayText, setRecurringDayText] = useState('1');
  const [existingRecurringId, setExistingRecurringId] = useState<number | null>(null);
  const [initialIsRecurring, setInitialIsRecurring] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 기존 거래 조회
  const { data: transaction, isLoading: txLoading } = useQuery({
    queryKey: ['transaction', txId, txBookId],
    queryFn: () => transactionApi.getById(txId, txBookId).then((r) => r.data.data),
    enabled: !!txId && !!txBookId,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', txBookId],
    queryFn: () => assetApi.getAll(txBookId).then((r) => r.data.data),
    enabled: !!txBookId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', txBookId],
    queryFn: () => categoryApi.getAll(txBookId).then((r) => r.data.data),
    enabled: !!txBookId,
  });

  // 반복 거래 조회
  const { data: recurringList = [] } = useQuery({
    queryKey: ['recurring', txBookId],
    queryFn: () => recurringApi.getAll(txBookId).then((r) => r.data.data),
    enabled: !!txBookId,
  });

  // 데이터 로드 후 폼 초기화
  useEffect(() => {
    if (transaction && assets.length > 0 && !initialized) {
      setTxType(transaction.type);
      setAmountStr(String(transaction.amount));
      setDate(transaction.date);
      setMemo(transaction.memo ?? '');

      if (transaction.type === 'TRANSFER') {
        const from = assets.find((a) => a.id === transaction.fromAssetId) ?? null;
        const to = assets.find((a) => a.id === transaction.toAssetId) ?? null;
        setFromAsset(from);
        setToAsset(to);
      } else {
        const asset = assets.find((a) => a.id === transaction.assetId) ?? null;
        setSelectedAsset(asset);
        if (categories.length > 0) {
          const cat = categories.find((c) => c.id === transaction.categoryId) ?? null;
          setSelectedCategory(cat);
        }
      }
      // 반복 거래 매칭 (같은 타입, 금액, 자산으로 매칭)
      if (recurringList.length > 0) {
        const matched = recurringList.find((r: RecurringTransaction) =>
          r.type === transaction.type &&
          r.amount === transaction.amount &&
          (transaction.type === 'TRANSFER'
            ? r.fromAssetId === transaction.fromAssetId && r.toAssetId === transaction.toAssetId
            : r.assetId === transaction.assetId && r.categoryId === transaction.categoryId)
        );
        if (matched) {
          setIsRecurring(true);
          setInitialIsRecurring(true);
          setExistingRecurringId(matched.id);
          setRecurringDay(matched.dayOfMonth);
          setRecurringDayText(String(matched.dayOfMonth));
        }
      }

      setInitialized(true);
    }
  }, [transaction, assets, categories, recurringList, initialized]);

  // 카테고리 별도 초기화 (categories가 늦게 로드될 수 있음)
  useEffect(() => {
    if (transaction && categories.length > 0 && initialized && !selectedCategory && transaction.type !== 'TRANSFER') {
      const cat = categories.find((c) => c.id === transaction.categoryId) ?? null;
      setSelectedCategory(cat);
    }
  }, [categories, transaction, initialized, selectedCategory]);

  const isNumpadEnabled = txType === 'TRANSFER' ? !!fromAsset : !!selectedAsset;

  // 수정 시에는 기존 금액만큼 잔액 여유가 있으므로 maxAmount를 보정
  const originalAmount = transaction?.amount ?? 0;
  const maxAmount =
    txType === 'EXPENSE' && selectedAsset
      ? (transaction?.assetId === selectedAsset.id ? selectedAsset.balance + originalAmount : selectedAsset.balance)
      : txType === 'TRANSFER' && fromAsset
      ? (transaction?.fromAssetId === fromAsset.id ? fromAsset.balance + originalAmount : fromAsset.balance)
      : Infinity;

  const handleKey = (key: string) => {
    setAmountStr((prev) => {
      if (key === '⌫') {
        const next = prev.slice(0, -1);
        return next === '' ? '0' : next;
      }
      if (prev === '0') return key === '00' ? '0' : key;
      const next = prev + key;
      if (next.length > 10) return prev;
      const nextNum = parseInt(next, 10) || 0;
      if (maxAmount !== Infinity && nextNum > maxAmount) return prev;
      return next;
    });
  };

  const amount = parseInt(amountStr, 10) || 0;

  const handleUpdate = async () => {
    if (amount <= 0) { Alert.alert('금액을 입력해주세요'); return; }
    if (txType !== 'TRANSFER' && !selectedAsset) { Alert.alert('자산을 선택해주세요'); return; }
    if (txType !== 'TRANSFER' && !selectedCategory) { Alert.alert('카테고리를 선택해주세요'); return; }
    if (txType === 'TRANSFER' && (!fromAsset || !toAsset)) { Alert.alert('출발/도착 자산을 선택해주세요'); return; }

    setIsSubmitting(true);
    try {
      await transactionApi.update(txId, txBookId, {
        amount,
        date,
        memo: memo || undefined,
        ...(txType !== 'TRANSFER'
          ? { assetId: selectedAsset!.id, categoryId: selectedCategory!.id }
          : { fromAssetId: fromAsset!.id, toAssetId: toAsset!.id }),
      });
      // 반복 거래 처리
      if (isRecurring && !initialIsRecurring) {
        try {
          await recurringApi.create({
            bookId: txBookId,
            type: txType,
            amount,
            dayOfMonth: recurringDay,
            memo: memo || undefined,
            ...(txType !== 'TRANSFER'
              ? { assetId: selectedAsset!.id, categoryId: selectedCategory!.id }
              : { fromAssetId: fromAsset!.id, toAssetId: toAsset!.id }),
          });
        } catch (e: any) { console.warn('반복 거래 생성 실패:', e.message); }
      } else if (!isRecurring && initialIsRecurring && existingRecurringId) {
        try { await recurringApi.delete(existingRecurringId); }
        catch (e: any) { console.warn('반복 거래 삭제 실패:', e.message); }
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets-total'] });
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      router.back();
    } catch (err: any) {
      Alert.alert('수정 실패', err.message ?? '다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await transactionApi.delete(txId, txBookId);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets-total'] });
      router.back();
    } catch (err: any) {
      setShowDeleteConfirm(false);
      Alert.alert('삭제 실패', err.message ?? '다시 시도해주세요.');
    } finally {
      setIsDeleting(false);
    }
  };

  const typeColor =
    txType === 'INCOME' ? colors.income :
    txType === 'EXPENSE' ? colors.expense : colors.transfer;

  if (txLoading || !initialized) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center" edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-base font-bold text-text-primary">거래 수정</Text>
        <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} hitSlop={12} disabled={isDeleting}>
          <Ionicons name="trash-outline" size={22} color={colors.expense} />
        </TouchableOpacity>
      </View>

      {/* 타입 표시 (수정 시 타입 변경 불가) */}
      <View className="flex-row mx-5 mt-1 mb-4 bg-card rounded-2xl p-1 border border-border">
        {([
          { type: 'EXPENSE' as TransactionType, label: '지출' },
          { type: 'INCOME' as TransactionType, label: '수입' },
          { type: 'TRANSFER' as TransactionType, label: '이체' },
        ]).map(({ type, label }) => (
          <View
            key={type}
            className={`flex-1 py-2 rounded-xl items-center ${txType === type ? 'bg-primary' : ''}`}
          >
            <Text className={`text-sm font-semibold ${txType === type ? 'text-white' : 'text-text-secondary'}`}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 스크롤 가능한 중간 영역 */}
      <ScrollView className="flex-1" bounces={false} showsVerticalScrollIndicator={false}>
        {/* 금액 표시 */}
        <View className="items-center py-4 mb-2">
          <Text className="text-text-muted text-sm mb-1">금액</Text>
          <Text className="text-5xl font-bold" style={{ color: isNumpadEnabled ? typeColor : colors.textMuted }}>
            {amount.toLocaleString()}
          </Text>
          <Text className="text-text-secondary text-lg mt-1">원</Text>
          {isNumpadEnabled && maxAmount !== Infinity && (
            <Text className="text-text-muted text-xs mt-1">
              최대 {maxAmount.toLocaleString()}원
            </Text>
          )}
        </View>

        {/* 날짜 / 자산 / 메모 */}
        <View className="mx-5 mb-3 bg-card rounded-2xl border border-border overflow-hidden">
          {/* 날짜 */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={17} color={colors.textSecondary} />
              <Text className="text-text-secondary text-sm">날짜</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity onPress={() => setDate((d) => changeDate(d, -1))} hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                <Text className="text-text-primary text-sm font-medium">
                  {formatDisplayDate(date)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDate((d) => changeDate(d, 1))} hitSlop={8}>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 자산 (수입/지출) */}
          {txType !== 'TRANSFER' && (
            <TouchableOpacity
              className="flex-row items-center justify-between px-4 py-3 border-b border-border"
              onPress={() => setAssetModal('single')}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="wallet-outline" size={17} color={colors.textSecondary} />
                <Text className="text-text-secondary text-sm">자산</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className={`text-sm ${selectedAsset ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                  {selectedAsset?.name ?? '선택하세요'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}

          {/* 카테고리 (수입/지출) */}
          {txType !== 'TRANSFER' && (
            <TouchableOpacity
              className="flex-row items-center justify-between px-4 py-3 border-b border-border"
              onPress={() => setCategoryModal(true)}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="pricetag-outline" size={17} color={colors.textSecondary} />
                <Text className="text-text-secondary text-sm">카테고리</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className={`text-sm ${selectedCategory ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                  {selectedCategory?.name ?? '선택하세요'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}

          {/* 이체: 출발/도착 자산 */}
          {txType === 'TRANSFER' && (
            <>
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-3 border-b border-border"
                onPress={() => setAssetModal('from')}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="arrow-up-outline" size={17} color={colors.textSecondary} />
                  <Text className="text-text-secondary text-sm">출발 자산</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className={`text-sm ${fromAsset ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                    {fromAsset?.name ?? '선택하세요'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-3 border-b border-border"
                onPress={() => setAssetModal('to')}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="arrow-down-outline" size={17} color={colors.textSecondary} />
                  <Text className="text-text-secondary text-sm">도착 자산</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className={`text-sm ${toAsset ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                    {toAsset?.name ?? '선택하세요'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* 메모 */}
          <View className="flex-row items-center px-4 py-3 border-b border-border">
            <Ionicons name="pencil-outline" size={17} color={colors.textSecondary} />
            <TextInput
              className="flex-1 ml-2 text-sm text-text-primary"
              placeholder="메모 (선택)"
              placeholderTextColor={colors.textMuted}
              value={memo}
              onChangeText={setMemo}
              returnKeyType="done"
            />
          </View>

          {/* 반복 설정 */}
          <View className="px-4 py-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="repeat-outline" size={17} color={colors.textSecondary} />
                <Text className="text-text-secondary text-sm">반복 설정</Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isRecurring ? colors.primary : colors.textMuted}
              />
            </View>
            {isRecurring && (
              <View className="flex-row items-center mt-3 ml-6">
                <Text className="text-text-secondary text-sm">매월</Text>
                <View className="mx-2 bg-bg rounded-lg border border-border px-2">
                  <TextInput
                    className="text-center text-sm text-text-primary py-1"
                    style={{ width: 36 }}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={recurringDayText}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9]/g, '');
                      setRecurringDayText(cleaned);
                      const num = parseInt(cleaned, 10);
                      if (num >= 1 && num <= 31) setRecurringDay(num);
                    }}
                    onBlur={() => {
                      const num = parseInt(recurringDayText, 10);
                      if (!num || num < 1 || num > 31) {
                        setRecurringDay(1);
                        setRecurringDayText('1');
                      } else {
                        setRecurringDayText(String(num));
                      }
                    }}
                  />
                </View>
                <Text className="text-text-secondary text-sm">일 반복</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 키패드 (하단 고정) */}
      <Numpad onPress={handleKey} disabled={!isNumpadEnabled} />

      {/* 수정 버튼 (하단 고정) */}
      <TouchableOpacity
        className="mx-5 my-3 bg-primary rounded-2xl py-4 items-center"
        style={{ opacity: isSubmitting ? 0.6 : 1 }}
        onPress={handleUpdate}
        disabled={isSubmitting || isDeleting}
      >
        <Text className="text-white font-bold text-base">
          {isSubmitting ? '수정 중...' : '수정 완료'}
        </Text>
      </TouchableOpacity>

      {/* 자산 선택 모달 */}
      <AssetPickerModal
        visible={assetModal !== null}
        assets={
          txType === 'TRANSFER' && assetModal === 'to'
            ? assets.filter((a) => a.id !== fromAsset?.id)
            : txType === 'TRANSFER' && assetModal === 'from'
            ? assets.filter((a) => a.id !== toAsset?.id)
            : assets
        }
        selectedId={
          assetModal === 'from' ? fromAsset?.id ?? null :
          assetModal === 'to' ? toAsset?.id ?? null :
          selectedAsset?.id ?? null
        }
        onSelect={(asset) => {
          if (assetModal === 'from') {
            setFromAsset(asset);
            if (txType === 'TRANSFER' && amount > asset.balance) setAmountStr('0');
          } else if (assetModal === 'to') {
            setToAsset(asset);
          } else {
            setSelectedAsset(asset);
            if (txType === 'EXPENSE' && amount > asset.balance) setAmountStr('0');
          }
        }}
        onClose={() => setAssetModal(null)}
      />

      {/* 카테고리 선택 모달 */}
      <CategoryPickerModal
        visible={categoryModal}
        categories={categories}
        selectedId={selectedCategory?.id ?? null}
        onSelect={(cat) => setSelectedCategory(cat)}
        onClose={() => setCategoryModal(false)}
      />

      {/* 날짜 선택 모달 */}
      <DatePickerModal
        visible={datePickerVisible}
        selectedDate={date}
        onSelect={(d) => setDate(d)}
        onClose={() => setDatePickerVisible(false)}
      />

      {/* 삭제 확인 모달 */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <View className="bg-card rounded-3xl px-6 py-6 w-full items-center">
            <View className="w-14 h-14 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#FEF2F2' }}>
              <Ionicons name="warning-outline" size={28} color={colors.expense} />
            </View>
            <Text className="text-lg font-bold text-text-primary mb-2">거래를 삭제하시겠습니까?</Text>
            <Text className="text-text-muted text-sm mb-6">자산 잔액이 자동으로 복구됩니다.</Text>
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-2xl border border-border bg-bg items-center"
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                <Text className="text-sm font-semibold text-text-secondary">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-2xl items-center"
                style={{ backgroundColor: colors.expense, opacity: isDeleting ? 0.6 : 1 }}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                <Text className="text-white text-sm font-semibold">
                  {isDeleting ? '삭제 중...' : '삭제'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
