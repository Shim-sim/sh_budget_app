import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: 인증 상태 확인 후 분기
  // 로그인 안 됨 → (auth)/login
  // 로그인 됨  → (tabs)/
  return <Redirect href="/(auth)/login" />;
}
