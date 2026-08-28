package com.yoonho.mandabit;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class MandabitBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        MandabitAlarmScheduler.rescheduleAll(context.getApplicationContext());
    }
}
