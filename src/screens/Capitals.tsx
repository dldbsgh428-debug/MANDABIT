import { useState } from 'react'
import { CAPITALS, capital } from '../data/capitals'
import { WEEKDAY_LABELS, dayNumber, lastDays, todayKey } from '../lib/date'
import { useAppState } from '../lib/store'
import {
  averageRate,
  capitalStats,
  countsInRange,
  cumulativeCounts,
  cumulativeRate,
  fullDays,
  overallStreak,
  pct,
  weekdayRates,
  type CapitalStat,
} from '../lib/stats'
import type { CapitalId } from '../types'
import { Bar, Card, CardHead, TableView } from '../components/ui'
import { Columns, GrowthCurve, type ColumnDatum, type CurvePoint } from '../components/charts'

type RangeId = '7' | '30' | '90'

const RANGES: { id: RangeId; label: string }[] = [
  { id: '7', label: '최근 7일' },
  { id: '30', label: '최근 30일' },
  { id: '90', label: '최근 90일' },
]

function CapitalRow({
  s,
  expanded,
  onToggle,
}: {
  s: CapitalStat
  expanded: boolean
  onToggle: () => void
}) {
  const color = `var(${s.cssVar})`
  const meta = capital(s.id)

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full rounded-2xl px-3.5 py-3 text-left transition-colors active:bg-sunken"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-[18px]">
            {s.emoji}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-medium text-ink">{s.name}</span>
              <span className="tnum shrink-0 text-[11px] text-muted">
                지금까지 {s.total}회
              </span>
            </span>
            <span className="mt-1.5 block">
              <Bar value={s.weekRate.value} color={color} height={5} />
            </span>
            <span className="tnum mt-1 block text-[10.5px] text-muted">
              최근 한 주 {s.week}회 · 예정한 것의 {pct(s.weekRate)}%
            </span>
          </span>

          <span aria-hidden className="shrink-0 text-[11px] text-muted">
            {expanded ? '▴' : '▾'}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="mx-3.5 mb-3 rounded-xl bg-sunken px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-ink2">
            {meta.tagline} — {meta.grows}
          </p>
          <dl className="tnum mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <dt className="text-muted">등록된 행동</dt>
              <dd className="font-medium text-ink">{s.actionCount}개</dd>
            </div>
            <div>
              <dt className="text-muted">최근 한 주</dt>
              <dd className="font-medium text-ink">{s.week}회</dd>
            </div>
            <div>
              <dt className="text-muted">마지막</dt>
              <dd className="font-medium text-ink">
                {s.daysIdle === null ? '없음' : s.daysIdle === 0 ? '오늘' : `${s.daysIdle}일 전`}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </li>
  )
}

type Scope = 'all' | CapitalId

