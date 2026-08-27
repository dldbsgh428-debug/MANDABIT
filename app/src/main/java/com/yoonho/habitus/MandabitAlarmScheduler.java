package com.yoonho.habitus;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;

public final class MandabitAlarmScheduler {
    private static final String PREFS_NAME = "mandabit_native_alarms";
    private static final String PAYLOAD_KEY = "payload";
    private static final String REQUEST_CODES_KEY = "request_codes";
    private static final String EMPTY_PAYLOAD = "{\"schedules\":[],\"routines\":[]}";
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private MandabitAlarmScheduler() {
    }

    public static synchronized void sync(Context context, String payload) {
        String safePayload = payload == null || payload.trim().isEmpty() ? EMPTY_PAYLOAD : payload;
        preferences(context).edit().putString(PAYLOAD_KEY, safePayload).apply();
        rescheduleAll(context);
    }

    public static synchronized void rescheduleAll(Context context) {
        Context appContext = context.getApplicationContext();
        SharedPreferences prefs = preferences(appContext);
        cancelScheduled(appContext, prefs.getStringSet(REQUEST_CODES_KEY, new HashSet<>()));

        Set<String> scheduledCodes = new HashSet<>();
        String payload = prefs.getString(PAYLOAD_KEY, EMPTY_PAYLOAD);
        long now = System.currentTimeMillis();

        try {
            JSONObject root = new JSONObject(payload);
            JSONArray schedules = root.optJSONArray("schedules");
            if (schedules != null) {
                for (int index = 0; index < schedules.length(); index++) {
                    JSONObject item = schedules.optJSONObject(index);
                    if (item == null || !item.optBoolean("alarm", false)
                            || item.optBoolean("completed", false)) {
                        continue;
                    }
                    LocalDate date = parseDate(item.optString("date", ""));
                    LocalTime time = parseTime(item.optString("time", ""));
                    if (date == null || time == null) {
                        continue;
                    }
                    long triggerAt = toEpochMillis(date, time);
                    if (triggerAt <= now + 15_000L) {
                        continue;
                    }
                    String id = item.optString("id", "");
                    int requestCode = requestCode("schedule:" + id);
                    schedule(
                            appContext,
                            requestCode,
                            triggerAt,
                            item.optString("title", "일정"),
                            "schedule"
                    );
                    scheduledCodes.add(String.valueOf(requestCode));
                }
            }

            JSONArray routines = root.optJSONArray("routines");
            if (routines != null) {
                for (int index = 0; index < routines.length(); index++) {
                    JSONObject item = routines.optJSONObject(index);
                    if (item == null || !item.optBoolean("alarm", false)) {
                        continue;
                    }
                    long triggerAt = nextRoutineTrigger(item, now);
                    if (triggerAt <= 0L) {
                        continue;
                    }
                    String id = item.optString("id", "");
                    int requestCode = requestCode("routine:" + id);
                    schedule(
                            appContext,
                            requestCode,
                            triggerAt,
                            item.optString("title", "반복 루틴"),
                            "routine"
                    );
                    scheduledCodes.add(String.valueOf(requestCode));
                }
            }
        } catch (Exception ignored) {
            // Invalid web payload cancels stale alarms rather than crashing the app.
        }

        prefs.edit().putStringSet(REQUEST_CODES_KEY, scheduledCodes).apply();
    }

    private static long nextRoutineTrigger(JSONObject routine, long now) {
        LocalDate today = LocalDate.now();
        LocalDate createdDate = parseDate(routine.optString("createdDate", ""));
        if (createdDate == null) {
            createdDate = today;
        }

        Set<String> completedDates = new HashSet<>();
        JSONArray completed = routine.optJSONArray("completedDates");
        if (completed != null) {
            for (int index = 0; index < completed.length(); index++) {
                String date = completed.optString(index, "");
                if (!date.isEmpty()) {
                    completedDates.add(date);
                }
            }
        }

        for (int offset = 0; offset <= 400; offset++) {
            LocalDate date = today.plusDays(offset);
            if (date.isBefore(createdDate) || completedDates.contains(date.toString())
                    || !isRoutineActive(routine, date)) {
                continue;
            }
            LocalTime time = routineTime(routine, date);
            if (time == null) {
                continue;
            }
            long triggerAt = toEpochMillis(date, time);
            if (triggerAt > now + 15_000L) {
                return triggerAt;
            }
        }
        return -1L;
    }

    private static boolean isRoutineActive(JSONObject routine, LocalDate date) {
        String frequency = routine.optString("frequency", "매일");
        DayOfWeek day = date.getDayOfWeek();
        boolean weekend = day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;

        if ("평일".equals(frequency)) {
            return !weekend;
        }
        if ("주말".equals(frequency)) {
            return weekend;
        }
        if ("요일 선택".equals(frequency)) {
            int webDay = day.getValue() % 7;
            JSONArray customDays = routine.optJSONArray("customDays");
            if (customDays == null) {
                return false;
            }
            for (int index = 0; index < customDays.length(); index++) {
                if (customDays.optInt(index, -1) == webDay) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    private static LocalTime routineTime(JSONObject routine, LocalDate date) {
        String frequency = routine.optString("frequency", "매일");
        if ("평일·주말".equals(frequency)) {
            DayOfWeek day = date.getDayOfWeek();
            boolean weekend = day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
            return parseTime(routine.optString(weekend ? "weekendTime" : "weekdayTime", ""));
        }
        return parseTime(routine.optString("time", ""));
    }

    private static void schedule(
            Context context,
            int requestCode,
            long triggerAt,
            String title,
            String kind
    ) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        Intent intent = new Intent(context, MandabitAlarmReceiver.class);
        intent.putExtra("request_code", requestCode);
        intent.putExtra("title", title);
        intent.putExtra("kind", kind);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && !alarmManager.canScheduleExactAlarms()) {
            alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAt,
                    pendingIntent
            );
        } else {
            alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAt,
                    pendingIntent
            );
        }
    }

    private static void cancelScheduled(Context context, Set<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return;
        }
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        for (String value : new HashSet<>(codes)) {
            try {
                int requestCode = Integer.parseInt(value);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        new Intent(context, MandabitAlarmReceiver.class),
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
                );
                if (pendingIntent != null) {
                    alarmManager.cancel(pendingIntent);
                    pendingIntent.cancel();
                }
            } catch (NumberFormatException ignored) {
                // Ignore legacy or malformed request codes.
            }
        }
    }

    private static int requestCode(String key) {
        return key.hashCode() & 0x7fffffff;
    }

    private static long toEpochMillis(LocalDate date, LocalTime time) {
        return LocalDateTime.of(date, time)
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
    }

    private static LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static LocalTime parseTime(String value) {
        try {
            return LocalTime.parse(value, TIME_FORMAT);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
