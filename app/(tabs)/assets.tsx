import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookApi } from '../../src/api/book';
import { assetApi } from '../../src/api/asset';
import { transactionApi } from '../../src/api/transaction';
import type { Asset, Transaction } from '../../src/types';
import colors from '../../constants/colors';

const formatMonth = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatKoreanMonth = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-');
  return `${y}년 ${parseInt(m)}월`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
};

// ─── 자산 추가/편집 모달 ──────────────────────────────────────────────────────

function AssetFormModal({
  visible,
  asset,
  bookId,
  onClose,
}: {
  visible: boolean;
  asset: Asset | null;
  bookId: number;
  onClose: (saved: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [balanceStr, setBalanceStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const onShow = () => {
    setName(asset?.name ?? '');
    setBalanceStr(asset ? String(asset.balance) : '');
  };

  const handleBalanceChange = (text: string) => {
    // 마이너스 부호와 숫자만 허용
    const cleaned = text.replace(/[^0-9-]/g, '');
    // 마이너스는 맨 앞에만 허용
    const isNegative = cleaned.startsWith('-');
    const digits = cleaned.replace(/-/g, '');
    if (digits === '' && !isNegative) {
      setBalanceStr('');
      return;
    }
    if (digits === '' && isNegative) {
      setBalanceStr('-');
      return;
    }
    const num = parseInt(digits, 10);
    setBalanceStr(isNegative ? `-${num}` : String(num));
  };

  const displayBalance =
    balanceStr === '' ? '' :
    balanceStr === '-' ? '-' :
    Number(balanceStr).toLocaleString();

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('자산 이름을 입력해주세요'); return; }
    const balance = parseInt(balanceStr || '0', 10);
    if (isNaN(balance)) { Alert.alert('잔액을 올바르게 입력해주세요'); return; }

    setIsSaving(true);
    try {
      if (asset) {
        await assetApi.update(bookId, asset.id, { name: name.trim(), balance });
      } else {
        await assetApi.create(bookId, { name: name.trim(), balance });
      }
      onClose(true);
    } catch (err: any) {
      Alert.alert('저장 실패', err.message ?? '다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={onShow}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => onClose(false)} />
        <View className="bg-card rounded-t-3xl px-6 pt-5 pb-10">
          <View className="w-10 h-1 bg-border rounded-full self-center mb-5" />
          <Text className="text-lg font-bold text-text-primary mb-5">
            {asset ? '자산 편집' : '자산 추가'}
          </Text>

          <Text className="text-sm text-text-secondary mb-2">자산 이름</Text>
          <TextInput
            className="bg-bg rounded-2xl px-4 py-3.5 text-text-primary text-base border border-border mb-4"
            placeholder="예) 카카오뱅크, 현금"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          <Text className="text-sm text-text-secondary mb-2">
            {asset ? '현재 잔액' : '초기 잔액'}
          </Text>
          <TextInput
            className="bg-bg rounded-2xl px-4 py-3.5 text-text-primary text-base border border-border mb-2"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
            value={displayBalance}
            onChangeText={handleBalanceChange}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <Text className="text-xs text-text-muted mb-4">
            음수 입력 시 부채로 표시되며 총 자산에 포함되지 않아요
          </Text>

          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center"
            style={{ opacity: isSaving ? 0.6 : 1 }}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving
              ? <ActivityIndicator color={colors.white} />
              : <Text className="text-white font-bold text-base">저장</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── 자산 상세 모달 (해당 월 거래 내역) ────────────────────────────────────────

function AssetDetailModal({
  visible,
  asset,
  bookId,
  onClose,
  onEdit,
}: {
  visible: boolean;
  asset: Asset | null;
  bookId: number;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [month, setMonth] = useState(() => formatMonth(new Date()));

  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: ['transactions', bookId, month],
    queryFn: () =>
      transactionApi.getAll({ bookId, month }).then((r) => r.data.data),
    enabled: visible && !!asset,
  });

  // 해당 자산의 거래만 필터 (수입/지출의 assetId 또는 이체의 from/toAssetId)
  const filtered = useMemo(() => {
    if (!asset) return [];
    return allTransactions.filter(
      (tx) =>
        tx.assetId === asset.id ||
        tx.fromAssetId === asset.id ||
        tx.toAssetId === asset.id,
    );
  }, [allTransactions, asset]);

  const summary = useMemo(
    () =>
      filtered.reduce(
        (acc, tx) => {
          if (tx.type === 'INCOME') acc.income += tx.amount;
          else if (tx.type === 'EXPENSE') acc.expense += tx.amount;
          else if (tx.type === 'TRANSFER') acc.transfer += tx.amount;
          return acc;
        },
        { income: 0, expense: 0, transfer: 0 },
      ),
    [filtered],
  );

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    setMonth(formatMonth(new Date(y, m - 1 + delta)));
  };

  if (!asset) return null;

  const isNegative = asset.balance < 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onClose}
      />
      <View className="bg-card rounded-t-3xl pt-4 pb-10" style={{ maxHeight: '70%' }}>
        <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />

        {/* 자산 헤더 */}
        <View className="flex-row items-center justify-between px-6 mb-4">
          <View className="flex-row items-center gap-3">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: isNegative ? '#FEE2E2' : colors.primaryMuted }}
            >
              <Ionicons
                name={isNegative ? 'trending-down-outline' : 'wallet-outline'}
                size={18}
                color={isNegative ? colors.expense : colors.primary}
              />
            </View>
            <View>
              <Text className="text-text-primary text-base font-bold">{asset.name}</Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: isNegative ? colors.expense : colors.textPrimary }}
              >
                {asset.balance.toLocaleString()}원
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-primary-muted rounded-xl px-3 py-2"
            onPress={onEdit}
          >
            <Text className="text-primary text-sm font-medium">편집</Text>
          </TouchableOpacity>
        </View>

        {/* 월 선택 */}
        <View className="flex-row items-center justify-center gap-4 mb-3">
          <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={12}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text className="text-sm font-semibold text-text-primary">
            {formatKoreanMonth(month)}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={12}>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 요약 */}
        <View className="flex-row mx-6 mb-3 bg-bg rounded-xl px-4 py-3">
          <View className="flex-1 items-center">
            <Text className="text-xs text-text-muted mb-0.5">수입</Text>
            <Text className="text-sm font-semibold" style={{ color: colors.income }}>
              +{summary.income.toLocaleString()}
            </Text>
          </View>
          <View className="w-px bg-border" />
          <View className="flex-1 items-center">
            <Text className="text-xs text-text-muted mb-0.5">지출</Text>
            <Text className="text-sm font-semibold" style={{ color: colors.expense }}>
              -{summary.expense.toLocaleString()}
            </Text>
          </View>
          {summary.transfer > 0 && (
            <>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-xs text-text-muted mb-0.5">이체</Text>
                <Text className="text-sm font-semibold" style={{ color: colors.transfer }}>
                  {summary.transfer.toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* 거래 목록 */}
        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="py-8 items-center">
            <Text className="text-text-muted text-sm">이 달의 거래 내역이 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={filtered.sort((a, b) => b.date.localeCompare(a.date))}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 24 }}
            renderItem={({ item: tx, index }) => {
              const iconName =
                tx.type === 'INCOME' ? 'arrow-down' :
                tx.type === 'EXPENSE' ? 'arrow-up' : 'swap-horizontal';
              const iconColor =
                tx.type === 'INCOME' ? colors.income :
                tx.type === 'EXPENSE' ? colors.expense : colors.transfer;
              const prefix = tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '';
              const label = tx.memo || (tx.type === 'TRANSFER' ? '이체' : tx.type === 'INCOME' ? '수입' : '지출');

              return (
                <View
                  className={`flex-row items-center py-3 ${
                    index < filtered.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <Ionicons name={iconName as any} size={14} color={iconColor} style={{ marginRight: 8 }} />
                  <View className="flex-1">
                    <Text className="text-text-primary text-sm" numberOfLines={1}>{label}</Text>
                    <Text className="text-text-muted text-xs">{formatDate(tx.date)}</Text>
                  </View>
                  <Text className="text-sm font-semibold" style={{ color: iconColor }}>
                    {prefix}{tx.amount.toLocaleString()}원
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── 자산 화면 ───────────────────────────────────────────────────────────────

export default function AssetsScreen() {
  const queryClient = useQueryClient();
  const [formModal, setFormModal] = useState<{ open: boolean; asset: Asset | null }>({
    open: false,
    asset: null,
  });
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  const { data: book } = useQuery({
    queryKey: ['book'],
    queryFn: () => bookApi.getMyBook().then((r) => r.data.data),
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', book?.id],
    queryFn: () => assetApi.getAll(book!.id).then((r) => r.data.data),
    enabled: !!book?.id,
  });

  // 양수 자산(자산)과 음수 자산(부채) 분리
  const positiveAssets = useMemo(() => assets.filter((a) => a.balance >= 0), [assets]);
  const negativeAssets = useMemo(() => assets.filter((a) => a.balance < 0), [assets]);

  // 총 자산: 양수 자산만 합산 (음수 부채 미포함)
  const totalBalance = useMemo(
    () => positiveAssets.reduce((sum, a) => sum + a.balance, 0),
    [positiveAssets],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['assets-total'] });
    queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
  };

  const handleDelete = (asset: Asset) => {
    Alert.alert(
      '자산 삭제',
      `'${asset.name}'을(를) 삭제할까요?\n거래 내역이 있는 자산은 삭제할 수 없어요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await assetApi.delete(book!.id, asset.id);
              invalidate();
            } catch (err: any) {
              Alert.alert('삭제 실패', err.message ?? '거래 내역이 있는 자산은 삭제할 수 없어요.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
        <Text className="text-2xl font-bold text-text-primary">자산</Text>
        <TouchableOpacity
          className="w-9 h-9 bg-primary rounded-xl items-center justify-center"
          onPress={() => setFormModal({ open: true, asset: null })}
        >
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* 총 자산 카드 */}
      <View className="mx-6 mb-5 bg-primary rounded-3xl px-5 py-5">
        <Text className="text-white/60 text-sm mb-1">총 자산</Text>
        <Text className="text-white text-3xl font-bold">
          {totalBalance.toLocaleString()}원
        </Text>
      </View>

      {/* 자산 목록 */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : assets.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <Ionicons name="wallet-outline" size={40} color={colors.textMuted} />
          <Text className="text-text-muted text-base">등록된 자산이 없어요</Text>
          <TouchableOpacity
            className="mt-2 bg-primary-muted rounded-2xl px-5 py-2.5"
            onPress={() => setFormModal({ open: true, asset: null })}
          >
            <Text className="text-primary text-sm font-semibold">자산 추가하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* 양수 자산 (자산) */}
          {positiveAssets.length > 0 && (
            <View className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
              {positiveAssets.map((asset, idx) => (
                <View key={asset.id}>
                  <TouchableOpacity
                    className="flex-row items-center justify-between px-4 py-4"
                    onPress={() => setDetailAsset(asset)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-xl bg-primary-muted items-center justify-center">
                        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                      </View>
                      <Text className="text-text-primary text-base font-medium">{asset.name}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-text-primary text-base font-semibold">
                        {asset.balance.toLocaleString()}원
                      </Text>
                      <TouchableOpacity onPress={() => handleDelete(asset)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                  {idx < positiveAssets.length - 1 && <View className="h-px bg-border mx-4" />}
                </View>
              ))}
            </View>
          )}

          {/* 음수 자산 (부채) */}
          {negativeAssets.length > 0 && (
            <>
              <View className="flex-row items-center gap-2 mb-2 px-1">
                <Ionicons name="warning-outline" size={14} color={colors.expense} />
                <Text className="text-expense text-xs font-semibold">부채</Text>
                <Text className="text-text-muted text-xs">총 자산에 미포함</Text>
              </View>
              <View className="bg-card rounded-2xl border border-border overflow-hidden" style={{ borderColor: '#FECACA' }}>
                {negativeAssets.map((asset, idx) => (
                  <View key={asset.id}>
                    <TouchableOpacity
                      className="flex-row items-center justify-between px-4 py-4"
                      onPress={() => setDetailAsset(asset)}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                          <Ionicons name="trending-down-outline" size={18} color={colors.expense} />
                        </View>
                        <Text className="text-text-primary text-base font-medium">{asset.name}</Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-base font-semibold" style={{ color: colors.expense }}>
                          {asset.balance.toLocaleString()}원
                        </Text>
                        <TouchableOpacity onPress={() => handleDelete(asset)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                    {idx < negativeAssets.length - 1 && <View className="h-px bg-border mx-4" />}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <AssetDetailModal
        visible={!!detailAsset}
        asset={detailAsset}
        bookId={book?.id ?? 0}
        onClose={() => setDetailAsset(null)}
        onEdit={() => {
          const a = detailAsset;
          setDetailAsset(null);
          setTimeout(() => setFormModal({ open: true, asset: a }), 300);
        }}
      />

      <AssetFormModal
        visible={formModal.open}
        asset={formModal.asset}
        bookId={book?.id ?? 0}
        onClose={(saved) => {
          setFormModal({ open: false, asset: null });
          if (saved) invalidate();
        }}
      />
    </SafeAreaView>
  );
}
