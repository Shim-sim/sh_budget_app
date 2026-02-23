import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import colors from '../../constants/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
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
  };

  return (
    <View className="flex-1 bg-bg">
      {/* 헤더 */}
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-bold text-text-primary">설정</Text>
      </View>

      {/* 메뉴 리스트 */}
      <View className="mx-6 bg-card rounded-2xl overflow-hidden border border-border">
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
    </View>
  );
}
