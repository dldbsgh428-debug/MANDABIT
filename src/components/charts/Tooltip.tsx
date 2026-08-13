import type { ReactNode } from 'react'

/**
 * 차트 위에 뜨는 값 상자. 툴팁은 값을 잠그지 않는다 — 같은 값이 직접 라벨이나
 * 표 보기로도 늘 닿아야 한다.
 */
export function ChartTooltip({
  x,
  y,
  width,
  children,
}: {
  x: number
  y: number
  width: number
  children: ReactNode
}) {
  // 좌우 가장자리에서 상자가 잘리지 않도록 붙여 세운다.
  const clampedLeft = Math.max(4, Math.min(width - 4, x))
  const align = clampedLeft > width - 90 ? 'translateX(-100%)' : clampedLeft < 90 ? '' : 'translateX(-50%)'

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] whitespace-nowrap text-ink shadow-lg ring-1 ring-hair"
      style={{ left: clampedLeft, top: y, transform: `${align} translateY(-115%)` }}
    >
      {children}
    </div>
  )
}
