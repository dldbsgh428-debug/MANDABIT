/** AsyncStorage 영속화와 백업 데이터 검증. */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData, Category } from '../types';
import { SCHEMA_VERSION, initialData } from './defaults';

const STORAGE_KEY = 'habitus.appdata.v1';

/** 저장된 데이터를 읽는다. 없거나 깨졌으면 초기 상태를 돌려준다. */
export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return initialData();
    return migrate(JSON.parse(raw));
  } catch (e) {
    // 저장된 JSON이 깨진 경우까지 앱이 못 켜지면 안 되므로 초기 상태로 복구한다.
    console.warn('[habitus] 저장된 데이터를 읽지 못해 초기 상태로 시작합니다.', e);
    return initialData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function clearData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * 예전 버전에서 저장된 데이터를 현재 스키마로 맞춘다.
 * 아직 v1이 유일하지만, 필드가 빠진 데이터가 들어와도 앱이 죽지 않도록
 * 기본값으로 메워준다.
 */
export function migrate(raw: unknown): AppData {
  const base = initialData();
  if (!raw || typeof raw !== 'object') return base;

  const d = raw as Partial<AppData>;
  return {
    version: SCHEMA_VERSION,
    settings: { ...base.settings, ...(d.settings ?? {}) },
    accounts: Array.isArray(d.accounts) ? d.accounts : [],
    snapshots: Array.isArray(d.snapshots) ? d.snapshots : [],
    transactions: Array.isArray(d.transactions) ? d.transactions : [],
    categories: mergeCategories(d.categories),
    recurring: Array.isArray(d.recurring) ? d.recurring : [],
  };
}

/**
 * 저장된 카테고리에 새로 생긴 기본 카테고리를 더한다.
 *
 * 앱을 업데이트하면서 기본 카테고리를 추가해도, 이미 쓰고 있던 사용자에게는
 * 저장된 목록이 있어서 새 항목이 보이지 않는다. id로 비교해 없는 것만 넣는다.
 * 사용자가 숨기거나 이름을 바꾼 카테고리는 그대로 둔다.
 */
function mergeCategories(saved: Category[] | undefined): Category[] {
  const defaults = initialData().categories;
  if (!Array.isArray(saved) || saved.length === 0) return defaults;

  const existing = new Set(saved.map((c) => c.id));
  const added = defaults.filter((c) => !existing.has(c.id));
  return added.length > 0 ? [...saved, ...added] : saved;
}

/**
 * 백업 파일(JSON 문자열)을 검증하고 AppData로 바꾼다.
 * 형식이 아니면 사용자에게 보여줄 한국어 메시지와 함께 throw한다.
 */
export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON 형식이 아닙니다. 백업 파일이 맞는지 확인해 주세요.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('백업 파일 구조가 올바르지 않습니다.');
  }

  const d = parsed as Partial<AppData>;
  // 계좌/거래 중 하나라도 배열로 들어 있어야 이 앱의 백업으로 인정한다.
  if (!Array.isArray(d.accounts) && !Array.isArray(d.transactions)) {
    throw new Error('HABITUS 백업 파일이 아닌 것 같습니다.');
  }

  return migrate(parsed);
}
