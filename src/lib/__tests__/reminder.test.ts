/**
 * 잔액 기록 알림 계산 테스트.
 *
 * 알림은 틀리면 두 방향으로 나쁘다. 안 울리면 기록이 끊겨 그래프가 망가지고,
 * 쓸데없이 울리면 사용자가 알림을 꺼버려서 결국 안 울리는 것과 같아진다.
 * 그래서 '이미 기록한 달은 건너뛴다'와 '지난 시각은 잡지 않는다'를 특히 본다.
 */

import {
  LAST_DAY,
  formatHour,
  formatReminderDay,
  formatWhen,
  planReminders,
} from '../reminder';

/** 로컬 기준 Date. 테스트가 도는 기기의 타임존과 무관하게 같은 결과가 나온다. */
const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);

/** 잡힌 알림을 읽기 쉬운 문자열로. */
const shown = (dates: Date[]) =>
  dates.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}시`);

describe('planReminders', () => {
  it('기본은 세 달치를 미리 잡는다', () => {
    // 앱을 안 열어도 몇 달은 알림이 오게 하기 위해서다.
    const { dates } = planReminders({ day: LAST_DAY, hour: 20, now: at(2026, 8, 5) });
    expect(shown(dates)).toEqual(['2026-8-31 20시', '2026-9-30 20시', '2026-10-31 20시']);
  });

  it('말일은 달마다 실제 마지막 날로 옮긴다', () => {
    const { dates } = planReminders({ day: LAST_DAY, hour: 20, now: at(2027, 1, 5) });
    // 2027년 2월은 28일까지.
    expect(shown(dates)).toEqual(['2027-1-31 20시', '2027-2-28 20시', '2027-3-31 20시']);
  });

  it('윤년 2월도 맞게 센다', () => {
    const { dates } = planReminders({ day: LAST_DAY, hour: 9, now: at(2028, 2, 1), count: 1 });
    expect(shown(dates)).toEqual(['2028-2-29 9시']);
  });

  it('그 달에 없는 날짜도 말일로 옮긴다', () => {
    const { dates } = planReminders({ day: 30, hour: 20, now: at(2027, 2, 1), count: 1 });
    expect(shown(dates)).toEqual(['2027-2-28 20시']);
  });

  it('이번 달 예정일이 지났으면 다음 달부터 잡는다', () => {
    const { dates } = planReminders({ day: 25, hour: 20, now: at(2026, 8, 26), count: 2 });
    expect(shown(dates)).toEqual(['2026-9-25 20시', '2026-10-25 20시']);
  });

  it('같은 날이라도 시각이 지났으면 그 알림은 버린다', () => {
    // 25일 21시에 계산하면 그날 20시 알림은 이미 지난 것이다.
    const { dates } = planReminders({ day: 25, hour: 20, now: at(2026, 8, 25, 21), count: 1 });
    expect(shown(dates)).toEqual(['2026-9-25 20시']);
  });

  it('같은 날이고 시각이 아직이면 오늘 것을 잡는다', () => {
    const { dates } = planReminders({ day: 25, hour: 20, now: at(2026, 8, 25, 9), count: 1 });
    expect(shown(dates)).toEqual(['2026-8-25 20시']);
  });

  it('이번 달에 이미 기록했으면 이번 달은 건너뛴다', () => {
    const plan = planReminders({
      day: LAST_DAY,
      hour: 20,
      now: at(2026, 8, 5),
      lastSnapshot: '2026-08-03',
      count: 2,
    });
    expect(plan.skippedThisMonth).toBe(true);
    expect(shown(plan.dates)).toEqual(['2026-9-30 20시', '2026-10-31 20시']);
  });

  it('지난달 기록은 이번 달을 건너뛸 이유가 되지 않는다', () => {
    const plan = planReminders({
      day: LAST_DAY,
      hour: 20,
      now: at(2026, 8, 5),
      lastSnapshot: '2026-07-31',
      count: 1,
    });
    expect(plan.skippedThisMonth).toBe(false);
    expect(shown(plan.dates)).toEqual(['2026-8-31 20시']);
  });

  it('이번 달 예정일이 이미 지났으면 건너뛴 것으로 세지 않는다', () => {
    // 알림이 이미 울린 뒤에 기록한 경우다. 건너뛴 게 아니라 제 몫을 다한 것이다.
    const plan = planReminders({
      day: 25,
      hour: 20,
      now: at(2026, 8, 27),
      lastSnapshot: '2026-08-26',
      count: 1,
    });
    expect(plan.skippedThisMonth).toBe(false);
    expect(shown(plan.dates)).toEqual(['2026-9-25 20시']);
  });

  it('기록이 아예 없으면 이번 달부터 잡는다', () => {
    const plan = planReminders({ day: 1, hour: 9, now: at(2026, 8, 5), count: 1 });
    expect(plan.skippedThisMonth).toBe(false);
    expect(shown(plan.dates)).toEqual(['2026-9-1 9시']);
  });

  it('연말을 넘어간다', () => {
    const { dates } = planReminders({ day: LAST_DAY, hour: 20, now: at(2026, 11, 5), count: 3 });
    expect(shown(dates)).toEqual(['2026-11-30 20시', '2026-12-31 20시', '2027-1-31 20시']);
  });

  it('건너뛰어도 요청한 개수를 채운다', () => {
    const plan = planReminders({
      day: LAST_DAY,
      hour: 20,
      now: at(2026, 8, 5),
      lastSnapshot: '2026-08-03',
      count: 3,
    });
    expect(plan.dates).toHaveLength(3);
  });
});

describe('사람이 읽는 문구', () => {
  it('말일과 날짜를 구분해 적는다', () => {
    expect(formatReminderDay(LAST_DAY)).toBe('매월 말일');
    expect(formatReminderDay(25)).toBe('매월 25일');
    expect(formatReminderDay(1)).toBe('매월 1일');
  });

  it('시간은 오전·오후로 적는다', () => {
    expect(formatHour(0)).toBe('밤 12시');
    expect(formatHour(9)).toBe('오전 9시');
    expect(formatHour(12)).toBe('낮 12시');
    expect(formatHour(20)).toBe('오후 8시');
  });

  it('다음 알림 시각은 요일까지 보여준다', () => {
    expect(formatWhen(new Date(2026, 7, 31, 20))).toBe('8월 31일 (월) 오후 8시');
  });
});
