import type { Action, AppState, CapitalId, Weekday, Weight } from '../types'
import { CAPITALS } from '../data/capitals'
import { addDays, lastDays, todayKey, weekdayOf } from './date'

/* ============================================================================
   성장 엔진
   ----------------------------------------------------------------------------
   두 개의 서로 다른 숫자를 쓴다. 이 구분이 앱 전체의 성격을 정한다.

   · 경험치(XP) / 레벨 — 지금까지 쌓은 것. 절대 줄지 않는다.
     한 번 오른 레벨은 며칠 쉬어도 사라지지 않는다. 그래야 기록이 자산이 된다.

   · 불씨(vitality) — 최근 활동. 안 하면 식는다.
     "지금 어느 자본이 꺼져가는가"를 보여주는 건 이쪽이다.

   둘 다 로그에서 매번 계산한다. 저장해 두지 않기 때문에 지난 날짜를 고쳐도
   숫자가 항상 다시 맞는다.
============================================================================ */

/** 행동 무게별 기본 경험치 */
export const WEIGHT_XP: Record<Weight, number> = {
  light: 10,
  normal: 20,
  deep: 35,
}

export const WEIGHT_LABEL: Record<Weight, string> = {
  light: '가볍게',
  normal: '보통',
  deep: '깊게',
}

export const WEIGHT_HINT: Record<Weight, string> = {
  light: '5–10분이면 끝나는 일',
  normal: '20–30분쯤 드는 일',
  deep: '한 시간 넘게 집중하는 일',
}

/** 연속 보너스 상한 — 14일 이상이면 1.42배에서 멈춘다. */
const STREAK_CAP = 14
const STREAK_STEP = 0.03

/** 불씨를 계산하는 창. 한 주 쉬면 눈에 보이게 식는다. */
export const VITALITY_WINDOW = 7

/**
 * 레벨 L에서 L+1로 가는 데 필요한 경험치.
 * 초반은 금방 오르고 뒤로 갈수록 완만해진다 — 시작한 사람이 포기하지 않도록.
 */
export function xpToNext(level: number): number {
  return 80 + 40 * (level - 1)
}

/** 누적 경험치 → 레벨과 그 레벨 안에서의 진행도 */
export function levelOf(totalXp: number): {
  level: number
  intoLevel: number
  needed: number
  progress: number
} {
  let level = 1
  let remaining = Math.max(0, Math.floor(totalXp))
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level)
    level++
  }
  const needed = xpToNext(level)
  return { level, intoLevel: remaining, needed, progress: needed === 0 ? 0 : remaining / needed }
}

/** 레벨 n에 도달하는 데 드는 누적 경험치 */
export function totalXpForLevel(level: number): number {
  let sum = 0
  for (let l = 1; l < level; l++) sum += xpToNext(l)
  return sum
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

/**
 * 특정 날짜에 그 행동을 한 시점의 연속 일수(그날 포함).
 * 예정이 없던 날은 연속을 끊지 않고 건너뛴다.
 */
export function streakAt(state: AppState, action: Action, date: string): number {
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

/**
 * 첫날은 배수가 붙지 않는다 (1.0배). 이어간 날부터 3%씩 붙어
 * 15일째에 1.42배에서 멈춘다.
 */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.max(streak - 1, 0), STREAK_CAP) * STREAK_STEP
}

/** 이 행동을 오늘 하면 몇 점을 받는가 (연속 보너스 포함) */
export function xpPreview(state: AppState, action: Action, date: string): number {
  const already = didDo(state, date, action.id)
  // 아직 안 했다면 오늘 체크했을 때 이어질 연속을 미리 계산한다.
  const streak = already ? streakAt(state, action, date) : streakAt(state, action, addDays(date, -1)) + 1
  return Math.round(WEIGHT_XP[action.weight] * streakMultiplier(streak))
}

/** 실제로 획득한 경험치 — 한 날짜, 한 행동 */
function earnedXp(state: AppState, action: Action, date: string): number {
  if (!didDo(state, date, action.id)) return 0
  return Math.round(WEIGHT_XP[action.weight] * streakMultiplier(streakAt(state, action, date)))
}

/** 하루에 획득한 총 경험치 */
export function dayXp(state: AppState, date: string): number {
  const log = state.logs[date]
  if (!log || log.done.length === 0) return 0
  let sum = 0
  for (const action of state.actions) {
    if (!log.done.includes(action.id)) continue
    sum += earnedXp(state, action, date)
  }
  return sum
}

