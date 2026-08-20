/**
 * 차트 컴포넌트. react-native-svg로 직접 그린다.
 *
 * 차트 라이브러리를 쓰지 않는 이유는 필요한 모양이 네 가지뿐이고,
 * 직접 그리면 다크 테마와 원화 단위 축 라벨을 정확히 맞출 수 있기 때문이다.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { colors, font, radius, spacing } from '../theme';
import { axisWon, percent } from '../lib/money';

/** 부모 너비를 재서 자식에게 넘겨준다. 차트가 화면 폭에 맞게 늘어나도록. */
function Measured({
  height,
  children,
}: {
  height: number;
  children: (width: number) => React.ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // 소수점 흔들림으로 무한 리렌더가 나지 않게 1px 이상 변할 때만 갱신한다.
    setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  };
  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? children(width) : null}
    </View>
  );
}

/* --------------------------------------------------------------- 진척도 링 */

/**
 * 목표 달성률 링. 가운데에는 자유롭게 내용을 넣는다.
 * 100%를 넘으면 링을 꽉 채우고 색을 초록으로 바꾼다.
 */
export function ProgressRing({
  progress,
  size = 180,
  thickness = 14,
  children,
}: {
  progress: number;
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const done = progress >= 1;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={done ? colors.up : colors.primary} />
            <Stop offset="1" stopColor={done ? colors.upLight : colors.primaryLight} />
          </LinearGradient>
        </Defs>
        {/* 12시 방향에서 시작해 시계방향으로 채우도록 -90도 회전 */}
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.surfaceAlt}
            strokeWidth={thickness}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#ringGrad)"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${c * clamped} ${c}`}
            fill="none"
          />
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>{children}</View>
    </View>
  );
}

/* ---------------------------------------------------------------- 라인 차트 */

export interface LinePoint {
  label: string;
  value: number;
}

/**
 * 순자산 추이 라인 차트.
 *
 * trendMonths > 0이면 마지막 구간의 평균 기울기를 점선으로 연장해서
 * "이 속도면 어디로 가는지"를 보여준다.
 */
