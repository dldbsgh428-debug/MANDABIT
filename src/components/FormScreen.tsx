/**
 * 입력 폼 화면의 스크롤 컨테이너.
 *
 * 안드로이드에서는 KeyboardAvoidingView가 사실상 동작하지 않아
 * (behavior를 주면 레이아웃이 튀고, 안 주면 아무 일도 안 한다)
 * 키보드 높이를 직접 재서 두 가지를 한다.
 *
 *  1. 키보드 높이만큼 아래 여백을 넣는다 — 마지막 입력창까지 스크롤이 닿는다.
 *  2. 포커스된 입력창이 키보드에 가리면 그만큼 자동으로 스크롤한다.
 *
 * 라이브러리를 쓰지 않은 이유는 네이티브 모듈을 하나 더 넣으면
 * APK를 다시 빌드해야만 확인할 수 있어 실패 비용이 크기 때문이다.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '../theme';

/** 입력창과 키보드 사이에 남길 최소 간격. */
const GAP = 24;

export function FormScreen({
  children,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  /** 현재 스크롤 위치. scrollTo는 절대 좌표를 받으므로 직접 들고 있어야 한다. */
  const offset = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // iOS는 키보드가 올라오기 전에 알려줘서 더 부드럽다.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates.height;
      setKeyboardHeight(height);

      const input = TextInput.State.currentlyFocusedInput();
      if (!input) return;

      // 화면 좌표로 재서 키보드 윗면과 겹치는 만큼만 올린다.
      input.measureInWindow((_x, y, _width, inputHeight) => {
        const keyboardTop = Dimensions.get('window').height - height;
        const overlap = y + inputHeight + GAP - keyboardTop;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: offset.current + overlap, animated: true });
        }
      });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        contentContainerStyle,
        // 키보드가 덮는 만큼 여백을 더해 마지막 입력창까지 스크롤이 닿게 한다.
        { paddingBottom: spacing.xxl + keyboardHeight },
      ]}
      onScroll={(e) => {
        offset.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      // 입력 중 스크롤하면 키보드를 내려 화면을 넓게 쓴다.
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
});
