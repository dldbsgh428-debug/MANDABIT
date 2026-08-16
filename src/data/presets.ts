import type { Action, CapitalId, Mood, PlanBlock, Weekday } from '../types'

export interface SuggestedAction {
  title: string
  capital: CapitalId
  cue?: string
  days?: Weekday[]
}

/**
 * 처음 시작할 때 '고를 수 있게' 보여주는 후보들. 자동으로 넣지 않는다 —
 * 남이 정해준 행동은 오래 못 간다. 직접 쓰는 칸이 언제나 함께 있다.
 */
export const SUGGESTED_ACTIONS: SuggestedAction[] = [
  { title: '10분 명상하기', capital: 'psych', cue: '아침 세수 후' },
  { title: '감사한 일 세 가지 쓰기', capital: 'psych', cue: '잠들기 전' },
  { title: '산책하며 생각 정리', capital: 'psych', cue: '점심시간' },

  { title: '운동 30분', capital: 'body', cue: '퇴근 후', days: [1, 2, 3, 4, 5] },
  { title: '7시간 이상 자기', capital: 'body', cue: '밤' },
  { title: '물 2L 마시기', capital: 'body', cue: '하루 종일' },
  { title: '계단으로 다니기', capital: 'body' },

  { title: '책 30분 읽기', capital: 'knowledge', cue: '자기 전' },
  { title: '읽은 것 한 문단 정리', capital: 'knowledge', cue: '주말', days: [6, 0] },
  { title: '오늘 배운 것 한 줄 기록', capital: 'knowledge' },

  { title: '가계부 3분 정리', capital: 'economy', cue: '저녁 식사 후' },
  { title: '무지출 하루', capital: 'economy' },
  { title: '주간 예산 점검', capital: 'economy', cue: '일요일', days: [0] },

  { title: '좋은 것 하나 감상하기', capital: 'culture', cue: '점심시간', days: [1, 3, 5] },
  { title: '새로운 음악 한 장 듣기', capital: 'culture' },
  { title: '전시·공연 다녀오기', capital: 'culture', cue: '주말', days: [6] },

  { title: '먼저 안부 연락하기', capital: 'social', cue: '저녁', days: [2, 6] },
  { title: '고맙다고 표현하기', capital: 'social' },
  { title: '누군가를 실제로 만나기', capital: 'social', days: [6] },

  { title: '영어 문장 소리내어 읽기', capital: 'language', cue: '출근길', days: [1, 2, 3, 4, 5] },
  { title: '오늘 있었던 일 글로 쓰기', capital: 'language', cue: '밤' },
  { title: '새 단어 5개 외우기', capital: 'language' },
]

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

export function makeAction(s: SuggestedAction, order: number, createdAt: string): Action {
  return {
    id: `a_${order}_${Math.random().toString(36).slice(2, 8)}`,
    title: s.title,
    capital: s.capital,
    cue: s.cue,
    days: s.days ?? [],
    createdAt,
    order,
  }
}
