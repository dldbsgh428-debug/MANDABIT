import { useState } from 'react'
import {
  addMonths,
  daysInMonth,
  elapsedDaysInMonth,
  formatMonthLabel,
  monthKey,
  todayKey,
} from '../lib/date'
import { currentMonth, setMonthReview, useAppState } from '../lib/store'
import { averageRate, cumulativeRate, habitStats, pct, perfectDayCount } from '../lib/stats'
import { Button, Card, CardHeader, EmptyState, Field, StatTile, TableView, TextArea } from '../components/ui'
import { MonthGrid } from '../components/tracker/MonthGrid'
import { ColumnChart, type BarDatum } from '../components/charts/Bars'

/** 달을 주 단위로 잘라 평균 달성률을 낸다 — 이미지의 '주간 달성률 차트'. */
function weeklyBuckets(days: string[]): string[][] {
  const weeks: string[][] = []
  let bucket: string[] = []
  for (const d of days) {
    bucket.push(d)
    if (bucket.length === 7) {
      weeks.push(bucket)
      bucket = []
    }
  }
  if (bucket.length) weeks.push(bucket)
  return weeks
}

export function Tracker({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const state = useAppState()
  const [month, setMonth] = useState(currentMonth())
  const today = todayKey()

  const days = daysInMonth(month)
  const elapsed = elapsedDaysInMonth(month, today)
  const active = [...state.habits]
    .filter((h) => !h.archived)
    .sort((a, b) => a.order - b.order)
  // 격자는 달 전체를 그리지만, 달성률·연속은 지난 날짜만 분모로 삼는다.
  const stats = active.map((h) => habitStats(state, h, elapsed))

  const cum = cumulativeRate(state, elapsed)
  const avg = averageRate(state, elapsed)
  const perfect = perfectDayCount(state, elapsed)

  // 아직 오지 않은 주는 막대를 세우지 않는다 — 0%로 읽히면 거짓말이 된다.
  const weekData: BarDatum[] = weeklyBuckets(days)
    .map((w, i) => ({ week: i + 1, scoped: w.filter((d) => d <= today) }))
    .filter((w) => w.scoped.length > 0)
    .map(({ week, scoped }) => {
      const r = averageRate(state, scoped)
      return {
        label: `${week}주`,
        value: r.value,
        tooltip: `${week}주차 · 평균 ${pct(r)}% (${scoped.length}일 중 ${r.total}일 기록)`,
      }
    })

  const review = state.reviews[month] ?? { month, keep: '', drop: '', next: '' }
  const isCurrent = month === monthKey(today)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-ink">
            {formatMonthLabel(month)}
          </h1>
          <p className="mt-0.5 text-[11px] text-muted">
            {isCurrent ? `${elapsed.length}일 경과 · ${days.length}일 중` : `${days.length}일`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="quiet" onClick={() => setMonth(addMonths(month, -1))} title="이전 달">
            ‹
          </Button>
          {!isCurrent ? (
            <Button variant="ghost" onClick={() => setMonth(currentMonth())}>
              이번 달
            </Button>
          ) : null}
          <Button variant="quiet" onClick={() => setMonth(addMonths(month, 1))} title="다음 달">
            ›
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="지금까지 달성률"
          value={pct(cum)}
          unit="%"
          meter={cum.value}
          sub={`${cum.done} / ${cum.total}칸`}
        />
        <StatTile label="하루 평균" value={pct(avg)} unit="%" meter={avg.value} />
        <StatTile label="완벽한 하루" value={perfect} unit="일" sub="예정 습관 전부 완료" />
        <StatTile label="습관 수" value={active.length} unit="개" sub="보관 제외" />
      </div>

      <Card>
        <CardHeader
          title="습관 트래커"
          hint="가로로 넘기면 한 달이 한눈에 들어옵니다"
        />
        {active.length === 0 ? (
          <EmptyState
            title="추적할 습관이 없어요"
            body="습관 탭에서 먼저 습관을 만들어 주세요."
          />
        ) : (
          <MonthGrid state={state} month={month} days={days} onOpenDay={onOpenDay} stats={stats} />
        )}
      </Card>

      <Card>
        <CardHeader title="주간 달성률" hint="달을 7일씩 끊어 평균을 냅니다" />
        <ColumnChart data={weekData} />
        <TableView
          caption={`${formatMonthLabel(month)} 주간 달성률`}
          head={['주차', '평균 달성률']}
          rows={weekData.map((w) => [w.label, `${Math.round(w.value * 100)}%`])}
        />
      </Card>

      <Card>
        <CardHeader
          title="이 달의 리뷰"
          hint="한 달을 닫는 세 문장. 다음 달 습관 목록이 여기서 나옵니다."
        />
        <div className="space-y-3 px-4 pb-4">
          <Field label="계속할 것">
            <TextArea
              rows={2}
              value={review.keep}
              placeholder="효과가 있었던 습관·루틴"
              onChange={(e) => setMonthReview(month, { keep: e.target.value })}
            />
          </Field>
          <Field label="그만둘 것">
            <TextArea
              rows={2}
              value={review.drop}
              placeholder="계속 미끄러진 습관, 무리했던 계획"
              onChange={(e) => setMonthReview(month, { drop: e.target.value })}
            />
          </Field>
          <Field label="다음 달에 새로 시도할 것">
            <TextArea
              rows={2}
              value={review.next}
              placeholder="어떤 자본을 키울까요?"
              onChange={(e) => setMonthReview(month, { next: e.target.value })}
            />
          </Field>
        </div>
      </Card>
    </div>
  )
}