/** 하루에 자본별로 획득한 경험치 */
export function dayXpByCapital(state: AppState, date: string): Record<CapitalId, number> {
  const out = emptyCapitalMap()
  const log = state.logs[date]
  if (!log) return out
  for (const action of state.actions) {
    if (!log.done.includes(action.id)) continue
    out[action.capital] += earnedXp(state, action, date)
  }
  return out
}

function emptyCapitalMap(): Record<CapitalId, number> {
  return {
    psych: 0,
    body: 0,
    knowledge: 0,
    economy: 0,
    culture: 0,
    social: 0,
    language: 0,
  }
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

/**
 * 기록 전체를 훑어 자본별 누적 경험치를 낸다.
 * 하루씩 되짚는 연속 계산이 안에 들어 있어 비싸므로 상태 단위로 캐시한다.
 */
export const totalXpByCapital = memoByState((state: AppState): Record<CapitalId, number> => {
  const out = emptyCapitalMap()
  for (const date of Object.keys(state.logs)) {
    const perDay = dayXpByCapital(state, date)
    for (const c of CAPITALS) out[c.id] += perDay[c.id]
  }
  return out
})

/**
 * 불씨 — 최근 한 주 동안 그 자본에서 얻은 경험치를, 같은 기간에 '다 했다면'
 * 받았을 경험치로 나눈 값(0~1). 예정된 행동이 없는 자본은 0.
 */
export function vitalityOf(
  state: AppState,
  capitalId: CapitalId,
  today = todayKey(),
): { value: number; earned: number; possible: number; lastActive: string | null } {
  const window = lastDays(VITALITY_WINDOW, today)
  const actions = state.actions.filter((a) => a.capital === capitalId && !a.archived)

  let earned = 0
  let possible = 0
  let lastActive: string | null = null

  for (const date of window) {
    for (const action of actions) {
      if (!isScheduled(action, date)) continue
      possible += WEIGHT_XP[action.weight]
      if (didDo(state, date, action.id)) {
        earned += WEIGHT_XP[action.weight]
        if (!lastActive || date > lastActive) lastActive = date
      }
    }
  }

  return {
    value: possible === 0 ? 0 : Math.min(1, earned / possible),
    earned,
    possible,
    lastActive,
  }
}

export interface CapitalGrowth {
  id: CapitalId
  name: string
  emoji: string
  cssVar: string
  totalXp: number
  level: number
  intoLevel: number
  needed: number
  progress: number
  vitality: number
  /** 마지막으로 이 자본에 무언가 한 날. 없으면 null. */
  lastActive: string | null
  /** 마지막 활동 이후 지난 날 수. 활동이 없으면 null. */
  daysIdle: number | null
  actionCount: number
}

const growthCache = new WeakMap<AppState, { today: string; value: CapitalGrowth[] }>()

/** 성장 화면이 쓰는 자본별 종합. 상태와 기준일이 같으면 다시 계산하지 않는다. */
export function capitalGrowth(state: AppState, today = todayKey()): CapitalGrowth[] {
  const hit = growthCache.get(state)
  if (hit && hit.today === today) return hit.value
  const value = computeCapitalGrowth(state, today)
  growthCache.set(state, { today, value })
  return value
}

function computeCapitalGrowth(state: AppState, today: string): CapitalGrowth[] {
  const totals = totalXpByCapital(state)
  return CAPITALS.map((c) => {
    const totalXp = totals[c.id]
    const lv = levelOf(totalXp)
    const vit = vitalityOf(state, c.id, today)
    const daysIdle = vit.lastActive
      ? Math.round(
          (new Date(today).getTime() - new Date(vit.lastActive).getTime()) / 86_400_000,
        )
      : null
    return {
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      cssVar: c.cssVar,
      totalXp,
      level: lv.level,
      intoLevel: lv.intoLevel,
      needed: lv.needed,
      progress: lv.progress,
      vitality: vit.value,
      lastActive: vit.lastActive,
      daysIdle,
      actionCount: state.actions.filter((a) => a.capital === c.id && !a.archived).length,
    }
  })
}

/**
 * 아비투스 지수 — 일곱 자본의 종합. 단순 합이 아니라 기하평균에 가깝게 잡아,
 * 하나만 몰아서 키우면 잘 오르지 않고 고르게 키울 때 잘 오른다.
 */
export function habitusIndex(growth: CapitalGrowth[]): number {
  if (growth.length === 0) return 0
  const product = growth.reduce((acc, g) => acc * (g.level + g.progress), 1)
  return Math.round(Math.pow(product, 1 / growth.length) * 10) / 10
}

/** 가장 얇은 자본 — 다음에 무엇을 할지 한 가지만 짚어주기 위해 */
export function weakestCapital(growth: CapitalGrowth[]): CapitalGrowth | null {
  const withActions = growth.filter((g) => g.actionCount > 0)
  if (withActions.length === 0) return null
  return [...withActions].sort(
    (a, b) => a.level + a.progress - (b.level + b.progress),
  )[0]
}

/** 며칠째 식어가는 자본 — 홈에서 한 줄 알림으로 쓴다 */
export function coolingCapital(growth: CapitalGrowth[]): CapitalGrowth | null {
  const candidates = growth.filter((g) => g.actionCount > 0 && g.vitality < 0.35)
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => a.vitality - b.vitality)[0]
}

