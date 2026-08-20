/**
 * 앱 전체 글씨체를 한 곳에서 정한다.
 *
 * 리액트 네이티브는 fontWeight로 굵기를 고르지 못한다. 폰트 파일 하나가
 * 곧 굵기 하나라서, 굵기마다 다른 이름을 직접 지정해야 한다. 화면마다
 * 그걸 적어두면 빠뜨리는 곳이 생기므로, Text/TextInput을 한 겹 감싸서
 * 스타일의 fontWeight를 보고 알맞은 폰트를 끼워 넣는다.
 *
 * 스타일에 fontFamily를 직접 적었으면 그대로 둔다(제목처럼 다른 글씨체를
 * 쓰고 싶은 경우).
 */

import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type TextInputProps,
} from 'react-native';

import { familyFor } from '../theme';

function withFamily(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  // 굵은 파일을 쓰면서 fontWeight까지 남겨두면 안드로이드가 그 위에 가짜
  // 굵기를 한 번 더 입혀 뭉개진다. 그래서 무게는 normal로 되돌린다.
  return [style, { fontFamily: familyFor(flat.fontWeight), fontWeight: 'normal' }];
}

export function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={withFamily(style)} />;
}

export function TextInput({ style, ...rest }: TextInputProps) {
  return <RNTextInput {...rest} style={withFamily(style as StyleProp<TextStyle>)} />;
}
