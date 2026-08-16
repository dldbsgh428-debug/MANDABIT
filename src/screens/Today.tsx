import { useState } from 'react'
import { capital, capitalColor } from '../data/capitals'
import { MOODS } from '../data/presets'
import { formatMinutes, formatWon, toolMeta } from '../data/tools'
import { entriesOn, sumOn } from '../lib/entries'
import { ToolSheet } from '../components/ToolSheet'
import { formatDay, greeting, todayKey } from '../lib/date'
import { logFor, setMood, setNote, toggleAction, useAppState } from '../lib/store'
import {
  actionStreak,
  capitalStats,
  didDo,
  overallStreak,
  pct,
  quietestCapital,
  todayProgress,
} from '../lib/stats'
import type { Action, Mood } from '../types'
import { Bar, Card, CardHead, Empty, TextArea } from '../components/ui'

function ActionRow({
  action,
  done,
  streak,
  progress,
  onOpen,
}: {
  action: Action
  done: boolean
  streak: number
  /** 도구가 붙은 행동이면 오늘 쌓인 양을 한 줄로 */
  progress: string | null
  onOpen: () => void
}) {
  const color = capitalColor(action.capital)
  const kind = action.tool?.kind ?? 'none'

  return (
    <button
      type="button"
      onClick={onOpen}
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
          {action.cue ? <span>{action.cue}</span> : null}
          {streak > 1 ? <span className="text-ink2">{streak}일째</span> : null}
          {progress ? (
            <span className="tnum font-medium" style={{ color }}>
              {progress}
            </span>
          ) : null}
        </span>
      </span>

      {/* 도구가 붙은 행동은 눌렀을 때 무엇이 열리는지 미리 알려준다 */}
      {kind !== 'none' ? (
        <span
          aria-hidden
          className="shrink-0 rounded-lg bg-sunken px-1.5 py-1 text-[11px] text-muted"
          title={toolMeta(kind).label}
        >
          {toolMeta(kind).emoji}
        </span>
      ) : null}

      <span
        aria-hidden
        className="h-7 w-1 shrink-0 rounded-full"
        style={{ background: color, opacity: done ? 1 : 0.25 }}
      />
    </button>
  )
}

export function Today() {
  const state = useAppState()
  const date = todayKey()
  const log = logFor(date)
  const progress = todayProgress(state, date)
  const stats = capitalStats(state, date)
  const streak = overallStreak(state, date)
  const quiet = quietestCapital(stats)

  // 도구가 붙은 행동은 체크가 아니라 입력창을 연다
  const [openAction, setOpenAction] = useState<Action | null>(null)

  /** 오늘 이 행동으로 쌓인 것을 한 줄로. 도구가 없으면 null. */
  function progressLabel(action: Action): string | null {
    const kind = action.tool?.kind
    if (!kind || kind === 'none') return null
    const entries = entriesOn(state, date, action.id)
    if (entries.length === 0) return null

    if (kind === 'money') {
      const out = entries
        .filter((e) => e.direction !== 'in')
        .reduce((s, e) => s + (e.amount ?? 0), 0)
      return formatWon(out)
    }
    if (kind === 'duration') return formatMinutes(sumOn(action, entries))
    if (kind === 'counter') {
      const total = sumOn(action, entries)
      const unit = action.tool?.unit ?? '회'
      return action.tool?.target ? `${total}/${action.tool.target}${unit}` : `${total}${unit}`
    }
    return `${entries.length}편`
  }

  function handleOpen(action: Action) {
    const kind = action.tool?.kind ?? 'none'
    if (kind === 'none') {
      toggleAction(date, action.id)
      return
    }
    setOpenAction(action)
  }

  const sorted = [...progress.planned].sort((a, b) => {
    const da = didDo(state, date, a.id) ? 1 : 0
    const db = didDo(state, date, b.id) ? 1 : 0
    if (da !== db) return da - db
    return a.order - b.order
  })

  // 오늘 실천한 것이 어느 자본에 들어갔는지
  const touched = stats.filter((s) =>
    state.actions.some(
      (a) => a.capital === s.id && !a.archived && didDo(state, date, a.id),
    ),
  )

  return (
    <div className="space-y-3">
      <header className="px-1 pt-1">
        <p className="text-[12px] text-muted">{greeting()}</p>
        <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-ink">{formatDay(date)}</h1>
      </header>

      <Card>
        <div className="px-4 pt-4 pb-4">
          <p className="text-[11px] font-medium text-muted">오늘</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="tnum text-[38px] leading-none font-semibold tracking-tight text-ink">
              {progress.doneCount}
            </span>
            <span className="text-[14px] font-medium text-ink2">/ {progress.totalCount}</span>
          </p>

          <div className="mt-3">
            <Bar value={progress.rate.value} height={8} />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
            <span>{pct(progress.rate)}% 실천</span>
            <span>{streak > 0 ? `${streak}일 연속 기록 중` : '오늘 다시 시작'}</span>
          </div>

          {touched.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {touched.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-[10.5px] text-ink2"
                >
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{ background: `var(${s.cssVar})` }}
                  />
                  {s.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      {quiet ? (
        <div className="flex items-start gap-2.5 rounded-2xl bg-sunken px-4 py-3">
          <span aria-hidden className="text-[15px] leading-tight">
            {quiet.emoji}
          </span>
          <p className="text-[12px] leading-relaxed text-ink2">
            최근 한 주 <span className="font-medium text-ink">{quiet.name}</span>에 쓴 시간이 가장
            적었어요
            {quiet.daysIdle !== null && quiet.daysIdle > 0 ? ` (${quiet.daysIdle}일 전이 마지막)` : ''}.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHead title="오늘 할 것" />
        {sorted.length === 0 ? (
          <Empty
            title="오늘 예정된 것이 없어요"
            body="'더보기'에서 행동을 추가하거나 요일을 조정해 주세요."
          />
        ) : (
          <ul className="px-1 pb-2">
            {sorted.map((action) => (
              <li key={action.id}>
                <ActionRow
                  action={action}
                  done={didDo(state, date, action.id)}
                  streak={actionStreak(state, action, date)}
                  progress={progressLabel(action)}
                  onOpen={() => handleOpen(action)}
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

      {openAction ? (
        <ToolSheet action={openAction} date={date} onClose={() => setOpenAction(null)} />
      ) : null}
    </div>
  )
}
