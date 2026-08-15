import { useState } from 'react'
import { CAPITALS, capital } from '../data/capitals'
import { WEEKDAY_LABELS, dayNumber, lastDays, todayKey } from '../lib/date'
import { useAppState } from '../lib/store'
import {
  capitalGrowth,
  cumulativeSeries,
  habitusIndex,
  weakestCapital,
  weekdayXp,
  xpToNext,
  type CapitalGrowth,
} from '../lib/growth'
import type { CapitalId } from '../types'
import { Bar, Card, CardHead, TableView } from '../components/ui'
import { Columns, GrowthCurve, type ColumnDatum, type CurvePoint } from '../components/charts'

/** 불씨 — 최근 활동을 4단계로 보여준다. 색이 아니라 글자로도 읽히게. */
function Ember({ vitality }: { vitality: number }) {
  const stage =
    vitality >= 0.7
      ? { icon: '🔥', label: '활활', tone: 'var(--good)' }
      : vitality >= 0.4
        ? { icon: '🔥', label: '타는 중', tone: 'var(--ink-2)' }
        : vitality > 0
          ? { icon: '🌫️', label: '식는 중', tone: 'var(--warn)' }
          : { icon: '🌑', label: '꺼짐', tone: 'var(--muted)' }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: stage.tone }}>
      <span aria-hidden style={{ opacity: vitality >= 0.4 ? 1 : 0.6 }}>
        {stage.icon}
      </span>
      {stage.label}
    </span>
  )
}

function CapitalCard({
  g,
  expanded,
  onToggle,
}: {
  g: CapitalGrowth
  expanded: boolean
  onToggle: () => void
}) {
  const color = `var(${g.cssVar})`
  const meta = capital(g.id)

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full rounded-2xl px-3.5 py-3 text-left transition-colors active:bg-sunken"
      >
        <div className="flex items-center gap-3">
          {/* 레벨 배지 */}
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-white"
            style={{ background: color }}
          >
            <span className="text-[9px] leading-none font-medium opacity-85">Lv</span>
            <span className="tnum text-[17px] leading-none font-bold">{g.level}</span>
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-1.5">
              <span className="truncate text-[15px] font-semibold text-ink">{g.name}</span>
              <Ember vitality={g.vitality} />
            </span>
            <span className="mt-1.5 block">
              <Bar value={g.progress} color={color} height={5} />
            </span>
            <span className="tnum mt-1 block text-[10.5px] text-muted">
              {g.intoLevel} / {g.needed} XP · 다음 레벨까지 {g.needed - g.intoLevel}
            </span>
          </span>

          <span aria-hidden className="shrink-0 text-[11px] text-muted">
            {expanded ? '▴' : '▾'}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="animate-rise mx-3.5 mb-3 rounded-xl bg-sunken px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-ink2">
            {meta.emoji} {meta.tagline} — {meta.grows}
          </p>
          <dl className="tnum mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <dt className="text-muted">누적</dt>
              <dd className="font-medium text-ink">{g.totalXp} XP</dd>
            </div>
            <div>
              <dt className="text-muted">등록된 행동</dt>
              <dd className="font-medium text-ink">{g.actionCount}개</dd>
            </div>
            <div>
              <dt className="text-muted">마지막 활동</dt>
              <dd className="font-medium text-ink">
                {g.daysIdle === null ? '없음' : g.daysIdle === 0 ? '오늘' : `${g.daysIdle}일 전`}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </li>
  )
}

type Scope = 'all' | CapitalId

