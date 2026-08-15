import type { Action, CapitalId, Mood, PlanBlock, Weekday, Weight } from '../types'

interface PresetAction {
  title: string
  capital: CapitalId
  weight: Weight
  cue: string
  days?: Weekday[]
}

/**
 * 처음 켰을 때 들어가는 행동들. 일곱 자본을 한 번씩은 밟도록 짰다 —
 * 첫날부터 성장 화면이 말이 되게.
 */
export const PRESET_ACTIONS: PresetAction[] = [
  { title: '10분 명상하기', capital: 'psych', weight: 'light', cue: '아침 세수 후' },
  { title: '감사한 일 세 가지 쓰기', capital: 'psych', weight: 'light', cue: '잠들기 전' },
  { title: '운동 30분', capital: 'body', weight: 'normal', cue: '퇴근 후', days: [1, 2, 3, 4, 5] },
  { title: '7시간 이상 자기', capital: 'body', weight: 'normal', cue: '밤' },
  { title: '책 30분 읽기', capital: 'knowledge', weight: 'normal', cue: '자기 전' },
  { title: '읽은 것 한 문단 정리', capital: 'knowledge', weight: 'deep', cue: '주말', days: [6, 0] },
  { title: '가계부 3분 정리', capital: 'economy', weight: 'light', cue: '저녁 식사 후' },
  { title: '좋은 것 하나 감상하기', capital: 'culture', weight: 'light', cue: '점심시간', days: [1, 3, 5] },
  { title: '먼저 안부 연락하기', capital: 'social', weight: 'light', cue: '저녁', days: [2, 6] },
  { title: '영어 문장 소리내어 읽기', capital: 'language', weight: 'light', cue: '출근길', days: [1, 2, 3, 4, 5] },
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

export function makePresetAction(p: PresetAction, index: number, createdAt: string): Action {
  return {
    id: `a_${index}_${Math.random().toString(36).slice(2, 8)}`,
    title: p.title,
    capital: p.capital,
    weight: p.weight,
    cue: p.cue,
    days: p.days ?? [],
    createdAt,
    order: index,
  }
}
