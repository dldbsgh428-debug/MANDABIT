import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '../src/components/ui';
import { StoreProvider, useStore } from '../src/store/StoreProvider';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <AppShell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { ready } = useStore();

  // 저장된 데이터를 다 읽기 전에는 어떤 화면도 띄우지 않는다.
  //
  // 입력 화면(목표 설정, 계좌 편집, 거래 입력)은 store 값을 useState 초기값으로
  // 한 번만 캡처한다. hydrate 전에 마운트되면 그 화면은 기본값(목표 1억,
  // 월 저축 0원, 시작일 오늘)을 붙잡은 채로 남고, 저장을 누르는 순간 실제
  // 설정을 그 기본값으로 덮어쓴다. 여기서 한 번 막으면 화면마다 신경 쓸 일이 없다.
  if (!ready) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* 입력 화면들은 아래에서 올라오는 모달로 띄운다. */}
      <Stack.Screen name="account/edit" options={{ presentation: 'modal', title: '계좌' }} />
      <Stack.Screen name="account/[id]" options={{ title: '계좌 상세' }} />
      <Stack.Screen
        name="transaction/edit"
        options={{ presentation: 'modal', title: '거래 입력' }}
      />
      <Stack.Screen name="category/manage" options={{ title: '카테고리 관리' }} />
      <Stack.Screen name="recurring/manage" options={{ title: '고정지출' }} />
      <Stack.Screen name="goal" options={{ presentation: 'modal', title: '목표 설정' }} />
    </Stack>
  );
}
