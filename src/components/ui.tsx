import type { ReactNode } from 'react'
import { capital, capitalColor } from '../data/capitals'
import type { CapitalId } from '../types'

/**
 * relative를 기본으로 둔다 — 카드 안의 sr-only(absolute) 텍스트가 초기 컨테이닝
 * 블록에 붙어 문서를 가로로 늘리는 것을 여기서 끊는다.
 */
export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
}) {
  return (
    <Tag
      className={`relative rounded-2xl bg-surface ring-1 ring-hair shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: ReactNode
  hint?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

/** 자본 색은 이름표와 항상 함께 나온다 — 색만으로 뜻을 나르지 않기 위해. */
export function CapitalTag({ id, size = 'sm' }: { id: CapitalId; size?: 'sm' | 'xs' }) {
  const c = capital(id)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-sunken px-2 py-0.5 font-medium text-ink2 ${
        size === 'xs' ? 'text-[10px]' : 'text-[11px]'
      }`}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: capitalColor(id) }}
      />
      {c.name}
    </span>
  )
}

export function CapitalDot({ id }: { id: CapitalId }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: capitalColor(id) }}
    />
  )
}

/**
 * 단일 비율을 한계선에 견주는 미터. 파이 2조각 대신 쓴다.
 */
export function Meter({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'muted' }) {
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${clamped * 100}%`,
          background: tone === 'accent' ? 'var(--accent)' : 'var(--axis)',
        }}
      />
    </div>
  )
}

/**
 * 스탯 타일 — 값 하나가 곧 차트인 경우. 막대 하나짜리 차트를 쓰지 않기 위해.
 * 큰 숫자는 비례폭 숫자(기본값)를 그대로 쓴다.
 */
export function StatTile({
  label,
  value,
  unit,
  sub,
  meter,
  accent,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  meter?: number
  accent?: string
}) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5 ring-1 ring-hair">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span
          className="text-[26px] leading-none font-semibold tracking-tight"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        {unit ? <span className="text-xs font-medium text-ink2">{unit}</span> : null}
      </div>
      {meter !== undefined ? <div className="mt-2"><Meter value={meter} /></div> : null}
      {sub ? <div className="mt-1.5 text-[11px] text-muted">{sub}</div> : null}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  className = '',
  type = 'button',
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'ghost' | 'solid' | 'quiet' | 'danger'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
}) {
  const styles: Record<string, string> = {
    solid: 'bg-[var(--accent)] text-white hover:opacity-90',
    ghost: 'bg-surface text-ink ring-1 ring-hair hover:bg-sunken',
    quiet: 'text-ink2 hover:bg-sunken',
    danger: 'text-[var(--critical)] ring-1 ring-hair hover:bg-sunken',
  }
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink2">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  )
}

const inputBase =
  'w-full rounded-lg bg-sunken px-3 py-2 text-[14px] text-ink ring-1 ring-transparent transition-shadow placeholder:text-muted focus:ring-[var(--accent)] focus:outline-none'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-none leading-relaxed ${props.className ?? ''}`} />
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

/** 차트마다 붙는 표 보기 — 값이 색이나 툴팁에만 갇히지 않도록. */
export function TableView({
  caption,
  head,
  rows,
}: {
  caption: string
  head: string[]
  rows: (string | number)[][]
}) {
  return (
    <details className="group px-4 pb-4">
      <summary className="cursor-pointer list-none text-[11px] font-medium text-muted hover:text-ink2">
        표로 보기 <span className="inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg ring-1 ring-hair">
        <table className="w-full text-left text-[11px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-sunken text-muted">
            <tr>
              {head.map((h) => (
                <th key={h} className="px-2.5 py-1.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tnum text-ink2">
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[var(--grid)]">
                {r.map((cell, j) => (
                  <td key={j} className="px-2.5 py-1.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
