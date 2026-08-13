import type { Weekday } from '../types'

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 로컬 타임존 기준 'YYYY-MM-DD' — toISOString은 UTC로 밀리므로 쓰지 않는다. */
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

export function monthKey(key: string): string {
  return key.slice(0, 7)
}

export function addDays(key: string, delta: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + delta)
  return toKey(d)
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function weekdayOf(key: string): Weekday {
  return fromKey(key).getDay() as Weekday
}

export function daysInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

/** month 안에서 오늘까지만 — 아직 오지 않은 날은 달성률 분모에서 뺀다. */
export function elapsedDaysInMonth(month: string, today = todayKey()): string[] {
  return daysInMonth(month).filter((d) => d <= today)
}

/** key가 속한 주(일요일 시작)의 7일 */
export function weekOf(key: string): string[] {
  const start = addDays(key, -weekdayOf(key))
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function formatDayLabel(key: string): string {
  const d = fromKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_LABELS[d.getDay()]}요일`
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${y}년 ${m}월`
}

export function dayNumber(key: string): number {
  return Number(key.slice(8, 10))
}

/** 두 'HH:MM'을 분 단위로 비교 가능한 수로 */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
