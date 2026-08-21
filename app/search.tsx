/**
 * 가계부 검색: 달의 경계를 넘어 내역을 찾는다.
 *
 * 가계부 탭은 한 달씩만 보여준다. "작년에 카페에 얼마 썼더라"는 거기서
 * 답이 안 나온다. 그래서 이 화면은 목록보다 합계를 먼저 보여준다 —
 * 찾는 사람이 알고 싶은 건 보통 몇 건이냐가 아니라 얼마냐이기 때문이다.
 *
 * 조건은 위에서 아래로 좁혀진다: 검색어 -> 수입·지출 -> 기간 -> 카테고리.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TransactionRow } from '../src/components/TransactionRow';
import { Text, TextInput } from '../src/components/Typo';
import { Card, EmptyState, Segmented } from '../src/components/ui';
import { addMonths, currentMonth, formatDateFull, formatMonth, today } from '../src/lib/date';
import { shortWon, won } from '../src/lib/money';
import { searchTransactions } from '../src/lib/search';
import { useStore } from '../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../src/theme';
import type { Transaction, TxType } from '../src/types';

/** 한 번에 그리는 건수. 몇 년치를 한꺼번에 그리면 스크롤이 버벅인다. */
const PAGE = 100;

type Period = 'all' | 'm3' | 'm12' | 'year';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'm3', label: '최근 3개월' },
  { value: 'm12', label: '최근 1년' },
  { value: 'year', label: '올해' },
];

