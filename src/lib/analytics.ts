/**
 * 순자산·저축률·목표 달성 예측 계산.
 *
 * 이 파일에는 화면과 무관한 순수 함수만 둔다. 그래야 테스트하기 쉽다.
 * (src/lib/__tests__/analytics.test.ts 참고)
 */

import type {
  Account,
  ISODate,
  AppData,
  BalanceSnapshot,
  Category,
  MonthKey,
  RecurringExpense,
  Transaction,
  TxType,
} from '../types';
import {
  addMonths,
  currentMonth,
  daysBetween,
  endOfMonth,
  fullMonthsBetween,
  monthOf,
  monthsBetween,
  monthRange,
  today,
} from './date';

/* ------------------------------------------------------- 예상 잔액 증가 */

/** 한 달을 며칠로 볼지. 달마다 길이가 달라서 평균값으로 고정한다. */
const DAYS_PER_MONTH = 365 / 12;

export interface Projection {
  /** 사용자가 마지막으로 입력한 잔액. 이 값은 절대 바뀌지 않는다. */
  recorded: number;
  /** 마지막 기록 이후 자동이체됐을 납입금 합계. */
  deposits: number;
  /** 마지막 기록 이후 붙었을 이자(단리). */
  interest: number;
  /** recorded + deposits + interest. 화면에 보여줄 '지금 잔액'. */
  total: number;
  /** 마지막 기록 이후 지난 일수. */
  days: number;
  /** 더해진 예상액이 있는지. false면 기록값과 같다. */
  hasProjection: boolean;
}

/**
 * 마지막으로 기록한 잔액에 그 이후의 납입금과 이자를 더해 '지금 잔액'을 추정한다.
 *
 * 중요한 점은 기준이 언제나 '마지막 기록 시점'이라는 것이다. 사용자가 실제 잔액을
 * 입력하면 그 날짜가 새 기준이 되므로, 이미 반영된 이자를 또 더하는 일이 없다.
 * 즉 추정치는 기록 위에 얹히기만 하고 기록을 덮어쓰지 않는다.
 *
 * 부채는 추정하지 않는다. 상환 계획을 모르는 채로 빚을 불리면 순자산이
 * 실제보다 나쁘게 나오고, 그건 사용자가 입력한 적 없는 숫자다.
 *
 * 이자는 계좌에서 켠 경우에만 붙인다. 적금·예금은 만기에 한 번에 받는 게
 * 보통이라, 중간 잔액에 이자를 얹으면 통장 숫자와 어긋나기 때문이다.
 * 켤 때는 단리(일할)와 월복리(매달 이자에 이자) 중에 고른다.
 *
 * 납입금은 납입일을 적어두면 그 날짜 기준으로 세고, 비워두면 마지막 기록일에서
 * 한 달씩 센다. 이자를 켠 계좌라면 납입금에도 각각 들어간 날부터 이자가 붙는다.
 */
