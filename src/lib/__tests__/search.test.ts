/**
 * 가계부 검색 테스트.
 *
 * 검색이 틀리면 사용자는 "그때 그 지출이 없다"고 믿는다. 없는 것을 보여주는
 * 것보다 있는 것을 빠뜨리는 쪽이 더 나쁘므로, 조각을 나눠 찾는 규칙과
 * 조건을 겹쳐 걸었을 때의 동작을 특히 본다. 합계는 화면에 그대로 나가는
 * 숫자라 따로 확인한다.
 */

import { isEmptyFilter, searchTransactions } from '../search';
import type { Account, Category, Transaction } from '../../types';

const categories: Category[] = [
  { id: 'exp-food', name: '식비', type: 'expense', emoji: '🍚' },
  { id: 'exp-cafe', name: '카페·간식', type: 'expense', emoji: '☕' },
  { id: 'inc-salary', name: '급여', type: 'income', emoji: '💼' },
];

const accounts: Account[] = [
  {
    id: 'acc-check',
    name: '주거래통장',
    side: 'asset',
    kind: 'deposit',
    balance: 1_000_000,
    includeInNetWorth: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-card',
    name: '생활비카드',
    side: 'liability',
    kind: 'card',
    balance: 300_000,
    includeInNetWorth: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

let seq = 0;
function tx(over: Partial<Transaction> & { categoryId: string }): Transaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    date: '2026-08-05',
    type: 'expense',
    amount: 5_000,
    createdAt: `2026-08-05T00:00:${String(seq).padStart(2, '0')}.000Z`,
    ...over,
  };
}

const txs: Transaction[] = [
  tx({ categoryId: 'exp-cafe', memo: '스타벅스 아메리카노', amount: 4_500, date: '2026-08-17', accountId: 'acc-card' }),
  tx({ categoryId: 'exp-cafe', memo: '메가커피', amount: 2_000, date: '2026-07-03', accountId: 'acc-card' }),
  tx({ categoryId: 'exp-food', memo: '점심 김밥천국', amount: 9_000, date: '2026-08-17', accountId: 'acc-check' }),
  tx({ categoryId: 'exp-food', memo: undefined, amount: 15_000, date: '2026-06-20' }),
  tx({ categoryId: 'inc-salary', memo: '8월 급여', amount: 3_200_000, date: '2026-08-25', type: 'income', accountId: 'acc-check' }),
];

const run = (filter: Partial<Parameters<typeof searchTransactions>[3]> = {}) =>
  searchTransactions(txs, categories, accounts, { query: '', ...filter });