/** 기간 선택을 실제 시작일로 옮긴다. 끝은 항상 열어둔다(미래 날짜 기록도 보이게). */
function startOf(period: Period): string | undefined {
  const now = currentMonth();
  switch (period) {
    case 'm3':
      return `${addMonths(now, -2)}-01`; // 이번 달 포함 3개월
    case 'm12':
      return `${addMonths(now, -11)}-01`;
    case 'year':
      return `${today().slice(0, 4)}-01-01`;
    default:
      return undefined;
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const { data, removeTransaction } = useStore();

  const [query, setQuery] = useState('');
  const [type, setType] = useState<TxType | 'all'>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  // 고른 유형에 맞는 카테고리만 보여준다. 지출을 찾는 중에 급여 칩이
  // 섞여 있으면 고를 수 있는 것처럼 보이지만 결과는 항상 0건이다.
  const pickable = useMemo(
    () =>
      data.categories.filter(
        (c) => !c.archived && (type === 'all' || c.type === type),
      ),
    [data.categories, type],
  );

  const result = useMemo(
    () =>
      searchTransactions(data.transactions, data.categories, data.accounts, {
        query,
        type: type === 'all' ? undefined : type,
        categoryIds,
        from: startOf(period),
      }),
    [data, query, type, categoryIds, period],
  );

  /** 유형을 바꾸면 그 유형에 없는 카테고리 선택은 버린다. */
  const changeType = (next: TxType | 'all') => {
    setType(next);
    setLimit(PAGE);
    if (next === 'all') return;
    setCategoryIds((ids) =>
      ids.filter((id) => data.categories.find((c) => c.id === id)?.type === next),
    );
  };

  const toggleCategory = (id: string) => {
    setLimit(PAGE);
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const reset = () => {
    setQuery('');
    setType('all');
    setPeriod('all');
    setCategoryIds([]);
    setLimit(PAGE);
  };

  const confirmDelete = (tx: Transaction) => {
    Alert.alert('거래를 삭제할까요?', `${formatDateFull(tx.date)} · ${won(tx.amount)}`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeTransaction(tx.id) },
    ]);
  };

  // 날짜별로 묶어서 소제목을 단다. 여러 해를 넘나드는 결과라 연도까지 적는다.
  const groups = useMemo(() => {
    const out: { date: string; items: Transaction[] }[] = [];
    for (const t of result.items.slice(0, limit)) {
      const last = out[out.length - 1];
      if (last && last.date === t.date) last.items.push(t);
      else out.push({ date: t.date, items: [t] });
    }
    return out;
  }, [result.items, limit]);

  const noRecords = data.transactions.length === 0;
  const filtered = Boolean(query.trim()) || type !== 'all' || period !== 'all' || categoryIds.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* 검색어 */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setLimit(PAGE);
          }}
          placeholder="메모 · 카테고리 · 계좌 · 금액"
          placeholderTextColor={colors.textFaint}
          autoFocus
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable hitSlop={8} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      <Segmented
        style={{ marginTop: spacing.md }}
        value={type}
        onChange={changeType}
        options={[
          { value: 'all' as const, label: '전체' },
          { value: 'expense' as const, label: '지출', color: colors.down },
          { value: 'income' as const, label: '수입', color: colors.up },
        ]}
      />

      {/* 기간 */}
      <View style={styles.chipWrap}>
        {PERIODS.map((p) => (
          <Chip
            key={p.value}
            label={p.label}
            active={period === p.value}
            onPress={() => {
              setPeriod(p.value);
              setLimit(PAGE);
            }}
          />
        ))}
      </View>

      {/* 카테고리는 개수가 많아 접어둔다. 고른 게 있으면 몇 개인지 붙여준다. */}
      <Pressable
        onPress={() => setOpenCategories((v) => !v)}
        style={({ pressed }) => [styles.disclosure, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.disclosureText}>
          카테고리{categoryIds.length ? ` ${categoryIds.length}개 선택` : ''}
        </Text>
        <Ionicons
          name={openCategories ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textFaint}
        />
      </Pressable>
      {openCategories ? (
        <View style={styles.chipWrap}>
          {pickable.map((c) => (
            <Chip
              key={c.id}
              label={`${c.emoji} ${c.name}`}
              active={categoryIds.includes(c.id)}
              onPress={() => toggleCategory(c.id)}
            />
          ))}
        </View>
      ) : null}

      {/* 0건일 때는 빈 화면이 같은 버튼을 크게 내주므로 여기서는 감춘다. */}
      {filtered && result.count > 0 ? (
        <Pressable onPress={reset} hitSlop={8} style={styles.reset}>
          <Ionicons name="refresh" size={14} color={colors.textMuted} />
          <Text style={styles.resetText}>조건 지우기</Text>
        </Pressable>
      ) : null}

      {/* 합계 먼저, 목록은 그 다음. 0건이면 0원만 세 번 나오니 접는다. */}
      {result.count > 0 ? (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>건수</Text>
              <Text style={styles.summaryValue}>{result.count.toLocaleString('ko-KR')}건</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>지출</Text>
              <Text style={[styles.summaryValue, { color: colors.down }]}>
                {shortWon(result.expense)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>수입</Text>
              <Text style={[styles.summaryValue, { color: colors.up }]}>
                {shortWon(result.income)}
              </Text>
            </View>
          </View>
          {result.byMonth.length > 1 ? (
            <Text style={styles.average}>
              {result.byMonth.length}개월 · 월평균 지출{' '}
              {shortWon(Math.round(result.expense / result.byMonth.length))}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {/* 월별 합계: 한 달만 나온 결과에는 같은 숫자가 두 번 나오므로 생략한다. */}
      {result.byMonth.length > 1 ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>월별</Text>
          <Card style={{ padding: 0 }}>
            {result.byMonth.map((m, i) => (
              <View key={m.month} style={[styles.monthRow, i > 0 && styles.rowBorder]}>
                <Text style={styles.monthName}>{formatMonth(m.month)}</Text>
                <Text style={styles.monthCount}>{m.count}건</Text>
                <View style={styles.monthAmounts}>
                  {m.expense > 0 ? (
                    <Text style={[styles.monthAmount, { color: colors.down }]}>
                      -{won(m.expense)}
                    </Text>
                  ) : null}
                  {m.income > 0 ? (
                    <Text style={[styles.monthAmount, { color: colors.up }]}>
                      +{won(m.income)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {/* 결과 목록 */}
      {result.count === 0 ? (
        noRecords ? (
          <EmptyState
            emoji="🧾"
            title="아직 기록이 없어요"
            description={'수입과 지출을 먼저 기록하면\n여기서 찾아볼 수 있어요.'}
            actionTitle="거래 입력하기"
            onAction={() => router.push('/transaction/edit')}
          />
        ) : (
          <EmptyState
            emoji="🔍"
            title="찾는 내역이 없어요"
            description={'검색어를 줄이거나 기간을 넓혀보세요.\n카테고리 이름·금액으로도 찾을 수 있어요.'}
            actionTitle="조건 지우기"
            onAction={reset}
          />
        )
      ) : (
        <>
          <Text style={styles.sectionTitle}>내역</Text>
          {groups.map((group) => (
            <View key={group.date} style={{ marginBottom: spacing.md }}>
              <Text style={styles.dateLabel}>{formatDateFull(group.date)}</Text>
              <Card style={{ padding: 0 }}>
                {group.items.map((tx, i) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    divider={i > 0}
                    onPress={() => router.push(`/transaction/edit?id=${tx.id}`)}
                    onLongPress={() => confirmDelete(tx)}
                  />
                ))}
              </Card>
            </View>
          ))}
          {result.count > limit ? (
            <Pressable
              onPress={() => setLimit((n) => n + PAGE)}
              style={({ pressed }) => [styles.more, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.moreText}>
                {(result.count - limit).toLocaleString('ko-KR')}건 더 보기
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.hint}>내역을 길게 누르면 삭제할 수 있어요.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

/** 눌러서 켜고 끄는 칩. 기간은 하나만, 카테고리는 여러 개 고를 수 있다. */
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 60 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: font.body, paddingVertical: 12 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: font.small, fontWeight: '500' },
  chipTextActive: { color: colors.text, fontWeight: '700' },

  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  disclosureText: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },

  reset: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  resetText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600' },

  summaryTop: { flexDirection: 'row' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { color: colors.textFaint, fontSize: font.tiny },
  summaryValue: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  average: {
    color: colors.textMuted,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  dateLabel: { color: colors.textFaint, fontSize: font.tiny, marginBottom: 6, marginLeft: 2 },

  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  monthName: { color: colors.text, fontSize: font.small, fontWeight: '600', width: 92 },
  monthCount: { color: colors.textFaint, fontSize: font.tiny, flex: 1 },
  monthAmounts: { alignItems: 'flex-end' },
  monthAmount: { fontSize: font.small, fontWeight: '700' },

  more: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moreText: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  hint: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.sm },
});