export function projectBalance(
  account: Account,
  lastRecordDate: ISODate,
  asOf: ISODate = today(),
): Projection {
  const none: Projection = {
    recorded: account.balance,
    deposits: 0,
    interest: 0,
    total: account.balance,
    days: 0,
    hasProjection: false,
  };

  if (account.side !== 'asset') return none;

  const days = daysBetween(lastRecordDate, asOf);
  if (days <= 0) return none;

  const monthly = account.monthlyDeposit ?? 0;
  // 이자 방식을 고르지 않은 계좌는 이율이 적혀 있어도 이자를 붙이지 않는다.
  const yearlyRate = account.interestMode ? (account.interestRate ?? 0) / 100 : 0;
  if (monthly <= 0 && yearlyRate <= 0) return { ...none, days };

  // 납입일을 적어뒀으면 실제 이체일을 쓴다. 그래야 '이번 달 것이 들어왔는지'가
  // 마지막 기록일이 아니라 달력 기준으로 정해진다.
  const dates = monthly > 0 && account.payDay
    ? depositDates(lastRecordDate, asOf, account.payDay)
    : null;
  const months = dates ? dates.length : fullMonthsBetween(lastRecordDate, asOf);
  const deposits = monthly * months;

  // 이자는 '얼마가 며칠 들어있었나'만 알면 나온다. 단리는 일할로 나누고,
  // 월복리는 지난 개월수(소수점 포함)만큼 월이율을 거듭제곱한다.
  const compound = account.interestMode === 'compound';
  const grow = (principal: number, heldDays: number) =>
    compound
      ? principal * ((1 + yearlyRate / 12) ** (heldDays / DAYS_PER_MONTH) - 1)
      : principal * yearlyRate * (heldDays / 365);

  let interest = grow(account.balance, days);

  // 납입금은 들어간 날부터 이자가 붙는다.
  if (dates) {
    for (const date of dates) {
      const heldDays = daysBetween(date, asOf);
      if (heldDays > 0) interest += grow(monthly, heldDays);
    }
  } else {
    // 납입일을 모르면 k번째 납입이 k개월 뒤에 들어갔다고 본다.
    for (let k = 1; k <= months; k++) {
      const heldDays = days - k * DAYS_PER_MONTH;
      if (heldDays > 0) interest += grow(monthly, heldDays);
    }
  }

  const rounded = Math.round(interest);
  const total = account.balance + deposits + rounded;

  return {
    recorded: account.balance,
    deposits,
    interest: rounded,
    total,
    days,
    hasProjection: deposits > 0 || rounded > 0,
  };
}

/**
 * 마지막 기록 다음날부터 asOf까지, 매달 payDay에 빠져나갔을 납입일들.
 * 그 달에 없는 날(2월 31일 같은)은 말일로 본다.
 */
export function depositDates(from: ISODate, to: ISODate, payDay: number): ISODate[] {
  const out: ISODate[] = [];
  for (const month of monthRange(monthOf(from), monthOf(to))) {
    const due = dueDateIn(month, payDay);
    if (due > from && due <= to) out.push(due);
  }
  return out;
}

/** 계좌의 마지막 잔액 기록 날짜. 기록이 없으면 계좌를 만든 날. */
export function lastRecordDate(account: Account, snapshots: BalanceSnapshot[]): ISODate {
  let latest = '';
  for (const s of snapshots) {
    if (s.accountId === account.id && s.date > latest) latest = s.date;
  }
  return latest || account.createdAt.slice(0, 10);
}

/**
 * 순자산 계산에 쓸 계좌별 '지금 잔액'.
 * project가 false면 기록값을 그대로 쓴다.
 */
export function currentBalances(
  accounts: Account[],
  snapshots: BalanceSnapshot[],
  project: boolean,
  asOf: ISODate = today(),
): Map<string, Projection> {
  const out = new Map<string, Projection>();
  for (const account of accounts) {
    out.set(
      account.id,
      project
        ? projectBalance(account, lastRecordDate(account, snapshots), asOf)
        : {
            recorded: account.balance,
            deposits: 0,
            interest: 0,
            total: account.balance,
            days: 0,
            hasProjection: false,
          },
    );
  }
  return out;
}

export interface NetWorth {
  assets: number;
  liabilities: number;
  net: number;
}

/**
 * 현재 계좌 잔액으로 순자산을 계산한다. includeInNetWorth가 false면 제외.
 *
 * balances를 넘기면 그 값(예상 증가가 반영된 잔액)을 쓰고,
 * 없으면 기록된 잔액을 그대로 쓴다.
 */
export function netWorth(accounts: Account[], balances?: Map<string, Projection>): NetWorth {
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (!a.includeInNetWorth) continue;
    const amount = balances?.get(a.id)?.total ?? a.balance;
    if (a.side === 'asset') assets += amount;
    else liabilities += amount;
  }
  return { assets, liabilities, net: assets - liabilities };
}

/**
 * 특정 월 말일 기준의 과거 순자산을 스냅샷으로 복원한다.
 * 계좌마다 '그 날짜 이전의 가장 최근 스냅샷'을 쓰고, 기록이 없으면 0으로 본다.
 * (기록이 없는 기간은 그 계좌가 아직 없었던 것으로 취급)
 */
