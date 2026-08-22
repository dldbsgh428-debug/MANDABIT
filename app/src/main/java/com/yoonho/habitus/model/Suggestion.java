package com.yoonho.habitus.model;

public final class Suggestion {
    public final String title;
    public final String reason;
    public final int durationMinutes;
    public final Capital capital;

    public Suggestion(String title, String reason, int durationMinutes, Capital capital) {
        this.title = title;
        this.reason = reason;
        this.durationMinutes = durationMinutes;
        this.capital = capital;
    }
}
