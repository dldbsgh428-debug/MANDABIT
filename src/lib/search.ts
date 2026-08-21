/**
 * 가계부 내역 검색.
 *
 * 가계부 탭은 한 달씩만 보여준다. 달을 넘겨가며 눈으로 훑는 것은 기록이
 * 쌓일수록 못 할 짓이 되고, "작년에 카페에 얼마 썼더라" 같은 질문에
 * 답하지 못한다. 그 질문의 답은 목록이 아니라 합계라서, 여기서는 걸러낸
 * 내역과 함께 건수·수입·지출 합계와 월별 합계를 같이 돌려준다.
 *
 * 화면을 타지 않는 순수 함수로 둬서 계산만 테스트로 지킨다.
 */

import type {
  Account,
  Category,
  ISODate,
  MonthKey,
  Transaction,
  TxType,
} from '../types';
import { monthOf } from './date';

export interface SearchFilter {
  /** 검색어. 공백으로 나눈 조각이 모두 맞아야 한다. */
  query: string;
  /** 수입만/지출만. 비우면 둘 다. */
  type?: TxType;
  /** 고른 카테고리만. 비었으면 전체. */
  categoryIds?: string[];
  /** 고른 계좌만. 비었으면 전체. */
  accountIds?: string[];
  /** 기간(양끝 포함). 비우면 제한 없음. */
  from?: ISODate;
  to?: ISODate;
}

export interface MonthTotal {
  month: MonthKey;
  income: number;
  expense: number;
  count: number;
}

export interface SearchResult {
  /** 최신순. 같은 날이면 나중에 입력한 것이 앞. */
  items: Transaction[];
  count: number;
  income: number;
  expense: number;
  /** 결과의 월별 합계. 최신 월이 앞. */
  byMonth: MonthTotal[];
}

/** 비교하기 좋게 다듬는다. 대소문자와 띄어쓰기 차이로 못 찾는 걸 막는다. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

/**
 * 조각 하나가 이 거래에 맞는지.
 *
 * 글자는 메모·카테고리 이름·계좌 이름에서 찾는다. 사람은 '카페'처럼
 * 카테고리 이름으로도 찾으려 하기 때문이다.
 *
 * 숫자만 친 조각은 금액과 날짜에서도 찾아본다. 금액은 앞자리부터 맞춰본다.
 * ('15000' -> 15,000원. '15' -> 15,000원·150,000원). 기억에 남는 것은
 * 뒷자리가 아니라 앞자리라서, 부분 포함보다 이쪽이 덜 시끄럽다.
 */
function matchesToken(token: string, haystack: string, tx: Transaction): boolean {
  if (haystack.includes(token)) return true;

  // '15,000원'처럼 숫자와 단위만 친 조각은 금액으로 본다.
  if (/^[0-9,]+원?$/.test(token)) {
    const digits = token.replace(/[^0-9]/g, '');
    if (digits && String(tx.amount).startsWith(digits)) return true;
  }
  // '2026-08'처럼 날짜를 그대로 치는 경우.
  if (tx.date.includes(token)) return true;

  return false;
}

export function searchTransactions(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  filter: SearchFilter,
): SearchResult {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  // 조각으로 먼저 나눈 뒤에 다듬는다. normalize가 공백을 지우기 때문에
  // 순서를 바꾸면 '스벅 커피'가 조각 하나로 붙어버린다.
  const needles = filter.query.trim().split(/\s+/).map(normalize).filter(Boolean);

  const categorySet = filter.categoryIds?.length ? new Set(filter.categoryIds) : null;
  const accountSet = filter.accountIds?.length ? new Set(filter.accountIds) : null;

  const items = transactions.filter((tx) => {
    if (filter.type && tx.type !== filter.type) return false;
    if (filter.from && tx.date < filter.from) return false;
    if (filter.to && tx.date > filter.to) return false;
    if (categorySet && !categorySet.has(tx.categoryId)) return false;
    if (accountSet && !(tx.accountId && accountSet.has(tx.accountId))) return false;

    if (!needles.length) return true;

    const haystack = normalize(
      [tx.memo ?? '', categoryName.get(tx.categoryId) ?? '', accountName.get(tx.accountId ?? '') ?? '']
        .join(' '),
    );
    return needles.every((t) => matchesToken(t, haystack, tx));
  });

  items.sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  );

  let income = 0;
  let expense = 0;
  const months = new Map<MonthKey, MonthTotal>();

  for (const tx of items) {
    if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;

    const key = monthOf(tx.date);
    let row = months.get(key);
    if (!row) {
      row = { month: key, income: 0, expense: 0, count: 0 };
      months.set(key, row);
    }
    row.count += 1;
    if (tx.type === 'income') row.income += tx.amount;
    else row.expense += tx.amount;
  }

  const byMonth = [...months.values()].sort((a, b) => b.month.localeCompare(a.month));

  return { items, count: items.length, income, expense, byMonth };
}

/** 아무 조건도 걸지 않은 상태인지. 화면에서 '조건 지우기'를 보일지 정할 때 쓴다. */
export function isEmptyFilter(filter: SearchFilter): boolean {
  return (
    !filter.query.trim() &&
    !filter.type &&
    !filter.categoryIds?.length &&
    !filter.accountIds?.length &&
    !filter.from &&
    !filter.to
  );
}