export function Growth() {
  const state = useAppState()
  const today = todayKey()
  const growth = capitalGrowth(state, today)
  const index = habitusIndex(growth)
  const weakest = weakestCapital(growth)

  const [open, setOpen] = useState<CapitalId | null>(null)
  const [scope, setScope] = useState<Scope>('all')

  const days = lastDays(30, today)
  const series = cumulativeSeries(state, days, scope === 'all' ? undefined : scope)
  const curve: CurvePoint[] = series.map((s) => ({
    label: `${dayNumber(s.date)}`,
    total: s.total,
    tooltip:
      s.gained > 0
        ? `${s.date} · 누적 ${s.total} XP (그날 +${s.gained})`
        : `${s.date} · 누적 ${s.total} XP (그날 쉼)`,
  }))

  const wd = weekdayXp(state, days)
  const weekdayData: ColumnDatum[] = wd.map((v, i) => ({
    label: WEEKDAY_LABELS[i],
    value: v,
    tooltip: `${WEEKDAY_LABELS[i]}요일 · 평균 ${Math.round(v)} XP`,
  }))

  const totalXp = growth.reduce((sum, g) => sum + g.totalXp, 0)
  const scopeColor = scope === 'all' ? 'var(--accent)' : `var(${capital(scope).cssVar})`

  return (
    <div className="space-y-3">
      <header className="px-1 pt-1">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">성장</h1>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
          레벨은 쌓은 것, 불씨는 지금. 레벨은 쉬어도 내려가지 않습니다.
        </p>
      </header>

      <Card>
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted">아비투스 지수</p>
            <p className="mt-1 text-[38px] leading-none font-semibold tracking-tight text-ink">
              {index}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              일곱 자본의 기하평균이라, 하나만 몰아 키우면 잘 오르지 않습니다.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-medium text-muted">총 누적</p>
            <p className="tnum mt-1 text-[20px] leading-none font-semibold text-ink">{totalXp}</p>
            <p className="mt-0.5 text-[10px] text-muted">XP</p>
          </div>
        </div>

        {weakest ? (
          <p className="mx-4 mb-4 rounded-xl bg-sunken px-3 py-2.5 text-[11px] leading-relaxed text-ink2">
            지금 가장 얇은 곳은{' '}
            <span className="font-medium text-ink">
              {weakest.emoji} {weakest.name}
            </span>
            (Lv {weakest.level}). 다음 레벨까지 {weakest.needed - weakest.intoLevel} XP 남았어요.
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHead title="일곱 자본" hint="눌러서 펼치면 자세히 볼 수 있어요" />
        <ul className="px-1 pb-2">
          {growth.map((g) => (
            <CapitalCard
              key={g.id}
              g={g}
              expanded={open === g.id}
              onToggle={() => setOpen(open === g.id ? null : g.id)}
            />
          ))}
        </ul>
      </Card>

      <Card>
        <CardHead
          title="성장 곡선"
          hint="최근 30일 누적. 평평한 구간은 그때 쌓지 않았다는 뜻입니다."
        />

        {/* 필터는 카드 위 한 줄로 — 곡선과 표가 같은 구간을 본다 */}
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
          caption="일별 누적 경험치"
          head={['날짜', '그날 획득', '누적']}
          rows={series.map((s) => [s.date, s.gained, s.total])}
        />
      </Card>

      <Card>
        <CardHead title="요일별 평균" hint="최근 30일. 어느 요일에 무너지는지 보입니다." />
        <Columns data={weekdayData} unit="" />
        <TableView
          caption="요일별 평균 경험치"
          head={['요일', '평균 XP']}
          rows={weekdayData.map((d) => [`${d.label}요일`, Math.round(d.value)])}
        />
      </Card>

      <Card>
        <CardHead title="레벨은 어떻게 오르나요" />
        <div className="space-y-2 px-4 pb-4 text-[12px] leading-relaxed text-ink2">
          <p>
            행동을 하면 무게만큼 경험치가 들어옵니다 —{' '}
            <span className="font-medium text-ink">가볍게 10 · 보통 20 · 깊게 35</span>.
          </p>
          <p>
            연속으로 이어가면 하루마다 3%씩 더 받고, 14일째에 최대{' '}
            <span className="font-medium text-ink">1.42배</span>가 됩니다.
          </p>
          <p className="tnum">
            레벨 1→2는 {xpToNext(1)} XP, 2→3은 {xpToNext(2)} XP… 뒤로 갈수록 40씩 늘어납니다.
          </p>
          <p>
            <span className="font-medium text-ink">레벨은 내려가지 않습니다.</span> 대신 최근 14일
            활동으로 계산하는 불씨가 식습니다. 쌓은 건 남고, 지금 상태는 따로 보입니다.
          </p>
        </div>
      </Card>
    </div>
  )
}
