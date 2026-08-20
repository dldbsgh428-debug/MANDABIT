/** 계좌 상세: 잔액 업데이트와 잔액 변동 기록. */

import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Typo';

import { projectBalance } from '../../src/lib/analytics';
import { LineChart } from '../../src/components/charts';
import { FormScreen } from '../../src/components/FormScreen';
import { DateField } from '../../src/components/DateField';
import { AmountInput, Button, Card, EmptyState, Field, Input } from '../../src/components/ui';
import { formatDateFull, today } from '../../src/lib/date';
import { parseAmount, shortWon, won } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { accountKindMeta, colors, font, radius, spacing } from '../../src/theme';

export default function AccountDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setBalance, removeSnapshot } = useStore();

  const account = data.accounts.find((a) => a.id === id);

  const history = useMemo(() => {
    if (!account) return [];
    return data.snapshots
      .filter((s) => s.accountId === account.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.snapshots, account]);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [memo, setMemo] = useState('');
  const [open, setOpen] = useState(false);

  if (!account) {
    return (
      <View style={styles.screen}>
        <EmptyState
          emoji="🔍"
          title="계좌를 찾을 수 없어요"
          description="삭제된 계좌일 수 있습니다."
          actionTitle="자산 목록으로"
          onAction={() => router.dismissTo('/(tabs)/accounts')}
        />
      </View>
    );
  }

  const meta = accountKindMeta[account.kind] ?? { label: '기타', emoji: '📦' };
  const isLiability = account.side === 'liability';

  // 마지막 기록 이후 붙었을 이자·납입금. 설정에서 끄면 기록값 그대로다.
  const recordedOn = history[0]?.date ?? account.createdAt.slice(0, 10);
  const projection = data.settings.projectBalances
    ? projectBalance(account, recordedOn)
    : null;
  const shownBalance = projection?.total ?? account.balance;

  // 오래된 순서로 뒤집어야 차트가 왼쪽에서 오른쪽으로 흐른다.
  const chartPoints = [...history]
    .reverse()
    .map((s) => ({ label: s.date.slice(5).replace('-', '/'), value: s.balance }));

  const submit = () => {
    const next = parseAmount(amount);
    if (!amount) {
      Alert.alert('금액을 입력해 주세요');
      return;
    }
    setBalance(account.id, next, date, memo.trim() || undefined);
    setAmount('');
    setMemo('');
    setDate(today());
    setOpen(false);
  };

  const confirmRemoveSnapshot = (snapshotId: string, snapDate: string) => {
    Alert.alert('이 기록을 삭제할까요?', `${formatDateFull(snapDate)} 기록이 사라집니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeSnapshot(snapshotId) },
    ]);
  };

  return (
    <FormScreen>
      <Stack.Screen
        options={{
          title: account.name,
          headerRight: () => (
            <Pressable hitSlop={8} onPress={() => router.push(`/account/edit?id=${account.id}`)}>
              <Ionicons name="create-outline" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      {/* 현재 잔액 */}
      <Card style={styles.hero}>
        <Text style={styles.heroKind}>
          {meta.emoji} {meta.label}
          {isLiability ? ' · 부채' : ''}
        </Text>
        <Text style={[styles.heroValue, isLiability && { color: colors.down }]}>
          {isLiability && shownBalance > 0 ? '-' : ''}
          {won(shownBalance)}
        </Text>

        {projection?.hasProjection ? (
          <View style={styles.projectionBox}>
            <Text style={styles.projectionTitle}>
              {formatDateFull(recordedOn)} 기록 이후 {projection.days}일치 예상
            </Text>
            <View style={styles.projectionRow}>
              <Text style={styles.projectionLabel}>기록한 잔액</Text>
              <Text style={styles.projectionValue}>{won(projection.recorded)}</Text>
            </View>
            {projection.deposits > 0 ? (
              <View style={styles.projectionRow}>
                <Text style={styles.projectionLabel}>납입금</Text>
                <Text style={[styles.projectionValue, { color: colors.up }]}>
                  +{won(projection.deposits)}
                </Text>
              </View>
            ) : null}
            {projection.interest > 0 ? (
              <View style={styles.projectionRow}>
                <Text style={styles.projectionLabel}>이자</Text>
                <Text style={[styles.projectionValue, { color: colors.up }]}>
                  +{won(projection.interest)}
                </Text>
              </View>
            ) : null}
            <Text style={styles.projectionNote}>
              추정치입니다. 실제 잔액을 기록하면 그 값이 새 기준이 됩니다.
            </Text>
          </View>
        ) : null}
        {account.interestRate ? (
          <Text style={styles.heroMeta}>연 {account.interestRate}%</Text>
        ) : null}
        {!account.includeInNetWorth ? (
          <View style={styles.excludedBadge}>
            <Text style={styles.excludedText}>순자산 계산에서 제외됨</Text>
          </View>
        ) : null}
        {account.memo ? <Text style={styles.heroMemo}>{account.memo}</Text> : null}
      </Card>

      {/* 잔액 업데이트 */}
      {open ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.formTitle}>잔액 업데이트</Text>
          <Field label={isLiability ? '남은 원금' : '현재 잔액'}>
            <AmountInput value={amount} onChangeText={setAmount} />
          </Field>
          <Field label="기준 날짜">
            <DateField value={date} onChange={setDate} />
          </Field>
          <Field label="메모 (선택)">
            <Input value={memo} onChangeText={setMemo} placeholder="예: 월급 입금, 원금 상환" />
          </Field>
          <Button title="기록하기" onPress={submit} />
          <Button
            title="취소"
            variant="ghost"
            onPress={() => setOpen(false)}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      ) : (
        <Button
          title="잔액 업데이트"
          onPress={() => {
            // 예상치가 아니라 마지막으로 기록한 값을 채운다. 실제 잔액을 확인해 고치라는 뜻이다.
            setAmount(String(account.balance));
            setOpen(true);
          }}
          style={{ marginTop: spacing.md }}
        />
      )}

      {/* 잔액 추이 */}
      {chartPoints.length >= 2 ? (
        <>
          <Text style={styles.sectionTitle}>잔액 추이</Text>
          <Card>
            <LineChart points={chartPoints} height={180} />
          </Card>
        </>
      ) : null}

      {/* 기록 목록 */}
      <Text style={styles.sectionTitle}>잔액 기록 {history.length}건</Text>
      {history.length === 0 ? (
        <Card>
          <Text style={styles.placeholder}>
            아직 기록이 없습니다. 잔액을 업데이트하면 여기에 쌓입니다.
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {history.map((snapshot, i) => {
            // 바로 다음 항목이 더 이전 기록이므로 그것과 비교해 증감을 낸다.
            const prev = history[i + 1];
            const delta = prev ? snapshot.balance - prev.balance : 0;
            return (
              <Pressable
                key={snapshot.id}
                onLongPress={() => confirmRemoveSnapshot(snapshot.id, snapshot.date)}
                style={({ pressed }) => [
                  styles.historyRow,
                  i > 0 && styles.historyBorder,
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>{formatDateFull(snapshot.date)}</Text>
                  {snapshot.memo ? <Text style={styles.historyMemo}>{snapshot.memo}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyBalance}>{won(snapshot.balance)}</Text>
                  {prev ? (
                    <Text
                      style={[
                        styles.historyDelta,
                        { color: delta === 0 ? colors.textFaint : delta > 0 ? colors.up : colors.down },
                      ]}
                    >
                      {delta > 0 ? '+' : ''}
                      {shortWon(delta)}
                    </Text>
                  ) : (
                    <Text style={styles.historyDelta}>첫 기록</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}
      {history.length > 0 ? (
        <Text style={styles.hint}>기록을 길게 누르면 삭제할 수 있어요.</Text>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  // 계좌를 못 찾았을 때의 빈 화면에서만 쓴다(본문은 FormScreen이 배경을 깐다).
  screen: { flex: 1, backgroundColor: colors.bg },

  hero: { alignItems: 'center', gap: 6 },
  heroKind: { color: colors.textFaint, fontSize: font.tiny },
  heroValue: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  heroMeta: { color: colors.textMuted, fontSize: font.small },
  heroMemo: { color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: 4 },

  projectionBox: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 3,
  },
  projectionTitle: { color: colors.textFaint, fontSize: font.tiny, marginBottom: 4 },
  projectionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  projectionLabel: { color: colors.textMuted, fontSize: font.small },
  projectionValue: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  projectionNote: { color: colors.textFaint, fontSize: font.tiny, marginTop: 6, lineHeight: 16 },
  excludedBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  excludedText: { color: colors.textFaint, fontSize: font.tiny },

  formTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginBottom: spacing.lg },

  sectionTitle: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  historyBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  historyDate: { color: colors.text, fontSize: font.body, fontWeight: '500' },
  historyMemo: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  historyBalance: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  historyDelta: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },

  placeholder: { color: colors.textMuted, fontSize: font.small },
  hint: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.sm },
});
