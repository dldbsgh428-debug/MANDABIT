import { capitalColor } from '../../data/capitals'
import { CONDITION_FACES } from '../../data/presets'
import { WEEKDAY_LABELS, dayNumber, todayKey, weekdayOf } from '../../lib/date'
import { entryFor, toggleHabit } from '../../lib/store'
import { dayRate, isDone, isScheduled, pct, type HabitStats } from '../../lib/stats'
import type { AppState } from '../../types'

const CELL = 26

/**
 * 습관 × 날짜 격자. 값이 '했다/안 했다' 두 상태뿐이라 농도 램프를 쓰지 않고
 * 채운 점 / 빈 링 / 옅은 선(예정 없음) 세 가지 모양으로 구분한다.
 */
export function MonthGrid({
  state,
  month,
  days,
  onOpenDay,
  stats,
}: {
  state: AppState
  month: string
  days: string[]
  onOpenDay: (date: string) => void
  stats: HabitStats[]
}) {
  const today = todayKey()

  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-max">
        <table className="border-separate border-spacing-0 text-[11px]">
          <caption className="sr-only">{month} 습관 체크 격자</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-surface px-4 py-2 text-left text-[11px] font-medium text-muted"
              >
                습관
              </th>
              {days.map((d) => {
                const wd = weekdayOf(d)
                const isToday = d === today
                return (
                  <th
                    key={d}
                    scope="col"
                    style={{ width: CELL, minWidth: CELL }}
                    className="px-0 py-1 font-medium"
                  >
                    <div
                      className={`tnum leading-tight ${
                        isToday ? 'font-bold text-ink' : wd === 0 || wd === 6 ? 'text-ink2' : 'text-muted'
                      }`}
                    >
                      {dayNumber(d)}
                    </div>
                    <div className="text-[9px] leading-tight text-muted">{WEEKDAY_LABELS[wd]}</div>
                  </th>
                )
              })}
              {/* 오른쪽 요약 열은 가로로 밀어도 따라온다. 좁은 화면에서는
                  격자에 자리를 내주려고 달성률만 남긴다. */}
              <th
                scope="col"
                className="sticky right-0 z-10 w-[52px] min-w-[52px] bg-surface px-2 py-2 text-right text-[10px] font-medium text-muted sm:right-[88px]"
              >
                달성
              </th>
              <th
                scope="col"
                className="sticky right-[44px] z-10 hidden w-[44px] min-w-[44px] bg-surface px-2 py-2 text-right text-[10px] font-medium text-muted sm:table-cell"
              >
                연속
              </th>
              <th
                scope="col"
                className="sticky right-0 z-10 hidden w-[44px] min-w-[44px] bg-surface px-2 py-2 text-right text-[10px] font-medium text-muted sm:table-cell"
              >
                최고
              </th>
            </tr>
          </thead>

          <tbody>
            {stats.map(({ habit, rate, streak, best }) => {
              const color = capitalColor(habit.capital)
              return (
                <tr key={habit.id} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 max-w-[116px] bg-surface px-4 py-1 text-left font-normal group-hover:bg-sunken sm:max-w-[176px]"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="truncate text-[12px] text-ink">{habit.name}</span>
                    </span>
                  </th>

                  {days.map((d) => {
                    const scheduled = isScheduled(habit, d)
                    const done = isDone(state.entries, d, habit.id)
                    const future = d > today
                    if (!scheduled) {
                      return (
                        <td key={d} className="p-0 text-center">
                          <span
                            aria-hidden
                            className="mx-auto block h-px w-2 rounded"
                            style={{ background: 'var(--grid)' }}
                          />
                          <span className="sr-only">{d} 예정 없음</span>
                        </td>
                      )
                    }
                    return (
                      <td key={d} className="p-0 text-center">
                        <button
                          type="button"
                          disabled={future}
                          onClick={() => toggleHabit(d, habit.id)}
                          aria-pressed={done}
                          aria-label={`${habit.name} · ${d} ${done ? '완료' : '미완료'}`}
                          className="grid h-[22px] w-full place-items-center disabled:cursor-not-allowed"
                        >
                          <span
                            className="block size-[13px] rounded-full transition-transform hover:scale-125"
                            style={
                              done
                                ? { background: color }
                                : {
                                    boxShadow: `inset 0 0 0 1.5px ${future ? 'var(--grid)' : 'var(--axis)'}`,
                                  }
                            }
                          />
                        </button>
                      </td>
                    )
                  })}

                  <td className="tnum sticky right-0 z-10 bg-surface px-2 text-right text-[11px] font-medium text-ink group-hover:bg-sunken sm:right-[88px]">
                    {pct(rate)}%
                  </td>
                  <td className="tnum sticky right-[44px] z-10 hidden bg-surface px-2 text-right text-[11px] text-ink2 group-hover:bg-sunken sm:table-cell">
                    {streak}일
                  </td>
                  <td className="tnum sticky right-0 z-10 hidden bg-surface px-2 text-right text-[11px] text-muted group-hover:bg-sunken sm:table-cell">
                    {best}일
                  </td>
                </tr>
              )
            })}

            {/* 컨디션 — 이모지로 한 달의 상태 곡선을 만든다 */}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface px-4 pt-3 pb-1 text-left text-[11px] font-medium text-muted"
              >
                컨디션
              </th>
              {days.map((d) => {
                const c = entryFor(d).condition
                return (
                  <td key={d} className="p-0 pt-3 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => onOpenDay(d)}
                      title={c ? CONDITION_FACES[c].label : '기록 없음'}
                      className="grid h-5 w-full place-items-center text-[12px] leading-none"
                    >
                      {c ? (
                        CONDITION_FACES[c].emoji
                      ) : (
                        <span aria-hidden className="text-muted opacity-40">
                          ·
                        </span>
                      )}
                    </button>
                  </td>
                )
              })}
              <td className="sticky right-0 z-10 bg-surface sm:right-[88px]" />
              <td className="sticky right-[44px] z-10 hidden bg-surface sm:table-cell" />
              <td className="sticky right-0 z-10 hidden bg-surface sm:table-cell" />
            </tr>

            {/* 일별 달성률 — 격자 아래 스파크 막대 */}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface px-4 pt-1 pb-3 text-left text-[11px] font-medium text-muted"
              >
                일별 달성률
              </th>
              {days.map((d) => {
                const r = dayRate(state, d)
                const future = d > today
                return (
                  <td key={d} className="p-0 pt-1 pb-3 align-bottom">
                    <div className="mx-auto flex h-6 w-[13px] items-end">
                      <div
                        title={`${d} · ${pct(r)}%`}
                        className="w-full rounded-[3px]"
                        style={{
                          height: `${Math.max(r.value * 100, r.value > 0 ? 8 : 0)}%`,
                          background: future ? 'var(--grid)' : 'var(--seq-400)',
                          opacity: future ? 0.4 : 1,
                        }}
                      />
                    </div>
                  </td>
                )
              })}
              <td className="sticky right-0 z-10 bg-surface sm:right-[88px]" />
              <td className="sticky right-[44px] z-10 hidden bg-surface sm:table-cell" />
              <td className="sticky right-0 z-10 hidden bg-surface sm:table-cell" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pt-1 pb-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-[11px] rounded-full" style={{ background: 'var(--accent)' }} />
          완료
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-[11px] rounded-full"
            style={{ boxShadow: 'inset 0 0 0 1.5px var(--axis)' }}
          />
          미완료
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-2.5 rounded" style={{ background: 'var(--grid)' }} />
          그날 예정 없음
        </span>
        <span className="ml-auto">칸을 눌러 바로 체크할 수 있어요</span>
      </div>
    </div>
  )
}
