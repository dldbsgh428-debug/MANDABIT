import type { Action, AppState, CapitalId, Entry, MoneyDirection } from '../types'

/* ============================================================================
   도구로 남긴 기록을 읽는 곳.

   기록은 평평한 목록 하나에 모아 둔다 — 가계부는 '이번 달 식비'처럼 날짜를
   가로지르는 집계가 잦아서, 날짜별로 쪼개 두면 매번 다시 합쳐야 한다.
============================================================================ */

export function entriesOn(state: AppState, date: string, actionId?: string): Entry[] {
  return state.entries
    .filter((e) => e.date === date && (!actionId || e.actionId === actionId))
    .sort((a, b) => a.at.localeCompare(b.at))
}

export function entriesFor(state: AppState, actionId: string): Entry[] {
  return state.entries
    .filter((e) => e.actionId === actionId)
    .sort((a, b) => b.at.localeCompare(a.at))
}

/** counter는 수량 합, duration은 분 합. 그 외는 건수. */
export function sumOn(action: Action, entries: Entry[]): number {
  const kind = action.tool?.kind ?? 'none'
  if (kind === 'counter') return entries.reduce((s, e) => s + (e.count ?? 0), 0)
  if (kind === 'duration') return entries.reduce((s, e) => s + (e.minutes ?? 0), 0)
  return entries.length
}

/**
 * 그날 이 행동을 '했다'고 볼 수 있는가.
 * 목표치가 있는 도구는 목표를 채워야 하고, 없으면 한 건만 적어도 된다.
 */
export function toolSatisfied(action: Action, entries: Entry[]): boolean {
  if (entries.length === 0) return false
  const target = action.tool?.target
  if (!target) return true
  return sumOn(action, entries) >= target
}

/* ---------------------------------------------------------------- 가계부 */

export interface MoneySummary {
  /** 지출 합계 */
  out: number
  /** 수입 합계 */
  in: number
  /** 지출 − 수입이 아니라 수입 − 지출. 음수면 그만큼 더 썼다는 뜻. */
  net: number
  count: number
  /** 분류별 지출, 큰 것부터 */
  byCategory: { category: string; amount: number; share: number }[]
  /** 하루 평균 지출 */
  perDay: number
}

/** 가계부 기록만 골라낸다 */
export function moneyEntries(state: AppState, dates?: string[]): Entry[] {
  const moneyActionIds = new Set(
    state.actions.filter((a) => a.tool?.kind === 'money').map((a) => a.id),
  )
  const inRange = dates ? new Set(dates) : null
  return state.entries
    .filter((e) => moneyActionIds.has(e.actionId) && e.amount !== undefined)
    .filter((e) => !inRange || inRange.has(e.date))
    .sort((a, b) => b.at.localeCompare(a.at))
}

export function summarizeMoney(entries: Entry[], dayCount: number): MoneySummary {
  let out = 0
  let inc = 0
  const cats = new Map<string, number>()

  for (const e of entries) {
    const amount = e.amount ?? 0
    if (e.direction === 'in') {
      inc += amount
      continue
    }
    out += amount
    const key = e.category || '기타'
    cats.set(key, (cats.get(key) ?? 0) + amount)
  }

  const byCategory = [...cats.entries()]
    .map(([category, amount]) => ({ category, amount, share: out === 0 ? 0 : amount / out }))
    .sort((a, b) => b.amount - a.amount)

  return {
    out,
    in: inc,
    net: inc - out,
    count: entries.length,
    byCategory,
    perDay: dayCount > 0 ? out / dayCount : 0,
  }
}

/* ------------------------------------------------------- 자본별 도구 요약 */

export interface ToolSummary {
  kind: 'money' | 'counter' | 'duration' | 'text'
  actionTitle: string
  actionId: string
  /** 화면에 그대로 찍는 한 줄 */
  headline: string
  sub?: string
}

/** 자본 상세에서 보여줄 도구 요약들 */
export function toolSummaries(
  state: AppState,
  capitalId: CapitalId,
  dates: string[],
): ToolSummary[] {
  const inRange = new Set(dates)
  const actions = state.actions.filter(
    (a) => a.capital === capitalId && !a.archived && a.tool && a.tool.kind !== 'none',
  )

  return actions.flatMap((action): ToolSummary[] => {
    const kind = action.tool?.kind
    if (!kind || kind === 'none') return []
    const entries = state.entries.filter((e) => e.actionId === action.id && inRange.has(e.date))
    if (entries.length === 0) return []

    const base = { actionTitle: action.title, actionId: action.id }

    if (kind === 'money') {
      const s = summarizeMoney(entries, dates.length)
      return [
        {
          ...base,
          kind,
          headline: `${Math.round(s.out).toLocaleString('ko-KR')}원 지출`,
          sub: s.byCategory.length
            ? `${s.byCategory[0].category}에 가장 많이 · ${entries.length}건`
            : `${entries.length}건`,
        },
      ]
    }

    if (kind === 'counter') {
      const total = entries.reduce((sum, e) => sum + (e.count ?? 0), 0)
      return [{ ...base, kind, headline: `${total}${action.tool?.unit ?? '회'}`, sub: `${entries.length}일 기록` }]
    }

    if (kind === 'duration') {
      const total = entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0)
      const h = Math.floor(total / 60)
      const m = total % 60
      return [
        {
          ...base,
          kind,
          headline: h > 0 ? `${h}시간 ${m}분` : `${m}분`,
          sub: `${entries.length}일 기록`,
        },
      ]
    }

    const latest = entries.sort((a, b) => b.at.localeCompare(a.at))[0]
    return [{ ...base, kind: 'text', headline: `${entries.length}편`, sub: latest.text?.slice(0, 40) }]
  })
}

export const DIRECTION_LABEL: Record<MoneyDirection, string> = {
  out: '지출',
  in: '수입',
}
