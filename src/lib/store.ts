import { useSyncExternalStore } from 'react'
import type {
  Action,
  AppState,
  CapitalId,
  DayLog,
  Mood,
  PlanBlock,
  Purchase,
  Reward,
  ThemePref,
} from '../types'
import { DEFAULT_BLOCKS, REST_PASS } from '../data/presets'
import { todayKey } from './date'
import { balanceXp, isRestDay } from './growth'

const KEY = 'habitus.v2'
const VERSION = 2

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * 처음 상태는 비어 있다. 행동도 보상도 온보딩에서 사용자가 직접 고른다 —
 * 남이 채워둔 목록은 자기 것이 되지 않는다. 휴식권만 붙박이로 넣어 둔다.
 */
function seed(): AppState {
  return {
    version: VERSION,
    actions: [],
    logs: {},
    rewards: [{ ...REST_PASS, createdAt: todayKey() }],
    purchases: [],
    restDays: [],
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
    const merged: AppState = {
      ...seed(),
      ...parsed,
      version: VERSION,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      logs: parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : {},
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : seed().rewards,
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      restDays: Array.isArray(parsed.restDays) ? parsed.restDays : [],
      seenLevels: parsed.seenLevels && typeof parsed.seenLevels === 'object' ? parsed.seenLevels : {},
    }
    // 붙박이 휴식권이 사라진 백업을 불러와도 되살린다.
    if (!merged.rewards.some((r) => r.id === REST_PASS.id)) {
      merged.rewards = [{ ...REST_PASS, createdAt: todayKey() }, ...merged.rewards]
    }
    return merged
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
export function addActions(inputs: Omit<Action, 'id' | 'createdAt' | 'order'>[], createdAt = todayKey()) {
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

/* ---------------------------------------------------------------- 보상 */

export function addReward(input: Omit<Reward, 'id' | 'createdAt' | 'order'>) {
  const reward: Reward = { ...input, id: `r_${uid()}`, createdAt: todayKey(), order: state.rewards.length }
  set({ ...state, rewards: [...state.rewards, reward] })
}

export function addRewards(inputs: Omit<Reward, 'id' | 'createdAt' | 'order'>[]) {
  const base = state.rewards.length
  const added: Reward[] = inputs.map((input, i) => ({
    ...input,
    id: `r_${uid()}`,
    createdAt: todayKey(),
    order: base + i,
  }))
  set({ ...state, rewards: [...state.rewards, ...added] })
}

export function updateReward(id: string, patch: Partial<Reward>) {
  set({ ...state, rewards: state.rewards.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
}

export function deleteReward(id: string) {
  // 붙박이 휴식권은 지우지 않는다 — 값만 바꿀 수 있다.
  if (id === REST_PASS.id) return
  set({ ...state, rewards: state.rewards.filter((r) => r.id !== id) })
}

export type BuyResult =
  | { ok: true }
  | { ok: false; reason: 'balance' | 'already-used' | 'missing' | 'rest-not-needed' }

/**
 * 보상을 바꾼다. 잔고에서만 빠지고 누적 경험치와 레벨은 그대로 남는다.
 * 휴식권은 사는 순간 오늘을 '쉬어도 되는 날'로 표시한다.
 */
export function buyReward(rewardId: string, date = todayKey()): BuyResult {
  const reward = state.rewards.find((r) => r.id === rewardId)
  if (!reward) return { ok: false, reason: 'missing' }
  if (balanceXp(state) < reward.cost) return { ok: false, reason: 'balance' }

  const isRest = reward.id === REST_PASS.id
  if (isRest && isRestDay(state, date)) return { ok: false, reason: 'rest-not-needed' }
  if (!reward.repeatable && state.purchases.some((p) => p.rewardId === reward.id)) {
    return { ok: false, reason: 'already-used' }
  }

  const purchase: Purchase = {
    id: `p_${uid()}`,
    rewardId: reward.id,
    title: reward.title,
    emoji: reward.emoji,
    cost: reward.cost,
    at: new Date().toISOString(),
  }

  set({
    ...state,
    purchases: [purchase, ...state.purchases],
    restDays: isRest ? [...state.restDays, date] : state.restDays,
  })
  return { ok: true }
}

/** 잘못 눌렀을 때 되돌리기 — 잔고를 돌려주고 휴식권이면 그날 표시도 지운다 */
export function undoPurchase(purchaseId: string) {
  const purchase = state.purchases.find((p) => p.id === purchaseId)
  if (!purchase) return
  const restDays =
    purchase.rewardId === REST_PASS.id
      ? state.restDays.filter((d) => d !== purchase.at.slice(0, 10))
      : state.restDays
  set({ ...state, purchases: state.purchases.filter((p) => p.id !== purchaseId), restDays })
}

/* ---------------------------------------------------------------- 기타 */

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
