/**
 * 월간 리포트 테스트.
 *
 * 리포트는 '지난달보다 늘었다/줄었다'를 말하는 화면이라, 비교 기준이 틀리면
 * 사실과 반대되는 문장을 보여주게 된다. 기간을 맞추는 부분을 특히 본다.
 *
 * 오늘을 2026-08-17로 고정한다(진행 중인 달 판정에 쓰인다).
 */

import { monthlyReport, defaultReportMonth } from '../report';
import type { AppData, Category, RecurringExpense, Transaction } from '../../types';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 7, 17)); // 2026-08-17 (로컬 시간)
});

afterAll(() => {
  jest.useRealTimers();
});

function tx(over: Partial<Transaction> & { amount: number; type: 'income' | 'expense' }): Transaction {
  return {
    id: `tx-${Math.random()}`,
    date: '2026-08-05',
    categoryId: 'exp-food',
    createdAt: '2026-08-05T00:00:00.000Z',
    ...over,
  };
}

function category(over: Partial<Category> & { id: string }): Category {
  return {
    name: over.id,
    emoji: '🍚',
    type: 'expense',
    ...over,
  };
}

function appData(over: Partial<AppData> = {}): AppData {
  return {
    version: 1,
    settings: {
      goalAmount: 100_000_000,
      monthlySavingTarget: 3_000_000,
      startDate: '2026-01-01',
      showForecastLine: true,
      projectBalances: true,
      autoRecurring: true,
      reminderEnabled: false,
      reminderDay: 31,
      reminderHour: 20,
    },
    accounts: [],
    snapshots: [],
    transactions: [],
    categories: [category({ id: 'exp-food', name: '식비' })],
    recurring: [],
    ...over,
  };
}

describe('monthlyReport', () => {
  it('진행 중인 달은 지난달 같은 기간까지만 견준다', () => {
    // 8월은 17일까지 왔다. 7월 한 달(31일)과 통째로 비교하면 무조건 줄어 보인다.
    const data = appData({
      transactions: [
        tx({ type: 'expense', amount: 100_000, date: '2026-07-05' }),
        tx({ type: 'expense', amount: 900_000, date: '2026-07-25' }), // 17일 이후라 빠져야 한다
        tx({ type: 'expense', amount: 120_000, date: '2026-08-05' }),
      ],
    });

    const r = monthlyReport(data, '2026-08');

    expect(r.partial).toBe(true);
    expect(r.throughDay).toBe(17);
    expect(r.cashflow.expense).toBe(120_000);
    expect(r.prev.expense).toBe(100_000); // 7월 25일 지출은 비교에서 제외
  });

  it('끝난 달은 그 달 전체를 본다', () => {
    const data = appData({
      transactions: [
        tx({ type: 'expense', amount: 900_000, date: '2026-07-25' }),
        tx({ type: 'expense', amount: 100_000, date: '2026-07-05' }),
      ],
    });

    const r = monthlyReport(data, '2026-07');

    expect(r.partial).toBe(false);
    expect(r.throughDay).toBe(31);
    expect(r.cashflow.expense).toBe(1_000_000);
  });

  it('금액과 비율을 둘 다 넘겨야 늘었다고 본다', () => {
    const data = appData({
      categories: [
        category({ id: 'exp-food', name: '식비' }),
        category({ id: 'exp-cafe', name: '카페' }),
      ],
      transactions: [
        // 식비: 50만 -> 55만. 5만원 늘었지만 10%라 비율 기준에 못 미친다.
        tx({ type: 'expense', amount: 500_000, date: '2026-07-05', categoryId: 'exp-food' }),
        tx({ type: 'expense', amount: 550_000, date: '2026-08-05', categoryId: 'exp-food' }),
        // 카페: 5만 -> 12만. 7만원 + 140%라 둘 다 넘는다.
        tx({ type: 'expense', amount: 50_000, date: '2026-07-06', categoryId: 'exp-cafe' }),
        tx({ type: 'expense', amount: 120_000, date: '2026-08-06', categoryId: 'exp-cafe' }),
      ],
    });

    const r = monthlyReport(data, '2026-08');

    expect(r.surged.map((c) => c.categoryId)).toEqual(['exp-cafe']);
    const cafe = r.categories.find((c) => c.categoryId === 'exp-cafe');
    expect(cafe?.delta).toBe(70_000);
    expect(cafe?.rate).toBeCloseTo(1.4);
  });

  it('지난달에 없던 카테고리는 증감률을 내지 않는다', () => {
    // 0에서 늘어난 건 비율로 말할 수 없다(무한대). 금액만 말한다.
    const data = appData({
      transactions: [tx({ type: 'expense', amount: 80_000, date: '2026-08-05' })],
    });

    const food = monthlyReport(data, '2026-08').categories[0];
    expect(food.prev).toBe(0);
    expect(food.delta).toBe(80_000);
    expect(food.rate).toBeUndefined();
  });

  it('적자면 경고를 먼저 띄운다', () => {
    const data = appData({
      transactions: [
        tx({ type: 'income', amount: 2_000_000, date: '2026-08-01', categoryId: 'inc-salary' }),
        tx({ type: 'expense', amount: 2_500_000, date: '2026-08-05' }),
      ],
    });

    const notes = monthlyReport(data, '2026-08').notes;
    expect(notes[0].tone).toBe('warn');
    expect(notes[0].text).toContain('500,000원');
  });

  it('월 저축 목표를 채우면 달성으로 말한다', () => {
    const data = appData({
      transactions: [
        tx({ type: 'income', amount: 5_000_000, date: '2026-08-01', categoryId: 'inc-salary' }),
        tx({ type: 'expense', amount: 1_000_000, date: '2026-08-05' }),
      ],
    });

    const notes = monthlyReport(data, '2026-08').notes;
    expect(notes[0].tone).toBe('good');
  });

  it('예산 초과와 기록 안 된 고정지출을 모은다', () => {
    const recurringExpense: RecurringExpense = {
      id: 'r1',
      name: '월세',
      amount: 600_000,
      categoryId: 'exp-house',
      dayOfMonth: 25,
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const data = appData({
      categories: [category({ id: 'exp-food', name: '식비', budget: 300_000 })],
      recurring: [recurringExpense],
      transactions: [tx({ type: 'expense', amount: 450_000, date: '2026-08-05' })],
    });

    const r = monthlyReport(data, '2026-08');

    expect(r.overBudget).toHaveLength(1);
    expect(r.overBudget[0].spent - r.overBudget[0].budget).toBe(150_000);
    expect(r.missedRecurring.map((m) => m.expense.id)).toEqual(['r1']);
  });
});

describe('defaultReportMonth', () => {
  it('이번 달 기록이 없으면 지난달을 연다', () => {
    expect(defaultReportMonth(appData())).toBe('2026-07');
  });

  it('이번 달 기록이 있으면 이번 달을 연다', () => {
    const data = appData({ transactions: [tx({ type: 'expense', amount: 1_000, date: '2026-08-02' })] });
    expect(defaultReportMonth(data)).toBe('2026-08');
  });
});
