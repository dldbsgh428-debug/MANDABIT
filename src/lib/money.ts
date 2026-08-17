/** 원화 금액 표시 유틸. */

/** 1,234,567 -> "1,234,567" */
export function comma(value: number): string {
  const n = Math.round(value);
  const sign = n < 0 ? '-' : '';
  return sign + Math.abs(n).toLocaleString('ko-KR');
}

/** 1,234,567 -> "1,234,567원" */
export function won(value: number): string {
  return `${comma(value)}원`;
}

/**
 * 큰 금액을 한국식 단위로 짧게 표시한다.
 * 100_000_000 -> "1억원", 123_450_000 -> "1억 2,345만원", 3_500_000 -> "350만원"
 *
 * 100만원 미만은 줄이지 않고 원 단위로 그대로 쓴다.
 * 만 단위로 줄이면 45,000원이 "4만원"이 되어 오차가 너무 커지고,
 * 어차피 "45,000원"도 충분히 짧기 때문이다.
 */
export function shortWon(value: number): string {
  const n = Math.round(value);
  if (n === 0) return '0원';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs < 1_000_000) return `${sign}${comma(abs)}원`;

  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);

  // 100만원 이상이므로 억이든 만이든 최소 한 쪽은 반드시 값이 있다.
  const parts: string[] = [];
  if (eok > 0) parts.push(`${comma(eok)}억`);
  if (man > 0) parts.push(`${comma(man)}만`);
  // 1만원 미만 잔돈은 생략한다. 억·만 단위 옆에서는 읽는 데 방해만 된다.

  return `${sign}${parts.join(' ')}원`;
}

/** 축 라벨처럼 아주 짧아야 하는 곳: 100_000_000 -> "1.0억", 3_500_000 -> "350만" */
export function axisWon(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000).toLocaleString('ko-KR')}만`;
  return `${sign}${Math.round(abs)}`;
}

/** 입력창의 문자열에서 숫자만 뽑아낸다. "1,000원" -> 1000 */
export function parseAmount(text: string): number {
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/** 입력창에 보여줄 콤마 포맷. 빈 값은 빈 문자열로 유지해야 지울 수 있다. */
export function formatAmountInput(text: string): string {
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

/** 0~1 비율을 "12.3%"로. */
export function percent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return '-';
  return `${(ratio * 100).toFixed(digits)}%`;
}

/**
 * 내림한 정수 퍼센트. "80%"는 실제로 80%에 도달했을 때만 나온다.
 *
 * 예산 소진율처럼 경고 기준(80%, 100%)이 붙는 숫자에 쓴다. 반올림하면
 * 79.75%가 "80% 사용"으로 보이면서 주의 배지는 안 뜨는 모순이 생긴다.
 */
export function percentFloor(ratio: number): string {
  if (!Number.isFinite(ratio)) return '-';
  return `${Math.floor(ratio * 100)}%`;
}
