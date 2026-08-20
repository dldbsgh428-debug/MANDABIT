/**
 * 앱 전역 디자인 토큰.
 *
 * 아이콘(크림 배경 + 네이비 바구니 + 세이지/블루 카드)의 색감을 그대로 쓴다.
 * 라이트 테마 하나로 고정한다. 돈 관련 숫자를 오래 들여다보는 앱이라
 * 글자는 대비를 확실히 주고, 증가(초록)/감소(빨강)는 한국 금융앱 관례를 따른다.
 *
 * 아이콘에서 뽑은 색: 크림 #FBF8F3, 네이비 #3C4F68, 세이지 #A2C2B7,
 * 블루 #92ADC8, 골드 #F4D3A5. 파스텔 그대로는 흰 바탕에서 글자로 못 쓰니
 * 글자·강조에 쓰는 값은 같은 계열에서 더 진한 쪽을 골랐다.
 */

export const colors = {
  bg: '#F6F1E8',
  surface: '#FFFCF7',
  surfaceAlt: '#EDE5D8',
  border: '#E1D7C6',

  text: '#2B3A4F',
  textMuted: '#66768C',
  textFaint: '#98A4B4',

  /** 브랜드/강조: 목표 진척도, 주요 버튼. 아이콘 바구니 색 */
  primary: '#3C4F68',
  /** 진척도 링 그라데이션의 밝은 끝 */
  primaryLight: '#7A93B0',
  primarySoft: '#E3E8EF',

  /** 증가·수입·달성. 아이콘 세이지(#A2C2B7)를 글자용으로 진하게 */
  up: '#3E7D66',
  upLight: '#7FA894',
  upSoft: '#E2EDE7',
  /** 감소·지출·초과 */
  down: '#B4564C',
  downSoft: '#F7E5E2',
  /** 경고(예산 80% 초과 등). 아이콘 동전색을 진하게 */
  warn: '#A9752E',
  warnSoft: '#F6EAD4',

  /** 차트 계열색. 도넛/바 차트에서 순서대로 쓴다. */
  chart: [
    '#3C4F68',
    '#7FA894',
    '#92ADC8',
    '#D9A85F',
    '#B4796A',
    '#8E86A8',
    '#6FA0A6',
    '#9AA6B5',
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
