import { useState } from 'react'
import { useMeasure } from './useMeasure'
import { ChartTooltip } from './Tooltip'

export interface BarDatum {
  label: string
  /** 0–1 */
  value: number
  color?: string
  sub?: string
  tooltip: string
}

/**
 * 가로 막대 — 이름이 긴 범주(7자본)를 비교할 때. 레이더 대신 이걸 쓴다.
 * 색은 자본이라는 '개체'를 따라가므로 값이 바뀌어도 색은 그대로다.
 */
export function HorizontalBars({ data }: { data: BarDatum[] }) {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div className="space-y-2 px-4 pb-2">
      {data.map((d, i) => (
        <div
          key={d.label}
          className="group relative flex items-center gap-3 rounded-lg py-1"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <div className="flex w-[86px] shrink-0 items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: d.color ?? 'var(--accent)' }}
            />
            <span className="truncate text-[12px] text-ink2">{d.label}</span>
          </div>

          <div className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${Math.max(d.value * 100, d.value > 0 ? 2 : 0)}%`,
                background: d.color ?? 'var(--accent)',
              }}
            />
          </div>

          <span className="tnum w-11 shrink-0 text-right text-[12px] font-medium text-ink">
            {Math.round(d.value * 100)}%
          </span>

          {hover === i ? (
            <div className="pointer-events-none absolute -top-1 left-[86px] z-10 -translate-y-full rounded-lg bg-surface px-2.5 py-1.5 text-[11px] whitespace-nowrap text-ink shadow-lg ring-1 ring-hair">
              {d.tooltip}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

const PAD = { top: 16, right: 6, bottom: 20, left: 26 }
const HEIGHT = 150

/** 세로 막대 — 요일처럼 짧고 순서가 있는 범주. 단일 계열이라 범례는 없다. */
export function ColumnChart({ data }: { data: BarDatum[] }) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const n = data.length
  // 막대가 두세 개뿐일 때 폭 전체로 벌어지지 않도록 슬롯을 묶고 가운데 정렬한다.
  const slot = n ? Math.min(plotW / n, 76) : 0
  const groupLeft = PAD.left + (plotW - slot * n) / 2
  // 인접 막대 사이 2px는 서피스로 비운다 — 테두리로 나누지 않는다.
  const barW = Math.max(6, Math.min(30, slot - 8))

  const yOf = (v: number) => PAD.top + (1 - v) * plotH
  const xOf = (i: number) => groupLeft + slot * i + slot / 2

  const values = data.map((d) => d.value)
  const maxIdx = values.indexOf(Math.max(...values))
  const minIdx = values.indexOf(Math.min(...values))

  return (
    <div ref={ref} className="relative px-4 pb-1">
      {width > 0 ? (
        <svg width={width} height={HEIGHT} role="img" aria-label="요일별 평균 달성률">
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yOf(t)}
                y2={yOf(t)}
                stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'}
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

          {data.map((d, i) => {
            const h = Math.max(d.value * plotH, d.value > 0 ? 2 : 0)
            return (
              <g
                key={d.label}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {/* 히트 영역은 막대보다 넉넉하게 */}
                <rect
                  x={xOf(i) - slot / 2}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                />
                <rect
                  x={xOf(i) - barW / 2}
                  y={yOf(0) - h}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={d.color ?? 'var(--accent)'}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                {i === maxIdx || i === minIdx ? (
                  <text
                    x={xOf(i)}
                    y={yOf(0) - h - 5}
                    textAnchor="middle"
                    className="tnum"
                    fontSize={9.5}
                    fontWeight={600}
                    fill="var(--ink-2)"
                  >
                    {Math.round(d.value * 100)}%
                  </text>
                ) : null}
                <text
                  x={xOf(i)}
                  y={HEIGHT - 6}
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
        <div style={{ height: HEIGHT }} />
      )}

      {hover !== null ? (
        <ChartTooltip x={xOf(hover) + 16} y={PAD.top + 10} width={width}>
          {data[hover].tooltip}
        </ChartTooltip>
      ) : null}
    </div>
  )
}
