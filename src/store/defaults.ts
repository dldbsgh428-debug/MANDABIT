import type { AppData, Category } from '../types';
import { today } from '../lib/date';

/** 스키마 버전. 구조를 바꾸면 올리고 migrate()에 변환을 추가한다. */
export const SCHEMA_VERSION = 1;

/** 목표 기본값: 1억원. */
export const DEFAULT_GOAL = 100_000_000;

const defaultCategories: Category[] = [
  // 수입
  { id: 'inc-salary', name: '급여', type: 'income', emoji: '💼', isDefault: true },
  { id: 'inc-bonus', name: '상여·성과급', type: 'income', emoji: '🎁', isDefault: true },
  { id: 'inc-side', name: '부수입', type: 'income', emoji: '🛠️', isDefault: true },
  { id: 'inc-invest', name: '금융소득', type: 'income', emoji: '📈', isDefault: true },
  { id: 'inc-etc', name: '기타수입', type: 'income', emoji: '➕', isDefault: true },

  // 지출
  { id: 'exp-food', name: '식비', type: 'expense', emoji: '🍚', isDefault: true },
  { id: 'exp-cafe', name: '카페·간식', type: 'expense', emoji: '☕', isDefault: true },
  { id: 'exp-house', name: '주거·관리비', type: 'expense', emoji: '🏠', isDefault: true },
  { id: 'exp-transport', name: '교통', type: 'expense', emoji: '🚇', isDefault: true },
  { id: 'exp-comm', name: '통신', type: 'expense', emoji: '📱', isDefault: true },
  { id: 'exp-sub', name: '구독·고정지출', type: 'expense', emoji: '🔁', isDefault: true },
  { id: 'exp-health', name: '의료·건강', type: 'expense', emoji: '💊', isDefault: true },
  { id: 'exp-shopping', name: '쇼핑', type: 'expense', emoji: '🛍️', isDefault: true },
  { id: 'exp-culture', name: '문화·여가', type: 'expense', emoji: '🎬', isDefault: true },
  { id: 'exp-social', name: '경조사', type: 'expense', emoji: '💐', isDefault: true },
  { id: 'exp-meeting', name: '모임·회비', type: 'expense', emoji: '🍻', isDefault: true },
  { id: 'exp-insurance', name: '보험', type: 'expense', emoji: '🛡️', isDefault: true },
  { id: 'exp-etc', name: '기타지출', type: 'expense', emoji: '➖', isDefault: true },
];

/** 첫 실행 시의 초기 상태. 계좌와 거래는 비워두고 사용자가 채운다. */
export function initialData(): AppData {
  return {
    version: SCHEMA_VERSION,
    settings: {
      goalAmount: DEFAULT_GOAL,
      monthlySavingTarget: 0,
      startDate: today(),
      showForecastLine: true,
      projectBalances: true,
    },
    accounts: [],
    snapshots: [],
    transactions: [],
    categories: defaultCategories,
    recurring: [],
  };
}
