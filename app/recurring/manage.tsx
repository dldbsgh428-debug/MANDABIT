/** 고정지출 관리: 매달 나가는 돈을 등록해두고 한 번에 가계부에 반영한다. */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '../../src/components/FormScreen';
import {
  AmountInput,
  Button,
  Card,
  Divider,
  EmptyState,
  Field,
  Input,
} from '../../src/components/ui';
import { recurringStatus, recurringTotal } from '../../src/lib/analytics';
import { currentMonth, formatMonth } from '../../src/lib/date';
import { parseAmount, won } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../../src/theme';
import type { RecurringExpense } from '../../src/types';

export default function RecurringManageScreen() {
  const { data, addRecurring, updateRecurring, removeRecurring, addTransactions } = useStore();
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [creating, setCreating] = useState(false);

  const month = currentMonth();

  const view = useMemo(() => {
    const rows = recurringStatus(data.recurring, data.transactions, month);
    return {
      rows,
      total: recurringTotal(data.recurring),
      pending: rows.filter((r) => !r.recorded),
    };
  }, [data.recurring, data.transactions, month]);

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  /** 아직 기록 안 된 고정지출을 한 번에 가계부에 넣는다. */
  const recordPending = () => {
    const { pending } = view;
    if (pending.length === 0) return;

    Alert.alert(
      `${pending.length}건을 가계부에 기록할까요?`,
      pending.map((r) => `${r.expense.name} ${won(r.expense.amount)}`).join('\n'),
      [
        { text: '취소', style: 'cancel' },
        {
          text: '기록',
          onPress: () =>
            addTransactions(
              pending.map((r) => ({
                date: r.dueDate,
                type: 'expense' as const,
                amount: r.expense.amount,
                categoryId: r.expense.categoryId,
                accountId: r.expense.accountId,
                memo: r.expense.name,
              })),
            ),
        },
      ],
    );
  };

  const confirmRemove = (item: RecurringExpense) => {
    Alert.alert(
      '고정지출을 삭제할까요?',
      `${item.name}. 이미 가계부에 기록된 지출은 그대로 남습니다.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => removeRecurring(item.id) },
      ],
    );
  };

  return (
    <FormScreen>
      {/* 월 합계 */}
      <Card>
        <Text style={styles.totalLabel}>매달 고정으로 나가는 돈</Text>
        <Text style={styles.totalValue}>{won(view.total)}</Text>
        {view.total > 0 ? (
          <>
            <Divider />
            <Text style={styles.totalHint}>
              {formatMonth(month)} 기준 {view.rows.length}건 중 {view.rows.length - view.pending.length}건 기록됨
            </Text>
            {view.pending.length > 0 ? (
              <Button
                title={`아직 안 넣은 ${view.pending.length}건 한 번에 기록`}
                onPress={recordPending}
                style={{ marginTop: spacing.md }}
              />
            ) : (
              <Text style={styles.doneText}>이번 달 고정지출을 모두 기록했어요 ✅</Text>
            )}
          </>
        ) : null}
      </Card>

      {creating || editing ? (
        <RecurringForm
          key={editing?.id ?? 'new'}
          item={editing}
          categories={data.categories}
          accounts={data.accounts}
          onCancel={closeForm}
          onToggleActive={() => {
            if (!editing) return;
            updateRecurring(editing.id, { active: !editing.active });
            closeForm();
          }}
          onSubmit={(payload) => {
            if (editing) updateRecurring(editing.id, payload);
            else addRecurring({ ...payload, active: true });
            closeForm();
          }}
        />
      ) : (
        <Button
          title="고정지출 추가"
          variant="ghost"
          onPress={() => setCreating(true)}
          style={{ marginTop: spacing.lg }}
        />
      )}

      {data.recurring.length === 0 && !creating ? (
        <EmptyState
          emoji="🔁"
          title="등록된 고정지출이 없어요"
          description={
            '월세·통신비·구독료처럼 매달 같은 금액이 나가는 것을\n등록해두면 매달 한 번에 기록할 수 있어요.'
          }
        />
      ) : null}

      {view.rows.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>이번 달 현황</Text>
          <Card style={{ padding: 0 }}>
            {view.rows.map((row, i) => {
              const cat = data.categories.find((c) => c.id === row.expense.categoryId);
              return (
                <Pressable
                  key={row.expense.id}
                  onPress={() => setEditing(row.expense)}
                  onLongPress={() => confirmRemove(row.expense)}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && styles.rowBorder,
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <Text style={styles.rowEmoji}>{cat?.emoji ?? '🔁'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{row.expense.name}</Text>
                    <Text style={styles.rowMeta}>
                      매달 {row.expense.dayOfMonth}일 · {cat?.name ?? '미분류'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text style={styles.rowAmount}>{won(row.expense.amount)}</Text>
                    <View style={[styles.badge, row.recorded && styles.badgeDone]}>
                      <Text style={[styles.badgeText, row.recorded && styles.badgeTextDone]}>
                        {row.recorded ? '기록됨' : '대기'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        </>
      ) : null}

      {/* 꺼둔 항목 */}
      {data.recurring.some((r) => !r.active) ? (
        <>
          <Text style={styles.sectionTitle}>잠시 멈춤</Text>
          <Card style={{ padding: 0 }}>
            {data.recurring
              .filter((r) => !r.active)
              .map((item, i) => (
                <View key={item.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <Text style={[styles.rowEmoji, { opacity: 0.5 }]}>⏸️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.textFaint }]}>{item.name}</Text>
                    <Text style={styles.rowMeta}>{won(item.amount)}</Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => updateRecurring(item.id, { active: true })}
                    style={styles.restoreBtn}
                  >
                    <Text style={styles.restoreText}>다시 켜기</Text>
                  </Pressable>
                </View>
              ))}
          </Card>
        </>
      ) : null}

      {data.recurring.length > 0 ? (
        <Text style={styles.note}>
          항목을 누르면 수정, 길게 누르면 삭제됩니다. 자동으로 기록되지는 않습니다 — 실제로
          나갔는지 확인하고 눌러야 저축률이 사실과 맞습니다.
        </Text>
      ) : null}
    </FormScreen>
  );
}

function RecurringForm({
  item,
  categories,
  accounts,
  onSubmit,
  onToggleActive,
  onCancel,
}: {
  item: RecurringExpense | null;
  categories: { id: string; name: string; emoji: string; type: string; archived?: boolean }[];
  accounts: { id: string; name: string }[];
  onSubmit: (payload: {
    name: string;
    amount: number;
    categoryId: string;
    dayOfMonth: number;
    accountId?: string;
  }) => void;
  onToggleActive: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState(item ? String(item.amount) : '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? '');
  const [day, setDay] = useState(String(item?.dayOfMonth ?? 25));
  const [accountId, setAccountId] = useState(item?.accountId);

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.archived);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('이름을 입력해 주세요', '예: 월세, 통신비, 넷플릭스');
      return;
    }
    const value = parseAmount(amount);
    if (value <= 0) {
      Alert.alert('금액을 입력해 주세요');
      return;
    }
    if (!categoryId) {
      Alert.alert('카테고리를 선택해 주세요');
      return;
    }

    const parsedDay = Number(day) || 1;
    onSubmit({
      name: trimmed,
      amount: value,
      categoryId,
      // 31일까지만 허용한다. 그 달에 없는 날이면 말일로 처리된다.
      dayOfMonth: Math.min(31, Math.max(1, parsedDay)),
      accountId,
    });
  };

  return (
    <Card style={{ marginTop: spacing.lg }}>
      <Text style={styles.formTitle}>{item ? '고정지출 수정' : '새 고정지출'}</Text>

      <Field label="이름">
        <Input value={name} onChangeText={setName} placeholder="예: 월세, 통신비, 넷플릭스" />
      </Field>

      <Field label="금액">
        <AmountInput value={amount} onChangeText={setAmount} />
      </Field>

      <Field label="결제일" hint="매달 며칠에 빠져나가는지. 그 달에 없는 날이면 말일로 잡힙니다.">
        <Input value={day} onChangeText={setDay} placeholder="25" keyboardType="number-pad" />
      </Field>

      <Field label="카테고리">
        <View style={styles.grid}>
          {expenseCategories.map((c) => {
            const active = c.id === categoryId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[styles.gridItem, active && styles.gridItemActive]}
              >
                <Text style={styles.gridEmoji}>{c.emoji}</Text>
                <Text style={[styles.gridLabel, active && styles.gridLabelActive]} numberOfLines={1}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      {accounts.length > 0 ? (
        <Field label="계좌 (선택)">
          <View style={styles.chipRow}>
            {accounts.map((a) => {
              const active = a.id === accountId;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAccountId(active ? undefined : a.id)}
                  style={[styles.chip, active && styles.gridItemActive]}
                >
                  <Text style={[styles.gridLabel, active && styles.gridLabelActive]} numberOfLines={1}>
                    {a.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      ) : null}

      <Button title={item ? '수정 저장' : '추가'} onPress={submit} />

      {item ? (
        <Button
          title={item.active ? '잠시 멈추기' : '다시 켜기'}
          variant="ghost"
          onPress={onToggleActive}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}

      <Button title="취소" variant="ghost" onPress={onCancel} style={{ marginTop: spacing.sm }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  totalLabel: { color: colors.textFaint, fontSize: font.tiny },
  totalValue: { color: colors.text, fontSize: font.h1, fontWeight: '800', marginTop: 4 },
  totalHint: { color: colors.textMuted, fontSize: font.small },
  doneText: { color: colors.up, fontSize: font.small, marginTop: spacing.sm },

  sectionTitle: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowEmoji: { fontSize: 20 },
  rowName: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  rowMeta: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  rowAmount: { color: colors.text, fontSize: font.body, fontWeight: '700' },

  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.warnSoft,
  },
  badgeDone: { backgroundColor: colors.upSoft },
  badgeText: { color: colors.warn, fontSize: font.tiny, fontWeight: '700' },
  badgeTextDone: { color: colors.up },

  restoreBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  restoreText: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },

  formTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginBottom: spacing.lg },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridItem: {
    width: '23%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridItemActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  gridEmoji: { fontSize: 20 },
  gridLabel: { color: colors.textMuted, fontSize: font.tiny, paddingHorizontal: 2 },
  gridLabelActive: { color: colors.text, fontWeight: '700' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },

  note: { color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.xl, lineHeight: 18 },
});
