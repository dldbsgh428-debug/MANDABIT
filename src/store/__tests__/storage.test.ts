/**
 * 저장 데이터 마이그레이션과 백업 파일 검증 테스트.
 *
 * 여기가 깨지면 사용자가 앱을 켤 수 없거나 백업 복원이 실패하므로
 * 잘못된 입력을 넣어도 죽지 않는지를 중점적으로 확인한다.
 */

import { migrate, parseBackup } from '../storage';
import { SCHEMA_VERSION, initialData } from '../defaults';

describe('migrate', () => {
  it('빈 값이 들어오면 초기 상태를 돌려준다', () => {
    expect(migrate(null).accounts).toEqual([]);
    expect(migrate(undefined).version).toBe(SCHEMA_VERSION);
    expect(migrate('문자열' as unknown).categories.length).toBeGreaterThan(0);
  });

  it('빠진 설정 값은 기본값으로 메운다', () => {
    const result = migrate({ settings: { goalAmount: 50_000_000 } });

    expect(result.settings.goalAmount).toBe(50_000_000);
    // 나머지 설정은 기본값이 채워져야 한다.
    expect(result.settings.monthlySavingTarget).toBe(0);
    expect(result.settings.showForecastLine).toBe(true);
    expect(typeof result.settings.startDate).toBe('string');
  });

  it('배열이 아닌 필드는 빈 배열로 바꾼다', () => {
    const result = migrate({ accounts: 'not-an-array', transactions: null });
    expect(result.accounts).toEqual([]);
    expect(result.transactions).toEqual([]);
  });

  it('업데이트로 새로 생긴 기본 카테고리를 기존 목록에 더한다', () => {
    // 이미 쓰던 사용자에게도 새 카테고리가 보여야 한다.
    const savedOnly = [
      { id: 'exp-food', name: '식비', type: 'expense' as const, emoji: '🍚', isDefault: true },
    ];
    const result = migrate({ categories: savedOnly });

    expect(result.categories.find((c) => c.id === 'exp-food')).toBeDefined();
    expect(result.categories.find((c) => c.id === 'exp-meeting')).toBeDefined();
    expect(result.categories.length).toBe(initialData().categories.length);
  });

  it('사용자가 고친 카테고리는 건드리지 않는다', () => {
    const renamed = [
      { id: 'exp-food', name: '밥값', type: 'expense' as const, emoji: '🍜', budget: 300_000 },
    ];
    const result = migrate({ categories: renamed });
    const food = result.categories.find((c) => c.id === 'exp-food');

    expect(food?.name).toBe('밥값');
    expect(food?.budget).toBe(300_000);
  });

  it('카테고리가 비어 있으면 기본 카테고리를 넣어준다', () => {
    // 카테고리가 하나도 없으면 거래를 입력할 수 없게 되므로 기본값으로 되살린다.
    const result = migrate({ categories: [] });
    expect(result.categories).toEqual(initialData().categories);
  });

  it('정상 데이터는 그대로 유지한다', () => {
    const data = initialData();
    data.settings.goalAmount = 200_000_000;
    data.accounts = [
      {
        id: 'a',
        name: '주거래',
        side: 'asset',
        kind: 'deposit',
        balance: 1_000_000,
        includeInNetWorth: true,
        createdAt: 'x',
        updatedAt: 'x',
      },
    ];

    const result = migrate(JSON.parse(JSON.stringify(data)));
    expect(result.accounts).toHaveLength(1);
    expect(result.settings.goalAmount).toBe(200_000_000);
  });
});

describe('parseBackup', () => {
  it('정상 백업을 읽는다', () => {
    const data = initialData();
    const restored = parseBackup(JSON.stringify(data));
    expect(restored.version).toBe(SCHEMA_VERSION);
  });

  it('JSON이 아니면 안내 메시지와 함께 실패한다', () => {
    expect(() => parseBackup('이건 JSON이 아님')).toThrow('JSON 형식이 아닙니다');
  });

  it('객체가 아닌 JSON은 거부한다', () => {
    expect(() => parseBackup('[1,2,3]')).toThrow();
    expect(() => parseBackup('42')).toThrow('백업 파일 구조가 올바르지 않습니다');
  });

  it('다른 앱의 JSON은 거부한다', () => {
    expect(() => parseBackup('{"foo":"bar"}')).toThrow('HABITUS 백업 파일이 아닌');
  });

  it('계좌 배열만 있어도 이 앱의 백업으로 인정한다', () => {
    // 거래를 한 번도 입력하지 않은 사용자의 백업도 복원돼야 한다.
    const restored = parseBackup('{"accounts":[]}');
    expect(restored.accounts).toEqual([]);
    expect(restored.categories.length).toBeGreaterThan(0);
  });
});

describe('기본 카테고리 이모지 갱신', () => {
  it('손대지 않은 이모지만 새 것으로 바꾼다', () => {
    const saved = migrate({
      version: 1,
      categories: [
        { id: 'exp-meeting', name: '모임·회비', type: 'expense', emoji: '🍻', isDefault: true },
      ],
    });
    expect(saved.categories.find((c) => c.id === 'exp-meeting')?.emoji).toBe('👥');
  });

  it('사용자가 고른 이모지는 그대로 둔다', () => {
    const saved = migrate({
      version: 1,
      categories: [
        { id: 'exp-meeting', name: '모임·회비', type: 'expense', emoji: '🎳', isDefault: true },
      ],
    });
    expect(saved.categories.find((c) => c.id === 'exp-meeting')?.emoji).toBe('🎳');
  });
});
