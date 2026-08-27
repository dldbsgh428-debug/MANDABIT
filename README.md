# MANDABIT

목표를 설계하고, 습관으로 완성하다.

MANDABIT Android 0.2는 최신 웹 화면을 그대로 보여 주는 WebView 앱입니다. 웹앱의 일정·반복 루틴 알림을 Android 네이티브 알람에 연결해 앱을 닫아도 설정한 시간에 알림을 받을 수 있습니다.

## Android 기능

- 최신 MANDABIT 화면 자동 반영
- 일정 및 반복 루틴별 알림
- 평일·주말 분리 시간과 요일 선택 지원
- 앱 종료 상태에서도 시스템 알림
- 휴대폰 재부팅·시간대 변경 후 알람 자동 복원
- Android 알림 권한과 정확한 알람 권한 안내
- 주황색 MANDABIT 앱 아이콘

## APK 빌드

main 브랜치에 변경이 올라오면 GitHub Actions가 자동으로 lint와 debug APK 빌드를 실행합니다.

[GitHub Actions에서 최신 APK 받기](https://github.com/dldbsgh428-debug/MANDABIT/actions/workflows/android-build.yml)

완료된 최신 실행의 Artifacts에서 \`mandabit-latest-apk\`를 내려받으면 \`MANDABIT-latest.apk\`가 들어 있습니다.

## 알림 사용

1. 일정 또는 반복 루틴에서 알림을 켭니다.
2. 처음 한 번 Android 알림 권한을 허용합니다.
3. 정확한 시간 알림 화면이 열리면 MANDABIT을 허용합니다.
4. 기기 절전 설정이 강한 경우 MANDABIT의 배터리 사용을 제한 없음으로 설정하면 더 안정적입니다.

웹 주소: https://habitus-scheduler.dldbsgh428.chatgpt.site
