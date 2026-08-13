/** 아비투스를 이루는 7가지 자본. 습관·계획·회고가 모두 이 축에 매달린다. */
export type CapitalId =
  | 'psych'
  | 'culture'
  | 'knowledge'
  | 'economy'
  | 'body'
  | 'language'
  | 'social'

export interface Capital {
  id: CapitalId
  name: string
  tagline: string
  /** 이 자본이 자라는 방식 — 습관을 만들 때 보여주는 힌트 */
  hint: string
  emoji: string
  /** var(--c1)…var(--c7) 중 하나. 검증된 7슬롯 categorical 팔레트. */
  cssVar: string
}

/** 0=일요일 … 6=토요일 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Habit {
  id: string
  name: string
  capital: CapitalId
  /** 실행할 요일. 빈 배열이면 매일. */
  days: Weekday[]
  /** 언제 할지에 대한 힌트 — 타임블록으로 끌어올 때 쓴다 */
  cue?: string
  archived?: boolean
  createdAt: string
  order: number
}

export interface TimeBlock {
  id: string
  /** 'HH:MM' */
  start: string
  end: string
  title: string
  capital: CapitalId | null
  done: boolean
}

/** 오늘 컨디션 — 이모지 하나로 남기면 한 달 상태가 보인다 */
export type Condition = 1 | 2 | 3 | 4 | 5

export interface DayEntry {
  /** 'YYYY-MM-DD' */
  date: string
  /** 완료한 습관 id 목록 */
  done: string[]
  blocks: TimeBlock[]
  condition?: Condition
  /** 그날의 만트라 (아침 선언) */
  mantra?: string
  /** 저녁 회고 3줄 */
  kept?: string
  learned?: string
  tomorrow?: string
  memo?: string
}

export interface MonthReview {
  /** 'YYYY-MM' */
  month: string
  keep: string
  drop: string
  next: string
}

export type ThemePref = 'system' | 'light' | 'dark'

export interface AppState {
  version: number
  habits: Habit[]
  entries: Record<string, DayEntry>
  reviews: Record<string, MonthReview>
  /** 사용자가 고정해 둔 만트라. 비어 있으면 프리셋에서 날짜별로 고른다. */
  pinnedMantra: string
  theme: ThemePref
  onboarded: boolean
}
