import { useState } from 'react'
import { CAPITALS, capital, capitalColor } from '../data/capitals'
import { WEEKDAY_LABELS, todayKey } from '../lib/date'
import { addHabit, archiveHabit, deleteHabit, moveHabit, updateHabit, useAppState } from '../lib/store'
import { habitStats, pct } from '../lib/stats'
import { elapsedDaysInMonth, monthKey } from '../lib/date'
import type { CapitalId, Habit, Weekday } from '../types'
import { Button, Card, CardHeader, CapitalTag, Field, TextInput } from '../components/ui'

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

function DayPicker({ value, onChange }: { value: Weekday[]; onChange: (v: Weekday[]) => void }) {
  const everyday = value.length === 0
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {ALL_DAYS.map((d) => {
          const on = everyday || value.includes(d)
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const base = everyday ? [...ALL_DAYS] : value
                const next = base.includes(d) ? base.filter((x) => x !== d) : [...base, d]
                onChange(next.length === 7 ? [] : next.sort())
              }}
              className={`size-8 rounded-lg text-[12px] font-medium transition-colors ${
                on ? 'bg-[var(--accent)] text-white' : 'bg-sunken text-muted hover:text-ink2'
              }`}
            >
              {WEEKDAY_LABELS[d]}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-muted">{everyday ? '매일 실행합니다' : `주 ${value.length}회`}</p>
    </div>
  )
}

