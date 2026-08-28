package com.yoonho.mandabit.model;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

/** A local profile now; its stable id allows a cloud account to be attached later. */
public final class UserProfile {
    public String localUserId;
    public String nickname;
    public int dailyAvailableMinutes;
    public int recommendationIntensity;

    public UserProfile() {
        localUserId = UUID.randomUUID().toString();
        nickname = "나";
        dailyAvailableMinutes = 30;
        recommendationIntensity = 2;
    }

    public JSONObject toJson() throws JSONException {
        JSONObject object = new JSONObject();
        object.put("localUserId", localUserId);
        object.put("nickname", nickname);
        object.put("dailyAvailableMinutes", dailyAvailableMinutes);
        object.put("recommendationIntensity", recommendationIntensity);
        return object;
    }

    public static UserProfile fromJson(JSONObject object) {
        UserProfile profile = new UserProfile();
        profile.localUserId = object.optString("localUserId", profile.localUserId);
        profile.nickname = object.optString("nickname", "나");
        profile.dailyAvailableMinutes = object.optInt("dailyAvailableMinutes", 30);
        profile.recommendationIntensity = object.optInt("recommendationIntensity", 2);
        return profile;
    }
}
