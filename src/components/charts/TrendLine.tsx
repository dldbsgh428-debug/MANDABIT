import { useState } from 'react'
import { useMeasure } from './useMeasure'
import { ChartTooltip } from './Tooltip'

export interface TrendPoint {
  label: string
  /** 0–1. 예정된 습관이 없던 날은 null — 선을 끊어 0%로 오해하지 않게. */
  value: number | null
  tooltip: string
}

const PAD = { top: 10, right: 14, bottom: 20, left: 30 }
const HEIGHT = 168

export function TrendLine({ points, color = 'var(--accent)' }: { points: TrendPoint[]; color?: string }) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const n = points.length

  const xOf = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yOf = (v: number) => PAD.top + (1 - v) * plotH

  // null 구간에서 선을 끊는다.
  const segments: { i: number; x: number; y: number }[][] = []
  let run: { i: number; x: number; y: number }[] = []
  points.forEach((p, i) => {
    if (p.value === null) {
      if (run.length) segments.push(run)
      run = []
      return
    }
    run.push({ i, x: xOf(i), y: yOf(p.value) })
  })
  if (run.length) segments.push(run)

  const lastFilled = [...points].map((p, i) => ({ p, i })).filter((d) => d.p.value !== null).pop()

  function pick(clientX: number, rect: DOMRect) {
    const rel = clientX - rect.left - PAD.left
    const i = Math.round((rel / Math.max(plotW, 1)) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  const hoveredPoint = hover !== null ? points[hover] : null

  return (
    <div ref={ref} className="relative px-4 pb-1">
      {width > 0 ? (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="일별 달성률 추이"
          onMouseMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setHover(null)}
          onTouchMove={(e) =>
            pick(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())
          }
          onTouchEnd={() => setHover(null)}
        >
          {/* 가로 격자 — 실선 헤어라인, 서피스에서 한 톤만 띄운다 */}
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yOf(t)}
                y2={yOf(t)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={yOf(t) + 3}
                textAnchor="end"
                className="tnum"
                fontSize={9}
                fill="var(--muted)"
              >
                {t * 100}
              </text>
            </g>
          ))}

          {segments.map((seg, si) => {
            const d = seg.map((s, i) => `${i === 0 ? 'M' : 'L'}${s.x},${s.y}`).join(' ')
            const area = `${d} L${seg[seg.length - 1].x},${yOf(0)} L${seg[0].x},${yOf(0)} Z`
            return (
              <g key={si}>
                <path d={area} fill={color} opacity={0.1} />
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )
          })}

          {/* 마지막 값만 직접 라벨 — 모든 점에 숫자를 붙이지 않는다 */}
          {lastFilled && lastFilled.p.value !== null ? (
            <>
              <circle
                cx={xOf(lastFilled.i)}
                cy={yOf(lastFilled.p.value)}
                r={4}
                fill={color}
                stroke="var(--surface)"
                strokeWidth={2}
              />
              <text
                x={xOf(lastFilled.i) - 7}
                y={yOf(lastFilled.p.value) - 7}
                textAnchor="end"
                className="tnum"
                fontSize={10}
                fontWeight={600}
                fill="var(--ink-2)"
              >
                {Math.round(lastFilled.p.value * 100)}%
              </text>
            </>
          ) : null}

          {hover !== null && hoveredPoint ? (
            <>
              <line
                x1={xOf(hover)}
                x2={xOf(hover)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--axis)"
                strokeWidth={1}
              />
              {hoveredPoint.value !== null ? (
                <circle
                  cx={xOf(hover)}
                  cy={yOf(hoveredPoint.value)}
                  r={4.5}
                  fill={color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              ) : null}
            </>
          ) : null}

          {/* x축 눈금은 성기게 */}
          {points.map((p, i) =>
            i % Math.ceil(n / 6) === 0 || i === n - 1 ? (
              <text
                key={i}
                x={xOf(i)}
                y={HEIGHT - 6}
                textAnchor="middle"
                className="tnum"
                fontSize={9}
                fill="var(--muted)"
              >
                {p.label}
              </text>
            ) : null,
          )}
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}

      {hover !== null && hoveredPoint ? (
        <ChartTooltip x={xOf(hover) + 16} y={PAD.top + 8} width={width}>
          {hoveredPoint.tooltip}
        </ChartTooltip>
      ) : null}
    </div>
  )
}
