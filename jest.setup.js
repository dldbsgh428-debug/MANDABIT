/**
 * Jest 공통 설정.
 *
 * AsyncStorage는 네이티브 모듈이라 테스트 환경에 없다.
 * 라이브러리가 제공하는 인메모리 목으로 갈아끼운다.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
