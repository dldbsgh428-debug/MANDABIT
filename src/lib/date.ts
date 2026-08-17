/**
 * 날짜 유틸. 모든 함수는 'YYYY-MM-DD' / 'YYYY-MM' 문자열을 다룬다.
 * Date 객체를 최소한으로만 쓰는 이유는 기기 타임존에 따라 날짜가
 * 하루 밀리는 문제를 피하기 위해서다.
 */

import type { ISODate, MonthKey } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

/** 오늘 날짜를 로컬 기준 'YYYY-MM-DD'로. */
export function today(): ISODate {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 이번 달 'YYYY-MM'. */
export function currentMonth(): MonthKey {
  return today().slice(0, 7);
}

/** 'YYYY-MM-DD' -> 'YYYY-MM' */
export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

/** 'YYYY-MM' -> 그 달의 마지막 날 'YYYY-MM-DD' */
export function endOfMonth(month: MonthKey): ISODate {
  const [y, m] = month.split('-').map(Number);
  // 다음 달 0일 = 이번 달 마지막 날
  const last = new Date(y, m, 0).getDate();
  return `${month}-${pad(last)}`;
}

/** 'YYYY-MM' 에 delta 개월을 더한다. addMonths('2026-01', -1) -> '2025-12' */
export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12 + 12) % 12 + 1;
  return `${ny}-${pad(nm)}`;
}

/** from부터 to까지(양끝 포함) 월 목록. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  let cur = from;
  // 잘못된 입력으로 무한 루프가 되지 않도록 상한을 둔다(50년).
  for (let i = 0; i < 600 && cur <= to; i++) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

/** 두 월 사이의 개월 수. monthsBetween('2026-01','2026-04') -> 3 */
export function monthsBetween(from: MonthKey, to: MonthKey): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty * 12 + tm) - (fy * 12 + fm);
}

/** 'YYYY-MM' -> '2026년 8월' */
export function formatMonth(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
}

/** 'YYYY-MM' -> '8월' (차트 축처럼 좁은 곳) */
export function formatMonthShort(month: MonthKey): string {
  const m = Number(month.split('-')[1]);
  return `${m}월`;
}

/** 'YYYY-MM-DD' -> '8월 17일 (월)' */
export function formatDate(date: ISODate): string {
  const [y, m, d] = date.split('-').map(Number);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${dow})`;
}

/** 'YYYY-MM-DD' 형식이 맞는지, 그리고 실제 존재하는 날짜인지 확인. */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const last = new Date(y, m, 0).getDate();
  return d >= 1 && d <= last;
}

/** date에 일 단위로 delta를 더한다. */
export function addDays(date: ISODate, delta: number): ISODate {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
