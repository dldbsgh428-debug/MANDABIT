import { useState } from 'react'
import { CAPITALS, capitalColor } from '../../data/capitals'
import { addDays, minutesOf } from '../../lib/date'
import { addBlock, copyBlocksFrom, removeBlock, seedBlocks, updateBlock } from '../../lib/store'
import type { CapitalId, DayEntry, TimeBlock } from '../../types'
import { Button, Card, CardHeader, EmptyState, TextInput } from '../ui'

function CapitalSelect({
  value,
  onChange,
}: {
  value: CapitalId | null
  onChange: (v: CapitalId | null) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || null) as CapitalId | null)}
      className="rounded-lg bg-sunken px-2 py-1.5 text-[12px] text-ink2 focus:outline-none"
    >
      <option value="">자본 없음</option>
      {CAPITALS.map((c) => (
        <option key={c.id} value={c.id}>
          {c.emoji} {c.name}
        </option>
      ))}
    </select>
  )
}

function BlockRow({
  date,
  block,
  editable,
}: {
  date: string
  block: TimeBlock
  editable: boolean
}) {
  const [open, setOpen] = useState(false)
  const color = block.capital ? capitalColor(block.capital) : 'var(--axis)'

  return (
    <li className="group">
      <div className="flex items-stretch gap-3 px-4 py-2">
        <div className="tnum w-[52px] shrink-0 pt-0.5 text-right">
          <div className="text-[12px] font-medium text-ink2">{block.start}</div>
          <div className="text-[10px] text-muted">{block.end}</div>
        </div>

        <div className="relative flex w-3 shrink-0 justify-center">
          <span className="absolute inset-y-0 w-px" style={{ background: 'var(--grid)' }} />
          <span
            className="relative mt-1.5 size-2.5 rounded-full ring-2"
            style={{
              background: block.done ? color : 'var(--surface)',
              // 겹치는 마크는 테두리 대신 서피스 링으로 떼어 놓는다.
              boxShadow: `0 0 0 2px var(--surface)`,
              borderColor: color,
              borderWidth: 1.5,
              borderStyle: 'solid',
            }}
          />
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <button
            type="button"
            disabled={!editable}
            onClick={() => updateBlock(date, block.id, { done: !block.done })}
            className="block w-full text-left"
          >
            <span
              className={`block text-[14px] leading-snug ${
                block.done ? 'text-muted line-through' : 'text-ink'
              }`}
            >
              {block.title || '제목 없음'}
            </span>
          </button>
          {block.capital ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted">
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
              {CAPITALS.find((c) => c.id === block.capital)?.name}
            </span>
          ) : null}
        </div>

        {editable ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={`${block.title} 수정`}
            className="h-7 shrink-0 rounded-lg px-2 text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-sunken hover:text-ink2"
          >
            수정
          </button>
        ) : null}
      </div>

      {open && editable ? (
        <div className="mx-4 mb-3 space-y-2 rounded-xl bg-sunken p-3">
          <div className="flex flex-wrap items-center gap-2">
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
            <CapitalSelect
              value={block.capital}
              onChange={(v) => updateBlock(date, block.id, { capital: v })}
            />
          </div>
          <TextInput
            value={block.title}
            placeholder="무엇을 하나요?"
            onChange={(e) => updateBlock(date, block.id, { title: e.target.value })}
            className="!bg-surface"
          />
          <div className="flex justify-between">
            <Button variant="quiet" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button variant="danger" onClick={() => removeBlock(date, block.id)}>
              삭제
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function TimeBlocks({
  date,
  entry,
  editable,
}: {
  date: string
  entry: DayEntry
  editable: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<{ start: string; end: string; title: string; capital: CapitalId | null }>({
    start: '09:00',
    end: '10:00',
    title: '',
    capital: null,
  })

  const blocks = [...entry.blocks].sort((a, b) => minutesOf(a.start) - minutesOf(b.start))
  const doneCount = blocks.filter((b) => b.done).length

  function submit() {
    if (!draft.title.trim()) return
    addBlock(date, { ...draft, title: draft.title.trim() })
    setDraft({ ...draft, title: '' })
    setAdding(false)
  }

  return (
    <Card>
      <CardHeader
        title="하루 계획표"
        hint={blocks.length ? `${doneCount} / ${blocks.length} 블록 완료` : '시간에 자본을 배분하세요'}
        action={
          editable ? (
            <Button onClick={() => setAdding((v) => !v)} variant="ghost">
              + 블록
            </Button>
          ) : null
        }
      />

      {blocks.length === 0 ? (
        <EmptyState
          title="아직 계획이 비어 있어요"
          body="기본 틀로 시작하거나 어제 계획을 그대로 가져올 수 있어요. 시간마다 어떤 자본을 키울지 정해두면 하루가 흐트러지지 않습니다."
          action={
            editable ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="solid" onClick={() => seedBlocks(date)}>
                  기본 틀 넣기
                </Button>
                <Button onClick={() => copyBlocksFrom(addDays(date, -1), date)}>
                  어제 계획 가져오기
                </Button>
              </div>
            ) : null
          }
        />
      ) : (
        <ul className="pb-1">
          {blocks.map((b) => (
            <BlockRow key={b.id} date={date} block={b} editable={editable} />
          ))}
        </ul>
      )}

      {adding && editable ? (
        <div className="mx-4 mb-4 space-y-2 rounded-xl bg-sunken p-3">
          <div className="flex flex-wrap items-center gap-2">
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
            <CapitalSelect value={draft.capital} onChange={(v) => setDraft({ ...draft, capital: v })} />
          </div>
          <TextInput
            autoFocus
            value={draft.title}
            placeholder="무엇을 하나요?"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="!bg-surface"
          />
          <div className="flex gap-2">
            <Button variant="solid" onClick={submit} disabled={!draft.title.trim()}>
              추가
            </Button>
            <Button variant="quiet" onClick={() => setAdding(false)}>
              취소
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
