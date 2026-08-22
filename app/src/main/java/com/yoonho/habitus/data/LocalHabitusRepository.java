package com.yoonho.habitus.data;

import android.content.Context;
import android.content.SharedPreferences;

import com.yoonho.habitus.model.Routine;
import com.yoonho.habitus.model.ScheduleItem;
import com.yoonho.habitus.model.UserProfile;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public final class LocalHabitusRepository implements HabitusRepository {
    private static final String STORE = "habitus_private_store";
    private static final String KEY_SCHEDULES = "schedules";
    private static final String KEY_ROUTINES = "routines";
    private static final String KEY_PROFILE = "profile";
    private final SharedPreferences preferences;

    public LocalHabitusRepository(Context context) {
        preferences = context.getSharedPreferences(STORE, Context.MODE_PRIVATE);
        if (!preferences.contains(KEY_PROFILE)) saveProfile(new UserProfile());
    }

    @Override
    public List<ScheduleItem> schedules() {
        List<ScheduleItem> result = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(preferences.getString(KEY_SCHEDULES, "[]"));
            for (int i = 0; i < array.length(); i++) result.add(ScheduleItem.fromJson(array.getJSONObject(i)));
        } catch (JSONException ignored) {
            // A damaged record never prevents the rest of the offline app from opening.
        }
        return result;
    }

    @Override
    public void saveSchedules(List<ScheduleItem> items) {
        JSONArray array = new JSONArray();
        try {
            for (ScheduleItem item : items) array.put(item.toJson());
            preferences.edit().putString(KEY_SCHEDULES, array.toString()).apply();
        } catch (JSONException ignored) { }
    }

    @Override
    public List<Routine> routines() {
        List<Routine> result = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(preferences.getString(KEY_ROUTINES, "[]"));
            for (int i = 0; i < array.length(); i++) result.add(Routine.fromJson(array.getJSONObject(i)));
        } catch (JSONException ignored) { }
        return result;
    }

    @Override
    public void saveRoutines(List<Routine> routines) {
        JSONArray array = new JSONArray();
        try {
            for (Routine routine : routines) array.put(routine.toJson());
            preferences.edit().putString(KEY_ROUTINES, array.toString()).apply();
        } catch (JSONException ignored) { }
    }

    @Override
    public UserProfile profile() {
        try {
            return UserProfile.fromJson(new JSONObject(preferences.getString(KEY_PROFILE, "{}")));
        } catch (JSONException ignored) {
            return new UserProfile();
        }
    }

    @Override
    public void saveProfile(UserProfile profile) {
        try {
            preferences.edit().putString(KEY_PROFILE, profile.toJson().toString()).apply();
        } catch (JSONException ignored) { }
    }

    @Override
    public String exportBackup() throws JSONException {
        JSONObject root = new JSONObject();
        root.put("format", "habitus-scheduler-backup");
        root.put("version", 1);
        root.put("profile", profile().toJson());
        JSONArray scheduleArray = new JSONArray();
        for (ScheduleItem item : schedules()) scheduleArray.put(item.toJson());
        root.put("schedules", scheduleArray);
        JSONArray routineArray = new JSONArray();
        for (Routine routine : routines()) routineArray.put(routine.toJson());
        root.put("routines", routineArray);
        return root.toString(2);
    }

    @Override
    public void importBackup(String rawJson) throws JSONException {
        JSONObject root = new JSONObject(rawJson);
        if (!"habitus-scheduler-backup".equals(root.optString("format"))) {
            throw new JSONException("아비투스 백업 형식이 아니에요.");
        }
        JSONObject profile = root.getJSONObject("profile");
        JSONArray schedules = root.getJSONArray("schedules");
        JSONArray routines = root.getJSONArray("routines");

        // Parse everything before replacing current data.
        UserProfile parsedProfile = UserProfile.fromJson(profile);
        List<ScheduleItem> parsedSchedules = new ArrayList<>();
        for (int i = 0; i < schedules.length(); i++) parsedSchedules.add(ScheduleItem.fromJson(schedules.getJSONObject(i)));
        List<Routine> parsedRoutines = new ArrayList<>();
        for (int i = 0; i < routines.length(); i++) parsedRoutines.add(Routine.fromJson(routines.getJSONObject(i)));

        SharedPreferences.Editor editor = preferences.edit();
        editor.putString(KEY_PROFILE, parsedProfile.toJson().toString());
        JSONArray scheduleArray = new JSONArray();
        for (ScheduleItem item : parsedSchedules) scheduleArray.put(item.toJson());
        editor.putString(KEY_SCHEDULES, scheduleArray.toString());
        JSONArray routineArray = new JSONArray();
        for (Routine routine : parsedRoutines) routineArray.put(routine.toJson());
        editor.putString(KEY_ROUTINES, routineArray.toString());
        editor.apply();
    }
}
