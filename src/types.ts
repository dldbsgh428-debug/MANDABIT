/**
 * HABITUS 자산관리 앱의 데이터 모델.
 *
 * 모든 금액은 원(KRW) 단위의 정수로 다룬다. 소수점은 쓰지 않는다.
 * 날짜는 'YYYY-MM-DD', 월은 'YYYY-MM' 문자열로 저장해서
 * 타임존 때문에 하루가 밀리는 문제를 피한다.
 */

export type ISODate = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM

/** 자산 계좌의 종류. 대시보드에서 종류별 비중을 보여줄 때 쓴다. */
export type AssetKind =
  | 'cash'
  | 'deposit'
  | 'savings'
  | 'stock'
  | 'crypto'
  | 'pension'
  | 'realestate'
  | 'other';

/** 부채 계좌의 종류. */
export type LiabilityKind = 'loan' | 'card' | 'jeonse' | 'other';

export type AccountKind = AssetKind | LiabilityKind;

export interface Account {
  id: string;
  name: string;
  /** 자산이면 'asset', 부채면 'liability'. 순자산 계산의 부호를 결정한다. */
  side: 'asset' | 'liability';
  kind: AccountKind;
  /**
   * 현재 잔액. 부채도 양수로 저장하고 순자산 계산에서 차감한다.
   * (예: 대출 3,000만원 -> balance: 30_000_000, side: 'liability')
   */
  balance: number;
  /** 순자산 집계에서 제외하고 싶은 계좌(예: 비상금 별도 관리)를 위한 플래그. */
  includeInNetWorth: boolean;
  /** 연이율(%). 예상 잔액 증가를 켜면 이 값으로 이자를 계산한다. */
  interestRate?: number;
  /**
   * 매달 자동이체로 들어가는 금액(적금 등).
   * 예상 잔액 증가를 켜면 마지막 기록 이후 지난 개월수만큼 더해진다.
   */
  monthlyDeposit?: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 특정 시점의 계좌 잔액 기록.
 * 순자산 추이 그래프는 이 스냅샷들을 월별로 모아서 그린다.
 */
export interface BalanceSnapshot {
  id: string;
  accountId: string;
  date: ISODate;
  balance: number;
  memo?: string;
}

export type TxType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: ISODate;
  type: TxType;
  amount: number;
  categoryId: string;
  /** 어느 계좌에서 나갔는지(선택). 비워두면 현금 흐름만 기록된다. */
  accountId?: string;
  memo?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  emoji: string;
  /** 월 예산 한도(원). 지출 카테고리에만 의미가 있다. 0 또는 미설정이면 한도 없음. */
  budget?: number;
  /** 기본 제공 카테고리는 삭제 대신 숨기기만 허용한다. */
  isDefault?: boolean;
  archived?: boolean;
}

export interface Settings {
  /** 목표 금액. 기본값 1억원. */
  goalAmount: number;
  /** 목표 시한(선택). 'YYYY-MM-DD'. 설정하면 필요 월 저축액을 역산해준다. */
  goalDeadline?: ISODate;
  /** 월 저축 목표액. */
  monthlySavingTarget: number;
  /** 프로젝트 시작일. 진행 개월수 계산에 쓴다. */
  startDate: ISODate;
  /** 순자산 추이 차트에 목표 달성 예상선을 겹쳐 보여줄지. */
  showForecastLine: boolean;
  /**
   * 마지막 기록 이후의 납입금·이자를 잔액에 얹어서 보여줄지.
   * 끄면 입력한 잔액만 그대로 쓴다.
   */
  projectBalances: boolean;
}

/** AsyncStorage에 저장되는 전체 상태. */
export interface AppData {
  /** 마이그레이션을 위한 스키마 버전. */
  version: number;
  settings: Settings;
  accounts: Account[];
  snapshots: BalanceSnapshot[];
  transactions: Transaction[];
  categories: Category[];
}
