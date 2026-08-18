/** 대시보드: 목표 진척도가 한눈에 보이는 첫 화면. */

import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, DonutChart, LineChart, ProgressRing } from '../../src/components/charts';
import { Card, DeltaBadge, Divider, SectionHeader } from '../../src/components/ui';
import {
  assetAllocation,
  forecastGoal,
  monthlyCashflow,
  netWorthSeries,
  requiredMonthlySaving,
  seriesStartMonth,
} from '../../src/lib/analytics';
import {
  currentMonth,
  formatMonth,
  formatMonthShort,
  monthOf,
  monthsBetween,
} from '../../src/lib/date';
import { percent, percentFloor, shortWon, won } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../../src/theme';

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data } = useStore();

  const view = useMemo(() => {
    const month = currentMonth();
    const series = netWorthSeries(data.accounts, data.snapshots, seriesStartMonth(data, 12), month);
    const forecast = forecastGoal(
      series,
      data.settings.goalAmount,
      data.settings.monthlySavingTarget,
    );
    const required = requiredMonthlySaving(forecast.remaining, data.settings.goalDeadline);
    const cashflow = monthlyCashflow(data.transactions, month);
    const allocation = assetAllocation(data.accounts);
    const current = series.length > 0 ? series[series.length - 1] : null;
    const elapsedMonths = monthsBetween(monthOf(data.settings.startDate), month);

    return { month, series, forecast, required, cashflow, allocation, current, elapsedMonths };
  }, [data]);

  const { series, forecast, required, cashflow, allocation, current } = view;
  const net = current?.net ?? 0;
  const hasHistory = series.length >= 2;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl },
      ]}
    >
      {/* ---------------------------------------------------------- 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>moa</Text>
          <Text style={styles.headerSub}>
            {formatMonth(view.month)} · {view.elapsedMonths}개월째
          </Text>
        </View>
        <Link href="/goal" asChild>
          <Pressable hitSlop={8} style={styles.iconButton}>
            <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </Link>
      </View>

      {/* ------------------------------------------------- 진척도 링 카드 */}
      <Card style={styles.heroCard}>
        <ProgressRing progress={forecast.progress} size={196} thickness={16}>
          <Text style={styles.heroLabel}>순자산</Text>
          <Text style={styles.heroValue}>{shortWon(net)}</Text>
          <View style={styles.heroProgressRow}>
            <Text style={styles.heroPercent}>{percent(forecast.progress)}</Text>
            {current && current.delta !== 0 ? <DeltaBadge value={current.delta} suffix="원" /> : null}
          </View>
        </ProgressRing>

        <View style={styles.heroFooter}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>목표</Text>
            <Text style={styles.heroStatValue}>{shortWon(data.settings.goalAmount)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>남은 금액</Text>
            <Text style={[styles.heroStatValue, { color: colors.primary }]}>
              {forecast.achieved ? '달성! 🎉' : shortWon(forecast.remaining)}
            </Text>
          </View>
        </View>
      </Card>

      {/* --------------------------------------------------- 달성 예측 카드 */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.forecastHead}>
          <Ionicons name="trending-up" size={16} color={colors.up} />
          <Text style={styles.forecastTitle}>목표 달성 예측</Text>
        </View>

        {forecast.achieved ? (
          <Text style={styles.forecastBig}>목표를 달성했습니다 🎉</Text>
        ) : forecast.monthsRemaining === null ? (
          <>
            <Text style={styles.forecastBig}>예측할 데이터가 부족해요</Text>
            <Text style={styles.forecastHint}>
              잔액을 두 달 이상 기록하거나, 목표 설정에서 월 저축 목표를 입력하면 예상 달성 시점을
              계산해 드려요.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.forecastBig}>
              {forecast.estimatedMonth ? formatMonth(forecast.estimatedMonth) : '-'} 달성 예상
            </Text>
            <Text style={styles.forecastHint}>
              {forecast.rateSource === 'history'
                ? `최근 순자산 증가 속도 월 ${shortWon(forecast.monthlyRate)} 기준`
                : `설정한 월 저축 목표 ${shortWon(forecast.monthlyRate)} 기준`}
              {' · '}
              {forecast.monthsRemaining}개월 남음
            </Text>
          </>
        )}

        {required !== null ? (
          <>
            <Divider />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>시한까지 매달 필요한 금액</Text>
              <Text style={[styles.rowValue, { color: colors.warn }]}>{won(required)}</Text>
            </View>
          </>
        ) : null}
      </Card>

      {/* ------------------------------------------------------ 순자산 추이 */}
      <SectionHeader title="순자산 추이" action="자산 관리" onAction={() => router.push('/accounts')} />
      <Card>
        {hasHistory ? (
          <>
            <LineChart
              points={series.map((p) => ({ label: formatMonthShort(p.month), value: p.net }))}
              height={210}
              trendMonths={data.settings.showForecastLine ? Math.min(6, forecast.monthsRemaining ?? 0) : 0}
              trendRate={forecast.monthlyRate}
            />
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>실제 순자산</Text>
              </View>
              {data.settings.showForecastLine && forecast.monthlyRate > 0 ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, styles.legendDashed]} />
                  <Text style={styles.legendText}>현재 속도 추세</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.placeholder}>
            잔액 기록이 두 달 이상 쌓이면 추이 그래프가 나타납니다.
          </Text>
        )}

        <Divider />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>총자산</Text>
          <Text style={styles.rowValue}>{won(current?.assets ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>총부채</Text>
          <Text style={[styles.rowValue, { color: colors.down }]}>
            {current && current.liabilities > 0 ? `-${won(current.liabilities)}` : won(0)}
          </Text>
        </View>
      </Card>

      {/* ------------------------------------------------------ 이번 달 요약 */}
      <SectionHeader title="이번 달 현금흐름" action="가계부" onAction={() => router.push('/ledger')} />
      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>수입</Text>
          <Text style={[styles.statValue, { color: colors.up }]}>{shortWon(cashflow.income)}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>지출</Text>
          <Text style={[styles.statValue, { color: colors.down }]}>{shortWon(cashflow.expense)}</Text>
        </Card>
      </View>
      <Card style={{ marginTop: spacing.sm }}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>이번 달 저축액</Text>
          <Text
            style={[
              styles.rowValue,
              { color: cashflow.saving >= 0 ? colors.up : colors.down, fontSize: font.h3 },
            ]}
          >
            {won(cashflow.saving)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>저축률</Text>
          <Text style={styles.rowValue}>
            {cashflow.income > 0 ? percent(cashflow.savingRate) : '수입 기록 없음'}
          </Text>
        </View>
        {data.settings.monthlySavingTarget > 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>월 저축 목표 달성률</Text>
            <Text style={styles.rowValue}>
              {percentFloor(cashflow.saving / data.settings.monthlySavingTarget)}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* --------------------------------------------------- 월별 저축 추이 */}
      {hasHistory ? (
        <>
          <SectionHeader title="월별 순자산 증가액" />
          <Card>
            <BarChart
              bars={series
                .slice(1)
                .map((p) => ({ label: formatMonthShort(p.month), value: p.delta }))}
              height={180}
              targetLine={data.settings.monthlySavingTarget || undefined}
            />
          </Card>
        </>
      ) : null}

      {/* ------------------------------------------------------- 자산 구성 */}
      {allocation.length > 0 ? (
        <>
          <SectionHeader title="자산 구성" />
          <Card>
            <DonutChart
              slices={allocation.map((a) => ({
                label: `${a.emoji} ${a.name}`,
                amount: a.amount,
              }))}
              centerLabel="총자산"
              centerValue={shortWon(current?.assets ?? 0)}
            />
          </Card>
        </>
      ) : (
        <>
          <SectionHeader title="자산 구성" />
          <Card onPress={() => router.push('/account/edit')}>
            <Text style={styles.placeholder}>
              계좌를 등록하면 자산 구성과 순자산이 계산됩니다. 눌러서 첫 계좌를 추가해 보세요.
            </Text>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  greeting: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: { alignItems: 'center', paddingVertical: spacing.xl },
  heroLabel: { color: colors.textFaint, fontSize: font.tiny },
  heroValue: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 2 },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  heroPercent: { color: colors.primary, fontSize: font.body, fontWeight: '700' },

  heroFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, alignSelf: 'stretch' },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroStatLabel: { color: colors.textFaint, fontSize: font.tiny },
  heroStatValue: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  heroDivider: { width: 1, height: 32, backgroundColor: colors.border },

  forecastHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  forecastTitle: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  forecastBig: { color: colors.text, fontSize: font.h2, fontWeight: '700' },
  forecastHint: { color: colors.textMuted, fontSize: font.small, marginTop: 6, lineHeight: 19 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: { color: colors.textMuted, fontSize: font.small },
  rowValue: { color: colors.text, fontSize: font.body, fontWeight: '600' },

  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, gap: 6 },
  statLabel: { color: colors.textFaint, fontSize: font.tiny },
  statValue: { fontSize: font.h3, fontWeight: '700' },

  legendRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 2.5, borderRadius: 2 },
  legendDashed: { backgroundColor: colors.up, opacity: 0.8 },
  legendText: { color: colors.textFaint, fontSize: font.tiny },

  placeholder: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
});