describe('searchTransactions', () => {
  it('검색어가 비면 전부 최신순으로 돌려준다', () => {
    const r = run();
    expect(r.count).toBe(5);
    expect(r.items.map((t) => t.date)).toEqual([
      '2026-08-25',
      '2026-08-17',
      '2026-08-17',
      '2026-07-03',
      '2026-06-20',
    ]);
  });

  it('같은 날짜면 나중에 입력한 것이 앞에 온다', () => {
    const r = run({ query: '2026-08-17' });
    expect(r.items.map((t) => t.memo)).toEqual(['점심 김밥천국', '스타벅스 아메리카노']);
  });

  it('메모에서 찾는다', () => {
    expect(run({ query: '김밥' }).items.map((t) => t.memo)).toEqual(['점심 김밥천국']);
  });

  it('카테고리 이름으로도 찾는다', () => {
    // 메모에 '카페'라는 글자가 없어도 카테고리가 카페면 나와야 한다.
    expect(run({ query: '카페' }).count).toBe(2);
  });

  it('계좌 이름으로도 찾는다', () => {
    expect(run({ query: '생활비카드' }).count).toBe(2);
  });

  it('대소문자와 띄어쓰기 차이를 무시한다', () => {
    expect(run({ query: '스타 벅스' }).count).toBe(1);
    expect(run({ query: '  김밥  ' }).count).toBe(1);
  });

  it('조각이 여럿이면 모두 맞아야 한다', () => {
    // '카페'(카테고리) + '메가'(메모) 둘 다 맞는 것은 하나뿐이다.
    expect(run({ query: '카페 메가' }).items.map((t) => t.memo)).toEqual(['메가커피']);
    expect(run({ query: '카페 김밥' }).count).toBe(0);
  });

  it('금액은 앞자리부터 맞춰본다', () => {
    expect(run({ query: '9000' }).items.map((t) => t.memo)).toEqual(['점심 김밥천국']);
    expect(run({ query: '15,000원' }).count).toBe(1);
    // '4'로 시작하는 금액은 4,500원 하나.
    expect(run({ query: '4' }).items.map((t) => t.amount)).toEqual([4_500]);
  });

  it('메모가 없는 거래도 다른 조건으로 찾을 수 있다', () => {
    expect(run({ query: '식비' }).count).toBe(2);
  });

  it('수입·지출로 거른다', () => {
    expect(run({ type: 'income' }).count).toBe(1);
    expect(run({ type: 'expense' }).count).toBe(4);
  });

  it('기간은 양끝을 포함한다', () => {
    expect(run({ from: '2026-07-03', to: '2026-08-17' }).count).toBe(3);
    expect(run({ from: '2026-08-01' }).count).toBe(3);
    expect(run({ to: '2026-06-30' }).count).toBe(1);
  });

  it('카테고리와 계좌로 거른다', () => {
    expect(run({ categoryIds: ['exp-cafe', 'exp-food'] }).count).toBe(4);
    expect(run({ accountIds: ['acc-check'] }).count).toBe(2);
    // 계좌를 안 적은 거래는 계좌 조건이 걸리면 빠진다.
    expect(run({ accountIds: ['acc-check', 'acc-card'] }).count).toBe(4);
  });

  it('조건을 겹쳐 걸면 모두 만족하는 것만 남는다', () => {
    const r = run({ query: '커피', type: 'expense', from: '2026-07-01', to: '2026-07-31' });
    expect(r.items.map((t) => t.memo)).toEqual(['메가커피']);
  });

  it('수입과 지출 합계를 나눠 센다', () => {
    const r = run();
    expect(r.income).toBe(3_200_000);
    expect(r.expense).toBe(4_500 + 2_000 + 9_000 + 15_000);
  });

  it('합계는 거른 결과만 센다', () => {
    const r = run({ query: '카페' });
    expect(r.expense).toBe(6_500);
    expect(r.income).toBe(0);
  });

  it('월별 합계를 최신 월부터 준다', () => {
    const r = run();
    expect(r.byMonth.map((m) => m.month)).toEqual(['2026-08', '2026-07', '2026-06']);
    expect(r.byMonth[0]).toEqual({
      month: '2026-08',
      income: 3_200_000,
      expense: 13_500,
      count: 3,
    });
  });

  it('결과가 없으면 빈 목록과 0을 준다', () => {
    const r = run({ query: '없는말' });
    expect(r).toEqual({ items: [], count: 0, income: 0, expense: 0, byMonth: [] });
  });

  it('원본 배열의 순서를 건드리지 않는다', () => {
    const before = txs.map((t) => t.id);
    run();
    expect(txs.map((t) => t.id)).toEqual(before);
  });
});

describe('isEmptyFilter', () => {
  it('아무 조건도 없으면 true', () => {
    expect(isEmptyFilter({ query: '' })).toBe(true);
    expect(isEmptyFilter({ query: '   ', categoryIds: [] })).toBe(true);
  });

  it('조건이 하나라도 있으면 false', () => {
    expect(isEmptyFilter({ query: '커피' })).toBe(false);
    expect(isEmptyFilter({ query: '', type: 'income' })).toBe(false);
    expect(isEmptyFilter({ query: '', from: '2026-01-01' })).toBe(false);
    expect(isEmptyFilter({ query: '', categoryIds: ['exp-cafe'] })).toBe(false);
  });
});
