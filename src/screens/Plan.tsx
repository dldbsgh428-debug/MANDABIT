import { useState } from 'react'
import { CAPITALS, capital, capitalColor } from '../data/capitals'
import { addDays, formatDay, minutesOf, todayKey, weekOf } from '../lib/date'
import {
  addBlock,
  copyBlocks,
  logFor,
  removeBlock,
  seedBlocks,
  updateBlock,
  useAppState,
} from '../lib/store'
import { dayRate, pct, scheduledOn } from '../lib/stats'
import type { CapitalId, PlanBlock } from '../types'
import { Button, Card, CardHead, Empty, TextInput } from '../components/ui'

function CapitalSelect({
  value,
  onChange,
}: {
  value: CapitalId | null
  onChange: (v: CapitalId | null) => void
}) {
  return (
    <div className="hide-scrollbar -mx-1 overflow-x-auto px-1">
      <div className="flex gap-1.5">
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors ${
            value === null
              ? 'bg-surface text-ink ring-2 ring-[var(--accent)]'
              : 'bg-surface text-muted ring-1 ring-hair'
          }`}
        >
          없음
        </button>
        {CAPITALS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={value === c.id}
            onClick={() => onChange(c.id)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors ${
              value === c.id
                ? 'bg-surface text-ink ring-2 ring-[var(--accent)]'
                : 'bg-surface text-muted ring-1 ring-hair'
            }`}
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: capitalColor(c.id) }}
            />
            {c.short}
          </button>
        ))}
      </div>
    </div>
  )
}

