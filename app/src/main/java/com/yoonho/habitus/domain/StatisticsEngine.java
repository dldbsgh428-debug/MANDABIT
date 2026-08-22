package com.yoonho.habitus.domain;

import com.yoonho.habitus.model.Capital;
import com.yoonho.habitus.model.Routine;
import com.yoonho.habitus.model.ScheduleItem;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class StatisticsEngine {
    public GrowthStats calculate(List<ScheduleItem> schedules, List<Routine> routines,
                                 LocalDate start, LocalDate end) {
        GrowthStats stats = new GrowthStats(start, end);
        stats.totalDays = (int) ChronoUnit.DAYS.between(start, end) + 1;
        Set<String> activeDates = new HashSet<>();

        for (ScheduleItem item : schedules) {
            LocalDate date = parseDate(item.date);
            if (date == null || date.isBefore(start) || date.isAfter(end)) continue;
            stats.plannedCount++;
            if (!item.completed) continue;
            stats.completedCount++;
            stats.totalMinutes += item.durationMinutes;
            add(stats, item.primaryCapital, item.durationMinutes);
            for (Capital secondary : item.secondaryCapitals) {
                add(stats, secondary, Math.max(1, item.durationMinutes / 4));
            }
            activeDates.add(item.date);
        }

        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            for (Routine routine : routines) {
                if (!routine.isActiveOn(cursor)) continue;
                try {
                    if (cursor.isBefore(LocalDate.parse(routine.createdDate))) continue;
                } catch (Exception ignored) { }
                stats.plannedCount++;
                if (routine.isCompletedOn(cursor)) {
                    stats.completedCount++;
                    stats.totalMinutes += routine.durationMinutes;
                    add(stats, routine.capital, routine.durationMinutes);
                    activeDates.add(cursor.toString());
                }
            }
            cursor = cursor.plusDays(1);
        }

        stats.activeDays = activeDates.size();
        stats.balanceScore = balanceScore(stats);
        return stats;
    }

    private void add(GrowthStats stats, Capital capital, int amount) {
        stats.minutes.put(capital, stats.minutes.get(capital) + amount);
    }

    private int balanceScore(GrowthStats stats) {
        int max = 0;
        int sum = 0;
        for (int value : stats.minutes.values()) {
            max = Math.max(max, value);
            sum += value;
        }
        if (sum == 0 || max == 0) return 0;
        float normalizedSum = 0f;
        for (int value : stats.minutes.values()) normalizedSum += value / (float) max;
        return Math.round(normalizedSum / Capital.values().length * 100f);
    }

    private LocalDate parseDate(String raw) {
        try { return LocalDate.parse(raw); }
        catch (Exception ignored) { return null; }
    }
}
