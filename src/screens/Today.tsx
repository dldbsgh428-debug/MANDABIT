import { useState } from 'react'
import { capital, capitalColor } from '../data/capitals'
import { MOODS } from '../data/presets'
import { formatDay, greeting, todayKey } from '../lib/date'
import { logFor, setMood, setNote, toggleAction, useAppState } from '../lib/store'
import {
  WEIGHT_LABEL,
  capitalGrowth,
  coolingCapital,
  didDo,
  habitusIndex,
  overallStreak,
  streakAt,
  todayProgress,
  xpPreview,
} from '../lib/growth'
import type { Action, Mood } from '../types'
import { Bar, Card, CardHead, Empty, TextArea } from '../components/ui'

function ActionRow({
  action,
  done,
  xp,
  streak,
  onToggle,
}: {
  action: Action
  done: boolean
  xp: number
  streak: number
  onToggle: () => void
}) {
  const color = capitalColor(action.capital)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors active:bg-sunken"
    >
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-full transition-all duration-200"
        style={{
          background: done ? color : 'transparent',
          boxShadow: done ? 'none' : 'inset 0 0 0 1.5px var(--axis)',
        }}
      >
        {done ? (
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#fff" strokeWidth="2.4">
            <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[15px] leading-tight ${done ? 'text-muted line-through' : 'text-ink'}`}
        >
          {action.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
            {capital(action.capital).short}
          </span>
          <span>{WEIGHT_LABEL[action.weight]}</span>
          {action.cue ? <span>· {action.cue}</span> : null}
          {streak > 1 ? <span className="text-ink2">🔥 {streak}일째</span> : null}
        </span>
      </span>

      <span
        className={`tnum shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold ${
          done ? 'text-muted' : 'text-ink'
        }`}
        style={done ? undefined : { background: 'var(--sunken)' }}
      >
        +{xp}
      </span>
    </button>
  )
}

export function Today() {
  const state = useAppState()
  const date = todayKey()
  const log = logFor(date)
  const progress = todayProgress(state, date)
  const growth = capitalGrowth(state, date)
  const index = habitusIndex(growth)
  const streak = overallStreak(state, date)
  const cooling = coolingCapital(growth)

  // 방금 얻은 경험치를 잠깐 띄운다
  const [pop, setPop] = useState<{ id: string; xp: number } | null>(null)

  function handleToggle(action: Action) {
    const wasDone = didDo(state, date, action.id)
    if (!wasDone) {
      setPop({ id: action.id, xp: xpPreview(state, action, date) })
      window.setTimeout(() => setPop(null), 1100)
    }
    toggleAction(date, action.id)
  }

  const sorted = [...progress.planned].sort((a, b) => {
    const da = didDo(state, date, a.id) ? 1 : 0
    const db = didDo(state, date, b.id) ? 1 : 0
    if (da !== db) return da - db
    return a.order - b.order
  })

  return (
    <div className="space-y-3">
      <header className="px-1 pt-1">
        <p className="text-[12px] text-muted">{greeting()}</p>
        <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-ink">{formatDay(date)}</h1>
      </header>

      {/* 오늘 쌓은 것 — 이 화면의 주인공 */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-muted">오늘 쌓은 경험치</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-[38px] leading-none font-semibold tracking-tight text-ink">
                  {progress.earned}
                </span>
                <span className="text-[13px] font-medium text-ink2">
                  / {progress.possible} XP
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-muted">아비투스 지수</p>
              <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight text-ink">
                {index}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Bar value={progress.possible ? progress.earned / progress.possible : 0} height={8} />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
            <span>
              {progress.doneCount} / {progress.totalCount}개 완료
            </span>
            <span>{streak > 0 ? `🔥 ${streak}일 연속` : '오늘 다시 시작'}</span>
          </div>
        </div>
      </Card>

      {cooling ? (
        <div className="animate-rise flex items-start gap-2.5 rounded-2xl bg-sunken px-4 py-3">
          <span aria-hidden className="text-[15px] leading-tight">
            {cooling.emoji}
          </span>
          <p className="text-[12px] leading-relaxed text-ink2">
            <span className="font-medium text-ink">{cooling.name}</span>의 불씨가 식고 있어요
            {cooling.daysIdle !== null ? ` (${cooling.daysIdle}일째 조용)` : ''}. 오늘 하나만 해도
            다시 살아납니다.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHead
          title="오늘의 행동"
          hint={
            progress.totalCount
              ? '누르면 경험치가 쌓입니다. 연속으로 할수록 더 많이 받아요.'
              : undefined
          }
        />
        {sorted.length === 0 ? (
          <Empty
            title="오늘 예정된 행동이 없어요"
            body="'더보기 → 행동 관리'에서 행동을 추가하거나 요일을 조정해 주세요."
          />
        ) : (
          <ul className="relative px-1 pb-2">
            {sorted.map((action) => (
              <li key={action.id} className="relative">
                {pop?.id === action.id ? (
                  <span
                    aria-hidden
                    className="animate-xp pointer-events-none absolute top-1 right-4 z-10 text-[13px] font-bold"
                    style={{ color: capitalColor(action.capital) }}
                  >
                    +{pop.xp} XP
                  </span>
                ) : null}
                <ActionRow
                  action={action}
                  done={didDo(state, date, action.id)}
                  xp={xpPreview(state, action, date)}
                  streak={streakAt(state, action, date)}
                  onToggle={() => handleToggle(action)}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHead title="오늘 컨디션" hint={log.mood ? MOODS[log.mood].label : '한 번만 눌러두세요'} />
        <div className="flex gap-2 px-4 pb-4" role="group" aria-label="오늘 컨디션">
          {([1, 2, 3, 4, 5] as Mood[]).map((lv) => {
            const active = log.mood === lv
            return (
              <button
                key={lv}
                type="button"
                aria-pressed={active}
                aria-label={MOODS[lv].label}
                onClick={() => setMood(date, active ? undefined : lv)}
                className={`min-h-11 flex-1 rounded-xl py-2 text-2xl transition-all ${
                  active ? 'bg-sunken ring-2 ring-[var(--accent)]' : 'opacity-45 ring-1 ring-hair'
                }`}
              >
                {MOODS[lv].emoji}
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <CardHead title="한 줄 남기기" hint="오늘을 한 문장으로" />
        <div className="px-4 pb-4">
          <TextArea
            rows={2}
            value={log.note ?? ''}
            placeholder="오늘 나를 칭찬할 한 가지"
            onChange={(e) => setNote(date, e.target.value)}
          />
        </div>
      </Card>
    </div>
  )
}
