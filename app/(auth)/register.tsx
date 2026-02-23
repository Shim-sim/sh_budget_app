import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { memberApi } from '../../src/api/member';
import { useAuthStore } from '../../src/stores/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
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
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: emailParam ?? '',
      nickname: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await memberApi.create({ email: data.email, nickname: data.nickname });
      await login(res.data.data.id);
      router.replace('/(tabs)/');
    } catch (err: any) {
      if (err.status === 409) {
        setErrorMsg('이미 사용 중인 이메일이에요. 로그인 화면으로 돌아가주세요.');
      } else {
        setErrorMsg(err.message ?? '회원가입에 실패했어요. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 pt-16 pb-8">
          {/* 뒤로가기 */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-8"
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
            <Text className="text-primary text-base ml-1">돌아가기</Text>
          </TouchableOpacity>

          {/* 헤더 */}
          <View className="mb-10">
            <Text className="text-3xl font-bold text-text-primary">계정 만들기</Text>
            <Text className="text-base text-text-secondary mt-2">
              닉네임을 설정하면 바로 시작할 수 있어요
            </Text>
          </View>

          {/* 폼 */}
          <View className="gap-4">
            {/* 이메일 (미리 채워짐, 수정 가능) */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="이메일"
                  placeholder="example@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={value}
                  onChangeText={(text) => {
                    setErrorMsg('');
                    onChange(text);
                  }}
                  error={errors.email?.message}
                />
              )}
            />

            {/* 닉네임 */}
            <Controller
              control={control}
              name="nickname"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="닉네임"
                  placeholder="닉네임을 입력해주세요 (2~20자)"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  value={value}
                  onChangeText={(text) => {
                    setErrorMsg('');
                    onChange(text);
                  }}
                  error={errors.nickname?.message}
                />
              )}
            />
          </View>

          {/* 에러 메시지 */}
          {errorMsg ? (
            <Text className="text-expense text-sm mt-3 ml-1">{errorMsg}</Text>
          ) : null}

          {/* 여백 */}
          <View className="flex-1" />

          {/* 가입 버튼 */}
          <View>
            <Button
              title="시작하기"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
            />
            <View className="flex-row justify-center mt-5">
              <Text className="text-text-secondary text-sm">이미 계정이 있으신가요?  </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-primary text-sm font-semibold">로그인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
