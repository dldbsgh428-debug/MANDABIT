/**
 * 잔액 기록 알림을 언제 띄울지 계산한다.
 *
 * 이 앱의 순자산 추이와 달성 예측은 전부 "매달 잔액을 갱신한다"는 전제 위에
 * 서 있다. 기록이 끊기면 그래프가 평평해지고 예상 달성 시점이 실제보다
 * 늦어진다. 그런데 앱은 지금껏 그걸 한 번도 상기시켜주지 않았다.
 *
 * 두 가지를 지킨다.
 *
 * 1. **이미 한 일로 귀찮게 하지 않는다.** 이번 달에 잔액을 기록했으면
 *    이번 달 알림은 건너뛴다. 할 일을 다 한 사람에게 울리는 알림은
 *    다음부터 알림 자체를 끄게 만든다.
 * 2. **앱을 안 열어도 몇 달은 버틴다.** 백그라운드에서 도는 코드가 없으므로
 *    알림은 앱을 열 때만 다시 잡힌다. 한 번만 잡아두면 그 알림을 무시한
 *    다음 달부터는 아무 알림도 오지 않는다. 그래서 몇 달치를 미리 잡는다.
 *
 * 날짜 계산만 여기 두고 실제 예약은 notifications.ts가 한다.
 */

import type { ISODate } from '../types';
import { dueDateIn } from './analytics';
import { addMonths, monthOf } from './date';

/** 몇 달치를 미리 잡아둘지. 앱을 안 열어도 이만큼은 알림이 온다. */
export const REMINDER_MONTHS = 3;

/** '말일'을 뜻하는 날짜 값. 그 달의 마지막 날로 옮겨진다. */
export const LAST_DAY = 31;

export interface ReminderPlan {
  /** 알림을 띄울 시각. 이른 순. */
  dates: Date[];
  /**
   * 이번 달 예정일을 건너뛰었는지.
   * 설정 화면에서 "이번 달은 이미 기록해서 건너뜁니다"라고 알려주는 데 쓴다.
   */
  skippedThisMonth: boolean;
}

/**
 * 다음 알림 시각들을 계산한다.
 *
 * @param day    매월 며칠(1~31). 그 달에 없는 날이면 말일로 옮긴다.
 * @param hour   몇 시(0~23).
 * @param now    지금. 이미 지난 시각은 잡지 않는다.
 * @param lastSnapshot 마지막 잔액 기록 날짜. 이번 달 것이면 이번 달은 건너뛴다.
 */
export function planReminders({
  day,
  hour,
  now,
  lastSnapshot,
  count = REMINDER_MONTHS,
}: {
  day: number;
  hour: number;
  now: Date;
  lastSnapshot?: ISODate;
  count?: number;
}): ReminderPlan {
  const thisMonth = monthKeyOf(now);
  const recordedThisMonth = Boolean(lastSnapshot && monthOf(lastSnapshot) === thisMonth);

  const dates: Date[] = [];
  let skippedThisMonth = false;

  // 이번 달부터 넉넉히 훑는다. 앞쪽이 지난 시각이라 버려질 수 있으므로
  // 필요한 개수보다 한 달 더 본다.
  for (let i = 0; i <= count && dates.length < count; i++) {
    const month = addMonths(thisMonth, i);
    const when = atHour(dueDateIn(month, day), hour);

    if (when.getTime() <= now.getTime()) continue; // 이미 지난 시각

    if (i === 0 && recordedThisMonth) {
      // 이번 달 할 일은 끝났다. 알림만 건너뛰고 다음 달부터 잡는다.
      skippedThisMonth = true;
      continue;
    }

    dates.push(when);
  }

  return { dates, skippedThisMonth };
}

/** 'YYYY-MM-DD'와 시각을 로컬 기준 Date로. */
export function atHour(date: ISODate, hour: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0);
}

/** Date -> 'YYYY-MM'. 로컬 기준으로 읽어야 하루가 밀리지 않는다. */
function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** '매월 25일' / '매월 말일'처럼 사람이 읽을 문구로. */
export function formatReminderDay(day: number): string {
  return day >= LAST_DAY ? '매월 말일' : `매월 ${day}일`;
}

/** 20 -> '오후 8시'. 알림 시간은 24시간제보다 이쪽이 잘 읽힌다. */
export function formatHour(hour: number): string {
  if (hour === 0) return '밤 12시';
  if (hour === 12) return '낮 12시';
  return hour < 12 ? `오전 ${hour}시` : `오후 ${hour - 12}시`;
}

/** '8월 31일 (월) 오후 8시'. 다음 알림이 언제인지 그대로 보여줄 때 쓴다. */
export function formatWhen(when: Date): string {
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][when.getDay()];
  return `${when.getMonth() + 1}월 ${when.getDate()}일 (${weekday}) ${formatHour(when.getHours())}`;
}
