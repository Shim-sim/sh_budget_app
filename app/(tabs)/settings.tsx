import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { bookApi } from '../../src/api/book';
import { categoryApi } from '../../src/api/category';
import { pushApi } from '../../src/api/push';
import { subscribeToPush, unsubscribeFromPush, isSubscribed } from '../../src/utils/pushNotification';
import type { Category } from '../../src/types';
import colors from '../../constants/colors';

// ─── 초대 코드 입력 모달 ──────────────────────────────────────────────────────

function JoinBookModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: (joined: boolean) => void;
}) {
  const [code, setCode] = useState('');
  const queryClient = useQueryClient();

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const joinMutation = useMutation({
    mutationFn: (inviteCode: string) => bookApi.join({ inviteCode }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      onClose(true);
      showAlert('참여 완료', '가계부에 참여했어요!');
    },
    onError: (err: any) => {
      const msg = err?.message ?? '다시 시도해주세요.';
      showAlert('참여 실패', msg);
    },
  });

  const onShow = () => setCode('');

  const handleJoin = () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      Alert.alert('초대 코드는 6자리입니다.');
      return;
    }
    joinMutation.mutate(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={onShow}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => onClose(false)}
        />
        <View className="bg-card rounded-t-3xl px-6 pt-5 pb-10">
          <View className="w-10 h-1 bg-border rounded-full self-center mb-5" />
          <Text className="text-lg font-bold text-text-primary mb-5">
            초대 코드로 참여
          </Text>

          <Text className="text-sm text-text-secondary mb-2">초대 코드</Text>
          <TextInput
            className="bg-bg rounded-2xl px-4 py-3.5 text-text-primary text-base border border-border mb-6 text-center tracking-widest"
            placeholder="6자리 코드 입력"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
            autoCapitalize="characters"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />

          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center"
            style={{ opacity: joinMutation.isPending ? 0.6 : 1 }}
            onPress={handleJoin}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-white font-bold text-base">참여하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── 카테고리 관리 섹션 ──────────────────────────────────────────────────────