export function LineChart({
  points,
  height = 200,
  trendMonths = 0,
  trendRate = 0,
}: {
  points: LinePoint[];
  height?: number;
  trendMonths?: number;
  trendRate?: number;
}) {
  if (points.length === 0) return null;

  const showTrend = trendMonths > 0 && trendRate > 0;
  const last = points[points.length - 1].value;
  const trendEnd = last + trendRate * trendMonths;

  return (
    <Measured height={height}>
      {(width) => {
        const padL = 44;
        const padR = 12;
        const padT = 12;
        const padB = 24;
        const innerW = Math.max(1, width - padL - padR);
        const innerH = Math.max(1, height - padT - padB);

        const values = points.map((p) => p.value);
        if (showTrend) values.push(trendEnd);
        let min = Math.min(...values, 0);
        let max = Math.max(...values);
        if (max === min) max = min + 1; // 값이 하나뿐이거나 전부 같을 때 0으로 나누는 것 방지

        // 위아래로 약간 여백을 줘서 선이 테두리에 붙지 않게 한다.
        const pad = (max - min) * 0.1;
        max += pad;
        if (min < 0) min -= pad;

        // 점선 구간까지 포함한 전체 x축 칸 수
        const totalSlots = points.length - 1 + (showTrend ? trendMonths : 0);
        const x = (i: number) => padL + (totalSlots === 0 ? innerW / 2 : (innerW * i) / totalSlots);
        const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

        const linePath = points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
          .join(' ');
        const areaPath =
          points.length > 1
            ? `${linePath} L ${x(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
            : '';

        // x축 라벨은 최대 5개만 골라 겹치지 않게 한다.
        const labelStep = Math.max(1, Math.ceil(points.length / 5));

        // y축 기준선 3개(최소/중간/최대)
        const gridValues = [min, (min + max) / 2, max];

        return (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primaryLight} stopOpacity={0.34} />
                <Stop offset="1" stopColor={colors.primaryLight} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {gridValues.map((gv, i) => (
              <G key={i}>
                <Line
                  x1={padL}
                  y1={y(gv)}
                  x2={width - padR}
                  y2={y(gv)}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />
                <SvgText
                  x={padL - 6}
                  y={y(gv) + 4}
                  fill={colors.textFaint}
                  fontSize={font.tiny}
                  textAnchor="end"
                >
                  {axisWon(gv)}
                </SvgText>
              </G>
            ))}

            {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}
            <Path
              d={linePath}
              stroke={colors.primary}
              strokeWidth={2.5}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {showTrend ? (
              <Path
                d={`M ${x(points.length - 1)} ${y(last)} L ${x(totalSlots)} ${y(trendEnd)}`}
                stroke={colors.up}
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="none"
              />
            ) : null}

            {points.map((p, i) => {
              const isLast = i === points.length - 1;
              return (
                <Circle
                  key={i}
                  cx={x(i)}
                  cy={y(p.value)}
                  r={isLast ? 4.5 : 2.5}
                  fill={isLast ? colors.primary : colors.bg}
                  stroke={colors.primary}
                  strokeWidth={isLast ? 2 : 1.5}
                />
              );
            })}

            {points.map((p, i) =>
              i % labelStep === 0 || i === points.length - 1 ? (
                <SvgText
                  key={`l${i}`}
                  x={x(i)}
                  y={height - 6}
                  fill={colors.textFaint}
                  fontSize={font.tiny}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              ) : null,
            )}
          </Svg>
        );
      }}
    </Measured>
  );
}

/* ----------------------------------------------------------------- 바 차트 */

export interface BarPoint {
  label: string;
  value: number;
}

/**
 * 월별 저축액 바 차트. 값이 음수면(적자) 0선 아래로 빨간 막대를 그린다.
 * targetLine을 주면 목표선을 겹쳐 보여준다.
 */
export function BarChart({
  bars,
  height = 180,
  targetLine,
}: {
  bars: BarPoint[];
  height?: number;
  targetLine?: number;
}) {
  if (bars.length === 0) return null;

  return (
    <Measured height={height}>
      {(width) => {
        const padL = 44;
        const padR = 12;
        const padT = 10;
        const padB = 22;
        const innerW = Math.max(1, width - padL - padR);
        const innerH = Math.max(1, height - padT - padB);

        const values = bars.map((b) => b.value);
        if (targetLine) values.push(targetLine);
        let max = Math.max(...values, 0);
        let min = Math.min(...values, 0);
        if (max === min) max = min + 1;
        max += (max - min) * 0.12;

        const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;
        const zeroY = y(0);

        const slot = innerW / bars.length;
        const barW = Math.min(28, slot * 0.6);
        const labelStep = Math.max(1, Math.ceil(bars.length / 6));
        const targetLabel = targetLine ? `목표 ${axisWon(targetLine)}` : '';

        return (
          <Svg width={width} height={height}>
            {[min, max].map((gv, i) => (
              <SvgText
                key={i}
                x={padL - 6}
                y={y(gv) + 4}
                fill={colors.textFaint}
                fontSize={font.tiny}
                textAnchor="end"
              >
                {axisWon(gv)}
              </SvgText>
            ))}

            {/* 0선 */}
            <Line x1={padL} y1={zeroY} x2={width - padR} y2={zeroY} stroke={colors.border} strokeWidth={1} />

            {bars.map((b, i) => {
              const cx = padL + slot * i + slot / 2;
              const top = b.value >= 0 ? y(b.value) : zeroY;
              const h = Math.max(2, Math.abs(zeroY - y(b.value)));
              return (
                <G key={i}>
                  <Rect
                    x={cx - barW / 2}
                    y={top}
                    width={barW}
                    height={h}
                    rx={4}
                    fill={b.value >= 0 ? colors.up : colors.down}
                    opacity={0.9}
                  />
                  {i % labelStep === 0 || i === bars.length - 1 ? (
                    <SvgText
                      x={cx}
                      y={height - 6}
                      fill={colors.textFaint}
                      fontSize={font.tiny}
                      textAnchor="middle"
                    >
                      {b.label}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}

            {/*
              목표선은 막대 뒤가 아니라 위에 그린다. 기준선이 막대에 가려지면
              무엇과 비교하는 선인지 알 수 없다.
              라벨은 왼쪽에 두고(오른쪽은 최신 막대와 겹친다) 뒤에 배경을 깔아
              막대 위를 지나도 읽히게 한다. SVG 텍스트는 배경을 못 가지므로 rect를 쓴다.
            */}
            {targetLine ? (
              <G>
                <Line
                  x1={padL}
                  y1={y(targetLine)}
                  x2={width - padR}
                  y2={y(targetLine)}
                  stroke={colors.warn}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <Rect
                  x={padL}
                  y={y(targetLine) - font.tiny - 7}
                  width={targetLabel.length * 7 + 8}
                  height={font.tiny + 7}
                  rx={3}
                  fill={colors.surface}
                />
                <SvgText
                  x={padL + 4}
                  y={y(targetLine) - 7}
                  fill={colors.warn}
                  fontSize={font.tiny}
                  textAnchor="start"
                >
                  {targetLabel}
                </SvgText>
              </G>
            ) : null}
          </Svg>
        );
      }}
    </Measured>
  );
}

/* --------------------------------------------------------------- 도넛 차트 */

export interface DonutSlice {
  label: string;
  amount: number;
}

/**
 * 자산 구성/지출 구성 도넛.
 *
 * 각 조각을 path arc 대신 원의 strokeDasharray로 그린다.
 * 각도 계산 실수가 생길 여지가 적고 렌더도 가볍다.
 */
export function DonutChart({
  slices,
  size = 150,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  if (total <= 0) return null;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={styles.donutRow}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={colors.surfaceAlt}
              strokeWidth={thickness}
              fill="none"
            />
            {slices.map((s, i) => {
              const len = c * (s.amount / total);
              const dash = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={colors.chart[i % colors.chart.length]}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  fill="none"
                />
              );
              offset += len;
              return dash;
            })}
          </G>
        </Svg>
        {centerLabel || centerValue ? (
          <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
            {centerLabel ? <Text style={styles.donutCenterLabel}>{centerLabel}</Text> : null}
            {centerValue ? <Text style={styles.donutCenterValue}>{centerValue}</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        {slices.map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.chart[i % colors.chart.length] }]}
            />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.legendValue}>{percent(s.amount / total, 0)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------- 예산 게이지 */

/** 예산 소진율 막대. 80%부터 노랑, 100% 넘으면 빨강으로 경고한다. */
export function BudgetBar({ usage }: { usage: number }) {
  const clamped = Math.max(0, Math.min(1, usage));
  const color = usage >= 1 ? colors.down : usage >= 0.8 ? colors.warn : colors.up;
  return (
    <View style={styles.budgetTrack}>
      <View style={[styles.budgetFill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ringCenter: { alignItems: 'center', justifyContent: 'center' },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  donutCenterLabel: { color: colors.textFaint, fontSize: font.tiny },
  donutCenterValue: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginTop: 2 },

  legend: { flex: 1, gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, color: colors.textMuted, fontSize: font.small },
  legendValue: { color: colors.text, fontSize: font.small, fontWeight: '600' },

  budgetTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  budgetFill: { height: '100%', borderRadius: radius.pill },
});
