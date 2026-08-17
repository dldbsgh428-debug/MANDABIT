/**
 * 순자산·저축률·목표 달성 예측 계산.
 *
 * 이 파일에는 화면과 무관한 순수 함수만 둔다. 그래야 테스트하기 쉽다.
 * (src/lib/__tests__/analytics.test.ts 참고)
 */

import type {
  Account,
  AppData,
  BalanceSnapshot,
  Category,
  MonthKey,
  Transaction,
  TxType,
} from '../types';
import { addMonths, currentMonth, endOfMonth, monthOf, monthsBetween, monthRange } from './date';

export interface NetWorth {
  assets: number;
  liabilities: number;
  net: number;
}

/** 현재 계좌 잔액으로 순자산을 계산한다. includeInNetWorth가 false면 제외. */
export function netWorth(accounts: Account[]): NetWorth {
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (!a.includeInNetWorth) continue;
    if (a.side === 'asset') assets += a.balance;
    else liabilities += a.balance;
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
): NetWorthPoint[] {
  const now = currentMonth();
  const points: NetWorthPoint[] = [];
  let prev: number | undefined;

  for (const month of monthRange(from, to)) {
    const nw = month >= now ? netWorth(accounts) : netWorthAt(accounts, snapshots, month);
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
export function assetAllocation(accounts: Account[]): CategorySlice[] {
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
    sums.set(a.kind, (sums.get(a.kind) ?? 0) + a.balance);
    total += a.balance;
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
