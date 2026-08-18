/** 목표 설정 모달: 목표 금액, 월 저축 목표, 시한, 시작일. */

import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateField } from '../src/components/DateField';
import { FormScreen } from '../src/components/FormScreen';
import { AmountInput, Button, Card, Field, ToggleRow } from '../src/components/ui';
import { forecastGoal, netWorthSeries, seriesStartMonth } from '../src/lib/analytics';
import { currentMonth, formatMonth, monthOf, monthsBetween } from '../src/lib/date';
import { parseAmount, shortWon, won } from '../src/lib/money';
import { useStore } from '../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../src/theme';

/** 자주 쓰는 목표 금액 프리셋. */
const GOAL_PRESETS = [
  { label: '1천만원', value: 10_000_000 },
  { label: '3천만원', value: 30_000_000 },
  { label: '5천만원', value: 50_000_000 },
  { label: '1억', value: 100_000_000 },
  { label: '2억', value: 200_000_000 },
  { label: '3억', value: 300_000_000 },
];

export default function GoalScreen() {
  const router = useRouter();
  const { data, updateSettings } = useStore();
  const { settings } = data;

  const [goal, setGoal] = useState(String(settings.goalAmount));
  const [target, setTarget] = useState(
    settings.monthlySavingTarget ? String(settings.monthlySavingTarget) : '',
  );
  const [useDeadline, setUseDeadline] = useState(Boolean(settings.goalDeadline));
  const [deadline, setDeadline] = useState(settings.goalDeadline ?? currentMonth() + '-01');
  const [startDate, setStartDate] = useState(settings.startDate);

  // 입력값을 바꾸는 즉시 예상 결과를 보여줘서 금액을 감으로 정할 수 있게 한다.
  const preview = useMemo(() => {
    const goalAmount = parseAmount(goal);
    const monthly = parseAmount(target);
    const series = netWorthSeries(
      data.accounts,
      data.snapshots,
      seriesStartMonth(data, 12),
      currentMonth(),
    );
    const forecast = forecastGoal(series, goalAmount, monthly);
    const net = series.length > 0 ? series[series.length - 1].net : 0;

    const monthsToDeadline = useDeadline
      ? monthsBetween(currentMonth(), monthOf(deadline))
      : null;
    const requiredForDeadline =
      monthsToDeadline && monthsToDeadline > 0
        ? Math.ceil(Math.max(0, goalAmount - net) / monthsToDeadline)
        : null;

    return { forecast, net, requiredForDeadline, monthsToDeadline };
  }, [goal, target, data, useDeadline, deadline]);

  const save = () => {
    updateSettings({
      goalAmount: Math.max(1, parseAmount(goal)),
      monthlySavingTarget: parseAmount(target),
      goalDeadline: useDeadline ? deadline : undefined,
      startDate,
    });
    router.back();
  };

  return (
    <FormScreen>
      <Field label="목표 금액">
        <AmountInput value={goal} onChangeText={setGoal} />
      </Field>
      <View style={styles.presetRow}>
        {GOAL_PRESETS.map((p) => {
          const active = parseAmount(goal) === p.value;
          return (
            <Pressable
              key={p.value}
              onPress={() => setGoal(String(p.value))}
              style={[styles.preset, active && styles.presetActive]}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Field
        label="월 저축 목표"
        hint="잔액 기록이 부족할 때 이 값으로 달성 시점을 예측합니다."
      >
        <AmountInput value={target} onChangeText={setTarget} />
      </Field>

      <View style={styles.toggleBox}>
        <ToggleRow
          label="목표 시한 정하기"
          hint="시한을 정하면 매달 필요한 저축액을 역산해 줍니다."
          value={useDeadline}
          onChange={setUseDeadline}
        />
      </View>

      {useDeadline ? (
        <Field label="목표 시한">
          {/* 시한은 미래 날짜라 '오늘/어제' 빠른 선택이 의미가 없다. */}
          <DateField value={deadline} onChange={setDeadline} quickPicks={false} />
        </Field>
      ) : null}

      <Field label="프로젝트 시작일" hint="대시보드의 '몇 개월째' 표시 기준입니다.">
        <DateField value={startDate} onChange={setStartDate} quickPicks={false} />
      </Field>

      {/* 미리보기 */}
      <Card style={{ marginBottom: spacing.xl }}>
        <Text style={styles.previewTitle}>이렇게 계산돼요</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>현재 순자산</Text>
          <Text style={styles.previewValue}>{won(preview.net)}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>남은 금액</Text>
          <Text style={styles.previewValue}>{shortWon(preview.forecast.remaining)}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>예상 달성</Text>
          <Text style={[styles.previewValue, { color: colors.primary }]}>
            {preview.forecast.achieved
              ? '달성 완료 🎉'
              : preview.forecast.estimatedMonth
                ? `${formatMonth(preview.forecast.estimatedMonth)} (${preview.forecast.monthsRemaining}개월)`
                : '예측 불가'}
          </Text>
        </View>
        {preview.requiredForDeadline !== null ? (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>시한까지 매달</Text>
            <Text style={[styles.previewValue, { color: colors.warn }]}>
              {won(preview.requiredForDeadline)}
            </Text>
          </View>
        ) : useDeadline && preview.monthsToDeadline !== null && preview.monthsToDeadline <= 0 ? (
          <Text style={styles.previewWarn}>시한을 이번 달보다 뒤로 잡아 주세요.</Text>
        ) : null}
      </Card>

      <Button title="저장" onPress={save} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({

  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.xl,
  },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  presetText: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  presetTextActive: { color: colors.text },

  toggleBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },

  previewTitle: { color: colors.textMuted, fontSize: font.small, fontWeight: '700', marginBottom: spacing.sm },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  previewLabel: { color: colors.textMuted, fontSize: font.small },
  previewValue: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  previewWarn: { color: colors.warn, fontSize: font.tiny, marginTop: spacing.sm },
});
