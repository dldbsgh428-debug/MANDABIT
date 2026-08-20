/** 거래 입력·수정 모달. id 쿼리가 있으면 수정 모드. */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Typo';

import { DateField } from '../../src/components/DateField';
import { FormScreen } from '../../src/components/FormScreen';
import { AmountInput, Button, Field, Input, Segmented } from '../../src/components/ui';
import { today } from '../../src/lib/date';
import { parseAmount } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../../src/theme';
import type { TxType } from '../../src/types';

export default function TransactionEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, addTransaction, updateTransaction, removeTransaction } = useStore();

  const existing = useMemo(() => data.transactions.find((t) => t.id === id), [data.transactions, id]);

  const [type, setType] = useState<TxType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [date, setDate] = useState(existing?.date ?? today());
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [accountId, setAccountId] = useState(existing?.accountId);
  const [memo, setMemo] = useState(existing?.memo ?? '');

  const categories = useMemo(
    () => data.categories.filter((c) => c.type === type && !c.archived),
    [data.categories, type],
  );

  // 타입을 바꾸면 이전 타입의 카테고리 선택은 무효가 된다.
  const changeType = (next: TxType) => {
    setType(next);
    setCategoryId('');
  };

  const save = () => {
    const value = parseAmount(amount);
    if (value <= 0) {
      Alert.alert('금액을 입력해 주세요');
      return;
    }
    if (!categoryId) {
      Alert.alert('카테고리를 선택해 주세요');
      return;
    }

    const payload = {
      date,
      type,
      amount: value,
      categoryId,
      accountId,
      memo: memo.trim() || undefined,
    };

    if (existing) updateTransaction(existing.id, payload);
    else addTransaction(payload);
    router.back();
  };

  const confirmRemove = () => {
    if (!existing) return;
    Alert.alert('거래를 삭제할까요?', '', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          removeTransaction(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <FormScreen>
      <Field label="구분">
        <Segmented
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: '지출', color: colors.down },
            { value: 'income', label: '수입', color: colors.up },
          ]}
        />
      </Field>

      <Field label="금액">
        <AmountInput value={amount} onChangeText={setAmount} />
      </Field>

      <Field label="날짜">
        <DateField value={date} onChange={setDate} />
      </Field>

      <Field label="카테고리">
        <View style={styles.grid}>
          {categories.map((c) => {
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

      {data.accounts.length > 0 ? (
        <Field label="계좌 (선택)" hint="어느 계좌에서 오갔는지 메모용으로 남깁니다.">
          <View style={styles.grid}>
            {data.accounts.map((a) => {
              const active = a.id === accountId;
              return (
                <Pressable
                  key={a.id}
                  // 이미 선택된 것을 다시 누르면 선택 해제한다.
                  onPress={() => setAccountId(active ? undefined : a.id)}
                  style={[styles.accountChip, active && styles.gridItemActive]}
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

      <Field label="메모 (선택)">
        <Input value={memo} onChangeText={setMemo} placeholder="예: 점심 회식" />
      </Field>

      <Button title={existing ? '수정 저장' : '저장'} onPress={save} />

      {existing ? (
        <Button
          title="삭제"
          variant="danger"
          onPress={confirmRemove}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}

      {categories.length === 0 ? (
        <Text style={styles.warn}>
          사용할 수 있는 {type === 'expense' ? '지출' : '수입'} 카테고리가 없습니다. 설정 &gt;
          카테고리 관리에서 추가해 주세요.
        </Text>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({

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

  accountChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },

  warn: { color: colors.warn, fontSize: font.small, marginTop: spacing.lg, lineHeight: 19 },
});
