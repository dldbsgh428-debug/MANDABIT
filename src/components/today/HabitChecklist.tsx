import { capitalColor } from '../../data/capitals'
import { toggleHabit } from '../../lib/store'
import { pct, type Rate } from '../../lib/stats'
import type { DayEntry, Habit } from '../../types'
import { Card, CardHeader, EmptyState, Meter } from '../ui'

function CheckDot({ done, color }: { done: boolean; color: string }) {
  return (
    <span
      aria-hidden
      className="relative grid size-6 shrink-0 place-items-center rounded-full transition-colors"
      style={{
        background: done ? color : 'transparent',
        boxShadow: done ? 'none' : 'inset 0 0 0 1.5px var(--axis)',
      }}
    >
      {done ? (
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="#fff" strokeWidth="2.4">
          <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

export function HabitChecklist({
  date,
  habits,
  entry,
  rate,
  editable,
}: {
  date: string
  habits: Habit[]
  entry: DayEntry
  rate: Rate
  editable: boolean
}) {
  return (
    <Card>
      <CardHeader
        title="오늘의 습관"
        hint={habits.length ? `${rate.done} / ${rate.total} 완료` : undefined}
        action={
          habits.length ? (
            <span className="tnum text-[22px] leading-none font-semibold tracking-tight text-ink">
              {pct(rate)}
              <span className="text-xs font-medium text-ink2">%</span>
            </span>
          ) : null
        }
      />

      {habits.length === 0 ? (
        <EmptyState
          title="오늘 예정된 습관이 없어요"
          body="습관 탭에서 요일을 지정하거나 새 습관을 추가하면 여기에 나타납니다."
        />
      ) : (
        <>
          <div className="px-4">
            <Meter value={rate.value} />
          </div>
          <ul className="mt-2 px-2 pb-2">
            {habits.map((h) => {
              const done = entry.done.includes(h.id)
              const color = capitalColor(h.capital)
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => toggleHabit(date, h.id)}
                    aria-pressed={done}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-sunken disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <CheckDot done={done} color={color} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[14px] ${
                          done ? 'text-muted line-through' : 'text-ink'
                        }`}
                      >
                        {h.name}
                      </span>
                      {h.cue ? (
                        <span className="mt-0.5 block truncate text-[11px] text-muted">{h.cue}</span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className="h-6 w-1 shrink-0 rounded-full"
                      style={{ background: color, opacity: done ? 1 : 0.28 }}
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
