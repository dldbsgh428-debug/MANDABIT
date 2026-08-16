import { useState } from 'react'
import { CAPITALS, capitalColor } from '../data/capitals'
import { SUGGESTED_ACTIONS, type SuggestedAction } from '../data/presets'
import { addActions, setOnboarded } from '../lib/store'
import type { CapitalId } from '../types'
import { Button, TextInput } from '../components/ui'

interface CustomAction {
  title: string
  capital: CapitalId
}

const STEPS = ['시작', '행동'] as const

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [custom, setCustom] = useState<CustomAction[]>([])
  const [draftTitle, setDraftTitle] = useState('')
  const [draftCapital, setDraftCapital] = useState<CapitalId>('psych')

  const totalActions = picked.size + custom.length

  function toggle(title: string) {
    const next = new Set(picked)
    if (next.has(title)) next.delete(title)
    else next.add(title)
    setPicked(next)
  }

  function addCustom() {
    const title = draftTitle.trim()
    if (!title) return
    setCustom([...custom, { title, capital: draftCapital }])
    setDraftTitle('')
  }

  function finish() {
    const fromSuggested: SuggestedAction[] = SUGGESTED_ACTIONS.filter((s) => picked.has(s.title))
    addActions(
      [
        ...fromSuggested.map((s) => ({
          title: s.title,
          capital: s.capital,
          cue: s.cue,
          days: s.days ?? [],
        })),
        ...custom.map((c) => ({
          title: c.title,
          capital: c.capital,
          cue: undefined,
          days: [] as never[],
        })),
      ],
      // 오늘부터 세기 시작한다.
      new Date().toISOString().slice(0, 10),
    )
    setOnboarded(true)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <header className="safe-top sticky top-0 z-20 bg-page/90 px-4 pt-3 pb-2 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-1.5">
              <span
                className="h-1 flex-1 rounded-full transition-colors"
                style={{ background: i <= step ? 'var(--accent)' : 'var(--sunken)' }}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {step + 1} / {STEPS.length} · {STEPS[step]}
        </p>
      </header>

      <main className="flex-1 px-4 pb-32">
        {step === 0 ? (
          <div className="animate-rise space-y-4 pt-6">
            <div>
              <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-balance text-ink">
                반복이 취향이 되고,
                <br />
                취향이 내가 됩니다.
              </h1>
              <p className="mt-3 text-[13px] leading-relaxed text-ink2">
                HABITUS는 할 일을 지우는 앱이 아니라,{' '}
                <span className="font-medium text-ink">일곱 가지 자본을 키우는</span> 앱입니다. 오늘
                한 일이 어느 자본에 쌓였는지 그대로 보여줍니다.
              </p>
            </div>

            <ul className="space-y-1.5">
              {CAPITALS.map((c) => (
                <li key={c.id} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-hair">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: capitalColor(c.id) }}
                  />
                  <span className="text-[13px] font-medium text-ink">
                    {c.emoji} {c.name}
                  </span>
                  <span className="truncate text-[11px] text-muted">{c.tagline}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-sunken px-4 py-3">
              <p className="text-[12px] leading-relaxed text-ink2">
                점수도 레벨도 없습니다. 무엇을 몇 번 했고, 어느 자본이 조용한지만 정직하게
                보여줍니다.
              </p>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="animate-rise space-y-4 pt-4">
            <div>
              <h2 className="text-[20px] font-semibold tracking-tight text-ink">
                무엇을 쌓으시겠어요?
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                끌리는 것만 고르세요. 셋이면 충분합니다. 나중에 얼마든지 바꿀 수 있어요.
              </p>
            </div>

            {CAPITALS.map((c) => {
              const items = SUGGESTED_ACTIONS.filter((s) => s.capital === c.id)
              return (
                <section key={c.id}>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink2">
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ background: capitalColor(c.id) }}
                    />
                    {c.emoji} {c.name}
                  </h3>
                  <ul className="space-y-1.5">
                    {items.map((s) => {
                      const on = picked.has(s.title)
                      return (
                        <li key={s.title}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(s.title)}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                              on ? 'bg-surface ring-2 ring-[var(--accent)]' : 'bg-surface ring-1 ring-hair'
                            }`}
                          >
                            <span
                              aria-hidden
                              className="grid size-5 shrink-0 place-items-center rounded-md text-[11px] text-white"
                              style={{ background: on ? 'var(--accent)' : 'var(--sunken)' }}
                            >
                              {on ? '✓' : ''}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                              {s.title}
                            </span>
                            {s.cue ? (
                              <span className="shrink-0 text-[10.5px] text-muted">{s.cue}</span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}

            <section className="rounded-2xl bg-sunken p-3">
              <h3 className="mb-2 text-[12px] font-medium text-ink">직접 쓰기</h3>
              {custom.length > 0 ? (
                <ul className="mb-2 space-y-1">
                  {custom.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-[12px]"
                    >
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: capitalColor(c.capital) }}
                      />
                      <span className="min-w-0 flex-1 truncate text-ink">{c.title}</span>
                      <button
                        type="button"
                        aria-label="빼기"
                        onClick={() => setCustom(custom.filter((_, j) => j !== i))}
                        className="shrink-0 px-1 text-muted"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <TextInput
                value={draftTitle}
                placeholder="예) 아침에 이불 개기"
                className="!bg-surface"
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              />

              <div className="hide-scrollbar mt-2 -mx-1 overflow-x-auto px-1">
                <div className="flex gap-1.5">
                  {CAPITALS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={draftCapital === c.id}
                      onClick={() => setDraftCapital(c.id)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors ${
                        draftCapital === c.id
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

              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="solid" disabled={!draftTitle.trim()} onClick={addCustom}>
                  추가
                </Button>
              </div>
            </section>
          </div>
        ) : null}

      </main>

      <footer className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-page/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {step > 0 ? (
            <Button variant="quiet" onClick={() => setStep(step - 1)}>
              이전
            </Button>
          ) : null}

          <span className="min-w-0 flex-1 truncate text-[11px] text-muted">
            {step === 1 ? `${totalActions}개 선택함` : null}
          </span>

          {step === 0 ? (
            <Button variant="solid" onClick={() => setStep(1)}>
              시작하기
            </Button>
          ) : (
            <Button variant="solid" disabled={totalActions === 0} onClick={finish}>
              완료
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
