import { useState } from 'react'
import { CAPITALS } from '../data/capitals'
import {
  WEEKDAY_LABELS,
  addDays,
  dayNumber,
  elapsedDaysInMonth,
  formatMonthLabel,
  monthKey,
  todayKey,
} from '../lib/date'
import { useAppState } from '../lib/store'
import {
  averageRate,
  capitalScores,
  currentStreak,
  cumulativeRate,
  dayRate,
  pct,
  perfectDayCount,
  weekdayRates,
} from '../lib/stats'
import { Card, CardHeader, StatTile, TableView } from '../components/ui'
import { ColumnChart, HorizontalBars, type BarDatum } from '../components/charts/Bars'
import { TrendLine, type TrendPoint } from '../components/charts/TrendLine'

type RangeId = '7' | '30' | 'month'

const RANGES: { id: RangeId; label: string }[] = [
  { id: '7', label: '최근 7일' },
  { id: '30', label: '최근 30일' },
  { id: 'month', label: '이번 달' },
]

function rangeDays(range: RangeId, today: string): string[] {
  if (range === 'month') return elapsedDaysInMonth(monthKey(today), today)
  const n = range === '7' ? 7 : 30
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)))
}

export function Insights() {
  const state = useAppState()
  const today = todayKey()
  const [range, setRange] = useState<RangeId>('30')
  const days = rangeDays(range, today)

  const scores = capitalScores(state, days)
  const active = scores.filter((s) => s.habitCount > 0)
  const cum = cumulativeRate(state, days)
  const avg = averageRate(state, days)

  const capitalData: BarDatum[] = active.map((s) => ({
    label: s.name,
    value: s.rate.value,
    color: `var(${s.cssVar})`,
    tooltip: `${s.emoji} ${s.name} · ${pct(s.rate)}% (${s.rate.done}/${s.rate.total}칸, 습관 ${s.habitCount}개)`,
  }))

  const trend: TrendPoint[] = days.map((d) => {
    const r = dayRate(state, d)
    return {
      label: `${dayNumber(d)}`,
      value: r.total === 0 ? null : r.value,
      tooltip:
        r.total === 0
          ? `${d} · 예정된 습관 없음`
          : `${d} · ${pct(r)}% (${r.done}/${r.total})`,
    }
  })

  const wd = weekdayRates(state, days)
  const weekdayData: BarDatum[] = wd.map((r, i) => ({
    label: WEEKDAY_LABELS[i],
    value: r.value,
    tooltip: `${WEEKDAY_LABELS[i]}요일 · 평균 ${pct(r)}% (${r.done}일 기록)`,
  }))

  // 가장 약한 자본 하나만 짚어준다 — 일곱 개를 다 강조하면 아무것도 강조하지 않는 것.
  const weakest = [...active].sort((a, b) => a.rate.value - b.rate.value)[0]
  const strongest = [...active].sort((a, b) => b.rate.value - a.rate.value)[0]
  const untouched = scores.filter((s) => s.habitCount === 0)

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">나의 아비투스</h1>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          7가지 자본에 시간을 어떻게 나눠 쓰고 있는지 봅니다
        </p>
      </div>

      {/* 필터는 한 줄로 위에 모아 둔다 — 카드 안에 개별 필터를 두지 않는다 */}
      <div className="flex gap-1 rounded-xl bg-sunken p-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              range === r.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink2'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="누적 달성률" value={pct(cum)} unit="%" meter={cum.value} sub={`${cum.done}/${cum.total}칸`} />
        <StatTile label="하루 평균" value={pct(avg)} unit="%" meter={avg.value} />
        <StatTile label="연속 달성" value={currentStreak(state, today)} unit="일" accent="var(--accent)" />
        <StatTile label="완벽한 하루" value={perfectDayCount(state, days)} unit="일" />
      </div>

      <Card>
        <CardHeader
          title="자본 균형"
          hint={
            weakest && strongest && weakest.id !== strongest.id
              ? `가장 두터운 곳은 ${strongest.name}, 가장 얇은 곳은 ${weakest.name}입니다`
              : '자본별 달성률'
          }
        />
        {capitalData.length ? (
          <>
            <HorizontalBars data={capitalData} />
            <TableView
              caption="자본별 달성률"
              head={['자본', '달성률', '완료/예정', '습관 수']}
              rows={active.map((s) => [
                `${s.emoji} ${s.name}`,
                `${pct(s.rate)}%`,
                `${s.rate.done}/${s.rate.total}`,
                `${s.habitCount}개`,
              ])}
            />
          </>
        ) : (
          <p className="px-4 pb-4 text-xs text-muted">습관을 추가하면 자본 균형이 나타납니다.</p>
        )}

        {untouched.length ? (
          <div className="mx-4 mb-4 rounded-xl bg-sunken px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-ink2">
              아직 습관이 없는 자본:{' '}
              <span className="font-medium text-ink">
                {untouched.map((s) => `${s.emoji} ${s.name}`).join(' · ')}
              </span>
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              {untouched[0].emoji} {untouched[0].name}은(는){' '}
              {CAPITALS.find((c) => c.id === untouched[0].id)?.hint}로 자랍니다.
            </p>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="달성률 추이" hint="예정된 습관이 없던 날은 선을 끊었습니다" />
        <TrendLine points={trend} />
        <TableView
          caption="일별 달성률"
          head={['날짜', '달성률', '완료/예정']}
          rows={days.map((d) => {
            const r = dayRate(state, d)
            return [d, r.total === 0 ? '–' : `${pct(r)}%`, r.total === 0 ? '–' : `${r.done}/${r.total}`]
          })}
        />
      </Card>

      <Card>
        <CardHeader title="요일별 평균" hint="어느 요일에 루틴이 무너지는지 보입니다" />
        <ColumnChart data={weekdayData} />
        <TableView
          caption="요일별 평균 달성률"
          head={['요일', '평균 달성률', '기록한 날']}
          rows={weekdayData.map((d, i) => [
            `${d.label}요일`,
            `${Math.round(d.value * 100)}%`,
            `${wd[i].done}일`,
          ])}
        />
      </Card>

      <Card>
        <CardHeader
          title={`${formatMonthLabel(monthKey(today))} 한 줄 요약`}
          hint="숫자보다 문장이 오래 남습니다"
        />
        <p className="px-4 pb-4 text-[13px] leading-relaxed text-ink2">
          {cum.total === 0
            ? '아직 기록이 없습니다. 오늘 한 칸만 채워보세요.'
            : `${days.length}일 동안 ${cum.done}칸을 채웠고, 평균 ${pct(avg)}%를 지켰습니다. ` +
              (weakest && weakest.rate.value < 0.5
                ? `${weakest.name}이(가) ${pct(weakest.rate)}%로 가장 얇습니다 — 다음 주엔 여기에 한 칸만 더 써보세요.`
                : '일곱 자본이 고르게 자라고 있습니다. 지금 리듬을 유지하세요.')}
        </p>
      </Card>
    </div>
  )
}
