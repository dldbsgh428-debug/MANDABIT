import type { Action, CapitalId, Mood, PlanBlock, Reward, Weekday, Weight } from '../types'

export interface SuggestedAction {
  title: string
  capital: CapitalId
  weight: Weight
  cue?: string
  days?: Weekday[]
}

/**
 * 처음 시작할 때 '고를 수 있게' 보여주는 후보들. 자동으로 넣지 않는다 —
 * 남이 정해준 행동은 오래 못 간다. 직접 쓰는 칸이 언제나 함께 있다.
 */
export const SUGGESTED_ACTIONS: SuggestedAction[] = [
  { title: '10분 명상하기', capital: 'psych', weight: 'light', cue: '아침 세수 후' },
  { title: '감사한 일 세 가지 쓰기', capital: 'psych', weight: 'light', cue: '잠들기 전' },
  { title: '산책하며 생각 정리', capital: 'psych', weight: 'normal', cue: '점심시간' },

  { title: '운동 30분', capital: 'body', weight: 'normal', cue: '퇴근 후', days: [1, 2, 3, 4, 5] },
  { title: '7시간 이상 자기', capital: 'body', weight: 'normal', cue: '밤' },
  { title: '물 2L 마시기', capital: 'body', weight: 'light', cue: '하루 종일' },
  { title: '계단으로 다니기', capital: 'body', weight: 'light' },

  { title: '책 30분 읽기', capital: 'knowledge', weight: 'normal', cue: '자기 전' },
  { title: '읽은 것 한 문단 정리', capital: 'knowledge', weight: 'deep', cue: '주말', days: [6, 0] },
  { title: '오늘 배운 것 한 줄 기록', capital: 'knowledge', weight: 'light' },

  { title: '가계부 3분 정리', capital: 'economy', weight: 'light', cue: '저녁 식사 후' },
  { title: '무지출 하루', capital: 'economy', weight: 'normal' },
  { title: '주간 예산 점검', capital: 'economy', weight: 'deep', cue: '일요일', days: [0] },

  { title: '좋은 것 하나 감상하기', capital: 'culture', weight: 'light', cue: '점심시간', days: [1, 3, 5] },
  { title: '새로운 음악 한 장 듣기', capital: 'culture', weight: 'light' },
  { title: '전시·공연 다녀오기', capital: 'culture', weight: 'deep', cue: '주말', days: [6] },

  { title: '먼저 안부 연락하기', capital: 'social', weight: 'light', cue: '저녁', days: [2, 6] },
  { title: '고맙다고 표현하기', capital: 'social', weight: 'light' },
  { title: '누군가를 실제로 만나기', capital: 'social', weight: 'deep', days: [6] },

  { title: '영어 문장 소리내어 읽기', capital: 'language', weight: 'light', cue: '출근길', days: [1, 2, 3, 4, 5] },
  { title: '오늘 있었던 일 글로 쓰기', capital: 'language', weight: 'normal', cue: '밤' },
  { title: '새 단어 5개 외우기', capital: 'language', weight: 'light' },
]

/** 보상도 후보만 보여준다. 무엇이 상이 되는지는 사람마다 완전히 다르다. */
export interface SuggestedReward {
  title: string
  cost: number
  emoji: string
  repeatable: boolean
}

export const SUGGESTED_REWARDS: SuggestedReward[] = [
  { title: '좋아하는 카페 가기', cost: 150, emoji: '☕', repeatable: true },
  { title: '드라마 한 편 몰아보기', cost: 200, emoji: '📺', repeatable: true },
  { title: '배달 음식 시키기', cost: 400, emoji: '🍜', repeatable: true },
  { title: '갖고 싶던 책 사기', cost: 600, emoji: '📗', repeatable: true },
  { title: '주말에 하루 통째로 놀기', cost: 1200, emoji: '🎡', repeatable: true },
  { title: '사고 싶던 것 지르기', cost: 3000, emoji: '🎁', repeatable: false },
]

/** 앱에 붙박이로 들어가는 보상 — 쉬는 것도 계획의 일부다. */
export const REST_PASS: Omit<Reward, 'createdAt'> = {
  id: 'rest-pass',
  title: '휴식권',
  cost: 150,
  emoji: '🛌',
  note: '오늘 아무것도 하지 않아도 연속 기록이 끊기지 않습니다.',
  repeatable: true,
  order: -1,
}

/** 계획 화면에서 '기본 틀 넣기'를 눌렀을 때 깔리는 하루 */
export const DEFAULT_BLOCKS: Omit<PlanBlock, 'id' | 'done'>[] = [
  { start: '06:30', end: '08:00', title: '아침 루틴 · 몸 깨우기', capital: 'body' },
  { start: '09:00', end: '12:00', title: '가장 중요한 일 한 가지', capital: 'knowledge' },
  { start: '12:00', end: '13:00', title: '점심 · 산책', capital: 'body' },
  { start: '13:00', end: '18:00', title: '본업', capital: null },
  { start: '19:00', end: '20:00', title: '운동', capital: 'body' },
  { start: '21:00', end: '22:00', title: '독서 · 기록', capital: 'knowledge' },
  { start: '22:30', end: '23:00', title: '하루 닫기', capital: 'psych' },
]

export const MOODS: Record<Mood, { emoji: string; label: string }> = {
  1: { emoji: '😞', label: '많이 지침' },
  2: { emoji: '😕', label: '그럭저럭' },
  3: { emoji: '😐', label: '보통' },
  4: { emoji: '🙂', label: '좋음' },
  5: { emoji: '😄', label: '최고' },
}

export const REWARD_EMOJIS = [
  '🎁', '☕', '📺', '🍜', '🍰', '📗', '🎮', '🎧', '🛍️', '🎬', '🍺', '✈️', '🛌', '💤', '🧖', '🎡',
]

export function makeAction(s: SuggestedAction, order: number, createdAt: string): Action {
  return {
    id: `a_${order}_${Math.random().toString(36).slice(2, 8)}`,
    title: s.title,
    capital: s.capital,
    weight: s.weight,
    cue: s.cue,
    days: s.days ?? [],
    createdAt,
    order,
  }
}

export function makeReward(s: SuggestedReward, order: number, createdAt: string): Reward {
  return {
    id: `r_${order}_${Math.random().toString(36).slice(2, 8)}`,
    title: s.title,
    cost: s.cost,
    emoji: s.emoji,
    repeatable: s.repeatable,
    createdAt,
    order,
  }
}