function CapitalPicker({ value, onChange }: { value: CapitalId; onChange: (v: CapitalId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {CAPITALS.map((c) => {
        const on = value === c.id
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-left text-[12px] transition-colors ${
              on ? 'bg-sunken ring-1 ring-[var(--accent)]' : 'bg-sunken/60 hover:bg-sunken'
            }`}
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: capitalColor(c.id) }}
            />
            <span className="truncate text-ink2">{c.name}</span>
          </button>
        )
      })}
    </div>
  )
}

interface Draft {
  name: string
  capital: CapitalId
  cue: string
  days: Weekday[]
}

const emptyDraft: Draft = { name: '', capital: 'psych', cue: '', days: [] }

function HabitForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  submitLabel: string
  onSubmit: (d: Draft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const c = capital(draft.capital)

  return (
    <div className="space-y-3 rounded-xl bg-sunken p-3">
      <Field label="습관 이름">
        <TextInput
          autoFocus
          value={draft.name}
          placeholder="예) 독서 30분 이상 하기"
          className="!bg-surface"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </Field>
      <Field label="어떤 자본을 키우나요?" hint={`${c.emoji} ${c.name} — ${c.hint}`}>
        <CapitalPicker value={draft.capital} onChange={(v) => setDraft({ ...draft, capital: v })} />
      </Field>
      <Field label="언제 하나요?" hint="계획표에 끌어올 때 힌트가 됩니다">
        <TextInput
          value={draft.cue}
          placeholder="예) 자기 전"
          className="!bg-surface"
          onChange={(e) => setDraft({ ...draft, cue: e.target.value })}
        />
      </Field>
      <Field label="실행 요일">
        <DayPicker value={draft.days} onChange={(v) => setDraft({ ...draft, days: v })} />
      </Field>
      <div className="flex gap-2">
        <Button variant="solid" disabled={!draft.name.trim()} onClick={() => onSubmit(draft)}>
          {submitLabel}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  )
}

function HabitRow({ habit, rateLabel, streak }: { habit: Habit; rateLabel: string; streak: number }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (editing) {
    return (
      <li className="px-2 py-2">
        <HabitForm
          initial={{ name: habit.name, capital: habit.capital, cue: habit.cue ?? '', days: habit.days }}
          submitLabel="저장"
          onCancel={() => setEditing(false)}
          onSubmit={(d) => {
            updateHabit(habit.id, {
              name: d.name.trim(),
              capital: d.capital,
              cue: d.cue.trim(),
              days: d.days,
            })
            setEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li className="group rounded-xl px-4 py-2.5 hover:bg-sunken">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ background: capitalColor(habit.capital), opacity: habit.archived ? 0.3 : 1 }}
        />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[14px] ${habit.archived ? 'text-muted' : 'text-ink'}`}>
            {habit.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CapitalTag id={habit.capital} size="xs" />
            <span className="text-[10px] text-muted">
              {habit.days.length === 0 ? '매일' : habit.days.map((d) => WEEKDAY_LABELS[d]).join('·')}
            </span>
            {habit.cue ? <span className="text-[10px] text-muted">· {habit.cue}</span> : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="tnum text-[13px] font-medium text-ink">{rateLabel}</div>
          <div className="tnum text-[10px] text-muted">연속 {streak}일</div>
        </div>
      </div>

      {/* 좁은 화면에서는 아래 줄에 항상 보이고, 넓은 화면에서는 hover로만 뜬다 */}
      <div className="mt-1.5 flex items-center gap-0.5 pl-4 transition-opacity sm:mt-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button
          type="button"
          onClick={() => moveHabit(habit.id, -1)}
          aria-label="위로"
          className="rounded px-1.5 py-1 text-[11px] text-muted hover:text-ink"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => moveHabit(habit.id, 1)}
          aria-label="아래로"
          className="rounded px-1.5 py-1 text-[11px] text-muted hover:text-ink"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded px-1.5 py-1 text-[11px] text-muted hover:text-ink"
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => archiveHabit(habit.id, !habit.archived)}
          className="rounded px-1.5 py-1 text-[11px] text-muted hover:text-ink"
        >
          {habit.archived ? '복구' : '보관'}
        </button>
        {confirming ? (
          <button
            type="button"
            onClick={() => deleteHabit(habit.id)}
            className="rounded px-1.5 py-1 text-[11px] font-medium text-[var(--critical)]"
          >
            정말 삭제
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded px-1.5 py-1 text-[11px] text-muted hover:text-[var(--critical)]"
          >
            삭제
          </button>
        )}
      </div>
    </li>
  )
}

export function Habits() {
  const state = useAppState()
  const [adding, setAdding] = useState(false)
  const days = elapsedDaysInMonth(monthKey(todayKey()))

  const sorted = [...state.habits].sort((a, b) => a.order - b.order)
  const live = sorted.filter((h) => !h.archived)
  const archived = sorted.filter((h) => h.archived)

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-ink">습관</h1>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            습관 하나하나가 어떤 자본을 키우는지 정해 두면, 아비투스가 어디로 기우는지 보입니다
          </p>
        </div>
        <Button variant="solid" onClick={() => setAdding((v) => !v)}>
          + 습관
        </Button>
      </div>

      {adding ? (
        <HabitForm
          initial={emptyDraft}
          submitLabel="추가"
          onCancel={() => setAdding(false)}
          onSubmit={(d) => {
            addHabit({
              name: d.name.trim(),
              capital: d.capital,
              cue: d.cue.trim(),
              days: d.days,
            })
            setAdding(false)
          }}
        />
      ) : null}

      <Card>
        <CardHeader title={`실행 중 ${live.length}개`} hint="이번 달 기준 달성률" />
        <ul className="px-2 pb-2">
          {live.map((h) => {
            const s = habitStats(state, h, days)
            return (
              <HabitRow
                key={h.id}
                habit={h}
                rateLabel={s.rate.total ? `${pct(s.rate)}%` : '–'}
                streak={s.streak}
              />
            )
          })}
        </ul>
      </Card>

      {archived.length ? (
        <Card>
          <CardHeader title={`보관 ${archived.length}개`} hint="기록은 남고 오늘 목록에서만 빠집니다" />
          <ul className="px-2 pb-2">
            {archived.map((h) => {
              const s = habitStats(state, h, days)
              return (
                <HabitRow
                  key={h.id}
                  habit={h}
                  rateLabel={s.rate.total ? `${pct(s.rate)}%` : '–'}
                  streak={s.streak}
                />
              )
            })}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="7자본이란" hint="도리스 메르틴이 정리한 아비투스의 축" />
        <ul className="space-y-2 px-4 pb-4">
          {CAPITALS.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: capitalColor(c.id) }}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink">
                  {c.emoji} {c.name} · <span className="font-normal text-ink2">{c.tagline}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{c.hint}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
