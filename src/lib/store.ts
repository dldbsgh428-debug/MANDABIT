import { useSyncExternalStore } from 'react'
import type { Action, AppState, DayLog, Entry, Mood, PlanBlock, ThemePref } from '../types'
import { DEFAULT_BLOCKS } from '../data/presets'
import { todayKey } from './date'
import { toolSatisfied } from './entries'

const KEY = 'habitus.v3'
const VERSION = 4

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * 처음 상태는 비어 있다. 행동은 온보딩에서 사용자가 직접 고르거나 쓴다 —
 * 남이 채워둔 목록은 자기 것이 되지 않는다.
 */
function seed(): AppState {
  return {
    version: VERSION,
    actions: [],
    logs: {},
    entries: [],
    theme: 'system',
    onboarded: false,
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      ...seed(),
      ...parsed,
      version: VERSION,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      logs: parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : {},
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    }
  } catch {
    return seed()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

// 첫 방문이면 시드를 바로 기록해 둔다. localStorage 접근 자체가 막힌
// 환경(샌드박스 iframe)에서는 읽기도 던지므로 조건문까지 통째로 감싼다.
try {
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(state))
} catch {
  // 저장이 막혀도 이번 세션은 메모리로 동작한다.
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

/* ------------------------------------------------------------ 도구 기록 */

/**
 * 기록을 넣고 빼면 그날의 완료 여부도 함께 맞춘다.
 * 완료 상태를 log.done 한 곳에만 두어야 통계가 어긋나지 않는다.
 */
function syncDone(next: AppState, date: string, actionId: string): AppState {
  const action = next.actions.find((a) => a.id === actionId)
  if (!action || !action.tool || action.tool.kind === 'none') return next

  const dayEntries = next.entries.filter((e) => e.date === date && e.actionId === actionId)
  const satisfied = toolSatisfied(action, dayEntries)
  const log = next.logs[date] ?? { date, done: [], blocks: [] }
  const has = log.done.includes(actionId)
  if (satisfied === has) return next

  const done = satisfied ? [...log.done, actionId] : log.done.filter((id) => id !== actionId)
  return { ...next, logs: { ...next.logs, [date]: { ...log, done, date } } }
}

export function addEntry(input: Omit<Entry, 'id' | 'at'>) {
  const entry: Entry = { ...input, id: `e_${uid()}`, at: new Date().toISOString() }
  set(syncDone({ ...state, entries: [...state.entries, entry] }, entry.date, entry.actionId))
}

export function updateEntry(id: string, patch: Partial<Entry>) {
  const target = state.entries.find((e) => e.id === id)
  if (!target) return
  const entries = state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
  set(syncDone({ ...state, entries }, target.date, target.actionId))
}

export function removeEntry(id: string) {
  const target = state.entries.find((e) => e.id === id)
  if (!target) return
  const entries = state.entries.filter((e) => e.id !== id)
  set(syncDone({ ...state, entries }, target.date, target.actionId))
}

/* ------------------------------------------------------------ 계획 블록 */

export function seedBlocks(date: string) {
  patchLog(date, { blocks: DEFAULT_BLOCKS.map((b) => ({ ...b, id: uid(), done: false })) })
}

export function addBlock(date: string, block: Omit<PlanBlock, 'id' | 'done'>) {
  patchLog(date, { blocks: [...logFor(date).blocks, { ...block, id: uid(), done: false }] })
}

export function updateBlock(date: string, id: string, patch: Partial<PlanBlock>) {
  patchLog(date, { blocks: logFor(date).blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
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

export function addAction(input: Omit<Action, 'id' | 'createdAt' | 'order'>, createdAt = todayKey()) {
  const action: Action = { ...input, id: `a_${uid()}`, createdAt, order: state.actions.length }
  set({ ...state, actions: [...state.actions, action] })
}

/** 온보딩에서 여러 개를 한 번에 넣을 때 — 렌더를 한 번만 일으킨다 */
export function addActions(
  inputs: Omit<Action, 'id' | 'createdAt' | 'order'>[],
  createdAt = todayKey(),
) {
  const base = state.actions.length
  const added: Action[] = inputs.map((input, i) => ({
    ...input,
    id: `a_${uid()}`,
    createdAt,
    order: base + i,
  }))
  set({ ...state, actions: [...state.actions, ...added] })
}

export function updateAction(id: string, patch: Partial<Action>) {
  set({ ...state, actions: state.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
}

/** 기록을 지우지 않기 위해 삭제 대신 보관을 기본으로 둔다. */
export function archiveAction(id: string, archived = true) {
  updateAction(id, { archived })
}

export function deleteAction(id: string) {
  const logs: Record<string, DayLog> = {}
  for (const [date, log] of Object.entries(state.logs)) {
    logs[date] = { ...log, done: log.done.filter((a) => a !== id) }
  }
  set({
    ...state,
    actions: state.actions.filter((a) => a.id !== id),
    logs,
    // 행동을 지우면 그 행동으로 남긴 가계부·기록도 함께 사라진다.
    entries: state.entries.filter((e) => e.actionId !== id),
  })
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