function CategoryManageSection({ bookId }: { bookId: number }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', bookId],
    queryFn: () => categoryApi.getAll(bookId).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => categoryApi.create({ bookId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', bookId] });
      setNewName('');
      setAddMode(false);
    },
    onError: (err: any) => showAlert('추가 실패', err.message ?? '다시 시도해주세요.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      categoryApi.update(id, bookId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', bookId] });
      setEditingId(null);
    },
    onError: (err: any) => showAlert('수정 실패', err.message ?? '다시 시도해주세요.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryApi.delete(id, bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', bookId] });
    },
    onError: (err: any) => {
      const msg = err.message ?? '다시 시도해주세요.';
      if (err.status === 400) {
        showAlert('삭제 불가', '사용 중인 카테고리는 삭제할 수 없어요.');
      } else {
        showAlert('삭제 실패', msg);
      }
    },
  });

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  const handleUpdate = () => {
    if (editingId === null) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    updateMutation.mutate({ id: editingId, name: trimmed });
  };

  const handleDelete = (cat: Category) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`"${cat.name}" 카테고리를 삭제하시겠어요?`)) {
        deleteMutation.mutate(cat.id);
      }
    } else {
      Alert.alert('카테고리 삭제', `"${cat.name}" 카테고리를 삭제하시겠어요?`, [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => deleteMutation.mutate(cat.id) },
      ]);
    }
  };

  return (
    <View className="bg-card rounded-2xl overflow-hidden border border-border mb-4">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xs font-semibold text-text-muted tracking-wide">
          카테고리 관리
        </Text>
      </View>

      {isLoading ? (
        <View className="py-6 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          {categories.length === 0 && !addMode && (
            <View className="py-4 items-center">
              <Text className="text-text-muted text-sm">등록된 카테고리가 없어요</Text>
            </View>
          )}

          {categories.map((cat, idx) => (
            <View key={cat.id}>
              {editingId === cat.id ? (
                <View className="flex-row items-center px-4 py-2.5 gap-2">
                  <TextInput
                    className="flex-1 bg-bg rounded-xl px-3 py-2 text-sm text-text-primary border border-border"
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleUpdate}
                  />
                  <TouchableOpacity onPress={handleUpdate} hitSlop={8}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center px-4 py-2.5">
                  <View className="w-7 h-7 rounded-lg bg-primary-muted items-center justify-center mr-3">
                    <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                  </View>
                  <Text className="text-text-primary text-sm font-medium flex-1">
                    {cat.name}
                  </Text>
                  <TouchableOpacity
                    className="mr-2"
                    onPress={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                    hitSlop={8}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(cat)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.expense} />
                  </TouchableOpacity>
                </View>
              )}
              {idx < categories.length - 1 && <View className="h-px bg-border mx-4" />}
            </View>
          ))}

          {addMode ? (
            <View className="flex-row items-center px-4 py-2.5 gap-2">
              <TextInput
                className="flex-1 bg-bg rounded-xl px-3 py-2 text-sm text-text-primary border border-border"
                placeholder="카테고리 이름"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <TouchableOpacity onPress={handleAdd} hitSlop={8}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddMode(false); setNewName(''); }} hitSlop={8}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="flex-row items-center justify-center px-4 py-3 gap-1"
              onPress={() => setAddMode(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text className="text-primary text-sm font-medium">카테고리 추가</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

// ─── 알림 설정 섹션 ──────────────────────────────────────────────────────────

function NotificationToggleSection() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isSubscribed().then((val) => {
      setEnabled(val);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (value: boolean) => {
    setLoading(true);
    try {
      if (value) {
        const vapidRes = await pushApi.getVapidKey();
        const success = await subscribeToPush(vapidRes.data.data);
        setEnabled(success);
        if (!success) {
          window.alert('알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.');
        }
      } else {
        await unsubscribeFromPush();
        setEnabled(false);
      }
    } catch (e) {
      console.warn('Notification toggle failed:', e);
      window.alert('알림 설정 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="bg-card rounded-2xl overflow-hidden border border-border mb-4">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xs font-semibold text-text-muted tracking-wide">
          알림 설정
        </Text>
      </View>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-7 h-7 rounded-lg bg-primary-muted items-center justify-center">
            <Ionicons name="notifications-outline" size={14} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary text-sm font-medium">푸시 알림</Text>
            <Text className="text-text-muted text-xs mt-0.5">
              거래/자산 등록 시 알림을 받습니다
            </Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={enabled ? colors.primary : colors.textMuted}
          />
        )}
      </View>
    </View>
  );
}

// ─── 설정 화면 ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, selectedBookId, selectBook } = useAuthStore();
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const { data: myBooks, isLoading: booksLoading } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => bookApi.getMyBooks().then((r) => r.data.data),
  });

  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ['book', selectedBookId],
    queryFn: () => bookApi.getMyBook().then((r) => r.data.data),
  });

  const { data: membersRaw } = useQuery({
    queryKey: ['bookMembers', book?.id],
    queryFn: () => bookApi.getMembers(book!.id).then((r) => r.data.data),
    enabled: !!book?.id,
  });
  const members = membersRaw ?? [];

  const handleSwitchBook = async (bookId: number) => {
    if (bookId === book?.id) return;
    await selectBook(bookId);
    await queryClient.invalidateQueries();
  };

  const handleCopyCode = async () => {
    if (!book?.inviteCode) return;
    await Clipboard.setStringAsync(book.inviteCode);
    if (Platform.OS === 'web') {
      window.alert('초대 코드가 클립보드에 복사되었어요.');
    } else {
      Alert.alert('복사 완료', '초대 코드가 클립보드에 복사되었어요.');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('정말 로그아웃 하시겠어요?')) {
        await logout();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]);
    }
  };

  const isLoading = booksLoading || bookLoading;

  return (
    <View className="flex-1 bg-bg">
      {/* 헤더 */}
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-bold text-text-primary">설정</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 가계부 정보 섹션 */}
        <View className="bg-card rounded-2xl overflow-hidden border border-border mb-4">
          <View className="px-4 pt-4 pb-2">
            <Text className="text-xs font-semibold text-text-muted tracking-wide">
              내 가계부
            </Text>
          </View>

          {isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : book ? (
            <>
              {/* 가계부 선택 리스트 */}
              {myBooks && myBooks.length > 1 && (
                <>
                  <View className="mx-4 rounded-xl bg-bg overflow-hidden">
                    {myBooks.map((b, idx) => {
                      const isSelected = b.id === book.id;
                      return (
                        <View key={b.id}>
                          <TouchableOpacity
                            className="flex-row items-center px-3 py-3"
                            onPress={() => handleSwitchBook(b.id)}
                            activeOpacity={0.6}
                          >
                            <Ionicons
                              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                              size={20}
                              color={isSelected ? colors.primary : colors.textMuted}
                            />
                            <Text
                              className={`ml-2.5 text-sm font-medium flex-1 ${
                                isSelected ? 'text-primary' : 'text-text-primary'
                              }`}
                            >
                              {b.name}
                            </Text>
                            <View
                              className={`rounded-lg px-2 py-0.5 ${
                                b.role === 'OWNER' ? 'bg-primary-muted' : 'bg-card'
                              }`}
                            >
                              <Text
                                className={`text-xs font-semibold ${
                                  b.role === 'OWNER' ? 'text-primary' : 'text-text-muted'
                                }`}
                              >
                                {b.role === 'OWNER' ? '방장' : '멤버'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          {idx < myBooks.length - 1 && (
                            <View className="h-px bg-border mx-3" />
                          )}
                        </View>
                      );
                    })}
                  </View>
                  <View className="h-px bg-border mx-4 mt-3" />
                </>
              )}

              {/* 가계부 이름 */}
              <View className="flex-row items-center px-4 py-3">
                <View className="w-9 h-9 rounded-xl bg-primary-muted items-center justify-center mr-3">
                  <Ionicons name="book-outline" size={18} color={colors.primary} />
                </View>
                <Text className="text-text-primary text-base font-semibold flex-1">
                  {book.name}
                </Text>
              </View>

              <View className="h-px bg-border mx-4" />

              {/* 초대 코드 */}
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-1">
                  <Text className="text-xs text-text-muted mb-1">초대 코드</Text>
                  <Text className="text-lg font-bold text-primary tracking-widest">
                    {book.inviteCode}
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-primary-muted rounded-xl px-3 py-2 flex-row items-center gap-1"
                  onPress={handleCopyCode}
                >
                  <Ionicons name="copy-outline" size={14} color={colors.primary} />
                  <Text className="text-primary text-sm font-medium">복사</Text>
                </TouchableOpacity>
              </View>

              <View className="h-px bg-border mx-4" />

              {/* 멤버 목록 */}
              <View className="px-4 pt-3 pb-1">
                <Text className="text-xs text-text-muted mb-2">
                  멤버 ({members.length}명)
                </Text>
              </View>
              {members.map((member, idx) => (
                <View key={member.memberId}>
                  <View className="flex-row items-center px-4 py-2.5">
                    <View className="w-8 h-8 rounded-full bg-primary-muted items-center justify-center mr-3">
                      <Text className="text-primary text-sm font-bold">
                        {(member.nickname ?? '?').charAt(0)}
                      </Text>
                    </View>
                    <Text className="text-text-primary text-sm font-medium flex-1">
                      {member.nickname ?? '알 수 없음'}
                    </Text>
                    <View
                      className={`rounded-lg px-2 py-0.5 ${
                        member.role === 'OWNER' ? 'bg-primary-muted' : 'bg-bg'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          member.role === 'OWNER' ? 'text-primary' : 'text-text-muted'
                        }`}
                      >
                        {member.role === 'OWNER' ? '방장' : '멤버'}
                      </Text>
                    </View>
                  </View>
                  {idx < members.length - 1 && <View className="h-px bg-border mx-4" />}
                </View>
              ))}
              <View className="h-2" />
            </>
          ) : (
            <View className="py-6 items-center">
              <Text className="text-text-muted text-sm">가계부 정보를 불러올 수 없어요</Text>
            </View>
          )}
        </View>

        {/* 카테고리 관리 섹션 */}
        {book && <CategoryManageSection bookId={book.id} />}

        {/* 알림 설정 섹션 (웹 전용) */}
        {Platform.OS === 'web' && <NotificationToggleSection />}

        {/* 가계부 참여 섹션 */}
        <View className="bg-card rounded-2xl overflow-hidden border border-border mb-4">
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-4"
            onPress={() => setJoinModalVisible(true)}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="enter-outline" size={20} color={colors.primary} />
              <Text className="text-text-primary text-base font-medium">
                초대 코드로 참여
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 로그아웃 */}
        <View className="bg-card rounded-2xl overflow-hidden border border-border">
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-between px-4 py-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="log-out-outline" size={20} color={colors.expense} />
              <Text className="text-expense text-base font-medium">로그아웃</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 초대 코드 입력 모달 */}
      <JoinBookModal
        visible={joinModalVisible}
        onClose={(joined) => {
          setJoinModalVisible(false);
        }}
      />
    </View>
  );
}