/* ------------------------------------------------------------- 여유(잔고)

   레벨을 만드는 누적 경험치와, 실제로 써 없어지는 잔고를 나눈다.
   행동 하나를 하면 같은 양이 양쪽에 들어오고, 보상을 바꿀 때는 잔고에서만
   빠진다. 그래야 보상을 써도 지금까지 쌓은 레벨이 깎이지 않는다.
------------------------------------------------------------------------- */

/** 지금까지 번 총 경험치 (레벨의 근거) */
export function lifetimeXp(state: AppState): number {
  const totals = totalXpByCapital(state)
  return CAPITALS.reduce((sum, c) => sum + totals[c.id], 0)
}

/** 보상으로 바꿔 쓴 총량 */
export function spentXp(state: AppState): number {
  return state.purchases.reduce((sum, p) => sum + p.cost, 0)
}

/** 지금 쓸 수 있는 여유 */
export function balanceXp(state: AppState): number {
  return lifetimeXp(state) - spentXp(state)
}

/** 휴식권을 쓴 날인가 */
export function isRestDay(state: AppState, date: string): boolean {
  return state.restDays.includes(date)
}

/**
 * 전체 연속 기록일 — 무엇이든 하나라도 한 날이 이어진 수.
 * 휴식권을 쓴 날은 쉬어도 연속을 끊지 않고 건너뛴다.
 */
export function overallStreak(state: AppState, today = todayKey()): number {
  let streak = 0
  let cursor = today
  // 오늘 아직 아무것도 안 했으면 어제부터 센다.
  if (dayXp(state, cursor) === 0 && !isRestDay(state, cursor)) cursor = addDays(cursor, -1)
  for (let i = 0; i < 800; i++) {
    if (dayXp(state, cursor) === 0) {
      if (!isRestDay(state, cursor)) break
      // 휴식권을 쓴 날은 세지 않되 흐름은 잇는다.
      cursor = addDays(cursor, -1)
      continue
    }
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** 오늘 진행 상황 */
export function todayProgress(state: AppState, date = todayKey()) {
  const planned = scheduledOn(state.actions, date)
  const done = planned.filter((a) => didDo(state, date, a.id))
  const earned = dayXp(state, date)
  const possible = planned.reduce(
    (sum, a) => sum + Math.round(WEIGHT_XP[a.weight] * streakMultiplier(streakAt(state, a, date))),
    0,
  )
  return {
    planned,
    doneCount: done.length,
    totalCount: planned.length,
    earned,
    possible,
    ratio: planned.length === 0 ? 0 : done.length / planned.length,
  }
}

/** 성장 곡선용 — 날짜별 누적 경험치 (전체 또는 한 자본) */
export function cumulativeSeries(
  state: AppState,
  dates: string[],
  capitalId?: CapitalId,
): { date: string; total: number; gained: number }[] {
  // 구간 시작 이전에 이미 쌓인 것부터 얹어야 곡선이 이어진다.
  const start = dates[0]
  let running = 0
  for (const date of Object.keys(state.logs)) {
    if (date >= start) continue
    running += capitalId ? dayXpByCapital(state, date)[capitalId] : dayXp(state, date)
  }

  return dates.map((date) => {
    const gained = capitalId ? dayXpByCapital(state, date)[capitalId] : dayXp(state, date)
    running += gained
    return { date, total: running, gained }
  })
}

/** 요일별 평균 획득 경험치 — 어느 요일에 무너지는지 */
export function weekdayXp(state: AppState, dates: string[]): number[] {
  const sums = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }))
  for (const date of dates) {
    const b = sums[weekdayOf(date)]
    b.sum += dayXp(state, date)
    b.n++
  }
  return sums.map((b) => (b.n === 0 ? 0 : b.sum / b.n))
}

export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
