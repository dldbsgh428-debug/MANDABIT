import type { CapitalId, Habit, TimeBlock, Weekday } from '../types'

interface PresetHabit {
  name: string
  capital: CapitalId
  cue: string
  days?: Weekday[]
}

/**
 * 처음 켰을 때 들어가는 기본 습관 열 개.
 * 7자본을 한 번씩은 밟도록 짜 두었다 — 균형 차트가 첫날부터 말이 되게.
 */
export const PRESET_HABITS: PresetHabit[] = [
  { name: '아침 7시 전에 일어나기', capital: 'body', cue: '기상 직후' },
  { name: '물 2L 마시기', capital: 'body', cue: '하루 종일' },
  { name: '운동 30분 하기', capital: 'body', cue: '퇴근 후', days: [1, 2, 3, 4, 5] },
  { name: '독서 30분 이상 하기', capital: 'knowledge', cue: '자기 전' },
  { name: '10분 명상하기', capital: 'psych', cue: '아침 세수 후' },
  { name: '감사일기 쓰기', capital: 'psych', cue: '잠들기 전' },
  { name: '가계부 3분 정리', capital: 'economy', cue: '저녁 식사 후' },
  { name: '영어 문장 3개 소리내어 읽기', capital: 'language', cue: '출근길' },
  { name: '좋은 것 하나 감상하기', capital: 'culture', cue: '점심시간', days: [1, 3, 5] },
  { name: '안부 연락 한 명', capital: 'social', cue: '저녁', days: [2, 6] },
]

/** 하루를 처음 열 때 깔리는 타임블록 뼈대. 그대로 두든 갈아엎든 사용자 자유. */
export const DEFAULT_BLOCKS: Omit<TimeBlock, 'id' | 'done'>[] = [
  { start: '06:30', end: '08:00', title: '아침 루틴 · 몸 깨우기', capital: 'body' },
  { start: '09:00', end: '12:00', title: '가장 중요한 일 한 가지', capital: 'knowledge' },
  { start: '12:00', end: '13:00', title: '점심 · 산책', capital: 'body' },
  { start: '13:00', end: '18:00', title: '본업', capital: null },
  { start: '19:00', end: '20:00', title: '운동', capital: 'body' },
  { start: '21:00', end: '22:00', title: '독서 · 기록', capital: 'knowledge' },
  { start: '22:30', end: '23:00', title: '회고 · 내일 준비', capital: 'psych' },
]

export const CONDITION_FACES: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😞', label: '많이 지침' },
  2: { emoji: '😕', label: '그럭저럭' },
  3: { emoji: '😐', label: '보통' },
  4: { emoji: '🙂', label: '좋음' },
  5: { emoji: '😄', label: '최고' },
}

export function makeHabit(p: PresetHabit, index: number, createdAt: string): Habit {
  return {
    id: `h_${index}_${Math.random().toString(36).slice(2, 8)}`,
    name: p.name,
    capital: p.capital,
    cue: p.cue,
    days: p.days ?? [],
    createdAt,
    order: index,
  }
}
