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

/**
 * 실천을 '체크'만 하지 않고 실제로 거들어 주는 도구.
 * 가계부 적기라면 앱 안에서 바로 적을 수 있어야 한다 — 다른 앱을 열어야 한다면
 * 그 습관은 오래 못 간다.
 */
export type ToolKind = 'none' | 'money' | 'counter' | 'duration' | 'text'

export interface ActionTool {
  kind: ToolKind
  /** counter·duration의 하루 목표치. 없으면 한 번만 적어도 완료. */
  target?: number
  /** counter의 단위 — 잔, 개, 쪽 */
  unit?: string
}

/** 자본에 시간을 쓰는 한 가지 실천. */
export interface Action {
  id: string
  title: string
  capital: CapitalId
  /** 실행할 요일. 빈 배열이면 매일. */
  days: Weekday[]
  /** 언제/어디서 할지 — 계획에 끌어올 때 쓰는 힌트 */
  cue?: string
  /** 없으면 단순 체크로 동작한다 */
  tool?: ActionTool
  archived?: boolean
  createdAt: string
  order: number
}

/** 가계부 항목의 방향 */
export type MoneyDirection = 'out' | 'in'

/**
 * 도구로 남긴 한 건의 기록. 도구 종류에 따라 채워지는 칸이 다르다.
 * 한 행동을 하루에 여러 번 적을 수 있다 (가계부가 특히 그렇다).
 */
export interface Entry {
  id: string
  actionId: string
  /** 'YYYY-MM-DD' */
  date: string
  /** ISO 문자열 — 같은 날 안에서의 순서 */
  at: string

  /** money: 원 단위 금액 (항상 양수, 방향은 direction으로) */
  amount?: number
  direction?: MoneyDirection
  category?: string

  /** counter: 이번에 더한 수량 */
  count?: number

  /** duration: 분 */
  minutes?: number

  /** text: 남긴 글 */
  text?: string

  /** 모든 도구 공통 한 줄 메모 */
  memo?: string
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
  /** 그날 실천한 행동 id */
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
  /** 도구로 남긴 기록. 가계부 집계 때문에 날짜별이 아니라 평평한 목록으로 둔다. */
  entries: Entry[]
  theme: ThemePref
  onboarded: boolean
}
