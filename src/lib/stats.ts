import type { Action, AppState, CapitalId, Weekday } from '../types'
import { CAPITALS } from '../data/capitals'
import { addDays, lastDays, todayKey, weekdayOf } from './date'

/* ============================================================================
   기록에서 숫자를 뽑는 곳.

   점수도 레벨도 없다. 세는 것은 실제로 있었던 일뿐이다 —
   몇 번 했는가, 예정한 것 중 얼마를 했는가, 며칠째 이어지는가.
   모든 값은 기록에서 매번 계산한다. 저장해 두지 않으므로 지난 날짜를
   고치면 숫자가 항상 다시 맞는다.
============================================================================ */

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

/** 그날 이 행동이 예정되어 있었는가. 만들기 전 날짜는 계산에서 뺀다. */
export function isScheduled(action: Action, date: string): boolean {
  if (action.archived) return false
  if (date < action.createdAt.slice(0, 10)) return false
  if (action.days.length === 0) return true
  return action.days.includes(weekdayOf(date))
}

export function scheduledOn(actions: Action[], date: string): Action[] {
  return actions.filter((a) => isScheduled(a, date))
}

export function didDo(state: AppState, date: string, actionId: string): boolean {
  return state.logs[date]?.done.includes(actionId) ?? false
}

/** 하루 달성률 — 그날 예정된 것 대비 실천한 것 */
export function dayRate(state: AppState, date: string): Rate {
  const planned = scheduledOn(state.actions, date)
  const done = planned.filter((a) => didDo(state, date, a.id)).length
  return rate(done, planned.length)
}

/** 날짜별 비율의 평균 — 예정 개수가 다른 날도 공평하게 */
export function averageRate(state: AppState, dates: string[]): Rate {
  const scored = dates.map((d) => dayRate(state, d)).filter((r) => r.total > 0)
  if (scored.length === 0) return rate(0, 0)
  const sum = scored.reduce((acc, r) => acc + r.value, 0)
  return { done: scored.length, total: scored.length, value: sum / scored.length }
}

/** 기간 전체를 한 분모로 묶은 달성률 */
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

/** 예정한 것을 하나도 남기지 않은 날의 수 */
export function fullDays(state: AppState, dates: string[]): number {
  return dates.filter((d) => {
    const r = dayRate(state, d)
    return r.total > 0 && r.done === r.total
  }).length
}

/**
 * 한 행동이 이어진 날 수(기준일 포함).
 * 예정이 없던 날은 흐름을 끊지 않고 건너뛴다.
 */
