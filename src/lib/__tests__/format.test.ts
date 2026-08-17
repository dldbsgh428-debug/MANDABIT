/** 금액 표시와 날짜 유틸 테스트. */

import {
  axisWon,
  comma,
  formatAmountInput,
  parseAmount,
  percent,
  percentFloor,
  shortWon,
  won,
} from '../money';
import {
  addDays,
  addMonths,
  endOfMonth,
  formatDate,
  formatDateFull,
  formatMonth,
  isValidDate,
  monthRange,
  monthsBetween,
} from '../date';

describe('금액 표시', () => {
  it('콤마를 넣는다', () => {
    expect(comma(1_234_567)).toBe('1,234,567');
    expect(comma(0)).toBe('0');
    expect(comma(-5000)).toBe('-5,000');
  });

  it('원 단위를 붙인다', () => {
    expect(won(1_000_000)).toBe('1,000,000원');
  });

  it('억·만 단위로 줄여 쓴다', () => {
    expect(shortWon(100_000_000)).toBe('1억원');
    expect(shortWon(123_450_000)).toBe('1억 2,345만원');
    expect(shortWon(3_500_000)).toBe('350만원');
    expect(shortWon(0)).toBe('0원');
    expect(shortWon(-50_000_000)).toBe('-5,000만원');
  });

  it('100만원 미만은 줄이지 않는다', () => {
    // 만 단위로 줄이면 45,000원이 '4만원'이 되어 오차가 너무 크다.
    expect(shortWon(45_000)).toBe('45,000원');
    expect(shortWon(18_500)).toBe('18,500원');
    expect(shortWon(8_500)).toBe('8,500원');
    expect(shortWon(999_999)).toBe('999,999원');
    expect(shortWon(-45_000)).toBe('-45,000원');
  });

  it('100만원 경계에서 만 단위로 바뀐다', () => {
    expect(shortWon(1_000_000)).toBe('100만원');
  });

  it('억·만 단위가 있으면 잔돈은 생략한다', () => {
    // 1억 2,345만 6,789원 -> 잔돈 6,789원은 표시하지 않는다.
    expect(shortWon(123_456_789)).toBe('1억 2,345만원');
  });

  it('축 라벨은 더 짧게 쓴다', () => {
    expect(axisWon(100_000_000)).toBe('1.0억');
    expect(axisWon(35_000_000)).toBe('3,500만');
    expect(axisWon(0)).toBe('0');
    expect(axisWon(-12_000_000)).toBe('-1,200만');
  });

  it('입력에서 숫자만 뽑는다', () => {
    expect(parseAmount('1,234,567원')).toBe(1_234_567);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });

  it('입력창 포맷은 빈 값을 유지한다', () => {
    // 빈 문자열을 '0'으로 바꿔버리면 사용자가 마지막 글자를 지울 수 없다.
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('1000')).toBe('1,000');
  });

  it('비율을 퍼센트로 쓴다', () => {
    expect(percent(0.123)).toBe('12.3%');
    expect(percent(1)).toBe('100.0%');
    expect(percent(0.5, 0)).toBe('50%');
    expect(percent(NaN)).toBe('-');
  });

  it('경고 기준이 붙는 퍼센트는 내림한다', () => {
    // 예산 소진율 79.75%가 '80% 사용'으로 보이면서 주의 배지는 안 뜨는
    // 모순을 막기 위해, 80%는 실제로 80%에 도달했을 때만 나와야 한다.
    expect(percentFloor(0.7975)).toBe('79%');
    expect(percentFloor(0.8)).toBe('80%');
    expect(percentFloor(0.999)).toBe('99%');
    expect(percentFloor(1)).toBe('100%');
    expect(percentFloor(NaN)).toBe('-');
  });
});

describe('날짜 유틸', () => {
  it('월 말일을 구한다', () => {
    expect(endOfMonth('2026-02')).toBe('2026-02-28');
    expect(endOfMonth('2028-02')).toBe('2028-02-29'); // 윤년
    expect(endOfMonth('2026-12')).toBe('2026-12-31');
  });

  it('개월을 더하고 뺀다', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-08', 16)).toBe('2027-12');
    expect(addMonths('2026-08', 0)).toBe('2026-08');
  });

  it('월 범위를 만든다', () => {
    expect(monthRange('2026-11', '2027-02')).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('끝이 시작보다 앞이면 빈 범위다', () => {
    expect(monthRange('2026-08', '2026-07')).toEqual([]);
  });

  it('두 월의 간격을 구한다', () => {
    expect(monthsBetween('2026-01', '2026-04')).toBe(3);
    expect(monthsBetween('2026-08', '2026-08')).toBe(0);
    expect(monthsBetween('2026-08', '2026-07')).toBe(-1);
  });

  it('일 단위로 더하며 월을 넘어간다', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('날짜 형식과 실제 존재 여부를 검사한다', () => {
    expect(isValidDate('2026-08-17')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-8-17')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });

  it('월을 한국어로 쓴다', () => {
    expect(formatMonth('2026-08')).toBe('2026년 8월');
  });

  it('날짜에 요일을 붙인다', () => {
    // 2026-08-17은 월요일.
    expect(formatDate('2026-08-17')).toBe('8월 17일 (월)');
  });

  it('연도가 필요한 곳에는 연도까지 쓴다', () => {
    // 목표 시한처럼 몇 년 뒤일 수 있는 날짜는 연도 없이는 오해를 부른다.
    expect(formatDateFull('2028-12-31')).toBe('2028년 12월 31일 (일)');
    expect(formatDateFull('2026-03-01')).toBe('2026년 3월 1일 (일)');
  });
});
