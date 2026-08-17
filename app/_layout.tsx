import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '../src/store/StoreProvider';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
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
          <Stack.Screen
            name="account/edit"
            options={{ presentation: 'modal', title: '계좌' }}
          />
          <Stack.Screen
            name="account/[id]"
            options={{ title: '계좌 상세' }}
          />
          <Stack.Screen
            name="transaction/edit"
            options={{ presentation: 'modal', title: '거래 입력' }}
          />
          <Stack.Screen
            name="category/manage"
            options={{ title: '카테고리 관리' }}
          />
          <Stack.Screen name="goal" options={{ presentation: 'modal', title: '목표 설정' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
