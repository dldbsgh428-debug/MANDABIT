import { useEffect, useState } from 'react'
import { capital, capitalColor } from '../data/capitals'
import { INCOME_CATEGORIES, MONEY_CATEGORIES, formatMinutes, formatWon } from '../data/tools'
import { entriesOn, sumOn } from '../lib/entries'
import { addEntry, removeEntry, useAppState } from '../lib/store'
import type { Action, Entry, MoneyDirection } from '../types'
import { Bar, Button, TextArea, TextInput } from './ui'

/** 화면 아래에서 올라오는 입력창. 폰에서 한 손으로 닿는 자리에 둔다. */
function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  // 시트가 열려 있는 동안 뒤 배경이 스크롤되지 않게 잠근다.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise safe-bottom relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface shadow-[var(--shadow-pop)] ring-1 ring-hair"
      >
        <div className="sticky top-0 z-10 bg-surface px-4 pt-3 pb-2">
          <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--axis)]" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-semibold text-ink">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="shrink-0 rounded-lg px-2 py-1 text-[13px] text-muted active:bg-sunken"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="px-4 pt-1 pb-5">{children}</div>
      </div>
    </div>
  )
}

function EntryList({ entries, render }: { entries: Entry[]; render: (e: Entry) => React.ReactNode }) {
  if (entries.length === 0) return null
  return (
    <ul className="mt-4 space-y-1">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-2 rounded-xl bg-sunken px-3 py-2">
          <div className="min-w-0 flex-1">{render(e)}</div>
          <button
            type="button"
            aria-label="이 기록 지우기"
            onClick={() => removeEntry(e.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-muted active:bg-surface"
          >
            지우기
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ 가계부 */

function MoneyForm({ action, date, entries }: { action: Action; date: string; entries: Entry[] }) {
  const [direction, setDirection] = useState<MoneyDirection>('out')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(MONEY_CATEGORIES[0])
  const [memo, setMemo] = useState('')

  const categories = direction === 'out' ? MONEY_CATEGORIES : INCOME_CATEGORIES
  const value = Number(amount.replace(/[^0-9]/g, ''))

  const dayOut = entries
    .filter((e) => e.direction !== 'in')
    .reduce((s, e) => s + (e.amount ?? 0), 0)
  const dayIn = entries
    .filter((e) => e.direction === 'in')
    .reduce((s, e) => s + (e.amount ?? 0), 0)

  function submit() {
    if (!value) return
    addEntry({
      actionId: action.id,
      date,
      amount: value,
      direction,
      category,
      memo: memo.trim() || undefined,
    })
    setAmount('')
    setMemo('')
  }

  return (
    <>
      <div className="mb-3 flex gap-1 rounded-xl bg-sunken p-1">
        {(['out', 'in'] as MoneyDirection[]).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={direction === d}
            onClick={() => {
              setDirection(d)
              setCategory(d === 'out' ? MONEY_CATEGORIES[0] : INCOME_CATEGORIES[0])
            }}
            className={`min-h-9 flex-1 rounded-lg text-[13px] font-medium transition-colors ${
              direction === d ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-muted'
            }`}
          >
            {d === 'out' ? '지출' : '수입'}
          </button>
        ))}
      </div>

      <div className="relative">
        <TextInput
          autoFocus
          inputMode="numeric"
          value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : ''}
          placeholder="0"
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="!py-3 !pr-10 !text-right !text-[22px] !font-semibold"
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-muted">
          원
        </span>
      </div>

      <div className="mt-2 flex gap-1.5">
        {[1000, 5000, 10000].map((step) => (
          <button
            key={step}
            type="button"
            onClick={() =>
              setAmount(String((Number(amount.replace(/[^0-9]/g, '')) || 0) + step))
            }
            className="flex-1 rounded-lg bg-sunken py-1.5 text-[11px] text-ink2 active:opacity-70"
          >
            +{step.toLocaleString('ko-KR')}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAmount('')}
          className="rounded-lg bg-sunken px-3 py-1.5 text-[11px] text-muted active:opacity-70"
        >
          지움
        </button>
      </div>

      <p className="mt-4 mb-1.5 text-[11px] font-medium text-ink2">분류</p>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={`rounded-lg px-2.5 py-1.5 text-[12px] transition-colors ${
              category === c
                ? 'bg-surface text-ink ring-2 ring-[var(--accent)]'
                : 'bg-sunken text-ink2'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <TextInput
          value={memo}
          placeholder="메모 (선택)"
          onChange={(e) => setMemo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>

      <Button variant="solid" className="mt-3 w-full" disabled={!value} onClick={submit}>
        적기
      </Button>

      {entries.length > 0 ? (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-sunken px-3 py-2.5 text-[12px]">
          <span className="text-muted">오늘</span>
          <span className="tnum font-medium text-ink">
            지출 {formatWon(dayOut)}
            {dayIn > 0 ? ` · 수입 ${formatWon(dayIn)}` : ''}
          </span>
        </div>
      ) : null}

      <EntryList
        entries={entries}
        render={(e) => (
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-ink2">
              {e.category}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{e.memo ?? ''}</span>
            <span
              className="tnum shrink-0 text-[13px] font-medium"
              style={{ color: e.direction === 'in' ? 'var(--good)' : 'var(--ink)' }}
            >
              {e.direction === 'in' ? '+' : '−'}
              {formatWon(e.amount ?? 0)}
            </span>
          </div>
        )}
      />
    </>
  )
}

/* ------------------------------------------------------------------ 횟수 */

function CounterForm({ action, date, entries }: { action: Action; date: string; entries: Entry[] }) {
  const unit = action.tool?.unit ?? '회'
  const target = action.tool?.target
  const total = sumOn(action, entries)

  return (
    <>
      <div className="rounded-2xl bg-sunken px-4 py-5 text-center">
        <p className="tnum text-[42px] leading-none font-semibold text-ink">
          {total}
          <span className="ml-1 text-[15px] font-medium text-ink2">{unit}</span>
        </p>
        {target ? (
          <>
            <p className="mt-1.5 text-[11px] text-muted">
              목표 {target}
              {unit}
              {total >= target ? ' · 다 채웠어요' : ` · ${target - total}${unit} 남음`}
            </p>
            <div className="mt-3">
              <Bar value={total / target} color={capitalColor(action.capital)} />
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          disabled={entries.length === 0}
          onClick={() => {
            const last = [...entries].sort((a, b) => b.at.localeCompare(a.at))[0]
            if (last) removeEntry(last.id)
          }}
        >
          −1
        </Button>
        <Button
          variant="solid"
          className="flex-[2]"
          onClick={() => addEntry({ actionId: action.id, date, count: 1 })}
        >
          +1 {unit}
        </Button>
      </div>

      {target && total < target ? (
        <Button
          className="mt-2 w-full"
          onClick={() =>
            addEntry({ actionId: action.id, date, count: target - total })
          }
        >
          남은 만큼 한 번에 채우기
        </Button>
      ) : null}
    </>
  )
}

/* ------------------------------------------------------------------ 시간 */

function DurationForm({ action, date, entries }: { action: Action; date: string; entries: Entry[] }) {
  const [minutes, setMinutes] = useState(String(action.tool?.target ?? 20))
  const target = action.tool?.target
  const total = sumOn(action, entries)
  const value = Number(minutes.replace(/[^0-9]/g, ''))

  return (
    <>
      {total > 0 ? (
        <div className="mb-3 rounded-2xl bg-sunken px-4 py-4 text-center">
          <p className="text-[11px] text-muted">오늘 쌓인 시간</p>
          <p className="tnum mt-1 text-[30px] leading-none font-semibold text-ink">
            {formatMinutes(total)}
          </p>
          {target ? (
            <div className="mt-3">
              <Bar value={total / target} color={capitalColor(action.capital)} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <TextInput
          autoFocus
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="!py-3 !pr-10 !text-right !text-[22px] !font-semibold"
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-muted">
          분
        </span>
      </div>

      <div className="mt-2 flex gap-1.5">
        {[10, 20, 30, 60].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(String(m))}
            className="flex-1 rounded-lg bg-sunken py-1.5 text-[11px] text-ink2 active:opacity-70"
          >
            {m}분
          </button>
        ))}
      </div>

      <Button
        variant="solid"
        className="mt-3 w-full"
        disabled={!value}
        onClick={() => addEntry({ actionId: action.id, date, minutes: value })}
      >
        {value}분 기록하기
      </Button>

      <EntryList
        entries={entries}
        render={(e) => (
          <span className="tnum text-[12px] text-ink">{formatMinutes(e.minutes ?? 0)}</span>
        )}
      />
    </>
  )
}

/* -------------------------------------------------------------------- 글 */

function TextForm({ action, date, entries }: { action: Action; date: string; entries: Entry[] }) {
  const [text, setText] = useState('')

  function submit() {
    const value = text.trim()
    if (!value) return
    addEntry({ actionId: action.id, date, text: value })
    setText('')
  }

  return (
    <>
      <TextArea
        autoFocus
        rows={4}
        value={text}
        placeholder="여기에 적어보세요"
        onChange={(e) => setText(e.target.value)}
      />
      <Button variant="solid" className="mt-3 w-full" disabled={!text.trim()} onClick={submit}>
        남기기
      </Button>

      <EntryList
        entries={entries}
        render={(e) => (
          <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-ink">{e.text}</p>
        )}
      />
    </>
  )
}

/* ------------------------------------------------------------------ 진입 */

export function ToolSheet({
  action,
  date,
  onClose,
}: {
  action: Action
  date: string
  onClose: () => void
}) {
  const state = useAppState()
  const entries = entriesOn(state, date, action.id)
  const kind = action.tool?.kind ?? 'none'
  const subtitle = `${capital(action.capital).name}${action.cue ? ` · ${action.cue}` : ''}`

  return (
    <Sheet title={action.title} subtitle={subtitle} onClose={onClose}>
      {kind === 'money' ? <MoneyForm action={action} date={date} entries={entries} /> : null}
      {kind === 'counter' ? <CounterForm action={action} date={date} entries={entries} /> : null}
      {kind === 'duration' ? <DurationForm action={action} date={date} entries={entries} /> : null}
      {kind === 'text' ? <TextForm action={action} date={date} entries={entries} /> : null}
    </Sheet>
  )
}
