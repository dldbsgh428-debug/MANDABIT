import type { CapitalId } from '../types'

export interface Mantra {
  text: string
  /** 이 문장이 특히 밀어주는 자본 (없으면 전반) */
  capital?: CapitalId
}

/**
 * 아침에 한 줄 읽고 시작하는 선언문.
 * 날짜를 씨앗으로 고르기 때문에 하루 동안은 같은 문장이 유지된다.
 */
export const MANTRAS: Mantra[] = [
  { text: '성격은 P여도, 루틴은 J처럼.' },
  { text: '오늘의 작은 습관이 내일의 큰 변화를 만든다.' },
  { text: '나는 결심으로 사는 사람이 아니라 구조로 사는 사람이다.' },
  { text: '완벽하게 하루를 살기보다, 어제의 나를 한 칸 넘어선다.' },
  { text: '기분이 아니라 시간표를 따른다.' },
  { text: '시작이 어려우면 2분만 한다. 그게 오늘의 승리다.' },
  { text: '끊긴 날은 실패가 아니라 데이터다. 내일 다시 잇는다.' },
  { text: '되고 싶은 사람이 오늘 할 법한 행동 하나를 지금 한다.' },
  { text: '남과 비교하지 않는다. 어제의 나와만 비교한다.' },
  { text: '반복이 취향이 되고, 취향이 곧 나의 아비투스가 된다.' },
  { text: '무너진 날에도 기록은 남긴다. 기록이 나를 데려간다.' },
  { text: '급한 일보다 중요한 일에 아침을 준다.' },

  { text: '불안은 사라지지 않는다. 다만 다루는 법을 익힐 뿐이다.', capital: 'psych' },
  { text: '오늘 내 편이 되어주는 사람은 나부터다.', capital: 'psych' },
  { text: '감사할 것 세 가지를 찾는 눈이 나를 부유하게 만든다.', capital: 'psych' },

  { text: '몸이 버텨주는 만큼 야망도 버틴다.', capital: 'body' },
  { text: '잘 자는 것도 실력이다.', capital: 'body' },
  { text: '움직인 만큼 생각이 맑아진다.', capital: 'body' },

  { text: '하루 열 쪽이 일 년이면 서재가 된다.', capital: 'knowledge' },
  { text: '읽은 것을 쓰지 않으면 읽지 않은 것과 같다.', capital: 'knowledge' },
  { text: '모른다고 말할 수 있는 사람이 가장 빨리 배운다.', capital: 'knowledge' },

  { text: '숫자를 보는 사람만이 숫자를 바꾼다.', capital: 'economy' },
  { text: '오늘 아낀 한 번이 미래의 선택지를 늘린다.', capital: 'economy' },

  { text: '좋은 것을 자주 보면 눈이 자란다.', capital: 'culture' },
  { text: '취향은 돈이 아니라 시간으로 만들어진다.', capital: 'culture' },

  { text: '연락은 여유가 생겨서 하는 게 아니라, 해야 여유가 생긴다.', capital: 'social' },
  { text: '먼저 주는 사람이 결국 넓어진다.', capital: 'social' },

  { text: '말투가 곧 나의 지문이다.', capital: 'language' },
  { text: '한 문장으로 설명하지 못하면 아직 내 것이 아니다.', capital: 'language' },
]

/** 날짜 문자열을 씨앗으로 하루 하나를 고정 선택한다. */
export function mantraForDate(date: string): Mantra {
  let hash = 0
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) % 100000
  }
  return MANTRAS[hash % MANTRAS.length]
}
