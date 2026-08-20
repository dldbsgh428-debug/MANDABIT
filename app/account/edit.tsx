/** 계좌 추가·수정 모달. id 쿼리가 있으면 수정 모드. */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Typo';

import { FormScreen } from '../../src/components/FormScreen';
import {
  AmountInput,
  Button,
  ChipRow,
  Field,
  Input,
  Segmented,
  ToggleRow,
} from '../../src/components/ui';
import { parseAmount } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { accountKindMeta, assetKinds, colors, font, liabilityKinds, spacing } from '../../src/theme';
import type { AccountKind } from '../../src/types';

export default function AccountEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, addAccount, updateAccount, setBalance, removeAccount } = useStore();

  const existing = useMemo(() => data.accounts.find((a) => a.id === id), [data.accounts, id]);

  const [side, setSide] = useState<'asset' | 'liability'>(existing?.side ?? 'asset');
  const [kind, setKind] = useState<AccountKind>(existing?.kind ?? 'deposit');
  const [name, setName] = useState(existing?.name ?? '');
  const [balance, setBalanceInput] = useState(existing ? String(existing.balance) : '');
  const [rate, setRate] = useState(existing?.interestRate ? String(existing.interestRate) : '');
  const [deposit, setDeposit] = useState(
    existing?.monthlyDeposit ? String(existing.monthlyDeposit) : '',
  );
  const [interestMode, setInterestMode] = useState<'none' | 'simple' | 'compound'>(
    existing?.interestMode ?? 'none',
  );
  const [payDay, setPayDay] = useState(existing?.payDay ? String(existing.payDay) : '');
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [include, setInclude] = useState(existing?.includeInNetWorth ?? true);

  const kindOptions = (side === 'asset' ? assetKinds : liabilityKinds).map((k) => ({
    value: k as AccountKind,
    label: `${accountKindMeta[k].emoji} ${accountKindMeta[k].label}`,
  }));

  /** 자산↔부채를 바꾸면 종류도 그쪽의 기본값으로 맞춰준다. */
  const changeSide = (next: 'asset' | 'liability') => {
    setSide(next);
    setKind(next === 'asset' ? 'deposit' : 'loan');
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('계좌 이름을 입력해 주세요', '예: 카카오뱅크 주거래, 미국주식 계좌');
      return;
    }

    const amount = parseAmount(balance);
    const interestRate = rate ? Number(rate) : undefined;
    const monthlyDeposit = parseAmount(deposit) || undefined;
    // 1~31 밖의 숫자는 저장하지 않는다. 그 달에 없는 날은 계산할 때 말일로 본다.
    const day = Number(payDay);
    const dayOfMonth = monthlyDeposit && day >= 1 && day <= 31 ? Math.floor(day) : undefined;

    if (existing) {
      updateAccount(existing.id, {
        name: trimmed,
        side,
        kind,
        includeInNetWorth: include,
        interestRate: Number.isFinite(interestRate) ? interestRate : undefined,
        // '반영 안 함'은 저장하지 않는다. 저장된 데이터에 의미 없는 값이 쌓이지 않게.
        interestMode: interestMode === 'none' ? undefined : interestMode,
        monthlyDeposit,
        payDay: dayOfMonth,
        memo: memo.trim() || undefined,
      });
      // 잔액이 바뀌었으면 잔액 기록도 함께 남긴다(추이 그래프의 데이터가 된다).
      if (amount !== existing.balance) setBalance(existing.id, amount);
    } else {
      addAccount({
        name: trimmed,
        side,
        kind,
        balance: amount,
        includeInNetWorth: include,
        interestRate: Number.isFinite(interestRate) ? interestRate : undefined,
        // '반영 안 함'은 저장하지 않는다. 저장된 데이터에 의미 없는 값이 쌓이지 않게.
        interestMode: interestMode === 'none' ? undefined : interestMode,
        monthlyDeposit,
        payDay: dayOfMonth,
        memo: memo.trim() || undefined,
      });
    }
    router.back();
  };

  const confirmRemove = () => {
    if (!existing) return;
    Alert.alert(
      '계좌를 삭제할까요?',
      `${existing.name}의 잔액 기록도 함께 삭제됩니다. 가계부 내역은 남습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            removeAccount(existing.id);
            // 방금 지운 계좌의 상세 화면으로 돌아가지 않도록 자산 목록으로 보낸다.
            router.dismissTo('/(tabs)/accounts');
          },
        },
      ],
    );
  };

  return (
    <FormScreen>
      <Field label="구분">
        <Segmented
          value={side}
          onChange={changeSide}
          options={[
            { value: 'asset', label: '자산', color: colors.up },
            { value: 'liability', label: '부채', color: colors.down },
          ]}
        />
      </Field>

      <Field label="종류">
        <ChipRow options={kindOptions} value={kind} onChange={setKind} />
      </Field>

      <Field label="계좌 이름">
        <Input
          value={name}
          onChangeText={setName}
          placeholder={side === 'asset' ? '예: 카카오뱅크 주거래' : '예: 신용대출'}
        />
      </Field>

      <Field
        label={side === 'asset' ? '현재 잔액' : '남은 원금'}
        hint={
          side === 'asset'
            ? '지금 이 계좌에 들어있는 금액'
            : '부채는 순자산에서 자동으로 차감됩니다.'
        }
      >
        <AmountInput value={balance} onChangeText={setBalanceInput} />
      </Field>

      <Field
        label="금리 (선택)"
        hint="연이율 %. 예상 잔액 증가를 켜면 이 값으로 이자를 계산합니다."
      >
        <Input value={rate} onChangeText={setRate} placeholder="3.5" keyboardType="decimal-pad" />
      </Field>

      {side === 'asset' && rate ? (
        <Field
          label="이자 반영"
          hint="적금·예금은 보통 만기에 이자를 한 번에 받으니 '안 함'으로 두세요. 군인공제회처럼 매달 이자가 실제로 붙는 상품만 켜면 됩니다."
        >
          <Segmented
            options={[
              { value: 'none' as const, label: '안 함' },
              { value: 'simple' as const, label: '단리' },
              { value: 'compound' as const, label: '월복리' },
            ]}
            value={interestMode}
            onChange={setInterestMode}
          />
        </Field>
      ) : null}

      {side === 'asset' ? (
        <Field
          label="월 납입액 (선택)"
          hint="적금처럼 매달 자동이체되는 금액. 마지막 기록 이후 지난 개월수만큼 더해 보여줍니다."
        >
          <AmountInput value={deposit} onChangeText={setDeposit} />
        </Field>
      ) : null}

      {side === 'asset' && deposit ? (
        <Field
          label="납입일 (선택)"
          hint="매달 며칠에 빠지는지. 적어두면 달력 기준으로 세서 더 정확합니다. 비우면 마지막 기록일에서 한 달씩 셉니다."
        >
          <Input
            value={payDay}
            // 두 자리까지만 받는다. 31을 넘는 값은 저장할 때 걸러진다.
            onChangeText={(t) => setPayDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
            placeholder="25"
            keyboardType="number-pad"
          />
        </Field>
      ) : null}

      <Field label="메모 (선택)">
        <Input value={memo} onChangeText={setMemo} placeholder="만기일, 용도 등" multiline />
      </Field>

      <View style={styles.toggleBox}>
        <ToggleRow
          label="순자산에 포함"
          hint="끄면 목록에는 보이지만 순자산·달성률 계산에서 빠집니다."
          value={include}
          onChange={setInclude}
        />
      </View>

      <Button title={existing ? '수정 저장' : '계좌 추가'} onPress={save} />

      {existing ? (
        <>
          <Button
            title="계좌 삭제"
            variant="danger"
            onPress={confirmRemove}
            style={{ marginTop: spacing.sm }}
          />
          <Text style={styles.hint}>
            잔액만 바꾸려면 계좌 상세 화면의 &apos;잔액 업데이트&apos;가 더 편해요.
          </Text>
        </>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  toggleBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  hint: {
    color: colors.textFaint,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 17,
  },
});
