import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { memberApi } from '../../src/api/member';
import { useAuthStore } from '../../src/stores/authStore';
import colors from '../../constants/colors';

const schema = z.object({
  email: z.string().email('올바른 이메일 형식이 아니에요'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 현재 백엔드: 이메일로 회원 조회 (추후 JWT 로그인으로 교체 예정)
      // 임시: 회원가입 API로 memberId 획득 후 로그인 처리
      const res = await memberApi.getByEmail(data.email);
      await login(res.data.data.id);
    } catch (err: any) {
      setErrorMsg(err.message ?? '로그인에 실패했어요. 이메일을 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
    >
      <View className="flex-1 px-6 justify-center">
        {/* 로고 */}
        <View className="mb-12">
          <Text className="text-3xl font-bold text-primary">sh_budget</Text>
          <Text className="text-base text-text-secondary mt-2">함께 관리하는 우리의 가계부</Text>
        </View>

        {/* 이메일 입력 */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-text-secondary mb-2">이메일</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-card rounded-2xl px-4 py-4 text-text-primary text-base border border-border"
                placeholder="이메일을 입력해주세요"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.email && (
            <Text className="text-expense text-xs mt-1 ml-1">{errors.email.message}</Text>
          )}
        </View>

        {/* 에러 메시지 */}
        {errorMsg ? (
          <Text className="text-expense text-sm mb-4 ml-1">{errorMsg}</Text>
        ) : null}

        {/* 로그인 버튼 */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="bg-primary rounded-2xl py-4 items-center mt-2"
        >
          {isLoading
            ? <ActivityIndicator color={colors.white} />
            : <Text className="text-white font-semibold text-base">로그인</Text>
          }
        </TouchableOpacity>

        {/* 회원가입 이동 */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-text-secondary text-sm">아직 계정이 없으신가요?  </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="text-primary text-sm font-semibold">회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
