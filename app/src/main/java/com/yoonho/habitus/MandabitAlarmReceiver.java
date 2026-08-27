package com.yoonho.habitus;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class MandabitAlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "mandabit_schedule_alerts";

    @Override
    public void onReceive(Context context, Intent intent) {
        int requestCode = intent.getIntExtra("request_code", 0);
        String title = intent.getStringExtra("title");
        if (title == null || title.trim().isEmpty()) {
            title = "예약한 실천 시간이에요.";
        }

        NotificationManager manager = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "일정 및 루틴 알림",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("MANDABIT에서 예약한 일정과 반복 루틴을 알려드려요.");
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }

        Intent openApp = new Intent(context, WebAppActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                9000 + (requestCode % 1000),
                openApp,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);
        builder.setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("MANDABIT 시간 알림")
                .setContentText(title)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setPriority(Notification.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(contentIntent);

        manager.notify(requestCode, builder.build());
        MandabitAlarmScheduler.rescheduleAll(context.getApplicationContext());
    }
}
