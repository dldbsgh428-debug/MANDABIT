package com.yoonho.mandabit.data;

import com.yoonho.mandabit.model.Routine;
import com.yoonho.mandabit.model.ScheduleItem;
import com.yoonho.mandabit.model.UserProfile;

import org.json.JSONException;

import java.util.List;

/** Storage boundary: a cloud-backed implementation can replace the local one later. */
public interface MandabitRepository {
    List<ScheduleItem> schedules();
    void saveSchedules(List<ScheduleItem> items);
    List<Routine> routines();
    void saveRoutines(List<Routine> routines);
    UserProfile profile();
    void saveProfile(UserProfile profile);
    String exportBackup() throws JSONException;
    void importBackup(String rawJson) throws JSONException;
}