export function Capitals() {
  const state = useAppState()
  const today = todayKey()
  const stats = capitalStats(state, today)

  const [open, setOpen] = useState<CapitalId | null>(null)
  const [range, setRange] = useState<RangeId>('30')
  const [scope, setScope] = useState<Scope>('all')

  const days = lastDays(Number(range), today)
  const counts = countsInRange(state, days)
  const cum = cumulativeRate(state, days)
  const avg = averageRate(state, days)
  const perfect = fullDays(state, days)
  const streak = overallStreak(state, today)

  const series = cumulativeCounts(state, days, scope === 'all' ? undefined : scope)
  const curve: CurvePoint[] = series.map((s) => ({
    label: `${dayNumber(s.date)}`,
    total: s.total,
    tooltip:
      s.gained > 0
        ? `${s.date} · 누적 ${s.total}회 (그날 ${s.gained}회)`
        : `${s.date} · 누적 ${s.total}회 (그날 쉼)`,
  }))

  const wd = weekdayRates(state, days)
  const weekdayData: ColumnDatum[] = wd.map((r, i) => ({
    label: WEEKDAY_LABELS[i],
    value: r.value * 100,
    tooltip: `${WEEKDAY_LABELS[i]}요일 · 평균 ${pct(r)}% (${r.done}일 기록)`,
  }))

  const active = stats.filter((s) => s.actionCount > 0)
  const totalCount = CAPITALS.reduce((sum, c) => sum + counts[c.id], 0)
  const scopeColor = scope === 'all' ? 'var(--accent)' : `var(${capital(scope).cssVar})`

  const sortedByShare = [...active].sort((a, b) => counts[b.id] - counts[a.id])
  const thickest = sortedByShare[0]
  const thinnest = sortedByShare[sortedByShare.length - 1]

  return (
    <div className="space-y-3">
      <header className="px-1 pt-1">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">자본</h1>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
          일곱 자본에 시간을 어떻게 나눠 쓰고 있는지 봅니다.
        </p>
      </header>

      {/* 필터는 한 줄로 위에 모아 둔다 — 아래 카드가 모두 같은 구간을 본다 */}
      <div className="flex gap-1 rounded-2xl bg-sunken p-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
            className={`min-h-9 flex-1 rounded-xl text-[12px] font-medium transition-colors ${
              range === r.id ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-muted'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-hair">
          <p className="text-[11px] font-medium text-muted">실천 횟수</p>
          <p className="tnum mt-1 text-[24px] leading-none font-semibold text-ink">{totalCount}</p>
          <p className="mt-1 text-[10.5px] text-muted">최근 {range}일</p>
        </div>
        <div className="rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-hair">
          <p className="text-[11px] font-medium text-muted">달성률</p>
          <p className="tnum mt-1 text-[24px] leading-none font-semibold text-ink">{pct(cum)}%</p>
          <p className="mt-1 text-[10.5px] text-muted">
            {cum.done} / {cum.total}
          </p>
        </div>
        <div className="rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-hair">
          <p className="text-[11px] font-medium text-muted">다 채운 날</p>
          <p className="tnum mt-1 text-[24px] leading-none font-semibold text-ink">{perfect}</p>
          <p className="mt-1 text-[10.5px] text-muted">일</p>
        </div>
        <div className="rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-hair">
          <p className="text-[11px] font-medium text-muted">연속 기록</p>
          <p className="tnum mt-1 text-[24px] leading-none font-semibold text-ink">{streak}</p>
          <p className="mt-1 text-[10.5px] text-muted">일</p>
        </div>
      </div>

      <Card>
        <CardHead
          title="일곱 자본"
          hint="눌러서 펼치면 자세히 볼 수 있어요"
        />
        <ul className="px-1 pb-2">
          {stats.map((s) => (
            <CapitalRow
              key={s.id}
              s={s}
              expanded={open === s.id}
              onToggle={() => setOpen(open === s.id ? null : s.id)}
            />
          ))}
        </ul>
      </Card>

      <Card>
        <CardHead
          title="균형"
          hint={
            thickest && thinnest && thickest.id !== thinnest.id
              ? `${thickest.name}에 가장 많이, ${thinnest.name}에 가장 적게 썼습니다`
              : '자본별 실천 비중'
          }
        />
        <div className="px-4 pb-3">
          {/* 비중 막대 — 색은 자본(개체)을 따라가므로 순위가 바뀌어도 그대로다.
              0~100 균형 점수를 따로 매기지 않는다. 지어낸 한 숫자보다
              막대와 실제 횟수가 기울기를 더 정직하게 보여준다. */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken">
            {CAPITALS.map((c) =>
              counts[c.id] > 0 ? (
                <div
                  key={c.id}
                  title={`${c.name} ${counts[c.id]}회`}
                  style={{
                    width: `${(counts[c.id] / Math.max(totalCount, 1)) * 100}%`,
                    background: `var(${c.cssVar})`,
                    // 인접한 색면은 테두리가 아니라 서피스 간격으로 떼어 놓는다
                    marginRight: 2,
                  }}
                />
              ) : null,
            )}
          </div>

          <ul className="mt-3 space-y-1.5">
            {sortedByShare.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: `var(${s.cssVar})` }}
                />
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink2">{s.name}</span>
                <span className="tnum shrink-0 text-[12px] font-medium text-ink">
                  {counts[s.id]}회
                </span>
                <span className="tnum w-9 shrink-0 text-right text-[11px] text-muted">
                  {totalCount ? Math.round((counts[s.id] / totalCount) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
        <TableView
          caption="자본별 실천 횟수"
          head={['자본', '횟수', '비중', '지금까지']}
          rows={sortedByShare.map((s) => [
            s.name,
            `${counts[s.id]}회`,
            `${totalCount ? Math.round((counts[s.id] / totalCount) * 100) : 0}%`,
            `${s.total}회`,
          ])}
        />
      </Card>

      <Card>
        <CardHead title="쌓인 기록" hint="누적 실천 횟수. 평평한 구간은 그때 쉬었다는 뜻입니다." />

        <div className="hide-scrollbar mb-1 overflow-x-auto px-4">
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-pressed={scope === 'all'}
              onClick={() => setScope('all')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                scope === 'all' ? 'bg-sunken text-ink' : 'text-muted'
              }`}
            >
              전체
            </button>
            {CAPITALS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={scope === c.id}
                onClick={() => setScope(c.id)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                  scope === c.id ? 'bg-sunken text-ink' : 'text-muted'
                }`}
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: `var(${c.cssVar})` }}
                />
                {c.short}
              </button>
            ))}
          </div>
        </div>

        <GrowthCurve points={curve} color={scopeColor} />
        <TableView
          caption="일별 누적 실천 횟수"
          head={['날짜', '그날', '누적']}
          rows={series.map((s) => [s.date, s.gained, s.total])}
        />
      </Card>

      <Card>
        <CardHead title="요일별 달성률" hint="어느 요일에 무너지는지 보입니다" />
        <Columns data={weekdayData} unit="%" />
        <TableView
          caption="요일별 평균 달성률"
          head={['요일', '평균', '기록한 날']}
          rows={weekdayData.map((d, i) => [`${d.label}요일`, `${Math.round(d.value)}%`, `${wd[i].done}일`])}
        />
      </Card>

      <Card>
        <CardHead title="한 줄 요약" />
        <p className="px-4 pb-4 text-[13px] leading-relaxed text-ink2">
          {cum.total === 0
            ? '아직 기록이 없습니다. 오늘 하나만 해보세요.'
            : `최근 ${range}일 동안 ${totalCount}번 실천했고, 예정한 것의 ${pct(cum)}%를 지켰습니다. 하루 평균은 ${pct(avg)}%입니다.` +
              (thinnest && thickest && thinnest.id !== thickest.id
                ? ` ${thinnest.name}이(가) 가장 얇습니다.`
                : '')}
        </p>
      </Card>
    </div>
  )
}
