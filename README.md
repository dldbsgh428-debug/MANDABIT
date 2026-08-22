# MANDABIT

[![Android APK Build](https://github.com/dldbsgh428-debug/HABITUS/actions/workflows/android-build.yml/badge.svg)](https://github.com/dldbsgh428-debug/HABITUS/actions/workflows/android-build.yml)

목표를 설계하고, 습관으로 완성하다. 만다라트와 삶의 7가지 자본을 실천으로 연결하는 성장 플래너입니다.

## 첫 버전에 포함된 기능

- 오늘 일정 확인, 완료 체크, 직접 추가 및 삭제
- 일정마다 주 자본 1개와 보조 자본 최대 2개 연결
- 매일·평일·주말 루틴 등록과 완료 기록
- 최근 7일 기록을 바탕으로 부족한 자본의 실천 일정 2~3개 추천
- 추천을 자동으로 넣지 않고 사용자가 선택한 뒤 날짜와 시간 확정
- 주간·월간 자본별 성장 시간, 달성률, 균형 점수와 성장 해석
- 이름, 하루 성장 가능 시간, 추천 개수 설정
- JSON 백업 내보내기 및 붙여넣기 복원
- 로그인 없이 기기에만 기록 저장

문화 자본은 클래식에 한정하지 않고 독서, 미술, 음악, 영화, 역사, 여행, 언어와 음식문화를 포함합니다.

## 데이터 구조

`HabitusRepository`를 저장 경계로 두었습니다. 현재는 `LocalHabitusRepository`가 기기 내부에 저장하며,
나중에 로그인과 동기화를 추가할 때 서버 저장 구현으로 교체하거나 함께 사용할 수 있습니다.
로컬 프로필도 안정적인 사용자 ID를 가지므로 공개 앱으로 확장할 때 기존 기록을 계정에 연결할 수 있습니다.

## 빌드

필요 환경: JDK 17, Android SDK 35, Gradle 8.9

```bash
./gradlew assembleDebug
```

APK는 `app/build/outputs/apk/debug/app-debug.apk`에 생성됩니다.

GitHub에 푸시하면 `Android APK Build` 작업이 자동으로 실행됩니다. 완료된 작업의
`Artifacts`에서 `mandabit-apk-실행번호` 파일을 내려받아 설치할 수 있습니다.
자동 빌드의 테스트 서명키는 Actions 캐시에만 보관하며 저장소에는 커밋하지 않습니다.

## 다음 단계 후보

- 캘린더 주·월 보기와 일정 수정
- 루틴별 요일 직접 선택 및 연속 달성 기록
- 알림과 위젯
- 추천 만족도 학습 및 AI 추천 엔진 연결
- 선택형 암호화 동기화와 계정 로그인
- 접근성 점검과 플레이스토어 출시 준비
