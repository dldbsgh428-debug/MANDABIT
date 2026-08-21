/** 설정 탭: 목표 설정, 카테고리 관리, 백업/복원, 초기화. */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../src/components/Typo';

import { Card, SectionHeader, ToggleRow } from '../../src/components/ui';
import { exportBackup, importBackup } from '../../src/lib/backup';
import { formatDateFull } from '../../src/lib/date';
import { shortWon } from '../../src/lib/money';
import { useStore } from '../../src/store/StoreProvider';
import { colors, font, spacing } from '../../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { data, updateSettings, replaceAll, resetAll } = useStore();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const result = await exportBackup(data);
      if (!result.shared) {
        Alert.alert('백업 파일을 저장했어요', `파일 위치:\n${result.uri}`);
      }
    } catch (e) {
      Alert.alert('백업 실패', e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    // 복원은 기존 데이터를 통째로 덮어쓰므로 반드시 한 번 확인한다.
    Alert.alert(
      '백업 파일로 복원할까요?',
      '현재 앱에 있는 계좌·거래·설정이 모두 백업 파일의 내용으로 바뀝니다. 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '파일 선택',
          onPress: async () => {
            setBusy(true);
            try {
              const restored = await importBackup();
              if (!restored) return; // 사용자가 선택을 취소한 경우
              replaceAll(restored);
              Alert.alert(
                '복원 완료',
                `계좌 ${restored.accounts.length}개, 거래 ${restored.transactions.length}건을 불러왔어요.`,
              );
            } catch (e) {
              Alert.alert('복원 실패', e instanceof Error ? e.message : '파일을 읽을 수 없습니다.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleReset = () => {
    Alert.alert('모든 데이터를 지울까요?', '계좌, 거래, 설정이 모두 삭제됩니다. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '전부 삭제',
        style: 'destructive',
        onPress: () =>
          // 실수로 눌렀을 때를 대비해 한 번 더 확인한다. 백업 없이 지우면 복구가 불가능하다.
          Alert.alert('정말 삭제할까요?', '백업을 먼저 내보내는 것을 권장합니다.', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: () => resetAll() },
          ]),
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="목표" />
      <Card style={{ padding: 0 }}>
        <Row
          icon="flag-outline"
          label="목표 금액"
          value={shortWon(data.settings.goalAmount)}
          onPress={() => router.push('/goal')}
        />
        <Row
          icon="cash-outline"
          label="월 저축 목표"
          value={
            data.settings.monthlySavingTarget > 0
              ? shortWon(data.settings.monthlySavingTarget)
              : '미설정'
          }
          onPress={() => router.push('/goal')}
          border
        />
        <Row
          icon="calendar-outline"
          label="목표 시한"
          value={data.settings.goalDeadline ? formatDateFull(data.settings.goalDeadline) : '미설정'}
          onPress={() => router.push('/goal')}
          border
        />
        <Row
          icon="play-outline"
          label="프로젝트 시작일"
          value={formatDateFull(data.settings.startDate)}
          onPress={() => router.push('/goal')}
          border
        />
      </Card>

      <SectionHeader title="표시" />
      <Card>
        <ToggleRow
          label="추세선 표시"
          hint="현재 저축 속도로 순자산이 어디까지 갈지 점선으로 보여줍니다."
          value={data.settings.showForecastLine}
          onChange={(v) => updateSettings({ showForecastLine: v })}
        />
        <ToggleRow
          label="예상 잔액 증가"
          hint="금리·월 납입액을 넣은 계좌에 마지막 기록 이후의 이자와 납입금을 더해 보여줍니다. 실제 잔액을 기록하면 그 값이 새 기준이 됩니다."
          value={data.settings.projectBalances}
          onChange={(v) => updateSettings({ projectBalances: v })}
        />
        <ToggleRow
          label="고정지출 자동 기록"
          hint="결제일이 지난 고정지출을 앱을 열 때 알아서 가계부에 넣습니다. 그 달에 같은 카테고리 지출이 이미 있으면 넣지 않고 기다립니다."
          value={data.settings.autoRecurring}
          onChange={(v) => updateSettings({ autoRecurring: v })}
        />
      </Card>

      <SectionHeader title="분류" />
      <Card style={{ padding: 0 }}>
        <Row
          icon="pricetags-outline"
          label="카테고리 · 예산 관리"
          value={`${data.categories.filter((c) => !c.archived).length}개`}
          onPress={() => router.push('/category/manage')}
        />
        <Row
          icon="repeat-outline"
          label="고정지출 관리"
          value={`${data.recurring.filter((r) => r.active).length}개`}
          onPress={() => router.push('/recurring/manage')}
          border
        />
      </Card>

      <SectionHeader title="데이터" />
      <Card style={{ padding: 0 }}>
        <Row
          icon="download-outline"
          label="백업 내보내기"
          value="JSON 파일"
          onPress={handleExport}
          disabled={busy}
        />
        <Row
          icon="cloud-upload-outline"
          label="백업 복원하기"
          value=""
          onPress={handleImport}
          disabled={busy}
          border
        />
      </Card>
      <Text style={styles.note}>
        데이터는 이 기기 안에만 저장됩니다. 앱을 지우거나 기기를 바꾸면 사라지니, 정기적으로 백업을
        내보내 두세요.
      </Text>

      <Card style={{ padding: 0, marginTop: spacing.xl }}>
        <Row
          icon="trash-outline"
          label="모든 데이터 삭제"
          value=""
          onPress={handleReset}
          danger
        />
      </Card>

      <View style={styles.statsBox}>
        <Text style={styles.statsText}>
          계좌 {data.accounts.length}개 · 잔액 기록 {data.snapshots.length}건 · 거래{' '}
          {data.transactions.length}건
        </Text>
        <Text style={styles.version}>HABITUS v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  border,
  danger,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  border?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        border && styles.rowBorder,
        pressed && { backgroundColor: colors.surfaceAlt },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={icon} size={19} color={danger ? colors.down : colors.textMuted} />
      <Text style={[styles.rowLabel, danger && { color: colors.down }]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '500' },
  rowValue: { color: colors.textMuted, fontSize: font.small },

  note: { color: colors.textFaint, fontSize: font.tiny, lineHeight: 18, marginTop: spacing.md },

  statsBox: { alignItems: 'center', marginTop: spacing.xxl, gap: 4 },
  statsText: { color: colors.textFaint, fontSize: font.tiny },
  version: { color: colors.textFaint, fontSize: font.tiny },
});