export function netWorthAt(
  accounts: Account[],
  snapshots: BalanceSnapshot[],
  month: MonthKey,
): NetWorth {
  const cutoff = endOfMonth(month);
  let assets = 0;
  let liabilities = 0;

  for (const account of accounts) {
    if (!account.includeInNetWorth) continue;

    let latest: BalanceSnapshot | undefined;
    for (const s of snapshots) {
      if (s.accountId !== account.id) continue;
      if (s.date > cutoff) continue;
      // 같은 날짜에 여러 기록이 있으면 나중에 저장된 쪽(배열 뒤쪽)을 쓴다.
      if (!latest || s.date >= latest.date) latest = s;
    }
    if (!latest) continue;

    if (account.side === 'asset') assets += latest.balance;
    else liabilities += latest.balance;
  }

  return { assets, liabilities, net: assets - liabilities };
}

export interface NetWorthPoint extends NetWorth {
  month: MonthKey;
  /** 전월 대비 순자산 증감. 첫 달은 0. */
  delta: number;
}

/**
 * 월별 순자산 추이. 이번 달은 스냅샷 대신 현재 잔액을 써서
 * 방금 입력한 값이 바로 반영되게 한다.
 */
export function netWorthSeries(
  accounts: Account[],
  snapshots: BalanceSnapshot[],
  from: MonthKey,
  to: MonthKey = currentMonth(),
  balances?: Map<string, Projection>,
): NetWorthPoint[] {
  const now = currentMonth();
  const points: NetWorthPoint[] = [];
  let prev: number | undefined;

  for (const month of monthRange(from, to)) {
    // 지난 달들은 기록으로만 그린다. 과거에 예상치를 섞으면 추이가 사실이 아니게 된다.
    const nw = month >= now ? netWorth(accounts, balances) : netWorthAt(accounts, snapshots, month);
    points.push({ month, ...nw, delta: prev === undefined ? 0 : nw.net - prev });
    prev = nw.net;
  }
  return points;
}

/**
 * 추이 차트에 쓸 시작 월을 정한다.
 * 기록이 있으면 첫 기록 월부터, 없으면 프로젝트 시작월부터.
 * 다만 너무 길어지면 축이 뭉개지므로 최근 maxMonths개월로 자른다.
 */
export function seriesStartMonth(data: AppData, maxMonths = 12): MonthKey {
  const now = currentMonth();
  const candidates: MonthKey[] = [monthOf(data.settings.startDate)];
  for (const s of data.snapshots) candidates.push(monthOf(s.date));
  for (const t of data.transactions) candidates.push(monthOf(t.date));

  const earliest = candidates.reduce((a, b) => (a < b ? a : b), now);
  const capped = addMonths(now, -(maxMonths - 1));
  return earliest > capped ? earliest : capped;
}

export interface Cashflow {
  income: number;
  expense: number;
  /** 수입 - 지출. 음수면 적자. */
  saving: number;
  /** 저축률 = 저축액 / 수입. 수입이 0이면 0. */
  savingRate: number;
}

/** 해당 월의 수입/지출/저축액. */
export function monthlyCashflow(transactions: Transaction[], month: MonthKey): Cashflow {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (monthOf(t.date) !== month) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const saving = income - expense;
  return { income, expense, saving, savingRate: income > 0 ? saving / income : 0 };
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  emoji: string;
  amount: number;
  /** 해당 타입 전체 합계 대비 비중(0~1). */
  ratio: number;
  /** 설정된 월 예산. 없으면 undefined. */
  budget?: number;
}

