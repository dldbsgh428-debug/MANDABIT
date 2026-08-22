package com.yoonho.habitus.model;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class ScheduleItem {
    public String id;
    public String title;
    public String date;
    public String time;
    public int durationMinutes;
    public Capital primaryCapital;
    public final List<Capital> secondaryCapitals = new ArrayList<>();
    public boolean completed;

    public ScheduleItem(String title, String date, String time, int durationMinutes, Capital primaryCapital) {
        this.id = UUID.randomUUID().toString();
        this.title = title;
        this.date = date;
        this.time = time;
        this.durationMinutes = durationMinutes;
        this.primaryCapital = primaryCapital;
    }

    public JSONObject toJson() throws JSONException {
        JSONObject object = new JSONObject();
        object.put("id", id);
        object.put("title", title);
        object.put("date", date);
        object.put("time", time);
        object.put("durationMinutes", durationMinutes);
        object.put("primaryCapital", primaryCapital.key());
        object.put("completed", completed);
        JSONArray secondary = new JSONArray();
        for (Capital capital : secondaryCapitals) secondary.put(capital.key());
        object.put("secondaryCapitals", secondary);
        return object;
    }

    public static ScheduleItem fromJson(JSONObject object) throws JSONException {
        ScheduleItem item = new ScheduleItem(
                object.optString("title", "일정"),
                object.optString("date", ""),
                object.optString("time", "09:00"),
                object.optInt("durationMinutes", 30),
                Capital.fromKey(object.optString("primaryCapital"))
        );
        item.id = object.optString("id", item.id);
        item.completed = object.optBoolean("completed", false);
        JSONArray secondary = object.optJSONArray("secondaryCapitals");
        if (secondary != null) {
            for (int i = 0; i < secondary.length(); i++) {
                Capital capital = Capital.fromKey(secondary.optString(i));
                if (capital != item.primaryCapital && !item.secondaryCapitals.contains(capital)) {
                    item.secondaryCapitals.add(capital);
                }
            }
        }
        return item;
    }
}
