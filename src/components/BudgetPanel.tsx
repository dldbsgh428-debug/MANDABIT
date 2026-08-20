/**
 * 예산 화면 조각: 월 저축 목표, 고정지출, 카테고리별 예산 소진율.
 *
 * 원래 탭이었는데 가계부 안으로 들어왔다. 가계부가 '이 달에 쓴 돈'을 다루니
 * '이 달에 쓰기로 한 돈'도 같은 화면에 있는 편이 자연스럽다. 달 선택은
 * 가계부가 갖고 있어서 month를 받아서 쓴다.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Typo';

import { BudgetBar } from './charts';
import {
  AmountInput,
  Button,
  Card,
  Divider,
  EmptyState,
  Field,
  SectionHeader,
} from './ui';
import {
  budgetStatus,
  monthlyCashflow,
  recurringStatus,
  recurringTotal,
} from '../lib/analytics';

import { parseAmount, percent, percentFloor, shortWon, won } from '../lib/money';
import { useStore } from '../store/StoreProvider';
import { colors, font, spacing } from '../theme';
import type { MonthKey } from '../types';

export function BudgetPanel({ month }: { month: MonthKey }) {
  const router = useRouter();
  const { data, updateSettings } = useStore();

  // 월 저축 목표를 이 화면에서 바로 고칠 수 있게 한다.
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(data.settings.monthlySavingTarget || ''));

  const view = useMemo(() => {
    const cashflow = monthlyCashflow(data.transactions, month);
    const lines = budgetStatus(data.transactions, data.categories, month);
    const totalBudget = lines.reduce((sum, l) => sum + l.budget, 0);
    const totalSpent = lines.reduce((sum, l) => sum + l.spent, 0);
    const overCount = lines.filter((l) => l.usage >= 1).length;
    const recurringRows = recurringStatus(data.recurring, data.transactions, month);
    return {
      cashflow,
      lines,
      totalBudget,
      totalSpent,
      overCount,
      recurringTotal: recurringTotal(data.recurring),
      recurringPending: recurringRows.filter((r) => !r.recorded).length,
      recurringCount: recurringRows.length,
    };
  }, [data, month]);

  const { cashflow, lines, totalBudget, totalSpent, overCount } = view;
  const target = data.settings.monthlySavingTarget;
  const targetUsage = target > 0 ? cashflow.saving / target : 0;

  const saveTarget = () => {
    updateSettings({ monthlySavingTarget: parseAmount(targetInput) });
    setEditingTarget(false);
  };

  return (
    <View>
      {/* ------------------------------------------------- 월 저축 목표 */}
      <Card>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>월 저축 목표</Text>
          <Pressable hitSlop={8} onPress={() => setEditingTarget((v) => !v)}>
            <Text style={styles.editLink}>{editingTarget ? '닫기' : '수정'}</Text>
          </Pressable>
        </View>

        {editingTarget ? (
          <View style={{ marginTop: spacing.md }}>
            <Field label="매달 모을 금액" hint="1억까지 남은 기간을 예측하는 기준이 됩니다.">
              <AmountInput value={targetInput} onChangeText={setTargetInput} />
            </Field>
            <Button title="저장" onPress={saveTarget} />
          </View>
        ) : target > 0 ? (
          <>
            <View style={styles.targetRow}>
              <Text
                style={[
                  styles.targetValue,
                  { color: cashflow.saving >= target ? colors.up : colors.text },
                ]}
              >
                {won(cashflow.saving)}
              </Text>
              <Text style={styles.targetTotal}> / {won(target)}</Text>
            </View>
            <BudgetBar usage={Math.max(0, targetUsage)} />
            <Text style={styles.targetHint}>
              {cashflow.saving >= target
                ? `목표 초과 달성! ${shortWon(cashflow.saving - target)} 더 모았어요 🎉`
                : cashflow.saving < 0
                  ? '이번 달은 지출이 수입보다 많아요.'
                  : `달성률 ${percentFloor(targetUsage)} · ${shortWon(target - cashflow.saving)} 남음`}
            </Text>
          </>
        ) : (
          <Text style={styles.placeholder}>
            월 저축 목표를 정하면 달성률과 1억 도달 시점을 계산해 드려요. 수정을 눌러 금액을
            입력해 보세요.
          </Text>
        )}
      </Card>

      {/* ------------------------------------------------- 고정지출 */}
      <SectionHeader
        title="고정지출"
        action="관리"
        onAction={() => router.push('/recurring/manage')}
      />
      <Card onPress={() => router.push('/recurring/manage')}>
        {view.recurringCount === 0 ? (
          <Text style={styles.placeholder}>
            월세·통신비·구독료처럼 매달 나가는 돈을 등록해두면, 매달 하나씩 입력하지 않고 한 번에
            기록할 수 있어요.
          </Text>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>매달 나가는 돈</Text>
              <Text style={styles.rowValue}>{won(view.recurringTotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>이번 달 기록</Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: view.recurringPending > 0 ? colors.warn : colors.up },
                ]}
              >
                {view.recurringPending > 0
                  ? `${view.recurringPending}건 대기`
                  : `${view.recurringCount}건 완료`}
              </Text>
            </View>
          </>
        )}
      </Card>

      {/* --------------------------------------------- 카테고리 예산 현황 */}
      <SectionHeader
        title="카테고리 예산"
        action="카테고리 관리"
        onAction={() => router.push('/category/manage')}
      />

      {lines.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="설정된 예산이 없어요"
          description={
            '카테고리 관리에서 식비·쇼핑 같은 항목에\n월 예산을 정하면 소진율을 여기서 볼 수 있어요.'
          }
          actionTitle="카테고리 관리로 이동"
          onAction={() => router.push('/category/manage')}
        />
      ) : (
        <>
          <Card>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>전체 예산</Text>
              <Text style={styles.rowValue}>{won(totalBudget)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>사용액</Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: totalSpent > totalBudget ? colors.down : colors.text },
                ]}
              >
                {won(totalSpent)}
              </Text>
            </View>
            <Divider />
            <BudgetBar usage={totalBudget > 0 ? totalSpent / totalBudget : 0} />
            <Text style={styles.summaryHint}>
              {totalBudget > 0
                ? `소진율 ${percentFloor(totalSpent / totalBudget)}`
                : '예산이 없습니다'}
              {overCount > 0 ? ` · 초과 ${overCount}개` : ''}
            </Text>
          </Card>

          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {lines.map((line) => {
              const over = line.usage >= 1;
              const warn = !over && line.usage >= 0.8;
              return (
                <Card key={line.category.id}>
                  <View style={styles.lineHead}>
                    <Text style={styles.lineName}>
                      {line.category.emoji} {line.category.name}
                    </Text>
                    {over ? (
                      <View style={styles.overBadge}>
                        <Ionicons name="alert-circle" size={12} color={colors.down} />
                        <Text style={styles.overText}>초과</Text>
                      </View>
                    ) : warn ? (
                      <View style={[styles.overBadge, { backgroundColor: colors.warnSoft }]}>
                        <Text style={[styles.overText, { color: colors.warn }]}>주의</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.lineAmounts}>
                    <Text style={[styles.lineSpent, over && { color: colors.down }]}>
                      {won(line.spent)}
                    </Text>
                    <Text style={styles.lineBudget}> / {won(line.budget)}</Text>
                  </View>

                  <BudgetBar usage={line.usage} />

                  <Text style={styles.lineHint}>
                    {over
                      ? `${shortWon(-line.remaining)} 초과`
                      : `${shortWon(line.remaining)} 남음 · ${percentFloor(line.usage)} 사용`}
                  </Text>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  editLink: { color: colors.primary, fontSize: font.small, fontWeight: '600' },

  targetRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.md, marginBottom: spacing.sm },
  targetValue: { fontSize: font.h1, fontWeight: '800' },
  targetTotal: { color: colors.textMuted, fontSize: font.body },
  targetHint: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.sm },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowLabel: { color: colors.textMuted, fontSize: font.small },
  rowValue: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  summaryHint: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.sm },

  lineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineName: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  lineAmounts: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6, marginBottom: spacing.sm },
  lineSpent: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  lineBudget: { color: colors.textFaint, fontSize: font.small },
  lineHint: { color: colors.textMuted, fontSize: font.tiny, marginTop: 6 },

  overBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.downSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overText: { color: colors.down, fontSize: font.tiny, fontWeight: '700' },

  placeholder: { color: colors.textMuted, fontSize: font.small, lineHeight: 20, marginTop: spacing.sm },
});