/** 해당 월의 카테고리별 합계를 금액 큰 순으로. */
export function categoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  month: MonthKey,
  type: TxType,
): CategorySlice[] {
  const sums = new Map<string, number>();
  let total = 0;

  for (const t of transactions) {
    if (t.type !== type || monthOf(t.date) !== month) continue;
    sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
    total += t.amount;
  }

  const slices: CategorySlice[] = [];
  for (const [categoryId, amount] of sums) {
    const cat = categories.find((c) => c.id === categoryId);
    slices.push({
      categoryId,
      name: cat?.name ?? '미분류',
      emoji: cat?.emoji ?? '❓',
      amount,
      ratio: total > 0 ? amount / total : 0,
      budget: cat?.budget,
    });
  }

  return slices.sort((a, b) => b.amount - a.amount);
}

export interface Forecast {
  /** 목표까지 남은 금액. 이미 달성했으면 0. */
  remaining: number;
  /** 달성률 0~1 이상(초과 달성 가능). */
  progress: number;
  /** 예측에 사용한 월 저축 속도(원/월). */
  monthlyRate: number;
  /** 월 저축 속도를 어디서 얻었는지. */
  rateSource: 'history' | 'target' | 'none';
  /** 남은 개월 수. 예측 불가면 null. */
  monthsRemaining: number | null;
  /** 예상 달성 월 'YYYY-MM'. 예측 불가면 null. */
  estimatedMonth: MonthKey | null;
  /** 이미 목표를 넘겼는지. */
  achieved: boolean;
}

/**
 * 목표 달성 예측.
 *
 * 저축 속도는 최근 lookback개월의 실제 순자산 증가 평균을 우선 쓰고,
 * 기록이 부족하거나 증가가 없으면 사용자가 설정한 월 저축 목표로 대체한다.
 * 둘 다 없으면 예측하지 않는다(추측한 숫자를 보여주는 것보다 정직하다).
 */
export function forecastGoal(
  points: NetWorthPoint[],
  goalAmount: number,
  monthlySavingTarget: number,
  lookback = 6,
): Forecast {
  const current = points.length > 0 ? points[points.length - 1].net : 0;
  const remaining = Math.max(0, goalAmount - current);
  const progress = goalAmount > 0 ? current / goalAmount : 0;
  const achieved = remaining <= 0;

  // 첫 달의 delta는 비교 대상이 없어 0이므로 평균에서 제외한다.
  const deltas = points.slice(1).map((p) => p.delta).slice(-lookback);
  const historyRate =
    deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

  let monthlyRate = 0;
  let rateSource: Forecast['rateSource'] = 'none';
  if (historyRate > 0) {
    monthlyRate = historyRate;
    rateSource = 'history';
  } else if (monthlySavingTarget > 0) {
    monthlyRate = monthlySavingTarget;
    rateSource = 'target';
  }

  if (achieved) {
    return {
      remaining: 0,
      progress,
      monthlyRate,
      rateSource,
      monthsRemaining: 0,
      estimatedMonth: currentMonth(),
      achieved: true,
    };
  }

  if (monthlyRate <= 0) {
    return {
      remaining,
      progress,
      monthlyRate: 0,
      rateSource: 'none',
      monthsRemaining: null,
      estimatedMonth: null,
      achieved: false,
    };
  }

  const monthsRemaining = Math.ceil(remaining / monthlyRate);
  return {
    remaining,
    progress,
    monthlyRate,
    rateSource,
    monthsRemaining,
    estimatedMonth: addMonths(currentMonth(), monthsRemaining),
    achieved: false,
  };
}

/**
 * 목표 시한이 있을 때 매달 얼마를 모아야 하는지 역산한다.
 * 시한이 지났거나 이미 달성했으면 null.
 */
export function requiredMonthlySaving(
  remaining: number,
  goalDeadline: string | undefined,
): number | null {
  if (!goalDeadline || remaining <= 0) return null;
  const monthsLeft = monthsBetween(currentMonth(), monthOf(goalDeadline));
  if (monthsLeft <= 0) return null;
  return Math.ceil(remaining / monthsLeft);
}

export interface BudgetLine {
  category: Category;
  spent: number;
  budget: number;
  /** 소진율 0~1 이상. 1을 넘으면 초과. */
  usage: number;
  remaining: number;
}

