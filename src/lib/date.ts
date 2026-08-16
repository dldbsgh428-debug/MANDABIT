import type { Weekday } from '../types'

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 로컬 타임존 기준 'YYYY-MM-DD'. toISOString은 UTC로 밀리므로 쓰지 않는다. */
export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function addDays(key: string, delta: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + delta)
  return toKey(d)
}

export function weekdayOf(key: string): Weekday {
  return fromKey(key).getDay() as Weekday
}

/** end까지 거슬러 올라간 n일치 날짜 배열 (오름차순) */
export function lastDays(n: number, end = todayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)))
}

/** key가 속한 주(월요일 시작)의 7일 */
export function weekOf(key: string): string[] {
  const wd = weekdayOf(key)
  const offset = wd === 0 ? 6 : wd - 1
  const start = addDays(key, -offset)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function formatDay(key: string): string {
  const d = fromKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_LABELS[d.getDay()]}`
}

export function dayNumber(key: string): number {
  return Number(key.slice(8, 10))
}

/** 'HH:MM' → 분 */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 아침/낮/저녁 인사 */
export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 5) return '늦은 밤이에요'
  if (h < 11) return '좋은 아침이에요'
  if (h < 17) return '오늘도 쌓는 중'
  if (h < 22) return '저녁이에요'
  return '하루를 닫을 시간'
}
