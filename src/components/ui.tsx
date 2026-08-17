/** 앱 전체에서 재사용하는 기본 UI 조각들. */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, font, radius, spacing } from '../theme';
import { formatAmountInput } from '../lib/money';

/* ------------------------------------------------------------------ 텍스트 */

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

/* -------------------------------------------------------------------- 카드 */

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/** 카드 안에서 항목을 구분하는 얇은 선. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

/** 화면 안의 섹션 제목 + 우측 액션. */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------- 버튼 */

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.downSoft : 'transparent';
  const fg =
    variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? colors.down : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === 'ghost' && styles.buttonGhost,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

/** 좌우로 선택하는 세그먼트 컨트롤. 자산/부채, 수입/지출 전환에 쓴다. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              active && { backgroundColor: opt.color ?? colors.primary },
            ]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 가로로 스크롤되는 칩 목록. 카테고리·계좌 선택에 쓴다. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------- 입력 */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[styles.input, multiline && styles.inputMultiline]}
    />
  );
}

/**
 * 금액 입력창. 타이핑하는 동안 콤마를 붙여 보여주고,
 * 바깥에는 숫자 문자열(콤마 없음)을 그대로 넘긴다.
 */
export function AmountInput({
  value,
  onChangeText,
  placeholder = '0',
  suffix = '원',
}: {
  value: string;
  onChangeText: (digits: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <View style={styles.amountWrap}>
      <TextInput
        value={formatAmountInput(value)}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType="number-pad"
        style={styles.amountInput}
      />
      <Text style={styles.amountSuffix}>{suffix}</Text>
    </View>
  );
}

/** 켜고 끄는 행. RN Switch 대신 눌러서 토글하는 행으로 만들어 터치 영역을 넓혔다. */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      </View>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </View>
    </Pressable>
  );
}

/* --------------------------------------------------------------- 상태 표시 */

/** 데이터가 없을 때 보여주는 안내. 다음에 할 행동을 알려준다. */
export function EmptyState({
  emoji,
  title,
  description,
  actionTitle,
  onAction,
}: {
  emoji: string;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{description}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/** 증감을 색과 부호로 보여주는 배지. */
export function DeltaBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  const positive = value > 0;
  const zero = value === 0;
  const color = zero ? colors.textMuted : positive ? colors.up : colors.down;
  const bg = zero ? colors.surfaceAlt : positive ? colors.upSoft : colors.downSoft;
  const sign = zero ? '' : positive ? '▲ ' : '▼ ';

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>
        {sign}
        {Math.abs(value).toLocaleString('ko-KR')}
        {suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.h1, fontWeight: '700' },
  subtitle: { color: colors.text, fontSize: font.h2, fontWeight: '600' },
  label: { color: colors.text, fontSize: font.body, fontWeight: '500' },
  muted: { color: colors.textMuted, fontSize: font.small },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { opacity: 0.7 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  sectionAction: { color: colors.primary, fontSize: font.small, fontWeight: '600' },

  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: font.body, fontWeight: '700' },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segment: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
  segmentText: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  segmentTextActive: { color: '#FFFFFF' },

  chipRow: { gap: spacing.sm, paddingVertical: 2 },
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

  field: { gap: spacing.sm, marginBottom: spacing.lg },
  fieldLabel: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  fieldHint: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },

  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.body,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },

  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: font.h1,
    fontWeight: '700',
    paddingVertical: 12,
    textAlign: 'right',
  },
  amountSuffix: { color: colors.textMuted, fontSize: font.h3, marginLeft: spacing.sm },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleLabel: { color: colors.text, fontSize: font.body, fontWeight: '500' },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleTrackOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.textFaint },
  toggleKnobOn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginBottom: spacing.xs },
  emptyDesc: { color: colors.textMuted, fontSize: font.small, textAlign: 'center', lineHeight: 20 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: font.tiny, fontWeight: '700' },
});
