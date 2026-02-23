import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../../components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-bg px-6">
      {/* 로고 영역 */}
      <View className="flex-1 items-center justify-center">
        <View className="w-20 h-20 bg-primary rounded-3xl items-center justify-center mb-6">
          <Text className="text-white text-4xl font-bold">S</Text>
        </View>
        <Text className="text-3xl font-bold text-text-primary">sh_budget</Text>
        <Text className="text-base text-text-secondary mt-3 text-center leading-6">
          함께 관리하는{'\n'}우리의 가계부
        </Text>
      </View>

      {/* 버튼 영역 */}
      <View className="pb-12 gap-3">
        <Button
          title="회원가입"
          onPress={() => router.push('/(auth)/register')}
        />
        <Button
          title="이미 계정이 있어요"
          variant="outline"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </View>
    </View>
  );
}
