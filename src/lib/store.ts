import { useSyncExternalStore } from 'react'
import type { AppState, Condition, DayEntry, Habit, TimeBlock } from '../types'
import { DEFAULT_BLOCKS, PRESET_HABITS, makeHabit } from '../data/presets'
import { monthKey, todayKey } from './date'

const KEY = 'habitus.v1'
const VERSION = 1

function seed(): AppState {
  const created = '2000-01-01'
  return {
    version: VERSION,
    habits: PRESET_HABITS.map((p, i) => makeHabit(p, i, created)),
    entries: {},
    reviews: {},
    pinnedMantra: '',
    theme: 'system',
    onboarded: false,
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Partial<AppState>
    // 스키마가 어긋나면 조용히 시드로 되돌리는 대신 알아볼 수 있는 부분만 살린다.
    return {
      ...seed(),
      ...parsed,
      version: VERSION,
      habits: Array.isArray(parsed.habits) ? parsed.habits : seed().habits,
      entries: parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
      reviews: parsed.reviews && typeof parsed.reviews === 'object' ? parsed.reviews : {},
    }
  } catch {
    return seed()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

// 첫 방문이면 시드를 바로 기록해 둔다 — 습관 id가 세션마다 달라지지 않도록.
// 샌드박스 iframe처럼 localStorage 접근 자체가 막힌 환경에서는 읽기도 던지므로
// 조건문까지 통째로 감싼다. 저장이 안 되면 이번 세션은 메모리로만 돈다.
try {
  if (!localStorage.getItem(KEY)) {
    localStorage.setItem(KEY, JSON.stringify(state))
  }
} catch {
  // 무시 — 화면은 계속 동작해야 한다.
}

function emit() {
  for (const l of listeners) l()
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 저장 공간이 막혀도 화면은 계속 돌아야 한다.
  }
}

function set(next: AppState) {
  state = next
  persist()
  emit()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState(): AppState {
  return state
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState)
}

/* ------------------------------------------------------------------ 하루 */

function blankEntry(date: string): DayEntry {
  return { date, done: [], blocks: [] }
}

export function entryFor(date: string): DayEntry {
  return state.entries[date] ?? blankEntry(date)
}

function patchEntry(date: string, patch: Partial<DayEntry>) {
  const current = entryFor(date)
  set({
    ...state,
    entries: { ...state.entries, [date]: { ...current, ...patch, date } },
  })
}

export function toggleHabit(date: string, habitId: string) {
  const current = entryFor(date)
  const done = current.done.includes(habitId)
    ? current.done.filter((id) => id !== habitId)
    : [...current.done, habitId]
  patchEntry(date, { done })
}

export function setCondition(date: string, condition: Condition | undefined) {
  patchEntry(date, { condition })
}

export function setReflection(
  date: string,
  patch: Pick<Partial<DayEntry>, 'kept' | 'learned' | 'tomorrow' | 'memo' | 'mantra'>,
) {
  patchEntry(date, patch)
}

/* -------------------------------------------------------------- 타임블록 */

const uid = () => Math.random().toString(36).slice(2, 10)

export function seedBlocks(date: string) {
  patchEntry(date, {
    blocks: DEFAULT_BLOCKS.map((b) => ({ ...b, id: uid(), done: false })),
  })
}

export function addBlock(date: string, block: Omit<TimeBlock, 'id' | 'done'>) {
  const current = entryFor(date)
  patchEntry(date, { blocks: [...current.blocks, { ...block, id: uid(), done: false }] })
}

export function updateBlock(date: string, id: string, patch: Partial<TimeBlock>) {
  const current = entryFor(date)
  patchEntry(date, {
    blocks: current.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  })
}

export function removeBlock(date: string, id: string) {
  const current = entryFor(date)
  patchEntry(date, { blocks: current.blocks.filter((b) => b.id !== id) })
}

/** 어제 짜둔 블록을 그대로 오늘로 복사 — 계획표를 매일 새로 짜지 않게. */
export function copyBlocksFrom(source: string, target: string) {
  const from = state.entries[source]
  if (!from || from.blocks.length === 0) return false
  patchEntry(target, {
    blocks: from.blocks.map((b) => ({ ...b, id: uid(), done: false })),
  })
  return true
}

/* ---------------------------------------------------------------- 습관 */

export function addHabit(input: Omit<Habit, 'id' | 'createdAt' | 'order'>) {
  const habit: Habit = {
    ...input,
    id: `h_${uid()}`,
    createdAt: todayKey(),
    order: state.habits.length,
  }
  set({ ...state, habits: [...state.habits, habit] })
}

export function updateHabit(id: string, patch: Partial<Habit>) {
  set({
    ...state,
    habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  })
}

/** 기록을 지우지 않기 위해 삭제 대신 보관 처리한다. */
export function archiveHabit(id: string, archived = true) {
  updateHabit(id, { archived })
}

export function deleteHabit(id: string) {
  const entries: Record<string, DayEntry> = {}
  for (const [date, e] of Object.entries(state.entries)) {
    entries[date] = { ...e, done: e.done.filter((h) => h !== id) }
  }
  set({ ...state, habits: state.habits.filter((h) => h.id !== id), entries })
}

export function moveHabit(id: string, delta: number) {
  const list = [...state.habits].sort((a, b) => a.order - b.order)
  const i = list.findIndex((h) => h.id === id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  set({ ...state, habits: list.map((h, idx) => ({ ...h, order: idx })) })
}

/* ---------------------------------------------------------------- 기타 */

export function setMonthReview(month: string, patch: Partial<{ keep: string; drop: string; next: string }>) {
  const current = state.reviews[month] ?? { month, keep: '', drop: '', next: '' }
  set({ ...state, reviews: { ...state.reviews, [month]: { ...current, ...patch, month } } })
}

export function setPinnedMantra(text: string) {
  set({ ...state, pinnedMantra: text })
}

export function setTheme(theme: AppState['theme']) {
  set({ ...state, theme })
}

export function setOnboarded(onboarded: boolean) {
  set({ ...state, onboarded })
}

export function exportJson(): string {
  return JSON.stringify(state, null, 2)
}

export function importJson(raw: string): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.habits)) {
      return { ok: false, error: 'HABITUS 백업 파일 형식이 아닙니다.' }
    }
    set({ ...seed(), ...parsed, version: VERSION })
    return { ok: true }
  } catch {
    return { ok: false, error: 'JSON을 읽을 수 없습니다.' }
  }
}

export function resetAll() {
  set(seed())
}

/** 현재 달 키 — 여러 화면이 같은 기준을 쓰도록 */
export function currentMonth(): string {
  return monthKey(todayKey())
}
