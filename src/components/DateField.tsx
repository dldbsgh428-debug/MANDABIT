/**
 * 날짜 입력 필드.
 *
 * 네이티브 날짜 선택기를 띄우고, 그 옆에 '어제/오늘' 같은 빠른 버튼을 둔다.
 * 가계부는 며칠 전 지출을 몰아서 입력하는 경우가 많아서
 * 한 번 탭으로 최근 날짜를 고를 수 있는 게 실제로 더 빠르다.
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, formatDateFull, today } from '../lib/date';
import { colors, font, radius, spacing } from '../theme';
import type { ISODate } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function DateField({
  value,
  onChange,
  quickPicks = true,
  future = false,
}: {
  value: ISODate;
  onChange: (date: ISODate) => void;
  quickPicks?: boolean;
  /**
   * 미래 날짜를 고르는 필드인지. 목표 시한처럼 앞날을 정하는 곳에 쓴다.
   * 기본값(false)은 거래·잔액 기록처럼 지나간 날짜만 허용한다.
   */
  future?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const now = today();

  const picks: { label: string; date: ISODate }[] = [
    { label: '오늘', date: now },
    { label: '어제', date: addDays(now, -1) },
    { label: '2일 전', date: addDays(now, -2) },
  ];

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={styles.fieldText}>{formatDateFull(value)}</Text>
        <Text style={styles.fieldHint}>변경</Text>
      </Pressable>

      {quickPicks ? (
        <View style={styles.quickRow}>
          {picks.map((p) => {
            const active = p.date === value;
            return (
              <Pressable
                key={p.label}
                onPress={() => onChange(p.date)}
                style={[styles.quickChip, active && styles.quickChipActive]}
              >
                <Text style={[styles.quickText, active && styles.quickTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {open ? (
        <DateTimePicker
          value={fromISO(value)}
          mode="date"
          // iOS는 인라인 스피너, 안드로이드는 기본 다이얼로그가 자연스럽다.
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          // 지난 일을 기록하는 필드는 미래를, 앞날을 정하는 필드는 과거를 막는다.
          maximumDate={future ? undefined : new Date()}
          minimumDate={future ? new Date() : undefined}
          onChange={(event, selected) => {
            // 안드로이드는 선택/취소 후 스스로 닫히지 않으므로 직접 닫는다.
            if (Platform.OS === 'android') setOpen(false);
            if (event.type === 'dismissed') return;
            if (selected) onChange(toISO(selected));
          }}
        />
      ) : null}

      {open && Platform.OS === 'ios' ? (
        <Pressable onPress={() => setOpen(false)} style={styles.doneButton}>
          <Text style={styles.doneText}>확인</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  fieldText: { color: colors.text, fontSize: font.body, fontWeight: '500' },
  fieldHint: { color: colors.primary, fontSize: font.small, fontWeight: '600' },

  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  quickText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600' },
  quickTextActive: { color: colors.text },

  doneButton: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  doneText: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
});
