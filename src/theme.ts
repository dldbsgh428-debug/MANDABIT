/**
 * 앱 전역 디자인 토큰.
 *
 * 다크 테마 하나로 고정한다. 돈 관련 숫자를 오래 들여다보는 앱이라
 * 대비를 확실히 주고, 증가(초록)/감소(빨강)는 한국 금융앱 관례를 따른다.
 */

export const colors = {
  bg: '#0B0E14',
  surface: '#141924',
  surfaceAlt: '#1C2231',
  border: '#252D3D',

  text: '#F2F5FA',
  textMuted: '#9AA5B8',
  textFaint: '#5E6980',

  /** 브랜드/강조: 목표 진척도, 주요 버튼 */
  primary: '#4C8DFF',
  primarySoft: '#1E3157',

  /** 증가·수입·달성 */
  up: '#26C281',
  upSoft: '#12352A',
  /** 감소·지출·초과 */
  down: '#FF5C5C',
  downSoft: '#3A1D22',
  /** 경고(예산 80% 초과 등) */
  warn: '#FFB020',
  warnSoft: '#3A2C12',

  /** 차트 계열색. 도넛/바 차트에서 순서대로 쓴다. */
  chart: [
    '#4C8DFF',
    '#26C281',
    '#FFB020',
    '#A56CFF',
    '#FF7AC8',
    '#42C9D9',
    '#FF8A4C',
    '#7A8AA8',
  ] as string[],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const font = {
  /** 큰 금액 표시 */
  display: 34,
  h1: 24,
  h2: 19,
  h3: 16,
  body: 15,
  small: 13,
  tiny: 11,
};

/** 계좌 종류 라벨과 이모지. 자산/부채 선택 UI와 목록에서 공유한다. */
export const accountKindMeta: Record<string, { label: string; emoji: string; side: 'asset' | 'liability' }> = {
  cash: { label: '현금', emoji: '💵', side: 'asset' },
  deposit: { label: '예금', emoji: '🏦', side: 'asset' },
  savings: { label: '적금', emoji: '🐖', side: 'asset' },
  stock: { label: '주식·ETF', emoji: '📈', side: 'asset' },
  crypto: { label: '코인', emoji: '🪙', side: 'asset' },
  pension: { label: '연금·IRP', emoji: '🧧', side: 'asset' },
  realestate: { label: '부동산', emoji: '🏠', side: 'asset' },
  other: { label: '기타', emoji: '📦', side: 'asset' },
  loan: { label: '대출', emoji: '🏧', side: 'liability' },
  card: { label: '카드값', emoji: '💳', side: 'liability' },
  jeonse: { label: '전세보증금 대출', emoji: '🔑', side: 'liability' },
};

export const assetKinds = [
  'cash',
  'deposit',
  'savings',
  'stock',
  'crypto',
  'pension',
  'realestate',
  'other',
] as const;

export const liabilityKinds = ['loan', 'card', 'jeonse', 'other'] as const;
