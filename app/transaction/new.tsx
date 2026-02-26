import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookApi } from '../../src/api/book';
import { assetApi } from '../../src/api/asset';
import { transactionApi } from '../../src/api/transaction';
import type { Asset, TransactionType } from '../../src/types';
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

function Numpad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <View>
      {KEYS.map((row, ri) => (
        <View key={ri} className="flex-row">
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              className="flex-1 items-center justify-center py-4 border-t border-r border-border bg-card"
              style={{ borderTopWidth: ri === 0 ? 1 : 0, borderRightWidth: 1 }}
              onPress={() => onPress(key)}
              activeOpacity={0.6}
            >
              {key === '⌫' ? (
                <Ionicons name="backspace-outline" size={20} color={colors.textPrimary} />
              ) : (
                <Text className="text-text-primary text-xl font-medium">{key}</Text>
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
  visible,
  assets,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  assets: Asset[];
  selectedId: number | null;
  onSelect: (asset: Asset) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onClose}
      />
      <View className="bg-card rounded-t-3xl px-6 pt-4 pb-10" style={{ maxHeight: '50%' }}>
        <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />
        <Text className="text-base font-bold text-text-primary mb-4">자산 선택</Text>
        {assets.length === 0 ? (
          <Text className="text-text-muted text-center py-8">
            등록된 자산이 없어요
          </Text>
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`flex-row items-center justify-between py-3.5 border-b border-border`}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text className="text-text-primary text-base">{item.name}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-text-secondary text-sm">
                    {item.balance.toLocaleString()}원
                  </Text>
                  {selectedId === item.id && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── 메인 화면 ───────────────────────────────────────────────────────────────

const TYPE_LABELS: { type: TransactionType; label: string }[] = [
  { type: 'EXPENSE', label: '지출' },
  { type: 'INCOME', label: '수입' },
  { type: 'TRANSFER', label: '이체' },
];

export default function NewTransactionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { date: paramDate } = useLocalSearchParams<{ date?: string }>();

  const [txType, setTxType] = useState<TransactionType>('EXPENSE');
  const [amountStr, setAmountStr] = useState('0');
  const [date, setDate] = useState(() =>
    paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : toDateString(new Date())
  );
  const [memo, setMemo] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [fromAsset, setFromAsset] = useState<Asset | null>(null);
  const [toAsset, setToAsset] = useState<Asset | null>(null);
  const [assetModal, setAssetModal] = useState<'single' | 'from' | 'to' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 가계부 + 자산 조회
  const { data: book } = useQuery({
    queryKey: ['book'],
    queryFn: () => bookApi.getMyBook().then((r) => r.data.data),
  });
  const { data: assets = [] } = useQuery({
    queryKey: ['assets', book?.id],
    queryFn: () => assetApi.getAll(book!.id).then((r) => r.data.data),
    enabled: !!book?.id,
  });

  // 키패드 입력 처리
  const handleKey = (key: string) => {
    setAmountStr((prev) => {
      if (key === '⌫') {
        const next = prev.slice(0, -1);
        return next === '' ? '0' : next;
      }
      if (prev === '0') return key === '00' ? '0' : key;
      const next = prev + key;
      if (next.length > 10) return prev;
      return next;
    });
  };

  const amount = parseInt(amountStr, 10) || 0;

  // 거래 등록
  const handleSubmit = async () => {
    if (!book) return;
    if (amount <= 0) {
      Alert.alert('금액을 입력해주세요');
      return;
    }
    if (txType !== 'TRANSFER' && !selectedAsset) {
      Alert.alert('자산을 선택해주세요');
      return;
    }
    if (txType === 'TRANSFER' && (!fromAsset || !toAsset)) {
      Alert.alert('출발/도착 자산을 선택해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      await transactionApi.create({
        bookId: book.id,
        type: txType,
        amount,
        date,
        memo: memo || undefined,
        ...(txType !== 'TRANSFER'
          ? { assetId: selectedAsset!.id }
          : { fromAssetId: fromAsset!.id, toAssetId: toAsset!.id }),
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets-total'] });
      router.back();
    } catch (err: any) {
      Alert.alert('등록 실패', err.message ?? '다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeColor =
    txType === 'INCOME' ? colors.income :
    txType === 'EXPENSE' ? colors.expense : colors.transfer;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-base font-bold text-text-primary">거래 추가</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 타입 선택 */}
      <View className="flex-row mx-5 mt-1 mb-4 bg-card rounded-2xl p-1 border border-border">
        {TYPE_LABELS.map(({ type, label }) => (
          <TouchableOpacity
            key={type}
            className={`flex-1 py-2 rounded-xl items-center ${txType === type ? 'bg-primary' : ''}`}
            onPress={() => {
              setTxType(type);
              setSelectedAsset(null);
              setFromAsset(null);
              setToAsset(null);
            }}
          >
            <Text
              className={`text-sm font-semibold ${txType === type ? 'text-white' : 'text-text-secondary'}`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 금액 표시 */}
      <View className="items-center py-4 mb-2">
        <Text className="text-text-muted text-sm mb-1">금액</Text>
        <Text className="text-5xl font-bold" style={{ color: typeColor }}>
          {amount.toLocaleString()}
        </Text>
        <Text className="text-text-secondary text-lg mt-1">원</Text>
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
            <Text className="text-text-primary text-sm font-medium">
              {formatDisplayDate(date)}
            </Text>
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
        <View className="flex-row items-center px-4 py-3">
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
      </View>

      {/* 키패드 */}
      <View className="flex-1 justify-end">
        <Numpad onPress={handleKey} />
        <TouchableOpacity
          className="mx-5 my-3 bg-primary rounded-2xl py-4 items-center"
          style={{ opacity: isSubmitting ? 0.6 : 1 }}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? '등록 중...' : '완료'}
          </Text>
        </TouchableOpacity>
      </View>

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
          if (assetModal === 'from') setFromAsset(asset);
          else if (assetModal === 'to') setToAsset(asset);
          else setSelectedAsset(asset);
        }}
        onClose={() => setAssetModal(null)}
      />
    </SafeAreaView>
  );
}
