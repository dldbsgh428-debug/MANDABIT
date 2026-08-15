import { useSyncExternalStore } from 'react'
import type { Action, AppState, CapitalId, DayLog, Mood, PlanBlock, ThemePref } from '../types'
import { DEFAULT_BLOCKS, PRESET_ACTIONS, makePresetAction } from '../data/presets'
import { todayKey } from './date'

const KEY = 'habitus.v2'
const VERSION = 2

const uid = () => Math.random().toString(36).slice(2, 10)

function seed(): AppState {
  // 아주 이른 날짜로 두어야 프리셋 행동이 과거 기록에도 잡힌다.
  const created = '2000-01-01'
  return {
    version: VERSION,
    actions: PRESET_ACTIONS.map((p, i) => makePresetAction(p, i, created)),
    logs: {},
    theme: 'system',
    seenLevels: {},
    onboarded: false,
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Partial<AppState>
    // 알아볼 수 있는 부분만 살리고 나머지는 기본값으로 채운다.
    return {
      ...seed(),
      ...parsed,
      version: VERSION,
      actions: Array.isArray(parsed.actions) ? parsed.actions : seed().actions,
      logs: parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : {},
      seenLevels: parsed.seenLevels && typeof parsed.seenLevels === 'object' ? parsed.seenLevels : {},
    }
  } catch {
    return seed()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

// 첫 방문이면 시드를 바로 기록해 둔다 — 행동 id가 세션마다 달라지지 않도록.
// localStorage 접근 자체가 막힌 환경(샌드박스 iframe)에서는 읽기도 던지므로
// 조건문까지 통째로 감싼다. 저장이 안 되면 이번 세션은 메모리로만 돈다.
try {
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(state))
} catch {
  // 무시 — 화면은 계속 동작해야 한다.
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
  for (const l of listeners) l()
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

/* ---------------------------------------------------------------- 하루 */

export function logFor(date: string): DayLog {
  return state.logs[date] ?? { date, done: [], blocks: [] }
}

function patchLog(date: string, patch: Partial<DayLog>) {
  const current = logFor(date)
  set({ ...state, logs: { ...state.logs, [date]: { ...current, ...patch, date } } })
}

/** 행동 완료 토글. 경험치는 저장하지 않고 기록에서 매번 다시 계산한다. */
export function toggleAction(date: string, actionId: string) {
  const current = logFor(date)
  const done = current.done.includes(actionId)
    ? current.done.filter((id) => id !== actionId)
    : [...current.done, actionId]
  patchLog(date, { done })
}

export function setMood(date: string, mood: Mood | undefined) {
  patchLog(date, { mood })
}

export function setNote(date: string, note: string) {
  patchLog(date, { note })
}

/* ------------------------------------------------------------ 계획 블록 */

export function seedBlocks(date: string) {
  patchLog(date, { blocks: DEFAULT_BLOCKS.map((b) => ({ ...b, id: uid(), done: false })) })
}

export function addBlock(date: string, block: Omit<PlanBlock, 'id' | 'done'>) {
  patchLog(date, { blocks: [...logFor(date).blocks, { ...block, id: uid(), done: false }] })
}

export function updateBlock(date: string, id: string, patch: Partial<PlanBlock>) {
  patchLog(date, {
    blocks: logFor(date).blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  })
}

export function removeBlock(date: string, id: string) {
  patchLog(date, { blocks: logFor(date).blocks.filter((b) => b.id !== id) })
}

/** 어제 짜둔 계획을 그대로 복사 — 매일 새로 짜지 않게 */
export function copyBlocks(from: string, to: string): boolean {
  const source = state.logs[from]
  if (!source || source.blocks.length === 0) return false
  patchLog(to, { blocks: source.blocks.map((b) => ({ ...b, id: uid(), done: false })) })
  return true
}

/* ---------------------------------------------------------------- 행동 */

export function addAction(input: Omit<Action, 'id' | 'createdAt' | 'order'>) {
  const action: Action = {
    ...input,
    id: `a_${uid()}`,
    createdAt: todayKey(),
    order: state.actions.length,
  }
  set({ ...state, actions: [...state.actions, action] })
}

export function updateAction(id: string, patch: Partial<Action>) {
  set({ ...state, actions: state.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
}

/** 기록과 경험치를 지우지 않기 위해 삭제 대신 보관을 기본으로 둔다. */
export function archiveAction(id: string, archived = true) {
  updateAction(id, { archived })
}

export function deleteAction(id: string) {
  const logs: Record<string, DayLog> = {}
  for (const [date, log] of Object.entries(state.logs)) {
    logs[date] = { ...log, done: log.done.filter((a) => a !== id) }
  }
  set({ ...state, actions: state.actions.filter((a) => a.id !== id), logs })
}

export function moveAction(id: string, delta: number) {
  const list = [...state.actions].sort((a, b) => a.order - b.order)
  const i = list.findIndex((a) => a.id === id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  set({ ...state, actions: list.map((a, idx) => ({ ...a, order: idx })) })
}

/* ---------------------------------------------------------------- 기타 */

/** 레벨업 축하를 한 번만 띄우기 위해 '본 레벨'을 기록한다. */
export function markLevelSeen(capitalId: CapitalId, level: number) {
  set({ ...state, seenLevels: { ...state.seenLevels, [capitalId]: level } })
}

export function setTheme(theme: ThemePref) {
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
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.actions)) {
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
