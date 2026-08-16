import type { Capital, CapitalId } from '../types'

/**
 * 자본 순서는 팔레트 슬롯 순서와 묶여 있다. 순서를 바꾸거나 자본을 더하면
 * 색각 이상 인접쌍 검증을 다시 돌려야 한다.
 */
export const CAPITALS: Capital[] = [
  {
    id: 'psych',
    short: '심리',
    name: '심리자본',
    tagline: '흔들려도 돌아오는 힘',
    grows: '명상, 감사, 회복 루틴 — 마음의 바닥을 다지는 일',
    emoji: '🧠',
    cssVar: '--c1',
  },
  {
    id: 'body',
    short: '신체',
    name: '신체자본',
    tagline: '몸이 곧 지구력',
    grows: '운동, 수면, 식단, 자세 — 매일의 컨디션을 만드는 일',
    emoji: '💪',
    cssVar: '--c2',
  },
  {
    id: 'knowledge',
    short: '지식',
    name: '지식자본',
    tagline: '아는 만큼 보인다',
    grows: '독서, 공부, 기록 — 생각의 재료를 쌓는 일',
    emoji: '📚',
    cssVar: '--c3',
  },
  {
    id: 'economy',
    short: '경제',
    name: '경제자본',
    tagline: '선택할 수 있는 자유',
    grows: '가계부, 저축, 투자 점검 — 돈의 흐름을 손에 쥐는 일',
    emoji: '💰',
    cssVar: '--c4',
  },
  {
    id: 'culture',
    short: '문화',
    name: '문화자본',
    tagline: '취향은 오래 남는다',
    grows: '전시, 음악, 영화, 요리 — 감각을 넓히는 일',
    emoji: '🎨',
    cssVar: '--c5',
  },
  {
    id: 'social',
    short: '사회',
    name: '사회자본',
    tagline: '관계는 저절로 자라지 않는다',
    grows: '먼저 연락, 모임, 도움 주기 — 사람에 시간을 쓰는 일',
    emoji: '🤝',
    cssVar: '--c6',
  },
  {
    id: 'language',
    short: '언어',
    name: '언어자본',
    tagline: '말이 곧 태도',
    grows: '글쓰기, 외국어, 발표 — 표현을 벼리는 일',
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

/** `style={{ color: capitalColor(id) }}` 로 바로 쓰는 문자열 */
export function capitalColor(id: CapitalId): string {
  return `var(${capital(id).cssVar})`
}
