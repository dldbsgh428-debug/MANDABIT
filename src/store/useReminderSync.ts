/**
 * 알림 예약을 앱 상태에 맞춰 다시 잡는다.
 *
 * 백그라운드에서 도는 코드가 없으므로, 예약을 고칠 기회는 앱이 떠 있을
 * 때뿐이다. 그래서 알림 설정이나 마지막 잔액 기록이 바뀌면 곧바로 다시
 * 잡는다. 잔액을 기록하는 순간 이번 달 알림이 사라지는 것도 이 덕분이다.
 */

import { useEffect, useMemo } from 'react';

import { scheduleReminders } from '../lib/notifications';
import { useStore } from './StoreProvider';

export function useReminderSync(): void {
  const { data, ready } = useStore();
  const { reminderEnabled, reminderDay, reminderHour } = data.settings;

  // 가장 최근 잔액 기록. 이번 달 것이면 이번 달 알림은 건너뛴다.
  const lastSnapshot = useMemo(() => {
    let latest: string | undefined;
    for (const s of data.snapshots) {
      if (!latest || s.date > latest) latest = s.date;
    }
    return latest;
  }, [data.snapshots]);

  useEffect(() => {
    if (!ready) return;
    scheduleReminders({
      enabled: reminderEnabled,
      day: reminderDay,
      hour: reminderHour,
      lastSnapshot,
    }).catch((e) => console.warn('[habitus] 알림 예약 실패', e));
  }, [ready, reminderEnabled, reminderDay, reminderHour, lastSnapshot]);
}
