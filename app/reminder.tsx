/**
 * 잔액 기록 알림 설정.
 *
 * 이 앱의 그래프와 예측은 전부 "매달 잔액을 갱신한다"는 습관 위에 서 있는데,
 * 지금껏 그 습관을 붙잡아주는 장치가 없었다. 알림 하나가 그 일을 한다.
 *
 * 화면 아래에 다음 알림 시각을 그대로 보여준다. 알림 설정은 켜놓고도
 * 정말 잡혔는지 알 방법이 없어서 대개 믿지 못하는데, 예정 시각이 눈에
 * 보이면 확인이 끝난다.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '../src/components/FormScreen';
import { Text } from '../src/components/Typo';
import { Card, ToggleRow } from '../src/components/ui';
import { ensurePermission, notificationsSupported } from '../src/lib/notifications';
import {
  LAST_DAY,
  formatHour,
  formatReminderDay,
  formatWhen,
  planReminders,
} from '../src/lib/reminder';
import { useStore } from '../src/store/StoreProvider';
import { colors, font, radius, spacing } from '../src/theme';

/** 고를 수 있는 날짜. 말일과, 월급날 근처에 맞추는 사람을 위한 며칠. */
const DAYS = [1, 5, 10, 15, 20, 25, LAST_DAY];

/** 고를 수 있는 시간. 통장을 열어볼 만한 시간대만 남겼다. */
const HOURS = [9, 12, 18, 20, 21, 22];

export default function ReminderScreen() {
  const router = useRouter();
  const { data, updateSettings } = useStore();
  const { settings } = data;

  const [enabled, setEnabled] = useState(settings.reminderEnabled);
  const [day, setDay] = useState(settings.reminderDay);
  const [hour, setHour] = useState(settings.reminderHour);

  const lastSnapshot = useMemo(() => {
    let latest: string | undefined;
    for (const s of data.snapshots) {
      if (!latest || s.date > latest) latest = s.date;
    }
    return latest;
  }, [data.snapshots]);

  // 실제 예약과 같은 함수로 계산해서, 화면에 적힌 시각과 울리는 시각이 어긋나지 않게 한다.
  const plan = useMemo(
    () => planReminders({ day, hour, now: new Date(), lastSnapshot }),
    [day, hour, lastSnapshot],
  );

  /** 알림을 켤 때만 권한을 묻는다. 거절당하면 켠 것으로 두지 않는다. */
  const toggle = async (next: boolean) => {
    if (!next) {
      setEnabled(false);
      updateSettings({ reminderEnabled: false });
      return;
    }

    const granted = await ensurePermission();
    if (!granted) {
      Alert.alert(
        '알림 권한이 필요해요',
        '기기 설정에서 MOA의 알림을 허용해 주세요.',
        [
          { text: '닫기', style: 'cancel' },
          { text: '설정 열기', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    setEnabled(true);
    updateSettings({ reminderEnabled: true });
  };

  const pickDay = (next: number) => {
    setDay(next);
    updateSettings({ reminderDay: next });
  };

  const pickHour = (next: number) => {
    setHour(next);
    updateSettings({ reminderHour: next });
  };

  if (!notificationsSupported) {
    return (
      <FormScreen>
        <Card>
          <Text style={styles.note}>
            알림은 iOS·안드로이드에서만 동작합니다. 웹에서는 설정할 수 없어요.
          </Text>
        </Card>
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Card style={styles.why}>
        <Text style={styles.whyTitle}>왜 필요한가요</Text>
        <Text style={styles.whyBody}>
          순자산 그래프와 예상 달성 시점은 매달 남긴 잔액 기록으로 그려집니다.
          한 달을 건너뛰면 그래프가 평평해지고, 실제보다 늦게 도달하는 것처럼
          보입니다. 통장 잔액을 옮겨 적는 데는 1분이면 충분해요.
        </Text>
      </Card>

      <View style={styles.toggleBox}>
        <ToggleRow
          label="잔액 기록 알림"
          hint="이번 달에 이미 기록했으면 그달 알림은 울리지 않습니다."
          value={enabled}
          onChange={toggle}
        />
      </View>

      <Text style={styles.fieldLabel}>날짜</Text>
      <View style={styles.chipWrap}>
        {DAYS.map((d) => (
          <Chip
            key={d}
            label={d === LAST_DAY ? '말일' : `${d}일`}
            active={day === d}
            dimmed={!enabled}
            onPress={() => pickDay(d)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>시간</Text>
      <View style={styles.chipWrap}>
        {HOURS.map((h) => (
          <Chip
            key={h}
            label={formatHour(h)}
            active={hour === h}
            dimmed={!enabled}
            onPress={() => pickHour(h)}
          />
        ))}
      </View>

      {/* 정말 잡혔는지 눈으로 확인시켜 준다. */}
      <Card style={{ marginTop: spacing.xl }}>
        <Text style={styles.previewTitle}>
          {enabled ? '이렇게 알려드려요' : '켜면 이렇게 알려드려요'}
        </Text>
        <Text style={styles.previewLine}>
          {formatReminderDay(day)} {formatHour(hour)}
        </Text>
        {plan.skippedThisMonth ? (
          <View style={styles.skipRow}>
            <Ionicons name="checkmark-circle" size={15} color={colors.up} />
            <Text style={styles.skipText}>
              이번 달은 이미 기록해서 건너뜁니다.
            </Text>
          </View>
        ) : null}
        <View style={styles.divider} />
        <Text style={styles.previewLabel}>다음 알림</Text>
        {plan.dates.map((d) => (
          <Text key={d.toISOString()} style={styles.previewWhen}>
            {formatWhen(d)}
          </Text>
        ))}
        <Text style={styles.hint}>
          앱을 열 때마다 다시 잡습니다. 그래서 {plan.dates.length}번치를 미리
          예약해 둡니다 — 한동안 앱을 안 열어도 알림은 계속 옵니다.
        </Text>
      </Card>

      {Platform.OS === 'android' ? (
        <Text style={styles.footnote}>
          Expo Go에서는 알림이 제한될 수 있습니다. 빌드해 설치한 앱에서는
          그대로 동작합니다.
        </Text>
      ) : null}

      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.done, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.doneText}>완료</Text>
      </Pressable>
    </FormScreen>
  );
}

function Chip({
  label,
  active,
  dimmed,
  onPress,
}: {
  label: string;
  active: boolean;
  /** 알림이 꺼져 있을 때. 고를 수는 있지만 지금은 안 쓰인다는 뜻으로 흐리게 둔다. */
  dimmed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive, dimmed && { opacity: 0.5 }]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  why: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  whyTitle: { color: colors.primary, fontSize: font.small, fontWeight: '700', marginBottom: 6 },
  whyBody: { color: colors.text, fontSize: font.small, lineHeight: 20 },

  toggleBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },

  fieldLabel: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  chipTextActive: { color: colors.text },

  previewTitle: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  previewLine: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginTop: 4 },
  skipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  skipText: { color: colors.up, fontSize: font.tiny, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  previewLabel: { color: colors.textFaint, fontSize: font.tiny, marginBottom: 4 },
  previewWhen: { color: colors.text, fontSize: font.small, fontWeight: '600', paddingVertical: 2 },
  hint: { color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.md, lineHeight: 17 },
  note: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  footnote: {
    color: colors.textFaint,
    fontSize: font.tiny,
    marginTop: spacing.lg,
    lineHeight: 17,
  },

  done: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  doneText: { color: '#FFFFFF', fontSize: font.body, fontWeight: '700' },
});