/** 예산이 설정된 지출 카테고리의 소진 현황. 소진율 높은 순. */
export function budgetStatus(
  transactions: Transaction[],
  categories: Category[],
  month: MonthKey,
): BudgetLine[] {
  const lines: BudgetLine[] = [];

  for (const category of categories) {
    if (category.type !== 'expense' || category.archived) continue;
    const budget = category.budget ?? 0;
    if (budget <= 0) continue;

    let spent = 0;
    for (const t of transactions) {
      if (t.type === 'expense' && t.categoryId === category.id && monthOf(t.date) === month) {
        spent += t.amount;
      }
    }

    lines.push({
      category,
      spent,
      budget,
      usage: spent / budget,
      remaining: budget - spent,
    });
  }

  return lines.sort((a, b) => b.usage - a.usage);
}

/** 계좌 종류별 자산 비중(도넛 차트용). 부채는 제외. */
export function assetAllocation(
  accounts: Account[],
  balances?: Map<string, Projection>,
): CategorySlice[] {
  const labels: Record<string, { name: string; emoji: string }> = {
    cash: { name: '현금', emoji: '💵' },
    deposit: { name: '예금', emoji: '🏦' },
    savings: { name: '적금', emoji: '🐖' },
    stock: { name: '주식', emoji: '📈' },
    crypto: { name: '코인', emoji: '🪙' },
    pension: { name: '연금', emoji: '🧧' },
    realestate: { name: '부동산', emoji: '🏠' },
    other: { name: '기타', emoji: '📦' },
  };

  const sums = new Map<string, number>();
  let total = 0;
  for (const a of accounts) {
    if (a.side !== 'asset' || !a.includeInNetWorth) continue;
    const amount = balances?.get(a.id)?.total ?? a.balance;
    sums.set(a.kind, (sums.get(a.kind) ?? 0) + amount);
    total += amount;
  }

  const out: CategorySlice[] = [];
  for (const [kind, amount] of sums) {
    const label = labels[kind] ?? { name: '기타', emoji: '📦' };
    out.push({
      categoryId: kind,
      name: label.name,
      emoji: label.emoji,
      amount,
      ratio: total > 0 ? amount / total : 0,
    });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

/* ----------------------------------------------------------- 고정지출 */

export interface RecurringStatus {
  expense: RecurringExpense;
  /** 이번 달에 이미 가계부에 기록됐는지. */
  recorded: boolean;
  /** 이번 달 결제 예정일 'YYYY-MM-DD'. 그 달에 없는 날이면 말일. */
  dueDate: ISODate;
}

/**
 * 고정지출이 해당 월에 이미 기록됐는지 판정한다.
 *
 * '같은 카테고리 + 같은 금액'이 그 달에 있으면 기록된 것으로 본다.
 * 거래에 고정지출 id를 심지 않는 이유는, 사용자가 가계부에서 직접 입력한
 * 월세도 기록으로 인정해야 중복 입력을 막을 수 있기 때문이다.
 */
export function recurringStatus(
  recurring: RecurringExpense[],
  transactions: Transaction[],
  month: MonthKey,
): RecurringStatus[] {
  return recurring
    .filter((r) => r.active)
    .map((r) => ({
      expense: r,
      dueDate: dueDateIn(month, r.dayOfMonth),
      recorded: transactions.some(
        (t) =>
          t.type === 'expense' &&
          monthOf(t.date) === month &&
          t.categoryId === r.categoryId &&
          t.amount === r.amount,
      ),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** 해당 월의 결제일. 31일 설정인데 2월이면 말일(28/29일)로 당긴다. */
export function dueDateIn(month: MonthKey, dayOfMonth: number): ISODate {
  const last = Number(endOfMonth(month).slice(-2));
  const day = Math.min(Math.max(1, dayOfMonth), last);
  return `${month}-${String(day).padStart(2, '0')}`;
}

/** 활성 고정지출의 월 합계. */
export function recurringTotal(recurring: RecurringExpense[]): number {
  return recurring.filter((r) => r.active).reduce((sum, r) => sum + r.amount, 0);
}
