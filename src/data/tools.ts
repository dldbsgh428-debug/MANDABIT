import type { ToolKind } from '../types'

export interface ToolMeta {
  kind: ToolKind
  label: string
  /** 행동을 만들 때 보여주는 설명 */
  hint: string
  emoji: string
}

export const TOOLS: ToolMeta[] = [
  { kind: 'none', label: '체크만', hint: '했는지 안 했는지만 표시합니다', emoji: '✓' },
  { kind: 'money', label: '가계부', hint: '금액과 분류를 적으면 달마다 정리해 줍니다', emoji: '💳' },
  { kind: 'counter', label: '횟수 세기', hint: '물 8잔처럼 하루에 몇 번인지 셉니다', emoji: '＃' },
  { kind: 'duration', label: '시간 재기', hint: '운동 30분처럼 걸린 시간을 적습니다', emoji: '⏱' },
  { kind: 'text', label: '글 남기기', hint: '감사 일기, 배운 것, 감상을 적습니다', emoji: '✎' },
]

export function toolMeta(kind: ToolKind): ToolMeta {
  return TOOLS.find((t) => t.kind === kind) ?? TOOLS[0]
}

/** 가계부 분류. 지출이 대부분이라 지출 항목을 앞에 둔다. */
export const MONEY_CATEGORIES = [
  '식비',
  '카페·간식',
  '교통',
  '생활용품',
  '주거·통신',
  '건강',
  '문화·여가',
  '의류·미용',
  '경조사',
  '기타',
] as const

export const INCOME_CATEGORIES = ['월급', '용돈', '부수입', '기타'] as const

/** 1,234원 */
export function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}

/** 큰 금액을 짧게 — 12.3만원 */
export function formatWonShort(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${(amount / 10_000).toFixed(abs >= 100_000 ? 0 : 1)}만`
  return `${Math.round(amount).toLocaleString('ko-KR')}`
}

/** 90분 → 1시간 30분 */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = Math.round(total % 60)
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}
