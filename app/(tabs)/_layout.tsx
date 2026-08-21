import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, type ColorValue } from 'react-native';

import { colors, fonts, spacing } from '../../src/theme';

/** 탭 아이콘. 활성/비활성 색은 Tabs가 넘겨준다. */
function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semibold },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '대시보드', headerShown: false, tabBarIcon: icon('speedometer-outline') }}
      />
      <Tabs.Screen
        name="accounts"
        options={{ title: '자산', tabBarIcon: icon('wallet-outline') }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: '가계부',
          tabBarIcon: icon('receipt-outline'),
          // 검색은 가계부에서만 쓸모가 있어서 이 탭의 헤더에만 둔다.
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() => router.push('/search')}
              style={({ pressed }) => [{ marginRight: spacing.lg }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="search" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '설정', tabBarIcon: icon('settings-outline') }}
      />
    </Tabs>
  );
}
