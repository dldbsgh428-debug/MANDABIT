import { useEffect, useRef, useState } from 'react'

/** 컨테이너 실폭을 재서 그린다 — viewBox를 늘려 글자가 찌그러지지 않게 */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

function Tip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  const left = Math.max(4, Math.min(width - 4, x))
  const shift = left > width - 90 ? 'translateX(-100%)' : left < 90 ? '' : 'translateX(-50%)'
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 rounded-lg bg-raised px-2.5 py-1.5 text-[11px] whitespace-nowrap text-ink shadow-[var(--shadow-pop)] ring-1 ring-hair"
      style={{ left, top: y, transform: `${shift} translateY(-115%)` }}
    >
      {children}
    </div>
  )
}

export interface CurvePoint {
  label: string
  total: number
  tooltip: string
}

const CURVE_PAD = { top: 12, right: 12, bottom: 18, left: 34 }
const CURVE_H = 150

/**
 * 누적 경험치 곡선. 단조 증가하는 값이라 오르내림이 아니라 '기울기'가 정보다 —
 * 평평하면 그 기간에 아무것도 안 쌓았다는 뜻.
 */
export function GrowthCurve({ points, color = 'var(--accent)' }: { points: CurvePoint[]; color?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const plotW = Math.max(0, width - CURVE_PAD.left - CURVE_PAD.right)
  const plotH = CURVE_H - CURVE_PAD.top - CURVE_PAD.bottom
  const n = points.length
  const max = Math.max(1, ...points.map((p) => p.total))

  const xOf = (i: number) => CURVE_PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yOf = (v: number) => CURVE_PAD.top + (1 - v / max) * plotH

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(p.total)}`).join(' ')
  const area = n ? `${line} L${xOf(n - 1)},${yOf(0)} L${xOf(0)},${yOf(0)} Z` : ''

  function pick(clientX: number, rect: DOMRect) {
    const rel = clientX - rect.left - CURVE_PAD.left
    const i = Math.round((rel / Math.max(plotW, 1)) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div ref={ref} className="relative px-4 pb-1">
      {width > 0 && n > 0 ? (
        <svg
          width={width}
          height={CURVE_H}
          role="img"
          aria-label="누적 경험치 성장 곡선"
          onMouseMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => pick(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
          onTouchMove={(e) => pick(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
          onTouchEnd={() => setHover(null)}
        >
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1={CURVE_PAD.left}
                x2={width - CURVE_PAD.right}
                y1={yOf(max * t)}
                y2={yOf(max * t)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={CURVE_PAD.left - 6}
                y={yOf(max * t) + 3}
                textAnchor="end"
                className="tnum"
                fontSize={9}
                fill="var(--muted)"
              >
                {Math.round(max * t)}
              </text>
            </g>
          ))}

          <path d={area} fill={color} opacity={0.12} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* 끝점만 직접 라벨 — 모든 점에 숫자를 붙이지 않는다 */}
          <circle cx={xOf(n - 1)} cy={yOf(points[n - 1].total)} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />

          {hover !== null ? (
            <>
              <line
                x1={xOf(hover)}
                x2={xOf(hover)}
                y1={CURVE_PAD.top}
                y2={CURVE_PAD.top + plotH}
                stroke="var(--axis)"
                strokeWidth={1}
              />
              <circle cx={xOf(hover)} cy={yOf(points[hover].total)} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
            </>
          ) : null}

          {points.map((p, i) =>
            i % Math.ceil(n / 5) === 0 || i === n - 1 ? (
              <text
                key={i}
                x={xOf(i)}
                y={CURVE_H - 4}
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
        <div style={{ height: CURVE_H }} />
      )}

      {hover !== null ? (
        <Tip x={xOf(hover) + 16} y={CURVE_PAD.top + 6} width={width}>
          {points[hover].tooltip}
        </Tip>
      ) : null}
    </div>
  )
}

export interface ColumnDatum {
  label: string
  value: number
  tooltip: string
}

const COL_PAD = { top: 16, right: 6, bottom: 20, left: 30 }
const COL_H = 140

/** 단일 계열 세로 막대 — 범례 없이 제목이 계열을 말한다 */
export function Columns({ data, unit = '' }: { data: ColumnDatum[]; unit?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const plotW = Math.max(0, width - COL_PAD.left - COL_PAD.right)
  const plotH = COL_H - COL_PAD.top - COL_PAD.bottom
  const n = data.length
  const slot = n ? Math.min(plotW / n, 76) : 0
  const left = COL_PAD.left + (plotW - slot * n) / 2
  const barW = Math.max(6, Math.min(28, slot - 8))
  const max = Math.max(1, ...data.map((d) => d.value))

  const yOf = (v: number) => COL_PAD.top + (1 - v / max) * plotH
  const xOf = (i: number) => left + slot * i + slot / 2

  const values = data.map((d) => d.value)
  const maxIdx = values.indexOf(Math.max(...values))
  const minIdx = values.indexOf(Math.min(...values))

  return (
    <div ref={ref} className="relative px-4 pb-1">
      {width > 0 ? (
        <svg width={width} height={COL_H} role="img" aria-label="요일별 평균 경험치">
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1={COL_PAD.left}
                x2={width - COL_PAD.right}
                y1={yOf(max * t)}
                y2={yOf(max * t)}
                stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'}
                strokeWidth={1}
              />
              <text
                x={COL_PAD.left - 6}
                y={yOf(max * t) + 3}
                textAnchor="end"
                className="tnum"
                fontSize={9}
                fill="var(--muted)"
              >
                {Math.round(max * t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const h = Math.max((d.value / max) * plotH, d.value > 0 ? 2 : 0)
            return (
              <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={xOf(i) - slot / 2} y={COL_PAD.top} width={slot} height={plotH} fill="transparent" />
                <rect
                  x={xOf(i) - barW / 2}
                  y={yOf(0) - h}
                  width={barW}
                  height={h}
                  rx={4}
                  fill="var(--accent)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                {(i === maxIdx || i === minIdx) && d.value > 0 ? (
                  <text
                    x={xOf(i)}
                    y={yOf(0) - h - 5}
                    textAnchor="middle"
                    className="tnum"
                    fontSize={9.5}
                    fontWeight={600}
                    fill="var(--ink-2)"
                  >
                    {Math.round(d.value)}
                    {unit}
                  </text>
                ) : null}
                <text
                  x={xOf(i)}
                  y={COL_H - 5}
                  textAnchor="middle"
                  fontSize={10}
                  fill={hover === i ? 'var(--ink)' : 'var(--muted)'}
                >
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      ) : (
        <div style={{ height: COL_H }} />
      )}

      {hover !== null ? (
        <Tip x={xOf(hover) + 16} y={COL_PAD.top + 8} width={width}>
          {data[hover].tooltip}
        </Tip>
      ) : null}
    </div>
  )
}
