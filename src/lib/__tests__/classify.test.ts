/**
 * 카테고리 자동 선택 테스트.
 *
 * 틀리게 골라놓고 사용자가 못 알아채면 통계 전체가 조용히 망가진다.
 * '배운 것이 기본 목록을 이긴다'와 '없는 카테고리는 고르지 않는다'를 특히 본다.
 */

import { suggestCategory } from '../classify';
import type { Category, Transaction } from '../../types';

const categories: Category[] = [
  { id: 'exp-food', name: '식비', type: 'expense', emoji: '🍚' },
  { id: 'exp-cafe', name: '카페·간식', type: 'expense', emoji: '☕' },
  { id: 'exp-shopping', name: '쇼핑', type: 'expense', emoji: '🛍️' },
  { id: 'inc-salary', name: '급여', type: 'income', emoji: '💼' },
];

function tx(over: Partial<Transaction> & { categoryId: string; memo: string }): Transaction {
  return {
    id: `tx-${Math.random()}`,
    date: '2026-08-05',
    type: 'expense',
    amount: 5_000,
    createdAt: '2026-08-05T00:00:00.000Z',
    ...over,
  };
}

describe('suggestCategory', () => {
  it('기본으로 아는 가맹점은 배운 게 없어도 고른다', () => {
    expect(suggestCategory('스타벅스', 'expense', [], categories, '2026-08')).toBe('exp-cafe');
    expect(suggestCategory('GS25 물', 'expense', [], categories, '2026-08')).toBe('exp-food');
  });

  it('지난 기록에서 배운다', () => {
    // 기본 목록에 없는 가게. 한 번 넣어두면 다음부터 안다.
    const past = [tx({ memo: '동네국수', categoryId: 'exp-food' })];
    expect(suggestCategory('동네국수', 'expense', past, categories, '2026-08')).toBe('exp-food');
  });

  it('배운 것이 기본 목록을 이긴다', () => {
    // 스타벅스에서 텀블러만 산다면 그 사람에게는 쇼핑이 맞다.
    const past = [
      tx({ memo: '스타벅스', categoryId: 'exp-shopping' }),
      tx({ memo: '스타벅스 텀블러', categoryId: 'exp-shopping' }),
    ];
    expect(suggestCategory('스타벅스', 'expense', past, categories, '2026-08')).toBe('exp-shopping');
  });

  it('최근 습관을 더 무겁게 본다', () => {
    // 작년에는 식비로 넣었지만 올해는 계속 카페로 넣었다면 카페가 맞다.
    const past = [
      tx({ memo: '카페베네', categoryId: 'exp-food', date: '2025-01-05' }),
      tx({ memo: '카페베네', categoryId: 'exp-food', date: '2025-02-05' }),
      tx({ memo: '카페베네', categoryId: 'exp-cafe', date: '2026-07-05' }),
    ];
    expect(suggestCategory('카페베네', 'expense', past, categories, '2026-08')).toBe('exp-cafe');
  });

  it('수입과 지출을 섞지 않는다', () => {
    const past = [tx({ memo: '이자', categoryId: 'exp-food' })];
    // 지출 기록에서 배운 걸 수입 입력에 쓰면 안 된다.
    expect(suggestCategory('이자', 'income', past, categories, '2026-08')).toBeNull();
    expect(suggestCategory('급여', 'income', past, categories, '2026-08')).toBe('inc-salary');
  });

  it('숨긴 카테고리는 고르지 않는다', () => {
    const hidden: Category[] = [{ ...categories[1], archived: true }, categories[0]];
    // 카페를 숨겼으면 스타벅스도 카페로 넣을 수 없다.
    expect(suggestCategory('스타벅스', 'expense', [], hidden, '2026-08')).toBeNull();
  });

  it('메모가 너무 짧으면 고르지 않는다', () => {
    // 한 글자는 우연히 겹치기 쉽다. 아무 말도 안 하는 편이 낫다.
    expect(suggestCategory('ㅇ', 'expense', [], categories, '2026-08')).toBeNull();
    expect(suggestCategory('', 'expense', [], categories, '2026-08')).toBeNull();
  });
});
