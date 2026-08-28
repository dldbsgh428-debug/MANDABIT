package com.yoonho.mandabit.domain;

import com.yoonho.mandabit.model.Capital;
import com.yoonho.mandabit.model.Routine;
import com.yoonho.mandabit.model.ScheduleItem;
import com.yoonho.mandabit.model.Suggestion;
import com.yoonho.mandabit.model.UserProfile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;

/** Offline recommendation v1. It is deterministic, explainable, and replaceable by AI later. */
public final class RecommendationEngine {
    private final EnumMap<Capital, String[][]> ideas = new EnumMap<>(Capital.class);

    public RecommendationEngine() {
        ideas.put(Capital.PSYCHOLOGICAL, new String[][]{
                {"감사일기 쓰기", "오늘 고마웠던 일 세 가지를 적어보세요", "10"},
                {"호흡 명상", "알림을 끄고 호흡에만 집중해 보세요", "10"},
                {"이번 주 돌아보기", "잘한 일과 바꾸고 싶은 일을 한 가지씩 적어보세요", "15"}
        });
        ideas.put(Capital.CULTURAL, new String[][]{
                {"작품 한 편 깊게 보기", "영화·음악·미술 중 하나를 고르고 짧은 감상을 남겨보세요", "30"},
                {"문화 산책", "익숙하지 않은 역사·음식·지역 문화를 하나 알아보세요", "20"},
                {"독서 기록", "읽고 있는 책을 읽고 인상적인 문장을 적어보세요", "20"}
        });
        ideas.put(Capital.KNOWLEDGE, new String[][]{
                {"집중 학습", "배우고 싶은 주제를 한 단원만 끝내보세요", "30"},
                {"공부 노트 정리", "오늘 배운 내용을 내 말로 다섯 줄 정리해 보세요", "20"},
                {"작은 프로젝트", "진행 중인 프로젝트의 다음 행동 하나를 완료해 보세요", "30"}
        });
        ideas.put(Capital.PHYSICAL, new String[][]{
                {"가볍게 걷기", "속도보다 몸을 깨우는 데 집중해 보세요", "20"},
                {"전신 스트레칭", "목·어깨·허리·다리를 천천히 풀어보세요", "15"},
                {"수면 준비 루틴", "잠들기 전 화면을 끄고 몸을 쉬게 해주세요", "20"}
        });
        ideas.put(Capital.LANGUAGE, new String[][]{
                {"짧은 글쓰기", "오늘 생각을 한 문단으로 또렷하게 적어보세요", "15"},
                {"외국어 소리 내기", "짧은 문장 열 개를 듣고 따라 말해보세요", "20"},
                {"경청 연습", "대화할 때 질문 하나를 더하고 끝까지 들어보세요", "15"}
        });
        ideas.put(Capital.ECONOMIC, new String[][]{
                {"오늘 지출 정리", "사용한 돈을 기록하고 필요·선택 지출로 나눠보세요", "10"},
                {"이번 주 예산 확인", "남은 예산과 예정 지출을 함께 확인해 보세요", "15"},
                {"재정 목표 점검", "저축·비상금 목표의 현재 위치를 기록해 보세요", "20"}
        });
        ideas.put(Capital.SOCIAL, new String[][]{
                {"안부 연락하기", "생각나는 사람 한 명에게 짧게 안부를 전해보세요", "10"},
                {"감사 표현하기", "도움을 준 사람에게 구체적으로 고마움을 표현해 보세요", "10"},
                {"관계 돌아보기", "이번 주에 더 챙기고 싶은 관계를 한 명 떠올려보세요", "15"}
        });
    }

    public List<Suggestion> recommend(List<ScheduleItem> schedules, List<Routine> routines,
                                      UserProfile profile, LocalDate today) {
        StatisticsEngine statistics = new StatisticsEngine();
        GrowthStats week = statistics.calculate(schedules, routines, today.minusDays(6), today);
        List<Capital> capitals = new ArrayList<>(Arrays.asList(Capital.values()));
        capitals.sort(Comparator.comparingInt(capital -> week.minutes.get(capital)));

        int count = Math.max(2, Math.min(3, profile.recommendationIntensity + 1));
        List<Suggestion> suggestions = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Capital capital = capitals.get(i);
            String[][] bank = ideas.get(capital);
            String[] idea = bank[(today.getDayOfYear() + i) % bank.length];
            int baseMinutes = Integer.parseInt(idea[2]);
            int minutes = Math.min(baseMinutes, Math.max(10, profile.dailyAvailableMinutes));
            String reason = week.totalMinutes == 0
                    ? "부담 없이 시작하기 좋은 " + capital.label() + " 자본 활동이에요."
                    : "최근 7일간 " + capital.label() + " 자본의 비중이 낮아 추천했어요.";
            suggestions.add(new Suggestion(idea[0], reason + " " + idea[1], minutes, capital));
        }
        return suggestions;
    }
}
