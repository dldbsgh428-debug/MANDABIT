import type { Capital, CapitalId } from '../types'

/**
 * 도리스 메르틴이 정리한 아비투스의 7가지 자본.
 * 순서는 팔레트 슬롯 순서와 1:1로 묶여 있다 — 자본을 추가·재정렬하면
 * 색 대비 검증(인접쌍 CVD ΔE)을 다시 돌려야 한다.
 */
export const CAPITALS: Capital[] = [
  {
    id: 'psych',
    name: '심리자본',
    tagline: '흔들려도 돌아오는 힘',
    hint: '명상, 감사일기, 회복 루틴처럼 마음의 바닥을 다지는 일',
    emoji: '🧠',
    cssVar: '--c1',
  },
  {
    id: 'body',
    name: '신체자본',
    tagline: '몸이 곧 지구력',
    hint: '운동, 수면, 식단, 자세 — 매일의 컨디션을 만드는 일',
    emoji: '💪',
    cssVar: '--c2',
  },
  {
    id: 'knowledge',
    name: '지식자본',
    tagline: '아는 만큼 보인다',
    hint: '독서, 공부, 기록, 정리 — 생각의 재료를 쌓는 일',
    emoji: '📚',
    cssVar: '--c3',
  },
  {
    id: 'economy',
    name: '경제자본',
    tagline: '선택할 수 있는 자유',
    hint: '가계부, 저축, 투자 점검 — 돈의 흐름을 손에 쥐는 일',
    emoji: '💰',
    cssVar: '--c4',
  },
  {
    id: 'culture',
    name: '문화자본',
    tagline: '취향은 오래 남는다',
    hint: '전시, 음악, 영화, 요리 — 감각을 넓히는 일',
    emoji: '🎨',
    cssVar: '--c5',
  },
  {
    id: 'social',
    name: '사회자본',
    tagline: '관계는 저절로 자라지 않는다',
    hint: '안부 연락, 모임, 도움 주기 — 사람에 시간을 쓰는 일',
    emoji: '🤝',
    cssVar: '--c6',
  },
  {
    id: 'language',
    name: '언어자본',
    tagline: '말이 곧 태도',
    hint: '글쓰기, 외국어, 발표 연습 — 표현을 벼리는 일',
    emoji: '🗣️',
    cssVar: '--c7',
  },
]

const BY_ID = new Map<CapitalId, Capital>(CAPITALS.map((c) => [c.id, c]))

export function capital(id: CapitalId): Capital {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`unknown capital: ${id}`)
  return found
}

/** `color: var(--c3)` 형태로 바로 쓸 수 있는 문자열 */
export function capitalColor(id: CapitalId): string {
  return `var(${capital(id).cssVar})`
}
