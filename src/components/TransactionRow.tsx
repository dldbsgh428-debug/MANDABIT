/**
 * 가계부 내역 한 줄.
 *
 * 가계부 탭과 검색 화면이 같은 목록을 보여주므로 한 곳에 둔다. 두 화면에서
 * 줄 모양이 조금씩 달라지면 같은 거래가 다른 것처럼 보인다.
 *
 * 카테고리·계좌 이름은 이 안에서 직접 찾는다. 부르는 쪽이 매번 lookup을
 * 넘기게 하면 화면마다 같은 코드가 생긴다.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { won } from '../lib/money';
import { useStore } from '../store/StoreProvider';
import { colors, font, radius, spacing } from '../theme';
import type { Transaction } from '../types';
import { Text } from './Typo';

export function TransactionRow({
  tx,
  onPress,
  onLongPress,
  divider,
}: {
  tx: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
  /** 위쪽에 구분선을 그린다. 묶음의 첫 줄이 아닐 때 켠다. */
  divider?: boolean;
}) {
  const { data } = useStore();
  const cat = data.categories.find((c) => c.id === tx.categoryId);
  const account = data.accounts.find((a) => a.id === tx.accountId);
  const income = tx.type === 'income';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        divider && styles.rowBorder,
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <Text style={styles.emoji}>{cat?.emoji ?? '❓'}</Text>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.category}>{cat?.name ?? '미분류'}</Text>
          {tx.auto ? (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>자동</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.memo} numberOfLines={1}>
          {[tx.memo, account?.name].filter(Boolean).join(' · ') || '메모 없음'}
        </Text>
      </View>
      <Text style={[styles.amount, { color: income ? colors.up : colors.text }]}>
        {income ? '+' : '-'}
        {won(tx.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  emoji: { fontSize: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  autoBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  autoBadgeText: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  category: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  memo: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  amount: { fontSize: font.body, fontWeight: '700' },
});
