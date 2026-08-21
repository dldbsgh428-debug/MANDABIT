/**
 * 메모를 보고 카테고리를 골라준다.
 *
 * 규칙을 미리 다 적어두는 대신 지난 기록에서 배운다. '스타벅스'를 카페로
 * 넣은 적이 있으면 다음부터 카페를 고른다. 사용자가 고치면 그 기록이
 * 다시 학습 재료가 되므로, 따로 저장해둘 규칙이 없다.
 *
 * 처음 쓰는 사람에게는 배울 기록이 없으니 흔한 가맹점 몇 개만 기본으로 안다.
 */

import type { Category, MonthKey, Transaction, TxType } from '../types';
import { monthOf, monthsBetween, currentMonth } from './date';

/** 기본으로 아는 가맹점. 배운 게 없을 때만 쓴다. */
const KNOWN: { category: string; words: string[] }[] = [
  {
    category: 'exp-cafe',
    words: ['스타벅스', '스벅', '투썸', '이디야', '메가커피', '빽다방', '컴포즈', '커피',
      '파리바게', '뚜레쥬르', '배스킨', '카페'],
  },
  {
    category: 'exp-food',
    words: ['gs25', 'cu', '세븐일레븐', '편의점', '이마트', '홈플러스', '롯데마트', '마트',
      '배달의민족', '배민', '요기요', '쿠팡이츠', '식당', '김밥', '국밥', '치킨', '피자', '분식'],
  },
  {
    category: 'exp-transport',
    words: ['카카오t', '택시', '지하철', '버스', '코레일', 'ktx', '주유', '하이패스', '티머니', '교통'],
  },
  { category: 'exp-comm', words: ['skt', 'kt', '유플러스', 'lgu', '알뜰폰', '통신비'] },
  {
    category: 'exp-sub',
    words: ['넷플릭스', '유튜브', '왓챠', '디즈니', '스포티파이', '멜론', '구독', 'chatgpt', 'icloud'],
  },
  { category: 'exp-culture', words: ['cgv', '메가박스', '롯데시네마', '영화', '공연', '전시', '노래방'] },
  {
    category: 'exp-shopping',
    words: ['쿠팡', '무신사', '지그재그', '올리브영', '다이소', '11번가', 'g마켓', '아마존'],
  },
  { category: 'exp-health', words: ['병원', '약국', '치과', '한의원', '헬스', '필라테스'] },
  { category: 'exp-house', words: ['월세', '관리비', '전기', '가스', '수도'] },
  { category: 'exp-social', words: ['축의', '조의', '결혼식', '부의', '돌잔치'] },
  { category: 'exp-insurance', words: ['보험'] },
  { category: 'inc-salary', words: ['급여', '월급'] },
  { category: 'inc-bonus', words: ['상여', '성과급', '보너스'] },
  { category: 'inc-invest', words: ['이자', '배당'] },
];

/** 비교하기 좋게 다듬는다. 대소문자와 띄어쓰기 차이로 못 알아보는 걸 막는다. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

/** 의미 있는 조각으로 자른다. 한 글자짜리는 우연히 겹치기 쉬워 버린다. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^0-9a-z가-힣]+/)
    .filter((t) => t.length >= 2);
}

/** 최근 것일수록 무겁게. 반년 전 습관보다 지난달 습관이 지금과 가깝다. */
function weightOf(month: MonthKey, now: MonthKey): number {
  const ago = monthsBetween(month, now);
  if (ago <= 3) return 3;
  if (ago <= 12) return 2;
  return 1;
}

/**
 * 메모에 맞는 카테고리 id. 고를 수 없으면 null.
 *
 * 지난 기록을 먼저 보고, 없으면 기본 가맹점 목록을 본다. 어느 쪽이든
 * 지금 없는(또는 숨긴) 카테고리는 고르지 않는다.
 */
export function suggestCategory(
  memo: string,
  type: TxType,
  transactions: Transaction[],
  categories: Category[],
  asOf: MonthKey = currentMonth(),
): string | null {
  const text = memo.trim();
  if (text.length < 2) return null;

  const usable = (id: string) =>
    categories.some((c) => c.id === id && c.type === type && !c.archived);

  const tokens = tokenize(text);
  const flat = normalize(text);

  // 1) 지난 기록에서 배우기
  const scores = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type || !t.memo) continue;

    const otherFlat = normalize(t.memo);
    const otherTokens = tokenize(t.memo);
    const hit =
      otherFlat === flat ||
      otherFlat.includes(flat) ||
      flat.includes(otherFlat) ||
      tokens.some((tok) => otherTokens.some((o) => o === tok || o.includes(tok) || tok.includes(o)));
    if (!hit) continue;

    const weight = weightOf(monthOf(t.date), asOf) * (otherFlat === flat ? 2 : 1);
    scores.set(t.categoryId, (scores.get(t.categoryId) ?? 0) + weight);
  }

  let best: string | null = null;
  let bestScore = 0;
  for (const [id, score] of scores) {
    if (score > bestScore && usable(id)) {
      best = id;
      bestScore = score;
    }
  }
  if (best) return best;

  // 2) 기본으로 아는 가맹점
  for (const { category, words } of KNOWN) {
    if (!usable(category)) continue;
    if (words.some((w) => flat.includes(w))) return category;
  }

  return null;
}
