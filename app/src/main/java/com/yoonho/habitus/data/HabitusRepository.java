package com.yoonho.habitus.data;

import com.yoonho.habitus.model.Routine;
import com.yoonho.habitus.model.ScheduleItem;
import com.yoonho.habitus.model.UserProfile;

import org.json.JSONException;

import java.util.List;

/** Storage boundary: a cloud-backed implementation can replace the local one later. */
public interface HabitusRepository {
    List<ScheduleItem> schedules();
    void saveSchedules(List<ScheduleItem> items);
    List<Routine> routines();
    void saveRoutines(List<Routine> routines);
    UserProfile profile();
    void saveProfile(UserProfile profile);
    String exportBackup() throws JSONException;
    void importBackup(String rawJson) throws JSONException;
}
