package com.yoonho.mandabit.model;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public final class Routine {
    public String id;
    public String title;
    public Capital capital;
    public String frequency;
    public int durationMinutes;
    public String createdDate;
    public final Set<String> completedDates = new HashSet<>();

    public Routine(String title, Capital capital, String frequency, int durationMinutes) {
        this.id = UUID.randomUUID().toString();
        this.title = title;
        this.capital = capital;
        this.frequency = frequency;
        this.durationMinutes = durationMinutes;
        this.createdDate = LocalDate.now().toString();
    }

    public boolean isActiveOn(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        if ("평일".equals(frequency)) return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY;
        if ("주말".equals(frequency)) return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
        return true;
    }

    public boolean isCompletedOn(LocalDate date) {
        return completedDates.contains(date.toString());
    }

    public JSONObject toJson() throws JSONException {
        JSONObject object = new JSONObject();
        object.put("id", id);
        object.put("title", title);
        object.put("capital", capital.key());
        object.put("frequency", frequency);
        object.put("durationMinutes", durationMinutes);
        object.put("createdDate", createdDate);
        JSONArray dates = new JSONArray();
        for (String date : completedDates) dates.put(date);
        object.put("completedDates", dates);
        return object;
    }

    public static Routine fromJson(JSONObject object) throws JSONException {
        Routine routine = new Routine(
                object.optString("title", "루틴"),
                Capital.fromKey(object.optString("capital")),
                object.optString("frequency", "매일"),
                object.optInt("durationMinutes", 15)
        );
        routine.id = object.optString("id", routine.id);
        routine.createdDate = object.optString("createdDate", routine.createdDate);
        JSONArray dates = object.optJSONArray("completedDates");
        if (dates != null) {
            for (int i = 0; i < dates.length(); i++) routine.completedDates.add(dates.optString(i));
        }
        return routine;
    }
}