function BlockRow({ date, block }: { date: string; block: PlanBlock }) {
  const [open, setOpen] = useState(false)
  const color = block.capital ? capitalColor(block.capital) : 'var(--axis)'

  return (
    <li>
      <div className="flex items-stretch gap-3 px-4 py-2">
        <div className="tnum w-[46px] shrink-0 pt-0.5 text-right">
          <div className="text-[12px] font-medium text-ink2">{block.start}</div>
          <div className="text-[10px] text-muted">{block.end}</div>
        </div>

        <div className="relative flex w-3 shrink-0 justify-center">
          <span aria-hidden className="absolute inset-y-0 w-px" style={{ background: 'var(--grid)' }} />
          <span
            aria-hidden
            className="relative mt-1.5 size-2.5 rounded-full"
            style={{
              background: block.done ? color : 'var(--surface)',
              border: `1.5px solid ${color}`,
              // 겹치는 마크는 테두리가 아니라 서피스 링으로 떼어 놓는다
              boxShadow: '0 0 0 2px var(--surface)',
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => updateBlock(date, block.id, { done: !block.done })}
          aria-pressed={block.done}
          className="min-w-0 flex-1 pb-1 text-left"
        >
          <span
            className={`block text-[14px] leading-snug ${
              block.done ? 'text-muted line-through' : 'text-ink'
            }`}
          >
            {block.title || '제목 없음'}
          </span>
          {block.capital ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted">
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
              {capital(block.capital).name}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`${block.title} 수정`}
          aria-expanded={open}
          className="h-8 shrink-0 rounded-lg px-2 text-[11px] text-muted active:bg-sunken"
        >
          수정
        </button>
      </div>

      {open ? (
        <div className="animate-rise mx-4 mb-3 space-y-2 rounded-xl bg-sunken p-3">
          <div className="flex items-center gap-2">
            <TextInput
              type="time"
              value={block.start}
              onChange={(e) => updateBlock(date, block.id, { start: e.target.value })}
              className="!w-auto !bg-surface"
            />
            <span className="text-xs text-muted">–</span>
            <TextInput
              type="time"
              value={block.end}
              onChange={(e) => updateBlock(date, block.id, { end: e.target.value })}
              className="!w-auto !bg-surface"
            />
          </div>
          <TextInput
            value={block.title}
            placeholder="무엇을 하나요?"
            onChange={(e) => updateBlock(date, block.id, { title: e.target.value })}
            className="!bg-surface"
          />
          <CapitalSelect
            value={block.capital}
            onChange={(v) => updateBlock(date, block.id, { capital: v })}
          />
          <div className="flex justify-between">
            <Button size="sm" variant="quiet" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button size="sm" variant="danger" onClick={() => removeBlock(date, block.id)}>
              삭제
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function Plan() {
  const state = useAppState()
  const today = todayKey()
  const [date, setDate] = useState(today)
  const log = logFor(date)

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<{
    start: string
    end: string
    title: string
    capital: CapitalId | null
  }>({ start: '09:00', end: '10:00', title: '', capital: null })

  const blocks = [...log.blocks].sort((a, b) => minutesOf(a.start) - minutesOf(b.start))
  const doneCount = blocks.filter((b) => b.done).length
  const week = weekOf(date)
  const planned = scheduledOn(state.actions, date)

  // 계획에 자본을 붙여 두면 하루가 어느 쪽으로 기울었는지 미리 보인다
  const byCapital = new Map<CapitalId, number>()
  for (const b of blocks) {
    if (!b.capital) continue
    const span = Math.max(0, minutesOf(b.end) - minutesOf(b.start))
    byCapital.set(b.capital, (byCapital.get(b.capital) ?? 0) + span)
  }
  const totalPlanned = [...byCapital.values()].reduce((a, b) => a + b, 0)

  function submit() {
    if (!draft.title.trim()) return
    addBlock(date, { ...draft, title: draft.title.trim() })
    setDraft({ ...draft, title: '' })
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <header className="px-1 pt-1">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">계획</h1>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
          시간에 자본을 배분해 두면 하루가 흐트러지지 않습니다.
        </p>
      </header>

      {/* 이번 주 — 날짜를 눌러 옮겨 다닌다 */}
      <div className="flex gap-1.5">
        {week.map((d) => {
          const active = d === date
          const r = dayRate(state, d)
          const has = (state.logs[d]?.blocks.length ?? 0) > 0
          return (
            <button
              key={d}
              type="button"
              aria-pressed={active}
              onClick={() => setDate(d)}
              className={`min-h-14 flex-1 rounded-xl py-1.5 transition-colors ${
                active ? 'bg-surface ring-2 ring-[var(--accent)]' : 'bg-sunken'
              }`}
            >
              <span
                className={`block text-[10px] ${d === today ? 'font-bold text-ink' : 'text-muted'}`}
              >
                {['일', '월', '화', '수', '목', '금', '토'][new Date(d).getDay()]}
              </span>
              <span
                className={`tnum block text-[14px] font-semibold ${active ? 'text-ink' : 'text-ink2'}`}
              >
                {Number(d.slice(8))}
              </span>
              <span
                aria-hidden
                className="mx-auto mt-1 block size-1 rounded-full"
                style={{
                  background: has ? 'var(--accent)' : r.done > 0 ? 'var(--axis)' : 'transparent',
                }}
              />
            </button>
          )
        })}
      </div>

      <Card>
        <CardHead
          title={formatDay(date)}
          hint={
            blocks.length
              ? `${doneCount} / ${blocks.length} 블록 완료`
              : `예정된 실천 ${planned.length}개`
          }
          action={
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              + 블록
            </Button>
          }
        />

        {blocks.length === 0 ? (
          <Empty
            title="아직 계획이 비어 있어요"
            body="기본 틀로 시작하거나 어제 계획을 그대로 가져올 수 있어요."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="solid" onClick={() => seedBlocks(date)}>
                  기본 틀 넣기
                </Button>
                <Button size="sm" onClick={() => copyBlocks(addDays(date, -1), date)}>
                  어제 것 가져오기
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="pb-1">
            {blocks.map((b) => (
              <BlockRow key={b.id} date={date} block={b} />
            ))}
          </ul>
        )}

        {adding ? (
          <div className="animate-rise mx-4 mb-4 space-y-2 rounded-xl bg-sunken p-3">
            <div className="flex items-center gap-2">
              <TextInput
                type="time"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                className="!w-auto !bg-surface"
              />
              <span className="text-xs text-muted">–</span>
              <TextInput
                type="time"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                className="!w-auto !bg-surface"
              />
            </div>
            <TextInput
              autoFocus
              value={draft.title}
              placeholder="무엇을 하나요?"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="!bg-surface"
            />
            <CapitalSelect value={draft.capital} onChange={(v) => setDraft({ ...draft, capital: v })} />
            <div className="flex gap-2">
              <Button size="sm" variant="solid" disabled={!draft.title.trim()} onClick={submit}>
                추가
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setAdding(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {totalPlanned > 0 ? (
        <Card>
          <CardHead
            title="이 하루의 배분"
            hint="계획한 시간을 자본별로 나눠 봅니다"
          />
          <div className="px-4 pb-4">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken">
              {CAPITALS.map((c) => {
                const m = byCapital.get(c.id) ?? 0
                if (m === 0) return null
                return (
                  <div
                    key={c.id}
                    title={`${c.name} ${Math.round(m / 60)}시간`}
                    style={{
                      width: `${(m / totalPlanned) * 100}%`,
                      background: capitalColor(c.id),
                      marginRight: 2,
                    }}
                  />
                )
              })}
            </div>
            <ul className="mt-3 space-y-1.5">
              {CAPITALS.filter((c) => (byCapital.get(c.id) ?? 0) > 0)
                .sort((a, b) => (byCapital.get(b.id) ?? 0) - (byCapital.get(a.id) ?? 0))
                .map((c) => {
                  const m = byCapital.get(c.id) ?? 0
                  const h = Math.floor(m / 60)
                  const mm = m % 60
                  return (
                    <li key={c.id} className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: capitalColor(c.id) }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink2">{c.name}</span>
                      <span className="tnum shrink-0 text-[12px] font-medium text-ink">
                        {h > 0 ? `${h}시간` : ''} {mm > 0 ? `${mm}분` : ''}
                      </span>
                    </li>
                  )
                })}
            </ul>
          </div>
        </Card>
      ) : null}

      {planned.length > 0 ? (
        <Card>
          <CardHead
            title="이날 예정된 실천"
            hint={`${pct(dayRate(state, date))}% 실천`}
          />
          <ul className="px-4 pb-4">
            {planned.map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-1">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: capitalColor(a.capital) }}
                />
                <span
                  className={`min-w-0 flex-1 truncate text-[12.5px] ${
                    log.done.includes(a.id) ? 'text-muted line-through' : 'text-ink2'
                  }`}
                >
                  {a.title}
                </span>
                {a.cue ? <span className="shrink-0 text-[10.5px] text-muted">{a.cue}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
