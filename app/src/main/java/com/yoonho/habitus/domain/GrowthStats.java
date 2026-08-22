package com.yoonho.habitus.domain;

import com.yoonho.habitus.model.Capital;

import java.time.LocalDate;
import java.util.EnumMap;

public final class GrowthStats {
    public final LocalDate startDate;
    public final LocalDate endDate;
    public final EnumMap<Capital, Integer> minutes = new EnumMap<>(Capital.class);
    public int completedCount;
    public int plannedCount;
    public int activeDays;
    public int totalDays;
    public int totalMinutes;
    public int balanceScore;

    public GrowthStats(LocalDate startDate, LocalDate endDate) {
        this.startDate = startDate;
        this.endDate = endDate;
        for (Capital capital : Capital.values()) minutes.put(capital, 0);
    }

    public Capital strongestCapital() {
        Capital best = Capital.PSYCHOLOGICAL;
        for (Capital capital : Capital.values()) {
            if (minutes.get(capital) > minutes.get(best)) best = capital;
        }
        return best;
    }

    public Capital lowestCapital() {
        Capital lowest = Capital.PSYCHOLOGICAL;
        for (Capital capital : Capital.values()) {
            if (minutes.get(capital) < minutes.get(lowest)) lowest = capital;
        }
        return lowest;
    }

    public int completionRate() {
        return plannedCount == 0 ? 0 : Math.round(completedCount * 100f / plannedCount);
    }
}
