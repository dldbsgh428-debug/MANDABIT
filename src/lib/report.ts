/**
 * 월간 리포트 계산.
 *
 * 가계부는 '기록', 예산은 '계획'이고 여기는 '돌아보기'다. 숫자를 다시 보여주는
 * 게 아니라 지난달과 견줘서 무엇이 달라졌는지 뽑아낸다.
 *
 * 화면과 무관한 순수 함수만 둔다(src/lib/__tests__/report.test.ts 참고).
 */

import type { AppData, Category, MonthKey, Transaction, TxType } from '../types';
import type { BudgetLine, Cashflow, CategorySlice, RecurringStatus } from './analytics';
import { budgetStatus, netWorthAt, recurringStatus } from './analytics';
import { addMonths, endOfMonth, monthOf, today } from './date';

export interface CategoryChange extends CategorySlice {
  /** 비교 기간의 같은 카테고리 금액. */
  prev: number;
  delta: number;
  /** 증감률. 지난달이 0이면 비율을 낼 수 없어 undefined. */
  rate?: number;
}

export interface ReportNote {
  tone: 'good' | 'warn' | 'info';
  text: string;
}

export interface MonthlyReport {
  month: MonthKey;
  /** 진행 중인 달이면 true. 지난달과 견줄 때 기간을 맞춰야 한다. */
  partial: boolean;
  /** 진행 중인 달에서 지금까지 지난 일수. 끝난 달이면 그 달의 마지막 날. */
  throughDay: number;

  cashflow: Cashflow;
  prev: Cashflow;
  savingTarget: number;

  /** 그 달 말 기준 순자산과 전월 대비 증가액. */
  netWorth: number;
  netWorthDelta: number;

  /** 지출 카테고리(금액 큰 순) + 지난달 같은 기간 대비. */
  categories: CategoryChange[];
  /** 눈에 띄게 늘어난 카테고리. */
  surged: CategoryChange[];
  overBudget: BudgetLine[];
  missedRecurring: RecurringStatus[];
  notes: ReportNote[];
}

/** 늘었다고 말할 기준. 둘 다 넘어야 한다(적은 금액이 비율만 크게 튀는 걸 막는다). */
const SURGE_AMOUNT = 30_000;
const SURGE_RATE = 0.3;
/** 저축률은 이 정도는 움직여야 언급할 가치가 있다. */
const RATE_NOTE = 0.03;

/** 해당 월 dayOfMonth일까지의 수입/지출 합계. */
function cashflowThrough(txs: Transaction[], month: MonthKey, throughDay: number): Cashflow {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (monthOf(t.date) !== month) continue;
    if (Number(t.date.slice(8, 10)) > throughDay) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const saving = income - expense;
  return { income, expense, saving, savingRate: income > 0 ? saving / income : 0 };
}

