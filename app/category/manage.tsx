/** 카테고리 관리: 추가·수정·숨기기와 월 예산 설정. */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '../../src/components/FormScreen';
import {
  AmountInput,
  Button,
  Card,
  Field,
  Input,
  Segmented,
} from '../../src/components/ui';
import { parseAmount, won } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../../src/theme';
import type { Category, TxType } from '../../src/types';

/** 카테고리 이모지 후보. 직접 입력 대신 골라 쓰게 해서 오타를 막는다. */
const EMOJI_CHOICES = [
  '🍚', '☕', '🏠', '🚇', '📱', '🔁', '💊', '🛍️', '🎬', '💐',
  '🛡️', '📚', '🎮', '✈️', '🐶', '🎁', '💼', '📈', '🛠️', '➕',
];

export default function CategoryManageScreen() {
  const { data, addCategory, updateCategory, removeCategory } = useStore();
  const [tab, setTab] = useState<TxType>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(
    () => data.categories.filter((c) => c.type === tab),
    [data.categories, tab],
  );
  const active = list.filter((c) => !c.archived);
  const archived = list.filter((c) => c.archived);

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  return (
    <FormScreen>
      <Segmented
        value={tab}
        onChange={(v) => {
          setTab(v);
          closeForm();
        }}
        options={[
          { value: 'expense', label: '지출', color: colors.down },
          { value: 'income', label: '수입', color: colors.up },
        ]}
      />

      {creating || editing ? (
        <CategoryForm
          key={editing?.id ?? 'new'}
          type={tab}
          category={editing}
          onCancel={closeForm}
          onSubmit={(payload) => {
            if (editing) updateCategory(editing.id, payload);
            else addCategory({ ...payload, type: tab });
            closeForm();
          }}
        />
      ) : (
        <Button
          title="카테고리 추가"
          variant="ghost"
          onPress={() => setCreating(true)}
          style={{ marginTop: spacing.lg }}
        />
      )}

      <Text style={styles.sectionTitle}>사용 중 {active.length}개</Text>
      <Card style={{ padding: 0 }}>
        {active.map((c, i) => (
          <View key={c.id} style={[styles.row, i > 0 && styles.rowBorder]}>
            <Text style={styles.rowEmoji}>{c.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{c.name}</Text>
              {c.type === 'expense' ? (
                <Text style={styles.rowBudget}>
                  {c.budget ? `월 예산 ${won(c.budget)}` : '예산 미설정'}
                </Text>
              ) : null}
            </View>
            <Pressable hitSlop={8} onPress={() => setEditing(c)} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              hitSlop={8}
              style={styles.iconBtn}
              onPress={() =>
                Alert.alert(
                  '카테고리를 숨길까요?',
                  '이미 기록된 거래는 그대로 남고, 새 거래에서 선택 목록에만 나오지 않습니다.',
                  [
                    { text: '취소', style: 'cancel' },
                    { text: '숨기기', style: 'destructive', onPress: () => removeCategory(c.id) },
                  ],
                )
              }
            >
              <Ionicons name="eye-off-outline" size={18} color={colors.textFaint} />
            </Pressable>
          </View>
        ))}
        {active.length === 0 ? (
          <Text style={styles.empty}>사용 중인 카테고리가 없습니다.</Text>
        ) : null}
      </Card>

      {archived.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>숨긴 항목 {archived.length}개</Text>
          <Card style={{ padding: 0 }}>
            {archived.map((c, i) => (
              <View key={c.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={[styles.rowEmoji, { opacity: 0.5 }]}>{c.emoji}</Text>
                <Text style={[styles.rowName, { flex: 1, color: colors.textFaint }]}>{c.name}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => updateCategory(c.id, { archived: false })}
                  style={styles.restoreBtn}
                >
                  <Text style={styles.restoreText}>복원</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Text style={styles.note}>
        지출 카테고리에 월 예산을 넣으면 예산 탭에서 소진율을 확인할 수 있어요.
      </Text>
    </FormScreen>
  );
}

function CategoryForm({
  type,
  category,
  onSubmit,
  onCancel,
}: {
  type: TxType;
  category: Category | null;
  onSubmit: (payload: { name: string; emoji: string; budget?: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [emoji, setEmoji] = useState(category?.emoji ?? '📦');
  const [budget, setBudget] = useState(category?.budget ? String(category.budget) : '');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('카테고리 이름을 입력해 주세요');
      return;
    }
    const parsed = parseAmount(budget);
    onSubmit({ name: trimmed, emoji, budget: parsed > 0 ? parsed : undefined });
  };

  return (
    <Card style={{ marginTop: spacing.lg }}>
      <Text style={styles.formTitle}>{category ? '카테고리 수정' : '새 카테고리'}</Text>

      <Field label="이름">
        <Input value={name} onChangeText={setName} placeholder="예: 운동·헬스" />
      </Field>

      <Field label="이모지">
        <View style={styles.emojiGrid}>
          {EMOJI_CHOICES.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[styles.emojiItem, e === emoji && styles.emojiItemActive]}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      {type === 'expense' ? (
        <Field label="월 예산 (선택)" hint="0이면 예산을 설정하지 않습니다.">
          <AmountInput value={budget} onChangeText={setBudget} />
        </Field>
      ) : null}

      <Button title={category ? '수정 저장' : '추가'} onPress={submit} />
      <Button title="취소" variant="ghost" onPress={onCancel} style={{ marginTop: spacing.sm }} />
    </Card>
  );
}

const styles = StyleSheet.create({

  sectionTitle: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowEmoji: { fontSize: 20 },
  rowName: { color: colors.text, fontSize: font.body, fontWeight: '500' },
  rowBudget: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  iconBtn: { padding: 4 },
  restoreBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  restoreText: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },

  empty: { color: colors.textMuted, fontSize: font.small, padding: spacing.lg },

  formTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginBottom: spacing.lg },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiItem: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiItemActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  emojiText: { fontSize: 20 },

  note: { color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.xl, lineHeight: 18 },
});
