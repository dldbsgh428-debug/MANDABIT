/** 가계부 탭: 월별 수입·지출 내역과 카테고리별 분석. */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DonutChart } from '../../src/components/charts';
import { Card, EmptyState, Loading, Segmented } from '../../src/components/ui';
import { categoryBreakdown, monthlyCashflow } from '../../src/lib/analytics';
import {
  addMonths,
  currentMonth,
  formatDate,
  formatDateFull,
  formatMonth,
  monthOf,
} from '../../src/lib/date';
import { percent, shortWon, won } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../../src/theme';
import type { Transaction, TxType } from '../../src/types';

export default function LedgerScreen() {
  const router = useRouter();
  const { data, ready, removeTransaction } = useStore();
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState<TxType>('expense');

  const view = useMemo(() => {
    const cashflow = monthlyCashflow(data.transactions, month);
    const breakdown = categoryBreakdown(data.transactions, data.categories, month, tab);
    const txs = data.transactions
      .filter((t) => monthOf(t.date) === month)
      // 같은 날짜면 나중에 입력한 것이 위로 오도록 createdAt까지 본다.
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));

    // 날짜별로 묶어서 소제목을 달아 보여준다.
    const groups: { date: string; items: Transaction[] }[] = [];
    for (const t of txs) {
      const last = groups[groups.length - 1];
      if (last && last.date === t.date) last.items.push(t);
      else groups.push({ date: t.date, items: [t] });
    }

    // 도넛에 조각이 너무 많으면 읽을 수 없다. 상위 7개만 두고 나머지는 '기타'로 합친다.
    // 합치지 않고 잘라내면 조각 비율의 합과 가운데 총액이 어긋난다.
    const TOP = 7;
    const donutSlices = breakdown.slice(0, TOP).map((b) => ({
      label: `${b.emoji} ${b.name}`,
      amount: b.amount,
    }));
    const rest = breakdown.slice(TOP);
    if (rest.length > 0) {
      donutSlices.push({
        label: `그 외 ${rest.length}개`,
        amount: rest.reduce((sum, b) => sum + b.amount, 0),
      });
    }

    return { cashflow, breakdown, donutSlices, groups, count: txs.length };
  }, [data, month, tab]);

  if (!ready) return <Loading />;

  const isCurrentMonth = month === currentMonth();
  const { cashflow, breakdown, groups } = view;

  const confirmDelete = (tx: Transaction) => {
    Alert.alert('거래를 삭제할까요?', `${formatDateFull(tx.date)} · ${won(tx.amount)}`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeTransaction(tx.id) },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 월 이동 */}
        <View style={styles.monthNav}>
          <Pressable hitSlop={10} onPress={() => setMonth(addMonths(month, -1))}>
            <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.monthText}>{formatMonth(month)}</Text>
          <Pressable
            hitSlop={10}
            onPress={() => setMonth(addMonths(month, 1))}
            disabled={isCurrentMonth}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isCurrentMonth ? colors.surfaceAlt : colors.textMuted}
            />
          </Pressable>
        </View>

        {/* 월 요약 */}
        <Card>
          <View style={styles.summaryTop}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>수입</Text>
              <Text style={[styles.summaryValue, { color: colors.up }]}>
                {shortWon(cashflow.income)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>지출</Text>
              <Text style={[styles.summaryValue, { color: colors.down }]}>
                {shortWon(cashflow.expense)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>저축</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: cashflow.saving >= 0 ? colors.text : colors.down },
                ]}
              >
                {shortWon(cashflow.saving)}
              </Text>
            </View>
          </View>
          {cashflow.income > 0 ? (
            <Text style={styles.savingRate}>
              저축률 {percent(cashflow.savingRate)} · 수입 100만원당{' '}
              {/* 어림잡는 문장이라 만원 단위로 끊는다. 100만원의 X%는 곧 X만원이다. */}
              {Math.round(cashflow.savingRate * 100).toLocaleString('ko-KR')}만원 저축
            </Text>
          ) : null}
        </Card>

        {view.count === 0 ? (
          <EmptyState
            emoji="🧾"
            title={`${formatMonth(month)} 기록이 없어요`}
            description={'수입과 지출을 기록하면 저축률과\n카테고리별 지출 비중을 볼 수 있어요.'}
            actionTitle="거래 입력하기"
            onAction={() => router.push('/transaction/edit')}
          />
        ) : (
          <>
            {/* 카테고리별 분석 */}
            <Segmented
              style={{ marginTop: spacing.xl }}
              value={tab}
              onChange={setTab}
              options={[
                { value: 'expense', label: '지출 분석', color: colors.down },
                { value: 'income', label: '수입 분석', color: colors.up },
              ]}
            />

            {breakdown.length > 0 ? (
              <Card style={{ marginTop: spacing.md }}>
                <DonutChart
                  slices={view.donutSlices}
                  centerLabel={tab === 'expense' ? '총지출' : '총수입'}
                  centerValue={shortWon(tab === 'expense' ? cashflow.expense : cashflow.income)}
                />

                <View style={styles.breakdownList}>
                  {breakdown.map((b) => (
                    <View key={b.categoryId} style={styles.breakdownRow}>
                      <Text style={styles.breakdownName} numberOfLines={1}>
                        {b.emoji} {b.name}
                      </Text>
                      <Text style={styles.breakdownAmount}>{won(b.amount)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : (
              <Card style={{ marginTop: spacing.md }}>
                <Text style={styles.placeholder}>
                  {tab === 'expense' ? '지출' : '수입'} 기록이 없습니다.
                </Text>
              </Card>
            )}

            {/* 거래 목록 */}
            <Text style={styles.listTitle}>전체 내역 {view.count}건</Text>
            {groups.map((group) => (
              <View key={group.date} style={{ marginBottom: spacing.md }}>
                <Text style={styles.dateLabel}>{formatDate(group.date)}</Text>
                <Card style={{ padding: 0 }}>
                  {group.items.map((tx, i) => {
                    const cat = data.categories.find((c) => c.id === tx.categoryId);
                    const account = data.accounts.find((a) => a.id === tx.accountId);
                    const income = tx.type === 'income';
                    return (
                      <Pressable
                        key={tx.id}
                        onPress={() => router.push(`/transaction/edit?id=${tx.id}`)}
                        onLongPress={() => confirmDelete(tx)}
                        style={({ pressed }) => [
                          styles.txRow,
                          i > 0 && styles.txRowBorder,
                          pressed && { backgroundColor: colors.surfaceAlt },
                        ]}
                      >
                        <Text style={styles.txEmoji}>{cat?.emoji ?? '❓'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txCategory}>{cat?.name ?? '미분류'}</Text>
                          <Text style={styles.txMemo} numberOfLines={1}>
                            {[tx.memo, account?.name].filter(Boolean).join(' · ') || '메모 없음'}
                          </Text>
                        </View>
                        <Text style={[styles.txAmount, { color: income ? colors.up : colors.text }]}>
                          {income ? '+' : '-'}
                          {won(tx.amount)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            ))}
            <Text style={styles.hint}>내역을 길게 누르면 삭제할 수 있어요.</Text>
          </>
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
        onPress={() => router.push('/transaction/edit')}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 100 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  monthText: { color: colors.text, fontSize: font.h3, fontWeight: '700', minWidth: 120, textAlign: 'center' },

  summaryTop: { flexDirection: 'row' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { color: colors.textFaint, fontSize: font.tiny },
  summaryValue: { fontSize: font.h3, fontWeight: '700' },
  savingRate: {
    color: colors.textMuted,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  breakdownList: { marginTop: spacing.lg, gap: spacing.sm },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownName: { color: colors.textMuted, fontSize: font.small, flex: 1 },
  breakdownAmount: { color: colors.text, fontSize: font.small, fontWeight: '600' },

  listTitle: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  dateLabel: { color: colors.textFaint, fontSize: font.tiny, marginBottom: 6, marginLeft: 2 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  txRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  txEmoji: { fontSize: 20 },
  txCategory: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  txMemo: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  txAmount: { fontSize: font.body, fontWeight: '700' },

  placeholder: { color: colors.textMuted, fontSize: font.small },
  hint: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.sm },

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
