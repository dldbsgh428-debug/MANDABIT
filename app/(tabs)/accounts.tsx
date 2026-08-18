/** 자산 탭: 계좌별 자산·부채 목록과 순자산 요약. */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState } from '../../src/components/ui';
import { currentBalances, netWorth, type Projection } from '../../src/lib/analytics';
import { shortWon, won } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { accountKindMeta, colors, font, radius, spacing } from '../../src/theme';
import type { Account } from '../../src/types';

export default function AccountsScreen() {
  const router = useRouter();
  const { data } = useStore();

  const { assets, liabilities, summary, balances } = useMemo(() => {
    const projected = currentBalances(
      data.accounts,
      data.snapshots,
      data.settings.projectBalances,
    );
    // 예상 잔액 기준으로 정렬해야 목록 순서와 표시 금액이 어긋나지 않는다.
    const sorted = [...data.accounts].sort(
      (a, b) => (projected.get(b.id)?.total ?? b.balance) - (projected.get(a.id)?.total ?? a.balance),
    );
    return {
      assets: sorted.filter((a) => a.side === 'asset'),
      liabilities: sorted.filter((a) => a.side === 'liability'),
      summary: netWorth(data.accounts, projected),
      balances: projected,
    };
  }, [data.accounts, data.snapshots, data.settings.projectBalances]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 순자산 요약 */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>순자산</Text>
          <Text style={styles.summaryValue}>{won(summary.net)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>자산</Text>
              <Text style={[styles.summaryItemValue, { color: colors.up }]}>
                {shortWon(summary.assets)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>부채</Text>
              <Text style={[styles.summaryItemValue, { color: colors.down }]}>
                {summary.liabilities > 0 ? `-${shortWon(summary.liabilities)}` : '0원'}
              </Text>
            </View>
          </View>
        </Card>

        {data.accounts.length === 0 ? (
          <EmptyState
            emoji="🏦"
            title="등록된 계좌가 없어요"
            description={
              '통장, 주식 계좌, 적금, 대출을 등록하면\n순자산과 1억까지 남은 금액이 자동으로 계산됩니다.'
            }
            actionTitle="첫 계좌 추가하기"
            onAction={() => router.push('/account/edit')}
          />
        ) : (
          <>
            <AccountGroup
              title="자산"
              accounts={assets}
              total={summary.assets}
              balances={balances}
              onPress={(id) => router.push(`/account/${id}`)}
            />
            {liabilities.length > 0 ? (
              <AccountGroup
                title="부채"
                accounts={liabilities}
                total={summary.liabilities}
                balances={balances}
                negative
                onPress={(id) => router.push(`/account/${id}`)}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {/* 새 계좌 추가 버튼 */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
        onPress={() => router.push('/account/edit')}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function AccountGroup({
  title,
  accounts,
  total,
  balances,
  negative,
  onPress,
}: {
  title: string;
  accounts: Account[];
  total: number;
  balances: Map<string, Projection>;
  negative?: boolean;
  onPress: (id: string) => void;
}) {
  if (accounts.length === 0) return null;

  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={[styles.groupTotal, negative && { color: colors.down }]}>
          {negative && total > 0 ? '-' : ''}
          {won(total)}
        </Text>
      </View>

      <Card style={{ padding: 0 }}>
        {accounts.map((account, i) => {
          const meta = accountKindMeta[account.kind] ?? { label: '기타', emoji: '📦' };
          const projection = balances.get(account.id);
          const amount = projection?.total ?? account.balance;
          return (
            <Pressable
              key={account.id}
              onPress={() => onPress(account.id)}
              style={({ pressed }) => [
                styles.accountRow,
                i > 0 && styles.accountRowBorder,
                pressed && { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Text style={styles.accountEmoji}>{meta.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.accountNameRow}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {account.name}
                  </Text>
                  {!account.includeInNetWorth ? (
                    <View style={styles.excludedBadge}>
                      <Text style={styles.excludedText}>제외</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.accountKind}>
                  {meta.label}
                  {account.interestRate ? ` · ${account.interestRate}%` : ''}
                  {projection?.hasProjection ? ' · 예상' : ''}
                </Text>
              </View>
              <View style={styles.accountRight}>
                <Text style={[styles.accountBalance, negative && { color: colors.down }]}>
                  {negative && amount > 0 ? '-' : ''}
                  {won(amount)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </View>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 100 },

  summaryCard: { alignItems: 'center', gap: 4 },
  summaryLabel: { color: colors.textFaint, fontSize: font.tiny },
  summaryValue: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', marginTop: spacing.md, alignSelf: 'stretch' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryItemLabel: { color: colors.textFaint, fontSize: font.tiny },
  summaryItemValue: { fontSize: font.body, fontWeight: '700' },

  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  groupTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  groupTotal: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  accountRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  accountEmoji: { fontSize: 22 },
  accountNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountName: { color: colors.text, fontSize: font.body, fontWeight: '600', flexShrink: 1 },
  accountKind: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  accountRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accountBalance: { color: colors.text, fontSize: font.body, fontWeight: '700' },

  excludedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  excludedText: { color: colors.textFaint, fontSize: font.tiny },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