/** 해당 월 dayOfMonth일까지의 카테고리별 합계. */
function breakdownThrough(
  txs: Transaction[],
  categories: Category[],
  month: MonthKey,
  type: TxType,
  throughDay: number,
): CategorySlice[] {
  const sums = new Map<string, number>();
  let total = 0;

  for (const t of txs) {
    if (t.type !== type || monthOf(t.date) !== month) continue;
    if (Number(t.date.slice(8, 10)) > throughDay) continue;
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

function lastDayOf(month: MonthKey): number {
  return Number(endOfMonth(month).slice(8, 10));
}

/**
 * 한 달치 리포트.
 *
 * 진행 중인 달은 지난달 '같은 기간'과 견준다. 20일치를 지난달 한 달과 비교하면
 * 무조건 줄어든 것처럼 보이기 때문이다.
 */
export function monthlyReport(data: AppData, month: MonthKey, asOf = today()): MonthlyReport {
  const partial = month === monthOf(asOf);
  const throughDay = partial ? Number(asOf.slice(8, 10)) : lastDayOf(month);
  const prevMonth = addMonths(month, -1);

  const cashflow = cashflowThrough(data.transactions, month, throughDay);
  const prev = cashflowThrough(data.transactions, prevMonth, throughDay);

  const now = breakdownThrough(data.transactions, data.categories, month, 'expense', throughDay);
  const before = breakdownThrough(
    data.transactions,
    data.categories,
    prevMonth,
    'expense',
    throughDay,
  );
  const prevById = new Map(before.map((b) => [b.categoryId, b.amount]));

  const categories: CategoryChange[] = now.map((c) => {
    const p = prevById.get(c.categoryId) ?? 0;
    return { ...c, prev: p, delta: c.amount - p, rate: p > 0 ? (c.amount - p) / p : undefined };
  });

  const surged = categories
    .filter((c) => c.delta >= SURGE_AMOUNT && (c.rate ?? Infinity) >= SURGE_RATE)
    .sort((a, b) => b.delta - a.delta);

  const overBudget = budgetStatus(data.transactions, data.categories, month).filter(
    (b) => b.usage > 1,
  );
  const missedRecurring = recurringStatus(data.recurring, data.transactions, month).filter(
    (r) => !r.recorded,
  );

  const net = netWorthAt(data.accounts, data.snapshots, month).net;
  const netBefore = netWorthAt(data.accounts, data.snapshots, prevMonth).net;

  const report: MonthlyReport = {
    month,
    partial,
    throughDay,
    cashflow,
    prev,
    savingTarget: data.settings.monthlySavingTarget,
    netWorth: net,
    netWorthDelta: net - netBefore,
    categories,
    surged,
    overBudget,
    missedRecurring,
    notes: [],
  };
  report.notes = buildNotes(report);
  return report;
}

/** 숫자를 읽고 사람이 할 말을 만든다. 중요한 것부터 최대 다섯 줄. */
function buildNotes(r: MonthlyReport): ReportNote[] {
  const notes: ReportNote[] = [];
  const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  if (r.cashflow.saving < 0) {
    notes.push({ tone: 'warn', text: `지출이 수입보다 ${won(-r.cashflow.saving)} 많았어요.` });
  } else if (r.savingTarget > 0) {
    const gap = r.savingTarget - r.cashflow.saving;
    notes.push(
      gap <= 0
        ? { tone: 'good', text: `월 저축 목표를 채웠어요. 목표의 ${pct(r.cashflow.saving / r.savingTarget)}.` }
        : { tone: 'info', text: `월 저축 목표까지 ${won(gap)} 남았어요.` },
    );
  }

  const rateDelta = r.cashflow.savingRate - r.prev.savingRate;
  if (r.cashflow.income > 0 && r.prev.income > 0 && Math.abs(rateDelta) >= RATE_NOTE) {
    notes.push({
      tone: rateDelta > 0 ? 'good' : 'warn',
      text:
        rateDelta > 0
          ? `저축률이 지난달보다 ${pct(rateDelta)} 올랐어요.`
          : `저축률이 지난달보다 ${pct(-rateDelta)} 떨어졌어요.`,
    });
  }

  for (const c of r.surged.slice(0, 2)) {
    notes.push({
      tone: 'warn',
      // '식비이(가)'처럼 조사를 붙이면 어색하다. '지출이'를 넣어 조사를 고정한다.
      text: `${c.name} 지출이 지난달보다 ${won(c.delta)} 늘었어요${
        c.rate !== undefined ? ` (${pct(c.rate)}↑)` : ''
      }.`,
    });
  }

  if (r.overBudget.length > 0) {
    const worst = r.overBudget[0];
    notes.push({
      tone: 'warn',
      text: `예산을 넘긴 카테고리가 ${r.overBudget.length}개예요. 가장 많이 넘긴 건 ${worst.category.name}(${pct(worst.usage)}).`,
    });
  }

  if (r.missedRecurring.length > 0) {
    notes.push({
      tone: 'info',
      text: `아직 기록하지 않은 고정지출이 ${r.missedRecurring.length}건 있어요.`,
    });
  }

  return notes.slice(0, 5);
}

/** 리포트를 열 때 기본으로 볼 달. 이번 달 기록이 하나도 없으면 지난달을 보여준다. */
export function defaultReportMonth(data: AppData, asOf = today()): MonthKey {
  const month = monthOf(asOf);
  const has = data.transactions.some((t) => monthOf(t.date) === month);
  return has ? month : addMonths(month, -1);
}
