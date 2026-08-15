import type { ReactNode } from 'react'
import { capital, capitalColor } from '../data/capitals'
import type { CapitalId } from '../types'

/** relative가 기본 — 안의 sr-only(absolute)가 문서를 가로로 늘리지 않도록 */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`relative rounded-2xl bg-surface ring-1 ring-hair shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </section>
  )
}

export function CardHead({
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
        {hint ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

/** 자본 색은 이름표와 항상 붙어 나온다 — 색만으로 뜻을 나르지 않기 위해 */
export function CapitalTag({ id, size = 'sm' }: { id: CapitalId; size?: 'sm' | 'xs' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-sunken px-2 py-0.5 font-medium text-ink2 ${
        size === 'xs' ? 'text-[10px]' : 'text-[11px]'
      }`}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: capitalColor(id) }} />
      {capital(id).name}
    </span>
  )
}

export function Bar({
  value,
  color = 'var(--accent)',
  height = 6,
  track = 'var(--sunken)',
}: {
  value: number
  color?: string
  height?: number
  track?: string
}) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height, background: track }}
      role="presentation"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${v * 100}%`, background: color }}
      />
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  className = '',
  type = 'button',
  disabled,
  title,
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'ghost' | 'solid' | 'quiet' | 'danger'
  size?: 'md' | 'sm'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
  ariaLabel?: string
}) {
  const styles: Record<string, string> = {
    solid: 'bg-[var(--accent)] text-white active:opacity-85',
    ghost: 'bg-surface text-ink ring-1 ring-hair active:bg-sunken',
    quiet: 'text-ink2 active:bg-sunken',
    danger: 'text-[var(--crit)] ring-1 ring-hair active:bg-sunken',
  }
  const sizes: Record<string, string> = {
    md: 'px-3.5 py-2 text-[13px] min-h-9',
    sm: 'px-2.5 py-1.5 text-[12px] min-h-8',
  }
  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink2">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl bg-sunken px-3 py-2.5 text-[15px] text-ink ring-1 ring-transparent transition-shadow placeholder:text-muted focus:ring-[var(--accent)] focus:outline-none'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${inputBase} resize-none leading-relaxed ${props.className ?? ''}`} />
  )
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

/** 차트 값이 색이나 툴팁에만 갇히지 않도록 붙이는 표 */
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
      <summary className="cursor-pointer list-none text-[11px] font-medium text-muted">
        표로 보기 <span className="inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-xl ring-1 ring-hair">
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
