/**
 * 순자산·저축률·달성 예측 계산 테스트.
 *
 * 이 계산이 틀리면 사용자가 잘못된 목표 시점을 믿게 되므로
 * 화면보다 이쪽을 먼저 테스트한다.
 *
 * currentMonth()가 실제 오늘을 보기 때문에 시스템 시간을 2026-08-17로 고정한다.
 */

import {
  assetAllocation,
  lastRecordDate,
  effectiveRate,
  monthlyGain,
  principalSplit,
  savedVsGained,
  projectBalance,
  budgetStatus,
  categoryBreakdown,
  forecastGoal,
  monthlyCashflow,
  netWorth,
  netWorthAt,
  netWorthSeries,
  recurringStatus,
  recurringTotal,
  dueDateIn,
  pendingAutoRecurring,
  requiredMonthlySaving,
} from '../analytics';
import type {
  Account,
  AppData,
  BalanceSnapshot,
  Category,
  RecurringExpense,
  Transaction,
} from '../../types';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 7, 17)); // 2026-08-17 (로컬 시간)
});

afterAll(() => {
  jest.useRealTimers();
});

/* ------------------------------------------------------------- 테스트 헬퍼 */

function account(over: Partial<Account> & { id: string; balance: number }): Account {
  return {
    name: over.id,
    side: 'asset',
    kind: 'deposit',
    includeInNetWorth: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function snapshot(accountId: string, date: string, balance: number): BalanceSnapshot {
  return { id: `${accountId}-${date}`, accountId, date, balance };
}

function tx(over: Partial<Transaction> & { amount: number; type: 'income' | 'expense' }): Transaction {
  return {
    id: `tx-${Math.random()}`,
    date: '2026-08-05',
    categoryId: 'exp-food',
    createdAt: '2026-08-05T00:00:00.000Z',
    ...over,
  };
}

/* -------------------------------------------------------------- 순자산 계산 */

describe('netWorth', () => {
  it('자산 합계에서 부채를 뺀다', () => {
    const result = netWorth([
      account({ id: 'a', balance: 30_000_000 }),
      account({ id: 'b', balance: 5_000_000 }),
      account({ id: 'c', balance: 12_000_000, side: 'liability', kind: 'loan' }),
    ]);

    expect(result.assets).toBe(35_000_000);
    expect(result.liabilities).toBe(12_000_000);
    expect(result.net).toBe(23_000_000);
  });

  it('includeInNetWorth가 false인 계좌는 제외한다', () => {
    const result = netWorth([
      account({ id: 'a', balance: 10_000_000 }),
      account({ id: 'b', balance: 99_000_000, includeInNetWorth: false }),
    ]);

    expect(result.net).toBe(10_000_000);
  });

  it('계좌가 없으면 0이다', () => {
    expect(netWorth([])).toEqual({ assets: 0, liabilities: 0, net: 0 });
  });
});

describe('netWorthAt', () => {
  const accounts = [
    account({ id: 'a', balance: 999 }),
    account({ id: 'b', balance: 999, side: 'liability', kind: 'loan' }),
  ];
  const snapshots = [
    snapshot('a', '2026-03-10', 10_000_000),
    snapshot('a', '2026-05-20', 15_000_000),
    snapshot('b', '2026-04-01', 8_000_000),
    snapshot('b', '2026-06-15', 6_000_000),
  ];

  it('해당 월 말일 이전의 가장 최근 기록을 쓴다', () => {
    // 5월 말 기준: a는 5/20 기록(1500만), b는 4/1 기록(800만)
    expect(netWorthAt(accounts, snapshots, '2026-05').net).toBe(7_000_000);
  });

  it('기록이 없는 계좌는 0으로 본다', () => {
    // 3월 말에는 a만 기록이 있다.
    expect(netWorthAt(accounts, snapshots, '2026-03')).toEqual({
      assets: 10_000_000,
      liabilities: 0,
      net: 10_000_000,
    });
  });

  it('첫 기록보다 이전 달은 0이다', () => {
    expect(netWorthAt(accounts, snapshots, '2026-01').net).toBe(0);
  });

  it('마지막 기록 이후의 달은 마지막 값을 유지한다', () => {
    // 7월 말: a는 1500만, b는 600만
    expect(netWorthAt(accounts, snapshots, '2026-07').net).toBe(9_000_000);
  });
});

describe('netWorthSeries', () => {
  const accounts = [account({ id: 'a', balance: 25_000_000 })];
  const snapshots = [
    snapshot('a', '2026-06-01', 10_000_000),
    snapshot('a', '2026-07-01', 18_000_000),
  ];

  it('월별 순자산과 전월 대비 증감을 낸다', () => {
    const series = netWorthSeries(accounts, snapshots, '2026-06', '2026-08');

    expect(series.map((p) => p.month)).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(series.map((p) => p.net)).toEqual([10_000_000, 18_000_000, 25_000_000]);
    // 첫 달은 비교 대상이 없어 0
    expect(series.map((p) => p.delta)).toEqual([0, 8_000_000, 7_000_000]);
  });

  it('이번 달은 스냅샷이 아니라 현재 잔액을 쓴다', () => {
    // 8월 스냅샷이 없어도 계좌의 현재 잔액(2500만)이 반영된다.
    const series = netWorthSeries(accounts, snapshots, '2026-08', '2026-08');
    expect(series[0].net).toBe(25_000_000);
  });
});

/* --------------------------------------------------------------- 현금흐름 */

describe('monthlyCashflow', () => {
  const transactions = [
    tx({ type: 'income', amount: 3_000_000, date: '2026-08-25', categoryId: 'inc-salary' }),
    tx({ type: 'expense', amount: 500_000, date: '2026-08-03' }),
    tx({ type: 'expense', amount: 300_000, date: '2026-08-15' }),
    // 다른 달 거래는 집계에 들어가면 안 된다.
    tx({ type: 'expense', amount: 9_000_000, date: '2026-07-01' }),
  ];

  it('해당 월의 수입·지출·저축액을 계산한다', () => {
    const flow = monthlyCashflow(transactions, '2026-08');
    expect(flow.income).toBe(3_000_000);
    expect(flow.expense).toBe(800_000);
    expect(flow.saving).toBe(2_200_000);
  });

  it('저축률은 저축액 / 수입이다', () => {
    const flow = monthlyCashflow(transactions, '2026-08');
    expect(flow.savingRate).toBeCloseTo(2_200_000 / 3_000_000, 6);
  });

  it('수입이 0이면 저축률은 0으로 둔다(0으로 나누지 않는다)', () => {
    const flow = monthlyCashflow([tx({ type: 'expense', amount: 100_000 })], '2026-08');
    expect(flow.savingRate).toBe(0);
    expect(flow.saving).toBe(-100_000);
  });

  it('거래가 없으면 전부 0이다', () => {
    expect(monthlyCashflow([], '2026-08')).toEqual({
      income: 0,
      expense: 0,
      saving: 0,
      savingRate: 0,
    });
  });
});

describe('categoryBreakdown', () => {
  const categories: Category[] = [
    { id: 'exp-food', name: '식비', type: 'expense', emoji: '🍚' },
    { id: 'exp-cafe', name: '카페', type: 'expense', emoji: '☕' },
    { id: 'inc-salary', name: '급여', type: 'income', emoji: '💼' },
  ];
  const transactions = [
    tx({ type: 'expense', amount: 300_000, categoryId: 'exp-food' }),
    tx({ type: 'expense', amount: 100_000, categoryId: 'exp-food' }),
    tx({ type: 'expense', amount: 100_000, categoryId: 'exp-cafe' }),
    tx({ type: 'income', amount: 3_000_000, categoryId: 'inc-salary' }),
  ];

  it('카테고리별로 합치고 금액 큰 순으로 정렬한다', () => {
    const slices = categoryBreakdown(transactions, categories, '2026-08', 'expense');

    expect(slices.map((s) => s.name)).toEqual(['식비', '카페']);
    expect(slices[0].amount).toBe(400_000);
    expect(slices[0].ratio).toBeCloseTo(0.8, 6);
    expect(slices[1].ratio).toBeCloseTo(0.2, 6);
  });

  it('수입과 지출을 섞지 않는다', () => {
    const slices = categoryBreakdown(transactions, categories, '2026-08', 'income');
    expect(slices).toHaveLength(1);
    expect(slices[0].amount).toBe(3_000_000);
  });

  it('삭제된 카테고리의 거래는 미분류로 표시한다', () => {
    const slices = categoryBreakdown(
      [tx({ type: 'expense', amount: 1000, categoryId: 'gone' })],
      categories,
      '2026-08',
      'expense',
    );
    expect(slices[0].name).toBe('미분류');
  });
});

/* --------------------------------------------------------------- 목표 예측 */

describe('forecastGoal', () => {
  /** 월 500만원씩 늘어난 3개월 기록. */
  const growing = [
    { month: '2026-06', assets: 0, liabilities: 0, net: 10_000_000, delta: 0 },
    { month: '2026-07', assets: 0, liabilities: 0, net: 15_000_000, delta: 5_000_000 },
    { month: '2026-08', assets: 0, liabilities: 0, net: 20_000_000, delta: 5_000_000 },
  ];

  it('실제 증가 속도로 남은 개월수와 달성 월을 계산한다', () => {
    const f = forecastGoal(growing, 100_000_000, 0);

    expect(f.rateSource).toBe('history');
    expect(f.monthlyRate).toBe(5_000_000);
    expect(f.remaining).toBe(80_000_000);
    expect(f.monthsRemaining).toBe(16);
    // 2026-08 + 16개월 = 2027-12
    expect(f.estimatedMonth).toBe('2027-12');
    expect(f.achieved).toBe(false);
  });

  it('달성률은 현재 순자산 / 목표다', () => {
    expect(forecastGoal(growing, 100_000_000, 0).progress).toBeCloseTo(0.2, 6);
  });

  it('나누어떨어지지 않으면 개월수를 올림한다', () => {
    // 남은 8000만 / 월 700만 = 11.43개월 -> 12개월
    const f = forecastGoal(
      [
        { month: '2026-07', assets: 0, liabilities: 0, net: 13_000_000, delta: 0 },
        { month: '2026-08', assets: 0, liabilities: 0, net: 20_000_000, delta: 7_000_000 },
      ],
      100_000_000,
      0,
    );
    expect(f.monthsRemaining).toBe(12);
  });

  it('기록상 증가가 없으면 설정한 월 저축 목표로 대체한다', () => {
    const flat = [
      { month: '2026-07', assets: 0, liabilities: 0, net: 20_000_000, delta: 0 },
      { month: '2026-08', assets: 0, liabilities: 0, net: 20_000_000, delta: 0 },
    ];
    const f = forecastGoal(flat, 100_000_000, 4_000_000);

    expect(f.rateSource).toBe('target');
    expect(f.monthlyRate).toBe(4_000_000);
    expect(f.monthsRemaining).toBe(20);
  });

  it('순자산이 줄고 있고 목표 저축액도 없으면 예측하지 않는다', () => {
    const shrinking = [
      { month: '2026-07', assets: 0, liabilities: 0, net: 20_000_000, delta: 0 },
      { month: '2026-08', assets: 0, liabilities: 0, net: 15_000_000, delta: -5_000_000 },
    ];
    const f = forecastGoal(shrinking, 100_000_000, 0);

    expect(f.rateSource).toBe('none');
    expect(f.monthsRemaining).toBeNull();
    expect(f.estimatedMonth).toBeNull();
  });

  it('기록이 한 달뿐이면 증가 속도를 알 수 없다', () => {
    const single = [{ month: '2026-08', assets: 0, liabilities: 0, net: 20_000_000, delta: 0 }];
    expect(forecastGoal(single, 100_000_000, 0).monthsRemaining).toBeNull();
  });

  it('목표를 넘겼으면 달성으로 표시하고 남은 금액은 0이다', () => {
    const done = [
      { month: '2026-07', assets: 0, liabilities: 0, net: 90_000_000, delta: 0 },
      { month: '2026-08', assets: 0, liabilities: 0, net: 105_000_000, delta: 15_000_000 },
    ];
    const f = forecastGoal(done, 100_000_000, 0);

    expect(f.achieved).toBe(true);
    expect(f.remaining).toBe(0);
    expect(f.monthsRemaining).toBe(0);
    expect(f.progress).toBeCloseTo(1.05, 6);
  });

  it('lookback 개월만 평균에 넣는다', () => {
    // 최근 2개월(1000만, 1000만)만 보면 평균 1000만.
    // 그 앞의 100만은 무시돼야 한다.
    const points = [
      { month: '2026-05', assets: 0, liabilities: 0, net: 0, delta: 0 },
      { month: '2026-06', assets: 0, liabilities: 0, net: 1_000_000, delta: 1_000_000 },
      { month: '2026-07', assets: 0, liabilities: 0, net: 11_000_000, delta: 10_000_000 },
      { month: '2026-08', assets: 0, liabilities: 0, net: 21_000_000, delta: 10_000_000 },
    ];
    expect(forecastGoal(points, 100_000_000, 0, 2).monthlyRate).toBe(10_000_000);
  });

  it('기록이 아예 없으면 순자산 0에서 시작한다', () => {
    const f = forecastGoal([], 100_000_000, 0);
    expect(f.remaining).toBe(100_000_000);
    expect(f.progress).toBe(0);
  });
});

describe('requiredMonthlySaving', () => {
  it('남은 금액을 시한까지의 개월수로 나눈다', () => {
    // 2026-08 -> 2026-12 은 4개월, 8000만 / 4 = 2000만
    expect(requiredMonthlySaving(80_000_000, '2026-12-31')).toBe(20_000_000);
  });

  it('올림해서 부족하지 않게 한다', () => {
    // 1000만 / 3개월 = 3,333,333.33 -> 3,333,334
    expect(requiredMonthlySaving(10_000_000, '2026-11-01')).toBe(3_333_334);
  });

  it('시한이 없으면 null이다', () => {
    expect(requiredMonthlySaving(80_000_000, undefined)).toBeNull();
  });

  it('이미 달성했으면 null이다', () => {
    expect(requiredMonthlySaving(0, '2026-12-31')).toBeNull();
  });

  it('시한이 지났거나 이번 달이면 null이다', () => {
    expect(requiredMonthlySaving(80_000_000, '2026-08-31')).toBeNull();
    expect(requiredMonthlySaving(80_000_000, '2026-01-01')).toBeNull();
  });
});

/* ----------------------------------------------------------------- 예산 */

describe('budgetStatus', () => {
  const categories: Category[] = [
    { id: 'exp-food', name: '식비', type: 'expense', emoji: '🍚', budget: 500_000 },
    { id: 'exp-cafe', name: '카페', type: 'expense', emoji: '☕', budget: 100_000 },
    { id: 'exp-etc', name: '기타', type: 'expense', emoji: '➖' }, // 예산 없음
    { id: 'inc-salary', name: '급여', type: 'income', emoji: '💼', budget: 999 },
  ];
  const transactions = [
    tx({ type: 'expense', amount: 200_000, categoryId: 'exp-food' }),
    tx({ type: 'expense', amount: 150_000, categoryId: 'exp-cafe' }),
    tx({ type: 'expense', amount: 999_999, categoryId: 'exp-etc' }),
    tx({ type: 'expense', amount: 500_000, categoryId: 'exp-food', date: '2026-07-01' }),
  ];

  it('예산이 설정된 지출 카테고리만 소진율 높은 순으로 낸다', () => {
    const lines = budgetStatus(transactions, categories, '2026-08');

    expect(lines.map((l) => l.category.id)).toEqual(['exp-cafe', 'exp-food']);
    expect(lines[0].usage).toBeCloseTo(1.5, 6);
    expect(lines[0].remaining).toBe(-50_000);
    expect(lines[1].spent).toBe(200_000); // 7월 지출은 제외
    expect(lines[1].remaining).toBe(300_000);
  });

  it('숨긴 카테고리는 제외한다', () => {
    const withArchived: Category[] = [
      { id: 'exp-food', name: '식비', type: 'expense', emoji: '🍚', budget: 500_000, archived: true },
    ];
    expect(budgetStatus(transactions, withArchived, '2026-08')).toHaveLength(0);
  });
});

/* ------------------------------------------------------------- 자산 구성 */

describe('assetAllocation', () => {
  it('종류별로 묶어 비중을 낸다', () => {
    const slices = assetAllocation([
      account({ id: 'a', balance: 30_000_000, kind: 'deposit' }),
      account({ id: 'b', balance: 10_000_000, kind: 'deposit' }),
      account({ id: 'c', balance: 60_000_000, kind: 'stock' }),
      // 부채와 제외 계좌는 자산 구성에 들어가지 않는다.
      account({ id: 'd', balance: 20_000_000, side: 'liability', kind: 'loan' }),
      account({ id: 'e', balance: 20_000_000, kind: 'cash', includeInNetWorth: false }),
    ]);

    expect(slices.map((s) => s.name)).toEqual(['주식', '예금']);
    expect(slices[0].ratio).toBeCloseTo(0.6, 6);
    expect(slices[1].amount).toBe(40_000_000);
  });

  it('자산이 없으면 빈 배열이다', () => {
    expect(assetAllocation([])).toEqual([]);
  });
});


/* --------------------------------------------------------- 예상 잔액 증가 */

describe('principalSplit', () => {
  it('잔액에서 원금을 빼 불어난 몫을 낸다', () => {
    const s = principalSplit(14_802_693, 14_000_000);
    expect(s?.principal).toBe(14_000_000);
    expect(s?.gain).toBe(802_693);
    expect(s?.rate).toBeCloseTo(0.0573, 4);
  });

  it('원금을 안 적었으면 null이다', () => {
    // 0으로 두면 '전액이 이자'라는 뜻이 되어버린다. 모른다는 것과 구분해야 한다.
    expect(principalSplit(1_000_000, undefined)).toBeNull();
  });

  it('손실이면 음수로 나온다', () => {
    // 주식 계좌는 평가손익이 마이너스일 수 있다.
    const s = principalSplit(8_000_000, 10_000_000);
    expect(s?.gain).toBe(-2_000_000);
    expect(s?.rate).toBeCloseTo(-0.2);
  });

  it('원금이 0이면 수익률을 내지 않는다', () => {
    const s = principalSplit(50_000, 0);
    expect(s?.gain).toBe(50_000);
    expect(s?.rate).toBeNull();
  });
});

describe('savedVsGained', () => {
  it('원금을 적어둔 계좌만 나누고, 못 나눈 계좌 수를 알려준다', () => {
    // 원금을 안 적은 계좌를 0으로 치면 잔액 전부가 수익으로 잡혀 거짓말이 된다.
    const result = savedVsGained([
      account({ id: 'a', balance: 10_000_000, principal: 9_000_000 }),
      account({ id: 'b', balance: 5_000_000 }),
      account({ id: 'c', balance: 3_000_000, side: 'liability', kind: 'loan' }),
    ]);

    expect(result.principal).toBe(9_000_000);
    expect(result.gain).toBe(1_000_000);
    expect(result.tracked).toBe(1);
    expect(result.untracked).toBe(1); // 부채는 세지 않는다
  });

  it('예상 납입금은 원금 쪽으로 붙인다', () => {
    // 앞으로 넣을 돈은 내가 넣는 돈이지 불어난 돈이 아니다.
    const a = account({ id: 'a', balance: 1_000_000, principal: 1_000_000 });
    const balances = new Map([
      [
        'a',
        {
          recorded: 1_000_000,
          deposits: 500_000,
          interest: 10_000,
          total: 1_510_000,
          days: 30,
          hasProjection: true,
        },
      ],
    ]);

    const result = savedVsGained([a], balances);
    expect(result.principal).toBe(1_500_000);
    expect(result.gain).toBe(10_000);
  });
});

describe('monthlyGain', () => {
  it('원금 증가는 저축, 나머지는 수익으로 나눈다', () => {
    const a = account({ id: 'a', balance: 3_100_000, principal: 3_000_000 });
    const snaps = [
      { ...snapshot('a', '2026-07-31', 2_050_000), principal: 2_000_000 },
      { ...snapshot('a', '2026-08-31', 3_100_000), principal: 3_000_000 },
    ];

    const g = monthlyGain([a], snaps, '2026-08');

    expect(g.available).toBe(true);
    expect(g.saved).toBe(1_000_000); // 원금 200만 -> 300만
    expect(g.gained).toBe(50_000); // 잔액은 105만 늘었으니 나머지 5만이 수익
  });

  it('원금 기록이 없으면 나누지 않는다', () => {
    const a = account({ id: 'a', balance: 1_000_000 });
    const snaps = [snapshot('a', '2026-07-31', 900_000), snapshot('a', '2026-08-31', 1_000_000)];

    expect(monthlyGain([a], snaps, '2026-08').available).toBe(false);
  });
});

describe('effectiveRate', () => {
  it('납입을 감안해 실제 수익률을 역산한다', () => {
    // 1년 동안: 시작 1,000만(원금 1,000만) -> 끝 2,100만(원금 2,000만).
    // 납입 1,000만, 불어난 몫 100만. 분모는 1,000만 + 납입의 절반 500만 = 1,500만.
    const a = account({ id: 'a', balance: 21_000_000, principal: 20_000_000 });
    const snaps = [
      { ...snapshot('a', '2026-01-01', 10_000_000), principal: 10_000_000 },
      { ...snapshot('a', '2027-01-01', 21_000_000), principal: 20_000_000 },
    ];

    const r = effectiveRate(a, snaps);

    expect(r?.gain).toBe(1_000_000);
    expect(r?.annual).toBeCloseTo(1_000_000 / 15_000_000, 4);
    expect(r?.days).toBe(365);
  });

  it('기록이 하나뿐이거나 기간이 짧으면 내지 않는다', () => {
    // 며칠치로 연 환산하면 말도 안 되는 숫자가 나온다.
    const a = account({ id: 'a', balance: 1_010_000, principal: 1_000_000 });
    const one = [{ ...snapshot('a', '2026-01-01', 1_000_000), principal: 1_000_000 }];
    expect(effectiveRate(a, one)).toBeNull();

    const tooShort = [
      ...one,
      { ...snapshot('a', '2026-01-10', 1_010_000), principal: 1_000_000 },
    ];
    expect(effectiveRate(a, tooShort)).toBeNull();
  });
});

describe('projectBalance', () => {
  it('마지막 기록 이후 지난 개월수만큼 납입금을 더한다', () => {
    // 1/15에 100만원을 기록했고 매달 50만원씩 넣는 적금. 4/15면 3개월치.
    const a = account({
      id: 'a',
      balance: 1_000_000,
      kind: 'savings',
      monthlyDeposit: 500_000,
    });
    const p = projectBalance(a, '2026-01-15', '2026-04-15');

    expect(p.deposits).toBe(1_500_000);
    expect(p.recorded).toBe(1_000_000);
    expect(p.total).toBe(2_500_000);
  });

  it('날짜가 안 찼으면 그 달치는 세지 않는다', () => {
    const a = account({ id: 'a', balance: 0, monthlyDeposit: 500_000 });
    // 1/15 -> 2/14는 아직 한 달이 안 됐다.
    expect(projectBalance(a, '2026-01-15', '2026-02-14').deposits).toBe(0);
    expect(projectBalance(a, '2026-01-15', '2026-02-15').deposits).toBe(500_000);
  });

  it('기존 잔액에 단리로 일할 이자를 붙인다', () => {
    // 1,000만원, 연 4% -> 1년이면 40만원.
    const a = account({ id: 'a', balance: 10_000_000, interestRate: 4, interestMode: 'simple' });
    const p = projectBalance(a, '2026-01-01', '2027-01-01');
    expect(p.interest).toBe(400_000);
  });

  it('반년이면 이자도 절반이다', () => {
    const a = account({ id: 'a', balance: 10_000_000, interestRate: 4, interestMode: 'simple' });
    const p = projectBalance(a, '2026-01-01', '2026-07-02');
    // 182일 / 365 * 40만원
    expect(p.interest).toBeCloseTo((400_000 * 182) / 365, 0);
  });

  it('월복리로 두면 이자에 이자가 붙는다', () => {
    // 1,000만원, 연 4%, 1년. 단리는 40만원, 월복리는 (1 + 0.04/12)^12 - 1 만큼.
    const simple = projectBalance(
      account({ id: 'a', balance: 10_000_000, interestRate: 4, interestMode: 'simple' }),
      '2026-01-01',
      '2027-01-01',
    );
    const compound = projectBalance(
      account({ id: 'b', balance: 10_000_000, interestRate: 4, interestMode: 'compound' }),
      '2026-01-01',
      '2027-01-01',
    );

    expect(simple.interest).toBe(400_000);
    expect(compound.interest).toBe(Math.round(10_000_000 * ((1 + 0.04 / 12) ** 12 - 1)));
    expect(compound.interest).toBeGreaterThan(simple.interest);
  });

  it('월복리도 기록 시점이 기준이라 이자가 두 번 붙지 않는다', () => {
    const a = account({ id: 'a', balance: 10_000_000, interestRate: 4, interestMode: 'compound' });
    // 반년치를 두 번 나눠 계산해도, 한 번에 반년치를 계산한 것과 같아야 한다.
    const half = projectBalance(a, '2026-01-01', '2026-07-01');
    const again = projectBalance(
      { ...a, balance: a.balance + half.interest },
      '2026-07-01',
      '2027-01-01',
    );
    const full = projectBalance(a, '2026-01-01', '2027-01-01');

    expect(half.interest + again.interest).toBeCloseTo(full.interest, -1);
  });

  it('이자 방식을 안 고르면 이율이 적혀 있어도 이자를 안 붙인다', () => {
    // 적금·예금은 만기에 이자를 한 번에 받는다. 중간 잔액에 얹으면 통장과 어긋난다.
    const a = account({ id: 'a', balance: 10_000_000, interestRate: 4 });
    const p = projectBalance(a, '2026-01-01', '2027-01-01');

    expect(p.interest).toBe(0);
    expect(p.total).toBe(10_000_000);
  });

  it('납입일을 적어두면 달력 기준으로 납입 횟수를 센다', () => {
    // 매달 25일에 빠지는 적금. 1/26에 기록했으면 1월치는 이미 지나갔다.
    const a = account({ id: 'a', balance: 0, monthlyDeposit: 500_000, payDay: 25 });

    expect(projectBalance(a, '2026-01-26', '2026-02-24').deposits).toBe(0);
    expect(projectBalance(a, '2026-01-26', '2026-02-25').deposits).toBe(500_000);
    expect(projectBalance(a, '2026-01-26', '2026-04-25').deposits).toBe(1_500_000);
  });

  it('납입일이 그 달에 없으면 말일에 빠진 것으로 본다', () => {
    // 31일 납입인데 2월은 28일까지다.
    const a = account({ id: 'a', balance: 0, monthlyDeposit: 500_000, payDay: 31 });
    expect(projectBalance(a, '2026-02-01', '2026-02-28').deposits).toBe(500_000);
  });

  it('부채는 추정하지 않는다', () => {
    // 상환 계획을 모르는 채로 빚을 불리면 사용자가 입력한 적 없는 숫자가 된다.
    const loan = account({
      id: 'l',
      balance: 10_000_000,
      side: 'liability',
      kind: 'loan',
      interestRate: 5,
      monthlyDeposit: 100_000,
    });
    const p = projectBalance(loan, '2026-01-01', '2027-01-01');

    expect(p.total).toBe(10_000_000);
    expect(p.hasProjection).toBe(false);
  });

  it('금리도 납입액도 없으면 기록값 그대로다', () => {
    const a = account({ id: 'a', balance: 5_000_000 });
    const p = projectBalance(a, '2026-01-01', '2027-01-01');

    expect(p.total).toBe(5_000_000);
    expect(p.hasProjection).toBe(false);
  });

  it('기록 날짜가 오늘이면 아무것도 더하지 않는다', () => {
    const a = account({ id: 'a', balance: 5_000_000, interestRate: 4, monthlyDeposit: 500_000 });
    const p = projectBalance(a, '2026-08-17', '2026-08-17');

    expect(p.total).toBe(5_000_000);
    expect(p.days).toBe(0);
  });

  it('잔액을 다시 기록하면 추정이 처음부터 다시 쌓인다', () => {
    // 이중 계산이 생기지 않는지 확인한다. 기준이 늘 '마지막 기록'이므로
    // 1년치 이자가 붙은 뒤 실제 잔액을 넣으면 그 시점부터 0에서 시작해야 한다.
    const before = account({ id: 'a', balance: 10_000_000, interestRate: 4, interestMode: 'simple' });
    expect(projectBalance(before, '2026-01-01', '2027-01-01').interest).toBe(400_000);

    // 사용자가 2027-01-01에 실제 잔액 1,040만원을 입력했다.
    const after = account({ id: 'a', balance: 10_400_000, interestRate: 4, interestMode: 'simple' });
    const p = projectBalance(after, '2027-01-01', '2027-01-01');

    expect(p.interest).toBe(0);
    expect(p.total).toBe(10_400_000);
  });

  it('납입금에도 들어간 날부터 이자가 붙는다', () => {
    // 잔액 0, 매달 100만원, 연 12%(월 1%).
    // 3개월 뒤: 첫 납입은 2개월, 둘째는 1개월, 셋째는 0개월치 이자.
    const a = account({
      id: 'a',
      balance: 0,
      monthlyDeposit: 1_000_000,
      interestRate: 12,
      interestMode: 'simple',
    });
    const p = projectBalance(a, '2026-01-01', '2026-04-01');

    expect(p.deposits).toBe(3_000_000);
    // 대략 100만 × 1% × (2 + 1) = 3만원 언저리
    expect(p.interest).toBeGreaterThan(20_000);
    expect(p.interest).toBeLessThan(40_000);
  });
});

describe('lastRecordDate', () => {
  it('가장 최근 기록 날짜를 쓴다', () => {
    const a = account({ id: 'a', balance: 0 });
    const snaps = [
      snapshot('a', '2026-03-01', 100),
      snapshot('a', '2026-05-01', 200),
      snapshot('b', '2026-09-01', 300),
    ];
    expect(lastRecordDate(a, snaps)).toBe('2026-05-01');
  });

  it('기록이 없으면 계좌를 만든 날을 쓴다', () => {
    const a = account({ id: 'a', balance: 0, createdAt: '2026-02-10T09:00:00.000Z' });
    expect(lastRecordDate(a, [])).toBe('2026-02-10');
  });
});

describe('netWorth (예상 잔액 반영)', () => {
  it('예상 잔액을 넘기면 그 값으로 계산한다', () => {
    const accounts = [
      account({ id: 'a', balance: 1_000_000 }),
      account({ id: 'b', balance: 2_000_000, side: 'liability', kind: 'loan' }),
    ];
    const balances = new Map([
      ['a', { recorded: 1_000_000, deposits: 500_000, interest: 10_000, total: 1_510_000, days: 30, hasProjection: true }],
    ]);

    // a는 예상값, b는 넘기지 않았으므로 기록값을 쓴다.
    expect(netWorth(accounts, balances).net).toBe(1_510_000 - 2_000_000);
  });

  it('안 넘기면 기존처럼 기록값만 쓴다', () => {
    const accounts = [account({ id: 'a', balance: 1_000_000 })];
    expect(netWorth(accounts).net).toBe(1_000_000);
  });
});

/* ------------------------------------------------------------- 고정지출 */

function recurring(over: Partial<RecurringExpense> & { id: string; amount: number }): RecurringExpense {
  return {
    name: over.id,
    categoryId: 'exp-house',
    dayOfMonth: 25,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('pendingAutoRecurring', () => {
  function data(over: Partial<AppData> = {}): AppData {
    return {
      version: 1,
      settings: {
        goalAmount: 100_000_000,
        monthlySavingTarget: 0,
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
      categories: [
        { id: 'exp-house', name: '주거', type: 'expense', emoji: '🏠' },
        { id: 'exp-insurance', name: '보험', type: 'expense', emoji: '🛡️' },
        { id: 'exp-etc', name: '기타', type: 'expense', emoji: '➖' },
      ],
      recurring: [],
      ...over,
    };
  }

  it('결제일이 지난 것만 넣는다', () => {
    const d = data({
      recurring: [
        recurring({ id: '월세', amount: 600_000, dayOfMonth: 5, categoryId: 'exp-house' }),
        recurring({ id: '보험', amount: 90_000, dayOfMonth: 28, categoryId: 'exp-insurance' }),
      ],
    });

    // 오늘은 8월 17일. 5일치는 지났고 28일치는 아직이다.
    const out = pendingAutoRecurring(d, '2026-08-17');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ amount: 600_000, date: '2026-08-05', auto: true });
  });

  it('같은 카테고리 지출이 이미 있으면 건너뛴다', () => {
    // 월세가 올라 직접 65만원을 넣어둔 상황. 예전 금액으로 한 건 더 쌓이면 안 된다.
    const d = data({
      recurring: [recurring({ id: '월세', amount: 600_000, dayOfMonth: 5, categoryId: 'exp-house' })],
      transactions: [
        tx({ type: 'expense', amount: 650_000, date: '2026-08-05', categoryId: 'exp-house' }),
      ],
    });

    expect(pendingAutoRecurring(d, '2026-08-17')).toHaveLength(0);
  });

  it('카테고리가 없어졌으면 넣지 않는다', () => {
    // 넣어봐야 '미분류'로 쌓인다.
    const d = data({
      categories: [],
      recurring: [recurring({ id: '월세', amount: 600_000, dayOfMonth: 5, categoryId: 'exp-gone' })],
    });

    expect(pendingAutoRecurring(d, '2026-08-17')).toHaveLength(0);
  });

  it('멈춘 항목은 넣지 않는다', () => {
    const d = data({
      recurring: [
        recurring({ id: '헬스', amount: 50_000, dayOfMonth: 1, categoryId: 'exp-etc', active: false }),
      ],
    });

    expect(pendingAutoRecurring(d, '2026-08-17')).toHaveLength(0);
  });

  it('한 번 넣고 나면 다시 넣지 않는다', () => {
    const d = data({
      recurring: [recurring({ id: '월세', amount: 600_000, dayOfMonth: 5, categoryId: 'exp-house' })],
    });

    const first = pendingAutoRecurring(d, '2026-08-17');
    const after = data({
      recurring: d.recurring,
      transactions: first.map((t, i) => ({ ...t, id: `t${i}`, createdAt: '2026-08-17T00:00:00.000Z' })),
    });

    expect(pendingAutoRecurring(after, '2026-08-17')).toHaveLength(0);
  });
});

describe('dueDateIn', () => {
  it('해당 월의 결제일을 만든다', () => {
    expect(dueDateIn('2026-08', 25)).toBe('2026-08-25');
  });

  it('그 달에 없는 날이면 말일로 당긴다', () => {
    // 31일 설정인데 2월은 28일까지밖에 없다.
    expect(dueDateIn('2026-02', 31)).toBe('2026-02-28');
    expect(dueDateIn('2028-02', 31)).toBe('2028-02-29'); // 윤년
    expect(dueDateIn('2026-04', 31)).toBe('2026-04-30');
  });

  it('범위를 벗어난 값도 안전하게 자른다', () => {
    expect(dueDateIn('2026-08', 0)).toBe('2026-08-01');
    expect(dueDateIn('2026-08', 99)).toBe('2026-08-31');
  });
});

describe('recurringTotal', () => {
  it('활성 항목만 더한다', () => {
    const total = recurringTotal([
      recurring({ id: 'r1', amount: 680_000 }),
      recurring({ id: 'r2', amount: 55_000 }),
      recurring({ id: 'r3', amount: 999_999, active: false }),
    ]);
    expect(total).toBe(735_000);
  });

  it('비어 있으면 0이다', () => {
    expect(recurringTotal([])).toBe(0);
  });
});

describe('recurringStatus', () => {
  const items = [
    recurring({ id: 'rent', amount: 680_000, categoryId: 'exp-house', dayOfMonth: 5 }),
    recurring({ id: 'phone', amount: 55_000, categoryId: 'exp-comm', dayOfMonth: 25 }),
    recurring({ id: 'paused', amount: 10_000, categoryId: 'exp-sub', active: false }),
  ];

  it('꺼둔 항목은 빼고 결제일 순으로 준다', () => {
    const rows = recurringStatus(items, [], '2026-08');

    expect(rows.map((r) => r.expense.id)).toEqual(['rent', 'phone']);
    expect(rows[0].dueDate).toBe('2026-08-05');
    expect(rows[1].dueDate).toBe('2026-08-25');
  });

  it('같은 카테고리·같은 금액이 그 달에 있으면 기록된 것으로 본다', () => {
    const txs = [
      tx({ type: 'expense', amount: 680_000, categoryId: 'exp-house', date: '2026-08-05' }),
    ];
    const rows = recurringStatus(items, txs, '2026-08');

    expect(rows.find((r) => r.expense.id === 'rent')?.recorded).toBe(true);
    expect(rows.find((r) => r.expense.id === 'phone')?.recorded).toBe(false);
  });

  it('다른 달 거래는 이번 달 기록으로 치지 않는다', () => {
    const txs = [
      tx({ type: 'expense', amount: 680_000, categoryId: 'exp-house', date: '2026-07-05' }),
    ];
    const rows = recurringStatus(items, txs, '2026-08');

    expect(rows.find((r) => r.expense.id === 'rent')?.recorded).toBe(false);
  });

  it('금액이 다르면 다른 지출로 본다', () => {
    // 월세를 68만원이 아니라 70만원 냈다면 고정지출이 아직 안 들어간 것이다.
    const txs = [
      tx({ type: 'expense', amount: 700_000, categoryId: 'exp-house', date: '2026-08-05' }),
    ];
    expect(recurringStatus(items, txs, '2026-08')[0].recorded).toBe(false);
  });

  it('수입은 기록으로 치지 않는다', () => {
    const txs = [
      tx({ type: 'income', amount: 680_000, categoryId: 'exp-house', date: '2026-08-05' }),
    ];
    expect(recurringStatus(items, txs, '2026-08')[0].recorded).toBe(false);
  });
});
