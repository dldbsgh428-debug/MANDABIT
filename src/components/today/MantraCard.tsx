import { useState } from 'react'
import { mantraForDate } from '../../data/mantras'
import { setPinnedMantra, setReflection } from '../../lib/store'
import type { DayEntry } from '../../types'
import { Button, Card, CapitalTag, TextArea } from '../ui'

/**
 * 아침에 한 줄. 우선순위는 그날 직접 쓴 문장 → 고정해 둔 문장 → 날짜별 프리셋.
 */
export function MantraCard({
  date,
  entry,
  pinned,
}: {
  date: string
  entry: DayEntry
  pinned: string
}) {
  const preset = mantraForDate(date)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [pin, setPin] = useState(false)

  const own = entry.mantra?.trim() || ''
  const text = own || pinned.trim() || preset.text
  const isCustom = Boolean(own || pinned.trim())

  function open() {
    setDraft(text)
    setPin(false)
    setEditing(true)
  }

  function save() {
    const value = draft.trim()
    setReflection(date, { mantra: value })
    if (pin) setPinnedMantra(value)
    setEditing(false)
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative px-4 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Today&apos;s Mantra
          </span>
          {!editing ? (
            <Button variant="quiet" onClick={open} className="-mr-1.5 px-2 py-1 text-[11px]">
              직접 쓰기
            </Button>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-3 space-y-3">
            <TextArea
              rows={3}
              value={draft}
              autoFocus
              placeholder="오늘 나에게 해주고 싶은 한 문장"
              onChange={(e) => setDraft(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-ink2">
              <input
                type="checkbox"
                checked={pin}
                onChange={(e) => setPin(e.target.checked)}
                className="size-3.5 accent-[var(--accent)]"
              />
              이 문장을 기본 만트라로 고정
            </label>
            <div className="flex gap-2">
              <Button variant="solid" onClick={save}>
                저장
              </Button>
              <Button variant="quiet" onClick={() => setEditing(false)}>
                취소
              </Button>
              {isCustom ? (
                <Button
                  variant="quiet"
                  className="ml-auto"
                  onClick={() => {
                    setReflection(date, { mantra: '' })
                    setPinnedMantra('')
                    setEditing(false)
                  }}
                >
                  기본으로 되돌리기
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <blockquote className="mt-2.5 text-[19px] leading-[1.5] font-semibold tracking-tight text-balance text-ink">
              {text}
            </blockquote>
            <div className="mt-3 flex items-center gap-2">
              {!isCustom && preset.capital ? <CapitalTag id={preset.capital} /> : null}
              {isCustom ? (
                <span className="text-[11px] text-muted">내가 쓴 문장</span>
              ) : (
                <span className="text-[11px] text-muted">오늘의 문장</span>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
