package com.yoonho.habitus;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import com.yoonho.habitus.data.HabitusRepository;
import com.yoonho.habitus.data.LocalHabitusRepository;
import com.yoonho.habitus.domain.GrowthStats;
import com.yoonho.habitus.domain.RecommendationEngine;
import com.yoonho.habitus.domain.StatisticsEngine;
import com.yoonho.habitus.model.Capital;
import com.yoonho.habitus.model.Routine;
import com.yoonho.habitus.model.ScheduleItem;
import com.yoonho.habitus.model.Suggestion;
import com.yoonho.habitus.model.UserProfile;
import com.yoonho.habitus.ui.CapitalBarChartView;
import com.yoonho.habitus.ui.CapitalRingView;
import com.yoonho.habitus.ui.UiKit;

import org.json.JSONException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String[] NAV_LABELS = {"홈", "일정", "루틴", "성장", "내정보"};
    private final DateTimeFormatter koreanDate = DateTimeFormatter.ofPattern("M월 d일 EEEE", Locale.KOREAN);
    private final DateTimeFormatter shortDate = DateTimeFormatter.ofPattern("M월 d일", Locale.KOREAN);

    private HabitusRepository repository;
    private final StatisticsEngine statisticsEngine = new StatisticsEngine();
    private final RecommendationEngine recommendationEngine = new RecommendationEngine();
    private FrameLayout content;
    private LinearLayout navigation;
    private int currentTab = 0;
    private int suggestionIndex = 0;
    private boolean monthlyStats = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWindow();
        repository = new LocalHabitusRepository(this);
        if (savedInstanceState != null) {
            currentTab = savedInstanceState.getInt("currentTab", 0);
            monthlyStats = savedInstanceState.getBoolean("monthlyStats", false);
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(UiKit.CREAM);

        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        navigation = createNavigation();
        root.addView(navigation, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, UiKit.dp(this, 68)));
        setContentView(root);
        renderCurrentTab();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (currentTab != 0) {
            currentTab = 0;
            renderCurrentTab();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        outState.putInt("currentTab", currentTab);
        outState.putBoolean("monthlyStats", monthlyStats);
        super.onSaveInstanceState(outState);
    }

    private void configureWindow() {
        Window window = getWindow();
        window.setStatusBarColor(UiKit.CREAM);
        window.setNavigationBarColor(Color.WHITE);
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    private LinearLayout createNavigation() {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER);
        bar.setPadding(UiKit.dp(this, 8), UiKit.dp(this, 7), UiKit.dp(this, 8), UiKit.dp(this, 7));
        bar.setBackgroundColor(Color.WHITE);
        bar.setElevation(UiKit.dp(this, 10));
        for (int i = 0; i < NAV_LABELS.length; i++) {
            final int tab = i;
            TextView button = UiKit.title(this, NAV_LABELS[i], 13);
            button.setGravity(Gravity.CENTER);
            button.setClickable(true);
            button.setFocusable(true);
            button.setOnClickListener(v -> {
                currentTab = tab;
                renderCurrentTab();
            });
            bar.addView(button, new LinearLayout.LayoutParams(0,
                    ViewGroup.LayoutParams.MATCH_PARENT, 1f));
        }
        return bar;
    }

    private void renderCurrentTab() {
        content.removeAllViews();
        refreshNavigation();
        if (currentTab == 0) showToday();
        else if (currentTab == 1) showSchedules();
        else if (currentTab == 2) showRoutines();
        else if (currentTab == 3) showGrowth();
        else showProfile();
    }

    private void refreshNavigation() {
        for (int i = 0; i < navigation.getChildCount(); i++) {
            TextView view = (TextView) navigation.getChildAt(i);
            boolean selected = i == currentTab;
            view.setTextColor(selected ? UiKit.GREEN : UiKit.MUTED);
            view.setBackground(selected ? UiKit.roundRect(UiKit.GREEN_LIGHT, 18) : null);
        }
    }

    private LinearLayout newScreen() {
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(UiKit.dp(this, 20), UiKit.dp(this, 22), UiKit.dp(this, 20), UiKit.dp(this, 30));
        return body;
    }

    private void displayScreen(LinearLayout body) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        scroll.addView(body, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        content.addView(scroll, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void addHeader(LinearLayout body, String title, String subtitle) {
        TextView titleView = UiKit.title(this, title, 27);
        body.addView(titleView);
        TextView subtitleView = UiKit.text(this, subtitle, 14, UiKit.MUTED);
        body.addView(subtitleView, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 7, 0, 20));
    }

    private void showToday() {
        LocalDate today = LocalDate.now();
        UserProfile profile = repository.profile();
        List<ScheduleItem> schedules = repository.schedules();
        List<Routine> routines = repository.routines();
        GrowthStats week = statisticsEngine.calculate(schedules, routines, today.minusDays(6), today);
        List<Suggestion> suggestions = recommendationEngine.recommend(schedules, routines, profile, today);

        LinearLayout body = newScreen();
        addHeader(body,
                "오늘도 " + displayName(profile.nickname) + "을 쌓아볼까요?",
                today.format(koreanDate));

        LinearLayout balanceCard = UiKit.card(this);
        TextView balanceTitle = UiKit.title(this, "이번 주 자본 균형", 17);
        balanceCard.addView(balanceTitle);
        TextView balanceCaption = UiKit.text(this,
                "많이 하는 것보다, 나에게 필요한 자본을 꾸준히 채워보세요.", 13, UiKit.MUTED);
        balanceCard.addView(balanceCaption, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 6, 0, 10));

        LinearLayout balanceRow = new LinearLayout(this);
        balanceRow.setOrientation(LinearLayout.HORIZONTAL);
        balanceRow.setGravity(Gravity.CENTER_VERTICAL);
        CapitalRingView ring = new CapitalRingView(this);
        ring.setStats(week);
        balanceRow.addView(ring, new LinearLayout.LayoutParams(UiKit.dp(this, 154), UiKit.dp(this, 154)));
        LinearLayout summary = new LinearLayout(this);
        summary.setOrientation(LinearLayout.VERTICAL);
        summary.setPadding(UiKit.dp(this, 12), 0, 0, 0);
        summary.addView(statLine("완료한 성장", week.totalMinutes + "분"));
        summary.addView(statLine("실천한 날", week.activeDays + "일"));
        summary.addView(statLine("가장 많이 채운 자본",
                week.totalMinutes == 0 ? "아직 없음" : week.strongestCapital().label()));
        balanceRow.addView(summary, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        balanceCard.addView(balanceRow);
        body.addView(balanceCard, cardParams(0, 0, 0, 18));

        if (!suggestions.isEmpty()) {
            suggestionIndex = Math.floorMod(suggestionIndex, suggestions.size());
            Suggestion suggestion = suggestions.get(suggestionIndex);
            LinearLayout suggestionCard = UiKit.card(this);
            suggestionCard.setBackground(UiKit.roundRect(UiKit.GREEN, 22));

            LinearLayout suggestionTop = new LinearLayout(this);
            suggestionTop.setGravity(Gravity.CENTER_VERTICAL);
            TextView label = chip("맞춤 추천 · " + suggestion.capital.label(),
                    Color.WHITE, withAlpha(Color.WHITE, 38));
            suggestionTop.addView(label);
            TextView duration = UiKit.title(this, suggestion.durationMinutes + "분", 13);
            duration.setTextColor(Color.WHITE);
            LinearLayout.LayoutParams durationParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            durationParams.leftMargin = UiKit.dp(this, 10);
            suggestionTop.addView(duration, durationParams);
            suggestionCard.addView(suggestionTop);

            TextView suggestionTitle = UiKit.title(this, suggestion.title, 22);
            suggestionTitle.setTextColor(Color.WHITE);
            suggestionCard.addView(suggestionTitle, UiKit.margins(this,
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 16, 0, 8));
            TextView reason = UiKit.text(this, suggestion.reason, 14, Color.rgb(225, 239, 233));
            suggestionCard.addView(reason);

            LinearLayout actionRow = new LinearLayout(this);
            actionRow.setGravity(Gravity.CENTER_VERTICAL);
            TextView choose = UiKit.button(this, "선택하고 시간 정하기", false);
            choose.setBackground(UiKit.roundRect(Color.WHITE, 14));
            choose.setOnClickListener(v -> showScheduleDialog(suggestion));
            actionRow.addView(choose, new LinearLayout.LayoutParams(0,
                    ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
            TextView another = UiKit.title(this, "다른 추천", 13);
            another.setTextColor(Color.WHITE);
            another.setGravity(Gravity.CENTER);
            another.setPadding(UiKit.dp(this, 14), UiKit.dp(this, 12), 0, UiKit.dp(this, 12));
            another.setOnClickListener(v -> {
                suggestionIndex++;
                renderCurrentTab();
            });
            actionRow.addView(another);
            suggestionCard.addView(actionRow, UiKit.margins(this,
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 18, 0, 0));
            body.addView(suggestionCard, cardParams(0, 0, 0, 24));
        }

        addSectionHeader(body, "오늘 일정", "일정 추가", v -> showScheduleDialog(null));
        List<ScheduleItem> todayItems = new ArrayList<>();
        for (ScheduleItem item : schedules) if (today.toString().equals(item.date)) todayItems.add(item);
        todayItems.sort(Comparator.comparing(item -> item.time));
        if (todayItems.isEmpty()) {
            body.addView(emptyCard("아직 등록된 일정이 없어요.",
                    "추천을 선택하거나 직접 오늘의 성장 일정을 추가해 보세요.",
                    "첫 일정 추가", v -> showScheduleDialog(null)), cardParams(0, 10, 0, 0));
        } else {
            for (ScheduleItem item : todayItems) body.addView(scheduleCard(item), cardParams(0, 10, 0, 0));
        }
        displayScreen(body);
    }

    private void showSchedules() {
        List<ScheduleItem> items = repository.schedules();
        items.sort(Comparator.comparing((ScheduleItem item) -> item.date).thenComparing(item -> item.time));
        LinearLayout body = newScreen();
        addHeader(body, "일정", "시간과 자본을 함께 기록해 성장의 방향을 확인해요.");
        TextView add = UiKit.button(this, "+ 새 일정", true);
        add.setOnClickListener(v -> showScheduleDialog(null));
        body.addView(add, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 0, 0, 20));

        if (items.isEmpty()) {
            body.addView(emptyCard("일정이 비어 있어요.",
                    "일정에는 주 자본 1개와 보조 자본을 최대 2개까지 연결할 수 있어요.",
                    "일정 만들기", v -> showScheduleDialog(null)), cardParams(0, 0, 0, 0));
        } else {
            String lastDate = "";
            for (ScheduleItem item : items) {
                if (!item.date.equals(lastDate)) {
                    TextView date = UiKit.title(this, formatDate(item.date), 16);
                    body.addView(date, UiKit.margins(this,
                            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 2,
                            lastDate.isEmpty() ? 0 : 18, 0, 2));
                    lastDate = item.date;
                }
                body.addView(scheduleCard(item), cardParams(0, 9, 0, 0));
            }
        }
        displayScreen(body);
    }

    private View scheduleCard(ScheduleItem item) {
        LinearLayout card = UiKit.card(this);
        card.setPadding(UiKit.dp(this, 15), UiKit.dp(this, 14), UiKit.dp(this, 15), UiKit.dp(this, 14));
        card.setOnLongClickListener(v -> {
            confirmDeleteSchedule(item);
            return true;
        });

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        CheckBox check = new CheckBox(this);
        check.setButtonTintList(ColorStateList.valueOf(item.primaryCapital.color()));
        check.setChecked(item.completed);
        row.addView(check, new LinearLayout.LayoutParams(
                UiKit.dp(this, 42), UiKit.dp(this, 48)));

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        TextView title = UiKit.title(this, item.title, 16);
        if (item.completed) {
            title.setTextColor(UiKit.MUTED);
            title.setPaintFlags(title.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
        }
        info.addView(title);
        TextView meta = UiKit.text(this,
                item.time + " · " + item.durationMinutes + "분 · " + capitalNames(item), 13, UiKit.MUTED);
        info.addView(meta, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 5, 0, 0));
        row.addView(info, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        TextView capital = chip(item.primaryCapital.label(), item.primaryCapital.color(),
                withAlpha(item.primaryCapital.color(), 28));
        row.addView(capital);
        card.addView(row);

        check.setOnCheckedChangeListener((buttonView, isChecked) -> {
            List<ScheduleItem> all = repository.schedules();
            for (ScheduleItem candidate : all) {
                if (candidate.id.equals(item.id)) candidate.completed = isChecked;
            }
            repository.saveSchedules(all);
            renderCurrentTab();
        });
        return card;
    }

    private void showRoutines() {
        LocalDate today = LocalDate.now();
        List<Routine> routines = repository.routines();
        int active = 0;
        int done = 0;
        for (Routine routine : routines) {
            if (routine.isActiveOn(today)) {
                active++;
                if (routine.isCompletedOn(today)) done++;
            }
        }

        LinearLayout body = newScreen();
        addHeader(body, "루틴", "작은 반복이 생활의 방향과 아비투스를 만들어요.");
        LinearLayout progress = UiKit.card(this);
        TextView progressTitle = UiKit.title(this,
                active == 0 ? "오늘 실행할 루틴이 없어요" : "오늘 " + done + " / " + active + " 완료", 20);
        progress.addView(progressTitle);
        TextView progressText = UiKit.text(this,
                active == 0 ? "매일, 평일 또는 주말 루틴을 만들어 보세요."
                        : done == active ? "오늘의 반복을 모두 지켰어요. 잘했어요!"
                        : "완벽함보다 다시 이어가는 힘이 중요해요.", 14, UiKit.MUTED);
        progress.addView(progressText, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 7, 0, 0));
        body.addView(progress, cardParams(0, 0, 0, 18));

        addSectionHeader(body, "나의 루틴", "루틴 추가", v -> showRoutineDialog());
        if (routines.isEmpty()) {
            body.addView(emptyCard("아직 만든 루틴이 없어요.",
                    "감사일기, 운동, 독서, 가계부처럼 반복하고 싶은 행동을 등록해 보세요.",
                    "첫 루틴 만들기", v -> showRoutineDialog()), cardParams(0, 10, 0, 0));
        } else {
            for (Routine routine : routines) body.addView(routineCard(routine, today), cardParams(0, 10, 0, 0));
        }
        displayScreen(body);
    }

    private View routineCard(Routine routine, LocalDate today) {
        boolean activeToday = routine.isActiveOn(today);
        LinearLayout card = UiKit.card(this);
        card.setPadding(UiKit.dp(this, 15), UiKit.dp(this, 14), UiKit.dp(this, 15), UiKit.dp(this, 14));
        card.setOnLongClickListener(v -> {
            confirmDeleteRoutine(routine);
            return true;
        });
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        CheckBox check = new CheckBox(this);
        check.setButtonTintList(ColorStateList.valueOf(routine.capital.color()));
        check.setEnabled(activeToday);
        check.setChecked(routine.isCompletedOn(today));
        row.addView(check, new LinearLayout.LayoutParams(UiKit.dp(this, 42), UiKit.dp(this, 48)));
        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.addView(UiKit.title(this, routine.title, 16));
        String metaText = routine.frequency + " · " + routine.durationMinutes + "분"
                + (activeToday ? "" : " · 오늘은 쉬는 날");
        info.addView(UiKit.text(this, metaText, 13, UiKit.MUTED), UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 5, 0, 0));
        row.addView(info, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        row.addView(chip(routine.capital.label(), routine.capital.color(),
                withAlpha(routine.capital.color(), 28)));
        card.addView(row);
        check.setOnCheckedChangeListener((buttonView, checked) -> {
            List<Routine> all = repository.routines();
            for (Routine candidate : all) {
                if (!candidate.id.equals(routine.id)) continue;
                if (checked) candidate.completedDates.add(today.toString());
                else candidate.completedDates.remove(today.toString());
            }
            repository.saveRoutines(all);
            renderCurrentTab();
        });
        return card;
    }

    private void showGrowth() {
        LocalDate today = LocalDate.now();
        LocalDate start = monthlyStats ? today.withDayOfMonth(1) : today.minusDays(6);
        GrowthStats stats = statisticsEngine.calculate(repository.schedules(), repository.routines(), start, today);
        LinearLayout body = newScreen();
        addHeader(body, "성장", "일정을 점수로 몰아붙이지 않고, 삶의 균형을 읽어드려요.");

        LinearLayout toggle = new LinearLayout(this);
        toggle.setPadding(UiKit.dp(this, 4), UiKit.dp(this, 4), UiKit.dp(this, 4), UiKit.dp(this, 4));
        toggle.setBackground(UiKit.roundRect(Color.rgb(234, 235, 230), 16));
        toggle.addView(periodButton("주간", !monthlyStats), new LinearLayout.LayoutParams(0, UiKit.dp(this, 44), 1f));
        toggle.addView(periodButton("월간", monthlyStats), new LinearLayout.LayoutParams(0, UiKit.dp(this, 44), 1f));
        body.addView(toggle, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 0, 0, 18));

        LinearLayout chartCard = UiKit.card(this);
        LinearLayout chartHeader = new LinearLayout(this);
        chartHeader.setGravity(Gravity.CENTER_VERTICAL);
        TextView chartTitle = UiKit.title(this,
                monthlyStats ? today.getMonthValue() + "월 자본별 성장" : "최근 7일 자본별 성장", 18);
        chartHeader.addView(chartTitle, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        chartHeader.addView(chip("균형 " + stats.balanceScore + "점", UiKit.GREEN, UiKit.GREEN_LIGHT));
        chartCard.addView(chartHeader);
        CapitalBarChartView chart = new CapitalBarChartView(this);
        chart.setStats(stats);
        chartCard.addView(chart, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, UiKit.dp(this, 286)));
        if (stats.totalMinutes == 0) {
            TextView noData = UiKit.text(this,
                    "완료한 일정과 루틴이 생기면 자본별 시간이 여기에 표시돼요.", 13, UiKit.MUTED);
            noData.setGravity(Gravity.CENTER);
            chartCard.addView(noData);
        }
        body.addView(chartCard, cardParams(0, 0, 0, 16));

        LinearLayout metrics = new LinearLayout(this);
        metrics.setOrientation(LinearLayout.HORIZONTAL);
        metrics.addView(metricCard("실천 시간", stats.totalMinutes + "분", "완료한 활동"),
                new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        View gap = new View(this);
        metrics.addView(gap, new LinearLayout.LayoutParams(UiKit.dp(this, 10), 1));
        metrics.addView(metricCard("달성률", stats.completionRate() + "%", "계획 대비 완료"),
                new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        body.addView(metrics);

        LinearLayout insight = UiKit.card(this);
        insight.addView(UiKit.title(this, "이번 기간의 성장 해석", 17));
        String insightText;
        if (stats.totalMinutes == 0) {
            insightText = "기록이 쌓이면 강한 자본과 돌봄이 필요한 자본을 알려드릴게요.";
        } else {
            insightText = stats.strongestCapital().label() + " 자본을 가장 많이 채웠어요. "
                    + stats.lowestCapital().label() + " 자본은 다음 추천에서 조금 더 챙겨볼게요.";
        }
        insight.addView(UiKit.text(this, insightText, 14, UiKit.MUTED), UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 9, 0, 0));
        body.addView(insight, cardParams(0, 16, 0, 0));
        displayScreen(body);
    }

    private TextView periodButton(String label, boolean selected) {
        TextView view = UiKit.title(this, label, 14);
        view.setGravity(Gravity.CENTER);
        view.setTextColor(selected ? UiKit.GREEN : UiKit.MUTED);
        view.setBackground(selected ? UiKit.roundRect(Color.WHITE, 13) : null);
        view.setOnClickListener(v -> {
            monthlyStats = "월간".equals(label);
            renderCurrentTab();
        });
        return view;
    }

    private void showProfile() {
        UserProfile profile = repository.profile();
        LinearLayout body = newScreen();
        addHeader(body, "내정보", "나에게 맞는 성장 속도와 추천 방식을 설정해요.");

        LinearLayout identity = UiKit.card(this);
        identity.setGravity(Gravity.CENTER_HORIZONTAL);
        TextView avatar = UiKit.title(this, firstLetter(profile.nickname), 27);
        avatar.setGravity(Gravity.CENTER);
        avatar.setTextColor(Color.WHITE);
        avatar.setBackground(UiKit.roundRect(UiKit.GREEN, 44));
        identity.addView(avatar, new LinearLayout.LayoutParams(UiKit.dp(this, 74), UiKit.dp(this, 74)));
        TextView name = UiKit.title(this, profile.nickname, 21);
        name.setGravity(Gravity.CENTER);
        identity.addView(name, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 12, 0, 4));
        TextView mode = UiKit.text(this, "개인용 · 기기 저장", 13, UiKit.MUTED);
        mode.setGravity(Gravity.CENTER);
        identity.addView(mode);
        body.addView(identity, cardParams(0, 0, 0, 18));

        LinearLayout settings = UiKit.card(this);
        settings.addView(UiKit.title(this, "맞춤 설정", 18));
        settings.addView(settingRow("이름", profile.nickname, v -> editNickname(profile)),
                UiKit.margins(this, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 14, 0, 0));
        settings.addView(divider());
        settings.addView(settingRow("하루 성장 가능 시간", profile.dailyAvailableMinutes + "분",
                v -> chooseAvailableMinutes(profile)));
        settings.addView(divider());
        settings.addView(settingRow("추천 개수", recommendationLabel(profile.recommendationIntensity),
                v -> chooseIntensity(profile)));
        body.addView(settings, cardParams(0, 0, 0, 18));

        LinearLayout backup = UiKit.card(this);
        backup.addView(UiKit.title(this, "기록 관리", 18));
        backup.addView(UiKit.text(this,
                "기록은 현재 휴대폰에만 저장돼요. 파일로 보관해 두면 다시 복원할 수 있어요.", 13, UiKit.MUTED),
                UiKit.margins(this, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 7, 0, 14));
        LinearLayout backupActions = new LinearLayout(this);
        TextView export = UiKit.button(this, "백업 내보내기", true);
        export.setOnClickListener(v -> exportBackup());
        backupActions.addView(export, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        View buttonGap = new View(this);
        backupActions.addView(buttonGap, new LinearLayout.LayoutParams(UiKit.dp(this, 9), 1));
        TextView restore = UiKit.button(this, "백업 복원", false);
        restore.setOnClickListener(v -> showRestoreDialog());
        backupActions.addView(restore, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        backup.addView(backupActions);
        body.addView(backup, cardParams(0, 0, 0, 18));

        LinearLayout guide = UiKit.card(this);
        guide.addView(UiKit.title(this, "7가지 아비투스 자본", 18));
        TextView guideText = UiKit.text(this,
                "문화 자본은 클래식에 한정하지 않고 독서·미술·음악·영화·역사·여행·언어·음식문화까지 포함해요.",
                13, UiKit.MUTED);
        guide.addView(guideText, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 7, 0, 12));
        for (Capital capital : Capital.values()) {
            LinearLayout row = new LinearLayout(this);
            row.setGravity(Gravity.CENTER_VERTICAL);
            View dot = new View(this);
            dot.setBackground(UiKit.roundRect(capital.color(), 8));
            row.addView(dot, new LinearLayout.LayoutParams(UiKit.dp(this, 9), UiKit.dp(this, 9)));
            LinearLayout text = new LinearLayout(this);
            text.setOrientation(LinearLayout.VERTICAL);
            text.setPadding(UiKit.dp(this, 11), 0, 0, 0);
            text.addView(UiKit.title(this, capital.label() + " 자본", 14));
            text.addView(UiKit.text(this, capital.description(), 12, UiKit.MUTED));
            row.addView(text, new LinearLayout.LayoutParams(0,
                    ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
            guide.addView(row, UiKit.margins(this,
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 8, 0, 4));
        }
        body.addView(guide, cardParams(0, 0, 0, 0));
        displayScreen(body);
    }

    private void showScheduleDialog(Suggestion preset) {
        LocalDate initialDate = LocalDate.now();
        int hour = Math.min(21, Math.max(9, LocalTime.now().getHour() + 1));
        String[] selectedDate = {initialDate.toString()};
        String[] selectedTime = {String.format(Locale.ROOT, "%02d:00", hour)};

        LinearLayout form = dialogForm();
        EditText title = editText("무엇을 할까요?", InputType.TYPE_CLASS_TEXT);
        if (preset != null) title.setText(preset.title);
        form.addView(fieldLabel("일정 이름"));
        form.addView(title, fieldParams());

        LinearLayout dateTimeRow = new LinearLayout(this);
        dateTimeRow.setOrientation(LinearLayout.HORIZONTAL);
        TextView dateButton = UiKit.button(this, initialDate.format(shortDate), false);
        TextView timeButton = UiKit.button(this, selectedTime[0], false);
        dateTimeRow.addView(dateButton, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        View dateGap = new View(this);
        dateTimeRow.addView(dateGap, new LinearLayout.LayoutParams(UiKit.dp(this, 8), 1));
        dateTimeRow.addView(timeButton, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        form.addView(fieldLabel("날짜와 시간"));
        form.addView(dateTimeRow, fieldParams());
        dateButton.setOnClickListener(v -> {
            LocalDate current = LocalDate.parse(selectedDate[0]);
            new DatePickerDialog(this, (view, year, month, day) -> {
                LocalDate date = LocalDate.of(year, month + 1, day);
                selectedDate[0] = date.toString();
                dateButton.setText(date.format(shortDate));
            }, current.getYear(), current.getMonthValue() - 1, current.getDayOfMonth()).show();
        });
        timeButton.setOnClickListener(v -> {
            LocalTime current = LocalTime.parse(selectedTime[0]);
            new TimePickerDialog(this, (view, selectedHour, selectedMinute) -> {
                selectedTime[0] = String.format(Locale.ROOT, "%02d:%02d", selectedHour, selectedMinute);
                timeButton.setText(selectedTime[0]);
            }, current.getHour(), current.getMinute(), true).show();
        });

        String[] durations = {"10분", "15분", "20분", "30분", "45분", "60분", "90분"};
        Spinner duration = spinner(durations);
        int presetMinutes = preset == null ? 30 : preset.durationMinutes;
        duration.setSelection(indexOfDuration(durations, presetMinutes));
        form.addView(fieldLabel("예상 시간"));
        form.addView(duration, fieldParams());

        String[] capitalLabels = capitalLabels(false);
        Spinner primary = spinner(capitalLabels);
        if (preset != null) primary.setSelection(preset.capital.ordinal());
        form.addView(fieldLabel("주 자본"));
        form.addView(primary, fieldParams());

        String[] optionalCapitals = capitalLabels(true);
        Spinner secondaryOne = spinner(optionalCapitals);
        Spinner secondaryTwo = spinner(optionalCapitals);
        LinearLayout secondaryRow = new LinearLayout(this);
        secondaryRow.addView(secondaryOne, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        View secondaryGap = new View(this);
        secondaryRow.addView(secondaryGap, new LinearLayout.LayoutParams(UiKit.dp(this, 8), 1));
        secondaryRow.addView(secondaryTwo, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        form.addView(fieldLabel("보조 자본 · 선택 사항"));
        form.addView(secondaryRow, fieldParams());

        ScrollView scroll = new ScrollView(this);
        scroll.addView(form);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(preset == null ? "새 일정" : "추천 일정 선택")
                .setView(scroll)
                .setNegativeButton("취소", null)
                .setPositiveButton("추가", null)
                .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String value = title.getText().toString().trim();
            if (value.isEmpty()) {
                title.setError("일정 이름을 입력해 주세요.");
                return;
            }
            Capital primaryCapital = Capital.values()[primary.getSelectedItemPosition()];
            ScheduleItem item = new ScheduleItem(value, selectedDate[0], selectedTime[0],
                    parseMinutes((String) duration.getSelectedItem()), primaryCapital);
            addSecondary(item, secondaryOne.getSelectedItemPosition(), primaryCapital);
            addSecondary(item, secondaryTwo.getSelectedItemPosition(), primaryCapital);
            List<ScheduleItem> all = repository.schedules();
            all.add(item);
            repository.saveSchedules(all);
            dialog.dismiss();
            Toast.makeText(this, "일정을 추가했어요.", Toast.LENGTH_SHORT).show();
            renderCurrentTab();
        }));
        dialog.show();
    }

    private void showRoutineDialog() {
        LinearLayout form = dialogForm();
        EditText title = editText("반복할 행동", InputType.TYPE_CLASS_TEXT);
        form.addView(fieldLabel("루틴 이름"));
        form.addView(title, fieldParams());
        Spinner capital = spinner(capitalLabels(false));
        form.addView(fieldLabel("연결할 자본"));
        form.addView(capital, fieldParams());
        Spinner frequency = spinner(new String[]{"매일", "평일", "주말"});
        form.addView(fieldLabel("반복 주기"));
        form.addView(frequency, fieldParams());
        Spinner duration = spinner(new String[]{"5분", "10분", "15분", "20분", "30분", "45분", "60분"});
        duration.setSelection(2);
        form.addView(fieldLabel("예상 시간"));
        form.addView(duration, fieldParams());

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("새 루틴")
                .setView(form)
                .setNegativeButton("취소", null)
                .setPositiveButton("추가", null)
                .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String value = title.getText().toString().trim();
            if (value.isEmpty()) {
                title.setError("루틴 이름을 입력해 주세요.");
                return;
            }
            Routine routine = new Routine(value,
                    Capital.values()[capital.getSelectedItemPosition()],
                    (String) frequency.getSelectedItem(),
                    parseMinutes((String) duration.getSelectedItem()));
            List<Routine> all = repository.routines();
            all.add(routine);
            repository.saveRoutines(all);
            dialog.dismiss();
            Toast.makeText(this, "루틴을 추가했어요.", Toast.LENGTH_SHORT).show();
            renderCurrentTab();
        }));
        dialog.show();
    }

    private void confirmDeleteSchedule(ScheduleItem item) {
        new AlertDialog.Builder(this)
                .setTitle("일정을 삭제할까요?")
                .setMessage(item.title)
                .setNegativeButton("취소", null)
                .setPositiveButton("삭제", (dialog, which) -> {
                    List<ScheduleItem> all = repository.schedules();
                    all.removeIf(candidate -> candidate.id.equals(item.id));
                    repository.saveSchedules(all);
                    renderCurrentTab();
                }).show();
    }

    private void confirmDeleteRoutine(Routine routine) {
        new AlertDialog.Builder(this)
                .setTitle("루틴을 삭제할까요?")
                .setMessage("완료 기록도 함께 삭제돼요.\n" + routine.title)
                .setNegativeButton("취소", null)
                .setPositiveButton("삭제", (dialog, which) -> {
                    List<Routine> all = repository.routines();
                    all.removeIf(candidate -> candidate.id.equals(routine.id));
                    repository.saveRoutines(all);
                    renderCurrentTab();
                }).show();
    }

    private void editNickname(UserProfile profile) {
        EditText input = editText("이름", InputType.TYPE_CLASS_TEXT);
        input.setText(profile.nickname);
        input.setSelectAllOnFocus(true);
        new AlertDialog.Builder(this)
                .setTitle("이름 설정")
                .setView(input)
                .setNegativeButton("취소", null)
                .setPositiveButton("저장", (dialog, which) -> {
                    String name = input.getText().toString().trim();
                    if (!name.isEmpty()) {
                        profile.nickname = name;
                        repository.saveProfile(profile);
                        renderCurrentTab();
                    }
                }).show();
    }

    private void chooseAvailableMinutes(UserProfile profile) {
        int[] values = {10, 20, 30, 45, 60, 90};
        String[] labels = {"10분", "20분", "30분", "45분", "60분", "90분"};
        int selected = 2;
        for (int i = 0; i < values.length; i++) if (values[i] == profile.dailyAvailableMinutes) selected = i;
        final int initial = selected;
        new AlertDialog.Builder(this)
                .setTitle("하루 성장 가능 시간")
                .setSingleChoiceItems(labels, initial, (dialog, which) -> {
                    profile.dailyAvailableMinutes = values[which];
                    repository.saveProfile(profile);
                    dialog.dismiss();
                    renderCurrentTab();
                }).show();
    }

    private void chooseIntensity(UserProfile profile) {
        String[] labels = {"가볍게 · 2개", "균형 있게 · 3개"};
        int selected = profile.recommendationIntensity <= 1 ? 0 : 1;
        new AlertDialog.Builder(this)
                .setTitle("하루 추천 개수")
                .setSingleChoiceItems(labels, selected, (dialog, which) -> {
                    profile.recommendationIntensity = which == 0 ? 1 : 2;
                    repository.saveProfile(profile);
                    dialog.dismiss();
                    renderCurrentTab();
                }).show();
    }

    private void exportBackup() {
        try {
            String backup = repository.exportBackup();
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("application/json");
            share.putExtra(Intent.EXTRA_SUBJECT, "MANDABIT 백업");
            share.putExtra(Intent.EXTRA_TEXT, backup);
            startActivity(Intent.createChooser(share, "백업 보관하기"));
        } catch (JSONException exception) {
            Toast.makeText(this, "백업을 만들지 못했어요.", Toast.LENGTH_SHORT).show();
        }
    }

    private void showRestoreDialog() {
        EditText input = editText("백업 내용을 붙여넣으세요", InputType.TYPE_CLASS_TEXT
                | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        input.setMinLines(7);
        input.setGravity(Gravity.TOP);
        input.setPadding(UiKit.dp(this, 14), UiKit.dp(this, 14), UiKit.dp(this, 14), UiKit.dp(this, 14));
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null && clipboard.hasPrimaryClip()) {
            ClipData clip = clipboard.getPrimaryClip();
            if (clip != null && clip.getItemCount() > 0) {
                CharSequence text = clip.getItemAt(0).coerceToText(this);
                if (text != null && text.toString().contains("habitus-scheduler-backup")) input.setText(text);
            }
        }
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("백업 복원")
                .setMessage("현재 기록이 백업 내용으로 바뀌어요.")
                .setView(input)
                .setNegativeButton("취소", null)
                .setPositiveButton("복원", null)
                .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            try {
                repository.importBackup(input.getText().toString());
                dialog.dismiss();
                Toast.makeText(this, "기록을 복원했어요.", Toast.LENGTH_SHORT).show();
                renderCurrentTab();
            } catch (JSONException exception) {
                input.setError(exception.getMessage() == null ? "백업 내용을 확인해 주세요." : exception.getMessage());
            }
        }));
        dialog.show();
    }

    private LinearLayout statLine(String label, String value) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.addView(UiKit.text(this, label, 12, UiKit.MUTED));
        row.addView(UiKit.title(this, value, 16), UiKit.margins(this,
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 2, 0, 10));
        return row;
    }

    private LinearLayout metricCard(String label, String value, String caption) {
        LinearLayout card = UiKit.card(this);
        card.setPadding(UiKit.dp(this, 15), UiKit.dp(this, 15), UiKit.dp(this, 15), UiKit.dp(this, 15));
        card.addView(UiKit.text(this, label, 12, UiKit.MUTED));
        card.addView(UiKit.title(this, value, 22), UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 5, 0, 5));
        card.addView(UiKit.text(this, caption, 12, UiKit.MUTED));
        return card;
    }

    private LinearLayout settingRow(String label, String value, View.OnClickListener listener) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(0, UiKit.dp(this, 12), 0, UiKit.dp(this, 12));
        TextView name = UiKit.title(this, label, 14);
        row.addView(name, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        TextView selected = UiKit.text(this, value + "  ›", 14, UiKit.GREEN);
        row.addView(selected);
        row.setOnClickListener(listener);
        return row;
    }

    private View divider() {
        View divider = new View(this);
        divider.setBackgroundColor(UiKit.LINE);
        divider.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, UiKit.dp(this, 1)));
        return divider;
    }

    private LinearLayout emptyCard(String title, String text, String action, View.OnClickListener listener) {
        LinearLayout card = UiKit.card(this);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        TextView icon = UiKit.title(this, "＋", 28);
        icon.setGravity(Gravity.CENTER);
        icon.setTextColor(UiKit.GREEN);
        icon.setBackground(UiKit.roundRect(UiKit.GREEN_LIGHT, 28));
        card.addView(icon, new LinearLayout.LayoutParams(UiKit.dp(this, 52), UiKit.dp(this, 52)));
        TextView titleView = UiKit.title(this, title, 17);
        titleView.setGravity(Gravity.CENTER);
        card.addView(titleView, UiKit.margins(this,
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 12, 0, 6));
        TextView textView = UiKit.text(this, text, 13, UiKit.MUTED);
        textView.setGravity(Gravity.CENTER);
        card.addView(textView);
        TextView actionView = UiKit.button(this, action, false);
        actionView.setOnClickListener(listener);
        card.addView(actionView, UiKit.margins(this,
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 15, 0, 0));
        return card;
    }

    private void addSectionHeader(LinearLayout body, String title, String action, View.OnClickListener listener) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.addView(UiKit.title(this, title, 19), new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        TextView actionView = UiKit.title(this, action, 13);
        actionView.setTextColor(UiKit.GREEN);
        actionView.setPadding(UiKit.dp(this, 8), UiKit.dp(this, 8), 0, UiKit.dp(this, 8));
        actionView.setOnClickListener(listener);
        row.addView(actionView);
        body.addView(row);
    }

    private TextView chip(String text, int color, int background) {
        TextView view = UiKit.title(this, text, 12);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        view.setPadding(UiKit.dp(this, 10), UiKit.dp(this, 6), UiKit.dp(this, 10), UiKit.dp(this, 6));
        view.setBackground(UiKit.roundRect(background, 14));
        return view;
    }

    private LinearLayout dialogForm() {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(UiKit.dp(this, 20), UiKit.dp(this, 4), UiKit.dp(this, 20), UiKit.dp(this, 10));
        return form;
    }

    private EditText editText(String hint, int inputType) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setTextSize(15);
        input.setTextColor(UiKit.INK);
        input.setHintTextColor(Color.rgb(150, 158, 154));
        input.setInputType(inputType);
        input.setSingleLine((inputType & InputType.TYPE_TEXT_FLAG_MULTI_LINE) == 0);
        input.setPadding(UiKit.dp(this, 13), UiKit.dp(this, 10), UiKit.dp(this, 13), UiKit.dp(this, 10));
        input.setBackground(UiKit.outlined(Color.WHITE, UiKit.LINE, 12, UiKit.dp(this, 1)));
        return input;
    }

    private TextView fieldLabel(String text) {
        TextView label = UiKit.title(this, text, 12);
        label.setTextColor(UiKit.MUTED);
        label.setPadding(0, UiKit.dp(this, 10), 0, UiKit.dp(this, 7));
        return label;
    }

    private LinearLayout.LayoutParams fieldParams() {
        return UiKit.margins(this, ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT, 0, 0, 0, 2);
    }

    private Spinner spinner(String[] values) {
        Spinner spinner = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, values);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        spinner.setPadding(UiKit.dp(this, 8), UiKit.dp(this, 3), UiKit.dp(this, 8), UiKit.dp(this, 3));
        spinner.setBackground(UiKit.outlined(Color.WHITE, UiKit.LINE, 12, UiKit.dp(this, 1)));
        return spinner;
    }

    private String[] capitalLabels(boolean optional) {
        int offset = optional ? 1 : 0;
        String[] labels = new String[Capital.values().length + offset];
        if (optional) labels[0] = "선택 안 함";
        for (int i = 0; i < Capital.values().length; i++) {
            labels[i + offset] = Capital.values()[i].label() + " 자본";
        }
        return labels;
    }

    private void addSecondary(ScheduleItem item, int spinnerPosition, Capital primary) {
        if (spinnerPosition <= 0) return;
        Capital capital = Capital.values()[spinnerPosition - 1];
        if (capital != primary && !item.secondaryCapitals.contains(capital)) item.secondaryCapitals.add(capital);
    }

    private int indexOfDuration(String[] durations, int minutes) {
        for (int i = 0; i < durations.length; i++) if (parseMinutes(durations[i]) == minutes) return i;
        return 3;
    }

    private int parseMinutes(String label) {
        try { return Integer.parseInt(label.replace("분", "").trim()); }
        catch (Exception ignored) { return 30; }
    }

    private String capitalNames(ScheduleItem item) {
        StringBuilder builder = new StringBuilder(item.primaryCapital.label());
        for (Capital secondary : item.secondaryCapitals) builder.append("+").append(secondary.label());
        return builder.toString();
    }

    private String formatDate(String raw) {
        try {
            LocalDate date = LocalDate.parse(raw);
            if (date.equals(LocalDate.now())) return "오늘 · " + date.format(shortDate);
            if (date.equals(LocalDate.now().plusDays(1))) return "내일 · " + date.format(shortDate);
            return date.format(koreanDate);
        } catch (Exception ignored) {
            return raw;
        }
    }

    private String displayName(String nickname) {
        return nickname == null || nickname.trim().isEmpty() || "나".equals(nickname) ? "나" : nickname;
    }

    private String firstLetter(String nickname) {
        String safe = displayName(nickname);
        return safe.substring(0, 1);
    }

    private String recommendationLabel(int intensity) {
        return intensity <= 1 ? "가볍게 · 2개" : "균형 있게 · 3개";
    }

    private int withAlpha(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }

    private LinearLayout.LayoutParams cardParams(int left, int top, int right, int bottom) {
        return UiKit.margins(this, ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT, left, top, right, bottom);
    }
}
