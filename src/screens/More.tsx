import { useRef, useState } from 'react'
import { CAPITALS, capital, capitalColor } from '../data/capitals'
import { WEEKDAY_LABELS, todayKey } from '../lib/date'
import {
  addAction,
  archiveAction,
  deleteAction,
  exportJson,
  importJson,
  moveAction,
  resetAll,
  setOnboarded,
  setTheme,
  updateAction,
  useAppState,
} from '../lib/store'
import { ALL_WEEKDAYS, capitalStats } from '../lib/stats'
import type { Action, CapitalId, ThemePref, Weekday } from '../types'
import { Button, Card, CardHead, Empty, Field, TextInput } from '../components/ui'

function DayPicker({ value, onChange }: { value: Weekday[]; onChange: (v: Weekday[]) => void }) {
  const everyday = value.length === 0
  return (
    <div>
      <div className="flex gap-1">
        {ALL_WEEKDAYS.map((d) => {
          const on = everyday || value.includes(d)
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const base = everyday ? [...ALL_WEEKDAYS] : value
                const next = base.includes(d) ? base.filter((x) => x !== d) : [...base, d]
                onChange(next.length === 7 ? [] : next.sort())
              }}
              className={`min-h-10 flex-1 rounded-xl text-[12px] font-medium transition-colors ${
                on ? 'bg-[var(--accent)] text-white' : 'bg-surface text-muted ring-1 ring-hair'
              }`}
            >
              {WEEKDAY_LABELS[d]}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">{everyday ? '매일' : `주 ${value.length}회`}</p>
    </div>
  )
}

interface Draft {
  title: string
  capital: CapitalId
  cue: string
  days: Weekday[]
}

const emptyDraft: Draft = { title: '', capital: 'psych', cue: '', days: [] }

function ActionForm({
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
    <div className="space-y-3 rounded-2xl bg-sunken p-3">
      <Field label="무엇을 하나요?">
        <TextInput
          autoFocus
          value={draft.title}
          placeholder="예) 책 30분 읽기"
          className="!bg-surface"
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </Field>

      <Field label="어떤 자본이 자라나요?" hint={`${c.emoji} ${c.grows}`}>
        <div className="grid grid-cols-4 gap-1.5">
          {CAPITALS.map((cc) => {
            const on = draft.capital === cc.id
            return (
              <button
                key={cc.id}
                type="button"
                aria-pressed={on}
                onClick={() => setDraft({ ...draft, capital: cc.id })}
                className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-1 text-[11px] transition-colors ${
                  on ? 'bg-surface text-ink ring-2 ring-[var(--accent)]' : 'bg-surface text-muted ring-1 ring-hair'
                }`}
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: capitalColor(cc.id) }}
                />
                {cc.short}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="언제 하나요? (선택)">
        <TextInput
          value={draft.cue}
          placeholder="예) 자기 전"
          className="!bg-surface"
          onChange={(e) => setDraft({ ...draft, cue: e.target.value })}
        />
      </Field>

      <Field label="요일">
        <DayPicker value={draft.days} onChange={(v) => setDraft({ ...draft, days: v })} />
      </Field>

      <div className="flex gap-2">
        <Button variant="solid" disabled={!draft.title.trim()} onClick={() => onSubmit(draft)}>
          {submitLabel}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  )
}

function ActionRow({ action }: { action: Action }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (editing) {
    return (
      <li className="px-1 py-1">
        <ActionForm
          initial={{
            title: action.title,
            capital: action.capital,
            cue: action.cue ?? '',
            days: action.days,
          }}
          submitLabel="저장"
          onCancel={() => setEditing(false)}
          onSubmit={(d) => {
            updateAction(action.id, {
              title: d.title.trim(),
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
    <li className="rounded-2xl px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ background: capitalColor(action.capital), opacity: action.archived ? 0.3 : 1 }}
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[14px] ${action.archived ? 'text-muted' : 'text-ink'}`}>
            {action.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {capital(action.capital).short} ·{' '}
            {action.days.length === 0 ? '매일' : action.days.map((d) => WEEKDAY_LABELS[d]).join('·')}
            {action.cue ? ` · ${action.cue}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex gap-0.5 pl-4">
        <button
          type="button"
          aria-label="위로"
          onClick={() => moveAction(action.id, -1)}
          className="rounded-lg px-2 py-1 text-[11px] text-muted active:bg-sunken"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="아래로"
          onClick={() => moveAction(action.id, 1)}
          className="rounded-lg px-2 py-1 text-[11px] text-muted active:bg-sunken"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg px-2 py-1 text-[11px] text-muted active:bg-sunken"
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => archiveAction(action.id, !action.archived)}
          className="rounded-lg px-2 py-1 text-[11px] text-muted active:bg-sunken"
        >
          {action.archived ? '복구' : '보관'}
        </button>
        {confirming ? (
          <button
            type="button"
            onClick={() => deleteAction(action.id)}
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--crit)]"
          >
            정말 삭제
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg px-2 py-1 text-[11px] text-muted active:bg-sunken"
          >
            삭제
          </button>
        )}
      </div>
    </li>
  )
}

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: '시스템' },
  { id: 'light', label: '라이트' },
  { id: 'dark', label: '다크' },
]

export function More() {
  const state = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<{ good: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)

  const sorted = [...state.actions].sort((a, b) => a.order - b.order)
  const live = sorted.filter((a) => !a.archived)
  const archived = sorted.filter((a) => a.archived)
  const stats = capitalStats(state, todayKey())
  const empty = stats.filter((s) => s.actionCount === 0)

  function download() {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habitus-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ good: true, text: '백업 파일을 내려받았습니다.' })
  }

  async function upload(file: File) {
    const result = importJson(await file.text())
    setMessage(result.ok ? { good: true, text: '백업을 불러왔습니다.' } : { good: false, text: result.error })
  }

  return (
    <div className="space-y-3">
      <header className="px-1 pt-1">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">더보기</h1>
      </header>

      <Card>
        <CardHead
          title={`행동 ${live.length}개`}
          hint="자주 못 할 일은 요일을 줄이세요. 지킬 수 있는 크기가 중요합니다."
          action={
            <Button size="sm" variant="solid" onClick={() => setAdding((v) => !v)}>
              + 행동
            </Button>
          }
        />

        {adding ? (
          <div className="px-3 pb-3">
            <ActionForm
              initial={emptyDraft}
              submitLabel="추가"
              onCancel={() => setAdding(false)}
              onSubmit={(d) => {
                addAction({
                  title: d.title.trim(),
                  capital: d.capital,
                  cue: d.cue.trim(),
                  days: d.days,
                })
                setAdding(false)
              }}
            />
          </div>
        ) : null}

        {live.length === 0 ? (
          <Empty title="행동이 없어요" body="행동을 하나 추가하면 오늘 화면에 나타납니다." />
        ) : (
          <ul className="px-1 pb-2">
            {live.map((a) => (
              <ActionRow key={a.id} action={a} />
            ))}
          </ul>
        )}

        {empty.length ? (
          <p className="mx-4 mb-4 rounded-xl bg-sunken px-3 py-2.5 text-[11px] leading-relaxed text-ink2">
            아직 행동이 없는 자본:{' '}
            <span className="font-medium text-ink">
              {empty.map((g) => `${g.emoji} ${g.name}`).join(' · ')}
            </span>
            . 이 자본들은 기록에 잡히지 않습니다.
          </p>
        ) : null}
      </Card>

      {archived.length ? (
        <Card>
          <CardHead title={`보관 ${archived.length}개`} hint="기록은 남고 오늘 목록에서만 빠집니다" />
          <ul className="px-1 pb-2">
            {archived.map((a) => (
              <ActionRow key={a.id} action={a} />
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHead title="테마" />
        <div className="flex gap-1.5 px-4 pb-4">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={state.theme === t.id}
              onClick={() => setTheme(t.id)}
              className={`min-h-10 flex-1 rounded-xl text-[12px] font-medium transition-colors ${
                state.theme === t.id
                  ? 'bg-sunken text-ink ring-2 ring-[var(--accent)]'
                  : 'bg-sunken text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead title="백업" hint="기록은 이 폰에만 저장됩니다. 기기를 바꾸기 전에 내보내세요." />
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <Button variant="solid" onClick={download}>
            내보내기
          </Button>
          <Button onClick={() => fileRef.current?.click()}>불러오기</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void upload(f)
              e.target.value = ''
            }}
          />
        </div>
        {message ? (
          <p
            className="px-4 pb-4 text-[11px]"
            style={{ color: message.good ? 'var(--good)' : 'var(--crit)' }}
          >
            {message.text}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHead title="다시 설정" hint="기록은 그대로 두고 처음 설정 화면만 다시 봅니다." />
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {confirmRestart ? (
            <>
              <Button variant="solid" onClick={() => setOnboarded(false)}>
                설정 화면 열기
              </Button>
              <Button variant="quiet" onClick={() => setConfirmRestart(false)}>
                취소
              </Button>
            </>
          ) : (
            <Button onClick={() => setConfirmRestart(true)}>처음 설정 다시 보기</Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHead title="전체 초기화" hint="행동과 기록이 모두 지워집니다. 되돌릴 수 없습니다." />
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {confirmReset ? (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  resetAll()
                  setConfirmReset(false)
                }}
              >
                정말 초기화합니다
              </Button>
              <Button variant="quiet" onClick={() => setConfirmReset(false)}>
                취소
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              전체 초기화
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
