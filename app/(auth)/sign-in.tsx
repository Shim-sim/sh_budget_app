import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
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
});

type FormData = z.infer<typeof schema>;

export default function SignInScreen() {
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
      const res = await memberApi.getByEmail(data.email);
      await login(res.data.data.id);
      router.replace('/(tabs)/');
    } catch (err: any) {
      if (err.status === 404) {
        setErrorMsg('가입된 이메일이 아니에요. 회원가입을 먼저 해주세요.');
      } else {
        setErrorMsg(err.message ?? '오류가 발생했어요. 다시 시도해주세요.');
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
            <Text className="text-3xl font-bold text-text-primary">다시 돌아오셨군요!</Text>
            <Text className="text-base text-text-secondary mt-2">
              가입하신 이메일을 입력해주세요
            </Text>
          </View>

          {/* 이메일 입력 */}
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
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                value={value}
                onChangeText={(text) => {
                  setErrorMsg('');
                  onChange(text);
                }}
                error={errors.email?.message}
              />
            )}
          />

          {errorMsg ? (
            <Text className="text-expense text-sm mt-3 ml-1">{errorMsg}</Text>
          ) : null}

          <View className="flex-1" />

          <Button
            title="로그인"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
