package com.yoonho.habitus.model;

import java.util.Locale;

/** The seven forms of capital used by Habitus Scheduler. */
public enum Capital {
    PSYCHOLOGICAL("심리", "회복력·자기신뢰·마음의 안정", 0xFF7C6AE8),
    CULTURAL("문화", "독서·예술·영화·역사·여행·음식문화", 0xFFE18B52),
    KNOWLEDGE("지식", "학습·자격·프로젝트·깊이 있는 이해", 0xFF3E9B8F),
    PHYSICAL("신체", "운동·수면·영양·건강한 생활", 0xFFE06666),
    LANGUAGE("언어", "말하기·글쓰기·외국어·경청", 0xFF4D82C4),
    ECONOMIC("경제", "예산·저축·투자·재정적 안정", 0xFF5B9A62),
    SOCIAL("사회", "관계·협업·신뢰·네트워크", 0xFFD4A532);

    private final String label;
    private final String description;
    private final int color;

    Capital(String label, String description, int color) {
        this.label = label;
        this.description = description;
        this.color = color;
    }

    public String label() { return label; }
    public String description() { return description; }
    public int color() { return color; }
    public String key() { return name().toLowerCase(Locale.ROOT); }

    public static Capital fromKey(String key) {
        if (key == null) return PSYCHOLOGICAL;
        for (Capital capital : values()) {
            if (capital.key().equalsIgnoreCase(key) || capital.name().equalsIgnoreCase(key)) {
                return capital;
            }
        }
        return PSYCHOLOGICAL;
    }
}
