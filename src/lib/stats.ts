import type { AppState, CapitalId, DayEntry, Habit } from '../types'
import { CAPITALS } from '../data/capitals'
import { addDays, elapsedDaysInMonth, todayKey, weekdayOf, weekOf } from './date'

export interface Rate {
  done: number
  total: number
  /** 0–1. total이 0이면 0. */
  value: number
}

function rate(done: number, total: number): Rate {
  return { done, total, value: total === 0 ? 0 : done / total }
}

export function pct(r: Rate): number {
  return Math.round(r.value * 100)
}

/** 해당 날짜에 이 습관을 하기로 되어 있었는가. 만든 날 이전은 계산에서 뺀다. */
export function isScheduled(habit: Habit, date: string): boolean {
  if (habit.archived) return false
  if (date < habit.createdAt.slice(0, 10)) return false
  if (habit.days.length === 0) return true
  return habit.days.includes(weekdayOf(date))
}

export function scheduledOn(habits: Habit[], date: string): Habit[] {
  return habits.filter((h) => isScheduled(h, date))
}

export function entryOf(entries: Record<string, DayEntry>, date: string): DayEntry | undefined {
  return entries[date]
}

export function isDone(entries: Record<string, DayEntry>, date: string, habitId: string): boolean {
  return entries[date]?.done.includes(habitId) ?? false
}

/** 하루 달성률 — 그날 예정된 습관 대비 체크한 습관 */
export function dayRate(state: AppState, date: string): Rate {
  const planned = scheduledOn(state.habits, date)
  const done = planned.filter((h) => isDone(state.entries, date, h.id)).length
  return rate(done, planned.length)
}

/** 여러 날의 평균 달성률 (날짜별 비율의 평균 — 습관 수가 다른 날도 공평하게) */
export function averageRate(state: AppState, dates: string[]): Rate {
  const scored = dates.map((d) => dayRate(state, d)).filter((r) => r.total > 0)
  if (scored.length === 0) return rate(0, 0)
  const sum = scored.reduce((a, r) => a + r.value, 0)
  return { done: scored.length, total: scored.length, value: sum / scored.length }
}

/** 기간 전체를 하나의 분모로 묶은 누적 달성률 */
export function cumulativeRate(state: AppState, dates: string[]): Rate {
  let done = 0
  let total = 0
  for (const d of dates) {
    const r = dayRate(state, d)
    done += r.done
    total += r.total
  }
  return rate(done, total)
}

/** 예정된 습관을 하나도 남기지 않은 날의 수 */
export function perfectDayCount(state: AppState, dates: string[]): number {
  return dates.filter((d) => {
    const r = dayRate(state, d)
    return r.total > 0 && r.done === r.total
  }).length
}

/** 오늘(또는 기준일)까지 이어진 연속 달성일. 예정이 없던 날은 연속을 끊지 않고 건너뛴다. */
export function currentStreak(state: AppState, until = todayKey()): number {
  let streak = 0
  let cursor = until
  // 오늘이 아직 미완이라면 어제부터 세기 시작한다.
  const todayR = dayRate(state, cursor)
  if (todayR.total > 0 && todayR.done < todayR.total) cursor = addDays(cursor, -1)

  for (let i = 0; i < 400; i++) {
    const r = dayRate(state, cursor)
    if (r.total === 0) {
      cursor = addDays(cursor, -1)
      continue
    }
    if (r.done < r.total) break
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export interface HabitStats {
  habit: Habit
  rate: Rate
  streak: number
  best: number
}

/** 한 습관의 기간 통계 — 트래커 표의 오른쪽 열 */
export function habitStats(state: AppState, habit: Habit, dates: string[]): HabitStats {
  let done = 0
  let total = 0
  let run = 0
  let best = 0
  let streak = 0
  let tailBroken = false

  for (const d of dates) {
    if (!isScheduled(habit, d)) continue
    total++
    if (isDone(state.entries, d, habit.id)) {
      done++
      run++
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }

  // 현재 연속은 기간 끝에서 거꾸로 센다.
  for (let i = dates.length - 1; i >= 0 && !tailBroken; i--) {
    const d = dates[i]
    if (!isScheduled(habit, d)) continue
    if (d > todayKey()) continue
    if (isDone(state.entries, d, habit.id)) streak++
    else tailBroken = true
  }

  return { habit, rate: rate(done, total), streak, best }
}

export interface CapitalScore {
  id: CapitalId
  name: string
  emoji: string
  cssVar: string
  rate: Rate
  habitCount: number
}

/** 7자본별 달성률 — 아비투스가 어느 쪽으로 기울어 있는지 보여준다. */
export function capitalScores(state: AppState, dates: string[]): CapitalScore[] {
  return CAPITALS.map((c) => {
    const habits = state.habits.filter((h) => h.capital === c.id && !h.archived)
    let done = 0
    let total = 0
    for (const h of habits) {
      for (const d of dates) {
        if (!isScheduled(h, d)) continue
        total++
        if (isDone(state.entries, d, h.id)) done++
      }
    }
    return {
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      cssVar: c.cssVar,
      rate: rate(done, total),
      habitCount: habits.length,
    }
  })
}

/** 요일별 평균 달성률 — 어느 요일에 무너지는지 */
export function weekdayRates(state: AppState, dates: string[]): Rate[] {
  const buckets: { sum: number; n: number }[] = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }))
  for (const d of dates) {
    const r = dayRate(state, d)
    if (r.total === 0) continue
    const b = buckets[weekdayOf(d)]
    b.sum += r.value
    b.n++
  }
  return buckets.map((b) => ({ done: b.n, total: b.n, value: b.n === 0 ? 0 : b.sum / b.n }))
}

export interface MonthSummary {
  /** 오늘 달성률 */
  today: Rate
  /** 이번 주 평균 */
  week: Rate
  /** 이번 달 누적 (지난 날짜만) */
  month: Rate
  streak: number
  /** 이번 달 체크한 총 개수 / 예정 개수 */
  checks: { done: number; total: number }
}

export function monthSummary(state: AppState, month: string, today = todayKey()): MonthSummary {
  const elapsed = elapsedDaysInMonth(month, today)
  const cum = cumulativeRate(state, elapsed)
  return {
    today: dayRate(state, today),
    week: averageRate(
      state,
      weekOf(today).filter((d) => d <= today),
    ),
    month: cum,
    streak: currentStreak(state, today),
    checks: { done: cum.done, total: cum.total },
  }
}
