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
  nickname: z
    .string()
    .min(2, '닉네임은 2자 이상이어야 해요')
    .max(20, '닉네임은 20자 이하여야 해요'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
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
      const res = await memberApi.create({ email: data.email, nickname: data.nickname });
      await login(res.data.data.id);
    } catch (err: any) {
      setErrorMsg(err.message ?? '회원가입에 실패했어요. 다시 시도해주세요.');
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
        {/* 헤더 */}
        <View className="mb-10">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Text className="text-primary text-base">← 돌아가기</Text>
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-text-primary">회원가입</Text>
          <Text className="text-base text-text-secondary mt-2">함께 시작해볼까요?</Text>
        </View>

        {/* 이메일 */}
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

        {/* 닉네임 */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-text-secondary mb-2">닉네임</Text>
          <Controller
            control={control}
            name="nickname"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-card rounded-2xl px-4 py-4 text-text-primary text-base border border-border"
                placeholder="닉네임을 입력해주세요 (2~20자)"
                placeholderTextColor={colors.textMuted}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.nickname && (
            <Text className="text-expense text-xs mt-1 ml-1">{errors.nickname.message}</Text>
          )}
        </View>

        {/* 에러 메시지 */}
        {errorMsg ? (
          <Text className="text-expense text-sm mb-4 ml-1">{errorMsg}</Text>
        ) : null}

        {/* 가입 버튼 */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="bg-primary rounded-2xl py-4 items-center"
        >
          {isLoading
            ? <ActivityIndicator color={colors.white} />
            : <Text className="text-white font-semibold text-base">시작하기</Text>
          }
        </TouchableOpacity>

        {/* 로그인 이동 */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-text-secondary text-sm">이미 계정이 있으신가요?  </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-primary text-sm font-semibold">로그인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
