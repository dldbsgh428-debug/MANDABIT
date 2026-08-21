/** 월간 리포트: 이번 달을 지난달과 견줘 무엇이 달라졌는지 보여준다. */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Typo';

import { BudgetBar, DonutChart } from '../src/components/charts';
import { Card, DeltaBadge, EmptyState, SectionHeader } from '../src/components/ui';
import { addMonths, currentMonth, formatMonth } from '../src/lib/date';
import { percent, percentFloor, shortWon, won } from '../src/lib/money';
import { defaultReportMonth, monthlyReport, type ReportNote } from '../src/lib/report';
import { useStore } from '../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../src/theme';

const TONE = {
  good: { color: colors.up, bg: colors.upSoft, icon: 'checkmark-circle' },
  warn: { color: colors.down, bg: colors.downSoft, icon: 'alert-circle' },
  info: { color: colors.primary, bg: colors.primarySoft, icon: 'information-circle' },
} as const;

export default function ReportScreen() {
  const router = useRouter();
  const { data } = useStore();
  const [month, setMonth] = useState(() => defaultReportMonth(data));

  const report = useMemo(() => monthlyReport(data, month), [data, month]);
  const { cashflow, prev } = report;
  const isCurrentMonth = month === currentMonth();

  // 도넛은 조각이 많으면 못 읽는다. 상위 7개만 두고 나머지는 합친다.
  const slices = useMemo(() => {
    const TOP = 7;
    const out = report.categories.slice(0, TOP).map((c) => ({
      label: `${c.emoji} ${c.name}`,
      amount: c.amount,
    }));
    const rest = report.categories.slice(TOP);
    if (rest.length > 0) {
      out.push({
        label: `그 외 ${rest.length}개`,
        amount: rest.reduce((sum, c) => sum + c.amount, 0),
      });
    }
    return out;
  }, [report.categories]);

  const empty = cashflow.income === 0 && cashflow.expense === 0;

  return (
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

      {/* 비교 기준을 먼저 밝힌다. 20일치를 지난달 한 달과 견주면 무조건 줄어 보인다. */}
      <Text style={styles.compareNote}>
        {report.partial
          ? `${report.throughDay}일까지 · 지난달 같은 기간과 비교`
          : '지난달 한 달과 비교'}
      </Text>

      {empty ? (
        <EmptyState
          emoji="📋"
          title={`${formatMonth(month)} 기록이 없어요`}
          description={'수입과 지출을 기록하면\n지난달과 비교해서 보여드릴게요.'}
          actionTitle="거래 입력하기"
          onAction={() => router.push('/transaction/edit')}
        />
      ) : (
        <>
          {/* 한 줄 코멘트 */}
          {report.notes.length > 0 ? (
            <Card style={styles.notes}>
              {report.notes.map((note, i) => (
                <Note key={i} note={note} first={i === 0} />
              ))}
            </Card>
          ) : null}

          {/* 수입·지출·저축 */}
          <SectionHeader title="이번 달 현금흐름" />
          <Card>
            <Row label="수입" value={cashflow.income} prev={prev.income} tone={colors.up} />
            <Row label="지출" value={cashflow.expense} prev={prev.expense} tone={colors.down} invert />
            <Row label="저축" value={cashflow.saving} prev={prev.saving} tone={colors.text} last />

            {cashflow.income > 0 ? (
              <Text style={styles.rate}>
                저축률 {percent(cashflow.savingRate)}
                {prev.income > 0
                  ? ` · 지난달 ${percent(prev.savingRate)}`
                  : ''}
              </Text>
            ) : null}
          </Card>

          {/* 월 저축 목표 */}
          {report.savingTarget > 0 ? (
            <Card style={{ marginTop: spacing.md }}>
              <View style={styles.targetHead}>
                <Text style={styles.cardTitle}>월 저축 목표</Text>
                <Text style={styles.targetPct}>
                  {percentFloor(Math.max(0, cashflow.saving) / report.savingTarget)}
                </Text>
              </View>
              <Text style={styles.targetAmount}>
                {won(Math.max(0, cashflow.saving))}
                <Text style={styles.targetOf}> / {won(report.savingTarget)}</Text>
              </Text>
              <BudgetBar usage={Math.max(0, cashflow.saving) / report.savingTarget} />
            </Card>
          ) : null}

          {/* 순자산 변화 */}
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.netRow}>
              <View>
                <Text style={styles.cardTitle}>순자산</Text>
                <Text style={styles.netValue}>{shortWon(report.netWorth)}</Text>
              </View>
              <DeltaBadge value={report.netWorthDelta} suffix="원" />
            </View>

            {report.gain.available ? (
              <>
                {/* 늘어난 돈이 내 저축인지 수익인지 나눠 본다. 목표까지 남은 거리를
                    좁히는 두 가지 방법이 서로 다른 일이기 때문이다. */}
                <View style={styles.gainRow}>
                  <Text style={styles.gainLabel}>내가 넣은 돈</Text>
                  <Text style={styles.gainValue}>{won(report.gain.saved)}</Text>
                </View>
                <View style={styles.gainRow}>
                  <Text style={styles.gainLabel}>불어난 돈</Text>
                  <Text
                    style={[
                      styles.gainValue,
                      { color: report.gain.gained >= 0 ? colors.up : colors.down },
                    ]}
                  >
                    {report.gain.gained >= 0 ? '+' : '-'}
                    {won(Math.abs(report.gain.gained))}
                  </Text>
                </View>
              </>
            ) : null}

            <Text style={styles.hint}>
              기록된 잔액 기준. 전월 말과 비교합니다.
              {report.gain.available ? '' : ' 계좌에 원금을 적어두면 저축과 수익을 나눠 볼 수 있어요.'}
            </Text>
          </Card>

          {/* 카테고리별 지출 */}
          {report.categories.length > 0 ? (
            <>
              <SectionHeader title="어디에 썼나" />
              <Card>
                <DonutChart slices={slices} centerLabel="총지출" centerValue={shortWon(cashflow.expense)} />
                <View style={styles.list}>
                  {report.categories.map((c) => (
                    <View key={c.categoryId} style={styles.catRow}>
                      <Text style={styles.catName} numberOfLines={1}>
                        {c.emoji} {c.name}
                      </Text>
                      <View style={styles.catRight}>
                        <Text style={styles.catAmount}>{won(c.amount)}</Text>
                        <Text
                          style={[
                            styles.catDelta,
                            { color: c.delta > 0 ? colors.down : c.delta < 0 ? colors.up : colors.textFaint },
                          ]}
                        >
                          {c.delta === 0
                            ? '지난달과 같음'
                            : `${c.delta > 0 ? '▲' : '▼'} ${won(Math.abs(c.delta))}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : null}

          {/* 예산 초과 */}
          {report.overBudget.length > 0 ? (
            <>
              <SectionHeader
                title="예산 초과"
                action="예산 관리"
                onAction={() => router.push('/ledger?pane=budget')}
              />
              <Card style={{ padding: 0 }}>
                {report.overBudget.map((line, i) => (
                  <View key={line.category.id} style={[styles.overRow, i > 0 && styles.rowBorder]}>
                    <Text style={styles.catName} numberOfLines={1}>
                      {line.category.emoji} {line.category.name}
                    </Text>
                    <Text style={styles.overAmount}>
                      {won(line.spent - line.budget)} 초과
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {/* 아직 기록 안 된 고정지출 */}
          {report.missedRecurring.length > 0 ? (
            <>
              <SectionHeader
                title="빠진 고정지출"
                action="관리"
                onAction={() => router.push('/recurring/manage')}
              />
              <Card style={{ padding: 0 }}>
                {report.missedRecurring.map((r, i) => (
                  <View key={r.expense.id} style={[styles.overRow, i > 0 && styles.rowBorder]}>
                    <Text style={styles.catName} numberOfLines={1}>
                      {r.expense.name}
                    </Text>
                    <Text style={styles.missedAmount}>{won(r.expense.amount)}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

/** 코멘트 한 줄. */
function Note({ note, first }: { note: ReportNote; first: boolean }) {
  const tone = TONE[note.tone];
  return (
    <View style={[styles.noteRow, !first && { marginTop: spacing.sm }]}>
      <Ionicons name={tone.icon} size={17} color={tone.color} />
      <Text style={styles.noteText}>{note.text}</Text>
    </View>
  );
}

/** 금액 한 줄과 지난달 대비. */
function Row({
  label,
  value,
  prev,
  tone,
  invert = false,
  last = false,
}: {
  label: string;
  value: number;
  prev: number;
  tone: string;
  /** 지출처럼 '늘어난 게 나쁜' 항목. 색을 뒤집는다. */
  invert?: boolean;
  last?: boolean;
}) {
  const delta = value - prev;
  const good = invert ? delta < 0 : delta > 0;
  return (
    <View style={[styles.flowRow, !last && styles.rowBorder]}>
      <Text style={styles.flowLabel}>{label}</Text>
      <View style={styles.flowRight}>
        <Text style={[styles.flowValue, { color: tone }]}>{won(value)}</Text>
        <Text
          style={[
            styles.flowDelta,
            { color: delta === 0 ? colors.textFaint : good ? colors.up : colors.down },
          ]}
        >
          {delta === 0 ? '지난달과 같음' : `${delta > 0 ? '▲' : '▼'} ${won(Math.abs(delta))}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  monthText: { color: colors.text, fontSize: font.h3, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  compareNote: { color: colors.textFaint, fontSize: font.small, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },

  notes: { marginBottom: spacing.md },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: { color: colors.text, fontSize: font.body, flex: 1, lineHeight: 21 },

  cardTitle: { color: colors.textMuted, fontSize: font.small },
  hint: { color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.sm },

  flowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  flowLabel: { color: colors.textMuted, fontSize: font.body },
  flowRight: { alignItems: 'flex-end' },
  flowValue: { fontSize: font.h3, fontWeight: '700' },
  flowDelta: { fontSize: font.tiny, marginTop: 2 },
  rate: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.md },

  targetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetPct: { color: colors.primary, fontSize: font.h3, fontWeight: '700' },
  targetAmount: { color: colors.text, fontSize: font.h2, fontWeight: '700', marginTop: spacing.xs, marginBottom: spacing.md },
  targetOf: { color: colors.textFaint, fontSize: font.body, fontWeight: '400' },

  netRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  netValue: { color: colors.text, fontSize: font.h2, fontWeight: '700', marginTop: 2 },
  gainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  gainLabel: { color: colors.textMuted, fontSize: font.small },
  gainValue: { color: colors.text, fontSize: font.body, fontWeight: '700' },

  list: { marginTop: spacing.lg },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  catName: { color: colors.text, fontSize: font.body, flex: 1, marginRight: spacing.md },
  catRight: { alignItems: 'flex-end' },
  catAmount: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  catDelta: { fontSize: font.tiny, marginTop: 2 },

  overRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  overAmount: { color: colors.down, fontSize: font.body, fontWeight: '700' },
  missedAmount: { color: colors.textMuted, fontSize: font.body, fontWeight: '700' },
});
