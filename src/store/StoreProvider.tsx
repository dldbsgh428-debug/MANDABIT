/**
 * 앱 전역 상태. Context + useReducer로 구현하고 변경이 생기면
 * AsyncStorage에 자동 저장한다.
 *
 * 화면에서는 useStore()로 데이터와 액션을 함께 꺼내 쓴다.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import type {
  Account,
  AppData,
  BalanceSnapshot,
  Category,
  ISODate,
  RecurringExpense,
  Settings,
  Transaction,
} from '../types';
import { today } from '../lib/date';
import { initialData } from './defaults';
import { loadData, saveData } from './storage';

/** 의존성 없이 충분히 안전한 지역 ID. 같은 밀리초에 여러 건이 들어와도 랜덤으로 구분된다. */
function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type Action =
  | { type: 'hydrate'; data: AppData }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'account/add'; account: Account; snapshot: BalanceSnapshot }
  | { type: 'account/update'; id: string; patch: Partial<Account> }
  | { type: 'account/remove'; id: string }
  | { type: 'account/setBalance'; id: string; balance: number; date: ISODate; memo?: string }
  | { type: 'snapshot/remove'; id: string }
  | { type: 'tx/add'; tx: Transaction }
  | { type: 'tx/update'; id: string; patch: Partial<Transaction> }
  | { type: 'tx/remove'; id: string }
  | { type: 'category/add'; category: Category }
  | { type: 'category/update'; id: string; patch: Partial<Category> }
  | { type: 'category/remove'; id: string }
  | { type: 'recurring/add'; item: RecurringExpense }
  | { type: 'recurring/update'; id: string; patch: Partial<RecurringExpense> }
  | { type: 'recurring/remove'; id: string }
  | { type: 'tx/addMany'; items: Transaction[] }
  | { type: 'data/replace'; data: AppData };

/** 같은 계좌·같은 날짜의 스냅샷은 덮어쓴다. 하루에 여러 번 고쳐도 기록이 지저분해지지 않는다. */
function upsertSnapshot(snapshots: BalanceSnapshot[], next: BalanceSnapshot): BalanceSnapshot[] {
  const idx = snapshots.findIndex((s) => s.accountId === next.accountId && s.date === next.date);
  if (idx === -1) return [...snapshots, next];
  const copy = [...snapshots];
  copy[idx] = { ...copy[idx], balance: next.balance, memo: next.memo ?? copy[idx].memo };
  return copy;
}

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
    case 'data/replace':
      return action.data;

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'account/add':
      return {
        ...state,
        accounts: [...state.accounts, action.account],
        snapshots: upsertSnapshot(state.snapshots, action.snapshot),
      };

    case 'account/update':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.id ? { ...a, ...action.patch, updatedAt: new Date().toISOString() } : a,
        ),
      };

    case 'account/remove':
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.id),
        // 계좌를 지우면 그 계좌의 잔액 기록도 함께 지운다(추이 그래프에 유령 데이터가 남지 않도록).
        snapshots: state.snapshots.filter((s) => s.accountId !== action.id),
        // 거래는 남기되 계좌 연결만 끊는다. 가계부 기록 자체는 지울 이유가 없다.
        transactions: state.transactions.map((t) =>
          t.accountId === action.id ? { ...t, accountId: undefined } : t,
        ),
      };

    case 'account/setBalance':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.id
            ? { ...a, balance: action.balance, updatedAt: new Date().toISOString() }
            : a,
        ),
        snapshots: upsertSnapshot(state.snapshots, {
          id: makeId('snap'),
          accountId: action.id,
          date: action.date,
          balance: action.balance,
          memo: action.memo,
        }),
      };

    case 'snapshot/remove':
      return { ...state, snapshots: state.snapshots.filter((s) => s.id !== action.id) };

    case 'tx/add':
      return { ...state, transactions: [action.tx, ...state.transactions] };

    case 'tx/addMany':
      return { ...state, transactions: [...action.items, ...state.transactions] };

    case 'recurring/add':
      return { ...state, recurring: [...state.recurring, action.item] };

    case 'recurring/update':
      return {
        ...state,
        recurring: state.recurring.map((r) =>
          r.id === action.id ? { ...r, ...action.patch } : r,
        ),
      };

    case 'recurring/remove':
      return { ...state, recurring: state.recurring.filter((r) => r.id !== action.id) };

    case 'tx/update':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t,
        ),
      };

    case 'tx/remove':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };

    case 'category/add':
      return { ...state, categories: [...state.categories, action.category] };

    case 'category/update':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c,
        ),
      };

    case 'category/remove': {
      const target = state.categories.find((c) => c.id === action.id);
      // 기본 카테고리이거나 이미 쓰인 카테고리는 숨기기만 한다.
      // 실제로 지우면 과거 거래가 '미분류'로 변해 지난 달 통계가 망가진다.
      const used = state.transactions.some((t) => t.categoryId === action.id);
      if (target?.isDefault || used) {
        return {
          ...state,
          categories: state.categories.map((c) =>
            c.id === action.id ? { ...c, archived: true } : c,
          ),
        };
      }
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id) };
    }

    default:
      return state;
  }
}