export function actionStreak(state: AppState, action: Action, date: string): number {
  let streak = 0
  let cursor = date
  for (let i = 0; i < 400; i++) {
    if (cursor < action.createdAt.slice(0, 10)) break
    if (!isScheduled(action, cursor)) {
      cursor = addDays(cursor, -1)
      continue
    }
    if (!didDo(state, cursor, action.id)) break
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** 무엇이든 하나라도 한 날이 이어진 수 */
export function overallStreak(state: AppState, today = todayKey()): number {
  let streak = 0
  let cursor = today
  // 오늘 아직 아무것도 안 했으면 어제부터 센다.
  if ((state.logs[cursor]?.done.length ?? 0) === 0) cursor = addDays(cursor, -1)
  for (let i = 0; i < 800; i++) {
    if ((state.logs[cursor]?.done.length ?? 0) === 0) break
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/* ------------------------------------------------------------------ 자본 */

function emptyCounts(): Record<CapitalId, number> {
  return { psych: 0, body: 0, knowledge: 0, economy: 0, culture: 0, social: 0, language: 0 }
}

/**
 * 상태가 바뀔 때만 다시 계산하도록 걸어두는 캐시.
 * 상태는 변경 시마다 새 객체로 교체되므로 객체 정체성을 키로 쓰면 정확하다.
 */
function memoByState<T>(compute: (state: AppState) => T) {
  const cache = new WeakMap<AppState, T>()
  return (state: AppState): T => {
    const hit = cache.get(state)
    if (hit !== undefined) return hit
    const value = compute(state)
    cache.set(state, value)
    return value
  }
}

/** 기록 전체에서 자본별로 실천한 총 횟수 */
export const totalCountsByCapital = memoByState((state: AppState): Record<CapitalId, number> => {
  const byAction = new Map(state.actions.map((a) => [a.id, a.capital]))
  const out = emptyCounts()
  for (const log of Object.values(state.logs)) {
    for (const id of log.done) {
      const capital = byAction.get(id)
      if (capital) out[capital]++
    }
  }
  return out
})

/** 특정 기간 동안 자본별로 실천한 횟수 */
export function countsInRange(state: AppState, dates: string[]): Record<CapitalId, number> {
  const byAction = new Map(state.actions.map((a) => [a.id, a.capital]))
  const out = emptyCounts()
  for (const date of dates) {
    for (const id of state.logs[date]?.done ?? []) {
      const capital = byAction.get(id)
      if (capital) out[capital]++
    }
  }
  return out
}

export interface CapitalStat {
  id: CapitalId
  name: string
  short: string
  emoji: string
  cssVar: string
  /** 지금까지 실천한 총 횟수 */
  total: number
  /** 최근 7일 실천 횟수 */
  week: number
  /** 최근 7일 달성률 (예정 대비) */
  weekRate: Rate
  /** 이 자본에 등록된 행동 수 */
  actionCount: number
  /** 마지막으로 이 자본에 무언가 한 날 */
  lastActive: string | null
  /** 마지막 활동 이후 지난 날 수. 활동이 없으면 null. */
  daysIdle: number | null
}

const statsCache = new WeakMap<AppState, { today: string; value: CapitalStat[] }>()

/** 자본 화면이 쓰는 종합. 상태와 기준일이 같으면 다시 계산하지 않는다. */
export function capitalStats(state: AppState, today = todayKey()): CapitalStat[] {
  const hit = statsCache.get(state)
  if (hit && hit.today === today) return hit.value
  const value = computeCapitalStats(state, today)
  statsCache.set(state, { today, value })
  return value
}

function computeCapitalStats(state: AppState, today: string): CapitalStat[] {
  const totals = totalCountsByCapital(state)
  const window = lastDays(7, today)
  const weekCounts = countsInRange(state, window)

  return CAPITALS.map((c) => {
    const actions = state.actions.filter((a) => a.capital === c.id && !a.archived)

    let done = 0
    let planned = 0
    for (const date of window) {
      for (const action of actions) {
        if (!isScheduled(action, date)) continue
        planned++
        if (didDo(state, date, action.id)) done++
      }
    }

    // 마지막 활동일은 전체 기록에서 찾는다 — 한 주 넘게 쉰 경우도 알려주려고.
    let lastActive: string | null = null
    for (const [date, log] of Object.entries(state.logs)) {
      if (!log.done.some((id) => actions.some((a) => a.id === id))) continue
      if (!lastActive || date > lastActive) lastActive = date
    }

    return {
      id: c.id,
      name: c.name,
      short: c.short,
      emoji: c.emoji,
      cssVar: c.cssVar,
      total: totals[c.id],
      week: weekCounts[c.id],
      weekRate: rate(done, planned),
      actionCount: actions.length,
      lastActive,
      daysIdle: lastActive
        ? Math.round((new Date(today).getTime() - new Date(lastActive).getTime()) / 86_400_000)
        : null,
    }
  })
}

/** 최근 활동이 가장 적은 자본 — 다음에 무엇을 할지 하나만 짚어주기 위해 */
export function quietestCapital(stats: CapitalStat[]): CapitalStat | null {
  const withActions = stats.filter((s) => s.actionCount > 0)
  if (withActions.length === 0) return null
  const quiet = [...withActions].sort((a, b) => a.weekRate.value - b.weekRate.value)[0]
  return quiet.weekRate.value < 0.5 ? quiet : null
}

/** 성장 곡선 — 날짜별 누적 실천 횟수 */
export function cumulativeCounts(
  state: AppState,
  dates: string[],
  capitalId?: CapitalId,
): { date: string; total: number; gained: number }[] {
  const byAction = new Map(state.actions.map((a) => [a.id, a.capital]))
  const countOn = (date: string) => {
    const done = state.logs[date]?.done ?? []
    if (!capitalId) return done.filter((id) => byAction.has(id)).length
    return done.filter((id) => byAction.get(id) === capitalId).length
  }

  // 구간 시작 이전에 이미 쌓인 것부터 얹어야 곡선이 이어진다.
  const start = dates[0]
  let running = 0
  for (const date of Object.keys(state.logs)) {
    if (date >= start) continue
    running += countOn(date)
  }

  return dates.map((date) => {
    const gained = countOn(date)
    running += gained
    return { date, total: running, gained }
  })
}

/** 요일별 평균 달성률 — 어느 요일에 무너지는지 */
export function weekdayRates(state: AppState, dates: string[]): Rate[] {
  const buckets = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }))
  for (const date of dates) {
    const r = dayRate(state, date)
    if (r.total === 0) continue
    const b = buckets[weekdayOf(date)]
    b.sum += r.value
    b.n++
  }
  return buckets.map((b) => ({ done: b.n, total: b.n, value: b.n === 0 ? 0 : b.sum / b.n }))
}

/** 오늘 화면이 쓰는 진행 상황 */
export function todayProgress(state: AppState, date = todayKey()) {
  const planned = scheduledOn(state.actions, date)
  const doneCount = planned.filter((a) => didDo(state, date, a.id)).length
  return {
    planned,
    doneCount,
    totalCount: planned.length,
    rate: rate(doneCount, planned.length),
  }
}

export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
