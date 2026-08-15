/** 아비투스를 이루는 7가지 자본. 앱의 모든 것이 이 축에 매달린다. */
export type CapitalId =
  | 'psych'
  | 'body'
  | 'knowledge'
  | 'economy'
  | 'culture'
  | 'social'
  | 'language'

export interface Capital {
  id: CapitalId
  name: string
  /** 좁은 줄에서 쓰는 두 글자 이름 */
  short: string
  /** 이 자본이 커지면 무엇이 달라지는가 */
  tagline: string
  /** 무엇을 하면 자라는가 — 행동을 만들 때 보여주는 힌트 */
  grows: string
  emoji: string
  /** var(--c1)…var(--c7). 색각 이상 검증을 마친 7슬롯 팔레트와 1:1. */
  cssVar: string
}

/** 0=일요일 … 6=토요일 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** 행동의 무게. 깊게 한 일이 더 많이 쌓이는 게 자연스럽다. */
export type Weight = 'light' | 'normal' | 'deep'

/** 자본을 늘리는 행동. 체크박스가 아니라 '경험치를 주는 행위'다. */
export interface Action {
  id: string
  title: string
  capital: CapitalId
  weight: Weight
  /** 실행할 요일. 빈 배열이면 매일. */
  days: Weekday[]
  /** 언제/어디서 할지 — 계획에 끌어올 때 쓰는 힌트 */
  cue?: string
  archived?: boolean
  createdAt: string
  order: number
}

export interface PlanBlock {
  id: string
  /** 'HH:MM' */
  start: string
  end: string
  title: string
  capital: CapitalId | null
  done: boolean
}

/** 하루 컨디션 */
export type Mood = 1 | 2 | 3 | 4 | 5

export interface DayLog {
  /** 'YYYY-MM-DD' */
  date: string
  /** 그날 완료한 행동 id */
  done: string[]
  blocks: PlanBlock[]
  mood?: Mood
  note?: string
}

export type ThemePref = 'system' | 'light' | 'dark'

export interface AppState {
  version: number
  actions: Action[]
  logs: Record<string, DayLog>
  theme: ThemePref
  /** 사용자가 마지막으로 본 레벨 — 레벨업 축하를 한 번만 띄우기 위해 */
  seenLevels: Partial<Record<CapitalId, number>>
  onboarded: boolean
}