export interface StoreValue {
  data: AppData;
  /** AsyncStorage에서 읽어오는 중이면 false. 첫 렌더에서 빈 화면을 보여주는 데 쓴다. */
  ready: boolean;

  updateSettings: (patch: Partial<Settings>) => void;

  addAccount: (input: {
    name: string;
    side: 'asset' | 'liability';
    kind: Account['kind'];
    balance: number;
    includeInNetWorth?: boolean;
    interestRate?: number;
    interestMode?: Account['interestMode'];
    monthlyDeposit?: number;
    payDay?: number;
    memo?: string;
  }) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  setBalance: (id: string, balance: number, date?: ISODate, memo?: string) => void;
  removeSnapshot: (id: string) => void;

  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt'>) => void;
  /** 고정지출을 한 번에 기록할 때 쓴다. */
  addTransactions: (inputs: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;

  addRecurring: (input: Omit<RecurringExpense, 'id' | 'createdAt'>) => void;
  updateRecurring: (id: string, patch: Partial<RecurringExpense>) => void;
  removeRecurring: (id: string) => void;

  addCategory: (input: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;

  replaceAll: (data: AppData) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, initialData());
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // 앱 시작 시 한 번 읽어온다.
  useEffect(() => {
    let cancelled = false;
    loadData().then((loaded) => {
      if (cancelled) return;
      dispatch({ type: 'hydrate', data: loaded });
      hydrated.current = true;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 상태가 바뀔 때마다 저장한다. 첫 hydrate 전에는 저장하지 않는다
  // (초기값으로 기존 데이터를 덮어쓰면 안 되므로).
  useEffect(() => {
    if (!hydrated.current) return;
    saveData(data).catch((e) => console.warn('[habitus] 저장 실패', e));
  }, [data]);

  const addAccount = useCallback<StoreValue['addAccount']>((input) => {
    const now = new Date().toISOString();
    const id = makeId('acc');
    dispatch({
      type: 'account/add',
      account: {
        id,
        name: input.name,
        side: input.side,
        kind: input.kind,
        balance: input.balance,
        includeInNetWorth: input.includeInNetWorth ?? true,
        interestRate: input.interestRate,
        interestMode: input.interestMode,
        monthlyDeposit: input.monthlyDeposit,
        payDay: input.payDay,
        memo: input.memo,
        createdAt: now,
        updatedAt: now,
      },
      // 계좌를 만든 시점의 잔액도 기록으로 남겨야 추이 그래프의 출발점이 생긴다.
      snapshot: { id: makeId('snap'), accountId: id, date: today(), balance: input.balance },
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      ready,
      updateSettings: (patch) => dispatch({ type: 'settings/update', patch }),

      addAccount,
      updateAccount: (id, patch) => dispatch({ type: 'account/update', id, patch }),
      removeAccount: (id) => dispatch({ type: 'account/remove', id }),
      setBalance: (id, balance, date, memo) =>
        dispatch({ type: 'account/setBalance', id, balance, date: date ?? today(), memo }),
      removeSnapshot: (id) => dispatch({ type: 'snapshot/remove', id }),

      addTransaction: (input) =>
        dispatch({
          type: 'tx/add',
          tx: { ...input, id: makeId('tx'), createdAt: new Date().toISOString() },
        }),
      addTransactions: (inputs) =>
        dispatch({
          type: 'tx/addMany',
          items: inputs.map((input) => ({
            ...input,
            id: makeId('tx'),
            createdAt: new Date().toISOString(),
          })),
        }),

      addRecurring: (input) =>
        dispatch({
          type: 'recurring/add',
          item: { ...input, id: makeId('rec'), createdAt: new Date().toISOString() },
        }),
      updateRecurring: (id, patch) => dispatch({ type: 'recurring/update', id, patch }),
      removeRecurring: (id) => dispatch({ type: 'recurring/remove', id }),
      updateTransaction: (id, patch) => dispatch({ type: 'tx/update', id, patch }),
      removeTransaction: (id) => dispatch({ type: 'tx/remove', id }),

      addCategory: (input) => dispatch({ type: 'category/add', category: { ...input, id: makeId('cat') } }),
      updateCategory: (id, patch) => dispatch({ type: 'category/update', id, patch }),
      removeCategory: (id) => dispatch({ type: 'category/remove', id }),

      replaceAll: (next) => dispatch({ type: 'data/replace', data: next }),
      resetAll: () => dispatch({ type: 'data/replace', data: initialData() }),
    }),
    [data, ready, addAccount],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore()는 StoreProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
