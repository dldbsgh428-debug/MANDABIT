/**
 * 기기 알림을 거는 얇은 층. 언제 울릴지는 reminder.ts가 정한다.
 *
 * 이 앱은 서버가 없으므로 전부 로컬 알림이다. 백그라운드에서 도는 코드도
 * 없어서, 앱을 열 때마다 예약을 지우고 다시 잡는 방식으로 최신 상태를
 * 유지한다. 예약이 몇 개 안 되니 지웠다 다시 잡는 비용은 무시할 만하고,
 * 이렇게 해야 "이번 달은 이미 기록했으니 건너뛴다" 같은 판단이 반영된다.
 *
 * 웹에서는 아무것도 하지 않는다. 브라우저 알림은 이 앱의 쓰임새가 아니고,
 * 화면을 훑어보려고 `npm run web`을 돌렸을 때 권한 창이 뜨면 방해만 된다.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { planReminders, type ReminderPlan } from './reminder';
import type { ISODate } from '../types';

const CHANNEL_ID = 'balance-reminder';

/** 알림을 쓸 수 있는 환경인지. 웹은 제외한다. */
export const notificationsSupported = Platform.OS !== 'web';

/**
 * 앱이 켜져 있는 동안 도착한 알림도 화면에 띄운다.
 *
 * 기본값은 '앱이 떠 있으면 조용히 넘긴다'인데, 그러면 마침 앱을 보고 있던
 * 사람만 알림을 못 받는다. 배지는 올리지 않는다 — 이 앱에는 읽지 않은
 * 항목이라는 개념이 없어서 숫자가 붙으면 지울 방법이 없다.
 */
if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * 알림 권한을 확인하고, 없으면 물어본다.
 *
 * 앱을 켜자마자 묻지 않고 사용자가 알림을 켤 때만 묻는다. 무엇을 위한
 * 권한인지 모르는 상태에서 뜨는 창은 대개 거절당하고, 한 번 거절하면
 * 설정 앱에 들어가기 전에는 다시 물어볼 수 없다.
 */
export async function ensurePermission(): Promise<boolean> {
  if (!notificationsSupported) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  // iOS의 '임시 허용'도 알림은 전달된다.
  if (current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** 안드로이드는 채널이 있어야 소리·중요도를 정할 수 있다. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '잔액 기록 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** 예약된 알림을 전부 지운다. 알림을 끌 때와 다시 잡기 직전에 부른다. */
export async function cancelReminders(): Promise<void> {
  if (!notificationsSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * 잔액 기록 알림을 다시 잡는다. 이미 잡혀 있던 것은 지우고 새로 넣는다.
 *
 * 권한이 없거나 알림이 꺼져 있으면 지우기만 하고 끝낸다. 돌려주는 값은
 * 실제로 잡힌 계획이라 설정 화면에서 "다음 알림: ..."으로 그대로 보여준다.
 */
export async function scheduleReminders(opts: {
  enabled: boolean;
  day: number;
  hour: number;
  lastSnapshot?: ISODate;
  now?: Date;
}): Promise<ReminderPlan> {
  const empty: ReminderPlan = { dates: [], skippedThisMonth: false };
  if (!notificationsSupported) return empty;

  await cancelReminders();
  if (!opts.enabled) return empty;

  const granted = await Notifications.getPermissionsAsync();
  if (!granted.granted && granted.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return empty;
  }

  await ensureChannel();

  const plan = planReminders({
    day: opts.day,
    hour: opts.hour,
    now: opts.now ?? new Date(),
    lastSnapshot: opts.lastSnapshot,
  });

  for (const date of plan.dates) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '이번 달 잔액을 기록할 시간이에요',
        // 무엇을 해야 하는지까지 적는다. '확인해보세요' 같은 말은
        // 알림을 열게 하지도, 기록을 남기게 하지도 못한다.
        body: '자산 탭에서 통장 잔액만 갱신하면 순자산 그래프가 이어집니다.',
        data: { screen: '/accounts' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: CHANNEL_ID,
      },
    });
  }

  return plan;
}
