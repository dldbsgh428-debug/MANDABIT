import { useState } from 'react'
import { CAPITALS, capitalColor } from '../data/capitals'
import { SUGGESTED_ACTIONS, SUGGESTED_REWARDS, type SuggestedAction } from '../data/presets'
import { WEIGHT_LABEL } from '../lib/growth'
import { addActions, addRewards, setOnboarded } from '../lib/store'
import type { CapitalId, Weight } from '../types'
import { Button, TextInput } from '../components/ui'

interface CustomAction {
  title: string
  capital: CapitalId
  weight: Weight
}

const STEPS = ['시작', '행동', '보상'] as const

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [custom, setCustom] = useState<CustomAction[]>([])
  const [pickedRewards, setPickedRewards] = useState<Set<string>>(new Set())
  const [customRewards, setCustomRewards] = useState<{ title: string; cost: number }[]>([])

  const [draftTitle, setDraftTitle] = useState('')
  const [draftCapital, setDraftCapital] = useState<CapitalId>('psych')
  const [draftWeight, setDraftWeight] = useState<Weight>('normal')

  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardCost, setRewardCost] = useState(300)

  const totalActions = picked.size + custom.length

  function toggle(title: string) {
    const next = new Set(picked)
    if (next.has(title)) next.delete(title)
    else next.add(title)
    setPicked(next)
  }

  function toggleReward(title: string) {
    const next = new Set(pickedRewards)
    if (next.has(title)) next.delete(title)
    else next.add(title)
    setPickedRewards(next)
  }

  function addCustom() {
    const title = draftTitle.trim()
    if (!title) return
    setCustom([...custom, { title, capital: draftCapital, weight: draftWeight }])
    setDraftTitle('')
  }

  function addCustomReward() {
    const title = rewardTitle.trim()
    if (!title) return
    setCustomRewards([...customRewards, { title, cost: rewardCost }])
    setRewardTitle('')
  }

  function finish() {
    const fromSuggested: SuggestedAction[] = SUGGESTED_ACTIONS.filter((s) => picked.has(s.title))
    addActions(
      [
        ...fromSuggested.map((s) => ({
          title: s.title,
          capital: s.capital,
          weight: s.weight,
          cue: s.cue,
          days: s.days ?? [],
        })),
        ...custom.map((c) => ({
          title: c.title,
          capital: c.capital,
          weight: c.weight,
          cue: undefined,
          days: [] as never[],
        })),
      ],
      // 오늘부터 세기 시작한다.
      new Date().toISOString().slice(0, 10),
    )

    addRewards([
      ...SUGGESTED_REWARDS.filter((r) => pickedRewards.has(r.title)).map((r) => ({
        title: r.title,
        cost: r.cost,
        emoji: r.emoji,
        repeatable: r.repeatable,
      })),
      ...customRewards.map((r) => ({
        title: r.title,
        cost: r.cost,
        emoji: '🎁',
        repeatable: true,
      })),
    ])

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
                한 일이 어느 자본에 쌓였는지 레벨로 보여줍니다.
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
                행동을 하면 <span className="font-medium text-ink">경험치</span>가 쌓여 레벨이
                오르고, 같은 양이 <span className="font-medium text-ink">여유</span>로 들어옵니다.
                여유는 직접 정한 보상으로 바꿔 씁니다.
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
                            <span className="shrink-0 text-[10.5px] text-muted">
                              {WEIGHT_LABEL[s.weight]}
                            </span>
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

              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1">
                  {(['light', 'normal', 'deep'] as Weight[]).map((w) => (
                    <button
                      key={w}
                      type="button"
                      aria-pressed={draftWeight === w}
                      onClick={() => setDraftWeight(w)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] transition-colors ${
                        draftWeight === w
                          ? 'bg-surface text-ink ring-2 ring-[var(--accent)]'
                          : 'bg-surface text-muted ring-1 ring-hair'
                      }`}
                    >
                      {WEIGHT_LABEL[w]}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="solid" className="ml-auto" disabled={!draftTitle.trim()} onClick={addCustom}>
                  추가
                </Button>
              </div>
            </section>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="animate-rise space-y-4 pt-4">
            <div>
              <h2 className="text-[20px] font-semibold tracking-tight text-ink">
                무엇으로 바꾸시겠어요?
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                쌓기만 하고 쓸 데가 없으면 오래 못 갑니다. 하루에 100 안팎을 법니다.
              </p>
            </div>

            <ul className="space-y-1.5">
              {SUGGESTED_REWARDS.map((r) => {
                const on = pickedRewards.has(r.title)
                return (
                  <li key={r.title}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleReward(r.title)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        on ? 'bg-surface ring-2 ring-[var(--accent)]' : 'bg-surface ring-1 ring-hair'
                      }`}
                    >
                      <span aria-hidden className="text-[18px]">
                        {r.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{r.title}</span>
                      <span className="tnum shrink-0 text-[11px] text-muted">{r.cost}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <section className="rounded-2xl bg-sunken p-3">
              <h3 className="mb-2 text-[12px] font-medium text-ink">직접 쓰기</h3>
              {customRewards.length > 0 ? (
                <ul className="mb-2 space-y-1">
                  {customRewards.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-[12px]"
                    >
                      <span className="min-w-0 flex-1 truncate text-ink">🎁 {r.title}</span>
                      <span className="tnum shrink-0 text-muted">{r.cost}</span>
                      <button
                        type="button"
                        aria-label="빼기"
                        onClick={() => setCustomRewards(customRewards.filter((_, j) => j !== i))}
                        className="shrink-0 px-1 text-muted"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <TextInput
                value={rewardTitle}
                placeholder="예) 주말에 늦잠 자기"
                className="!bg-surface"
                onChange={(e) => setRewardTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomReward()}
              />
              <div className="mt-2 flex items-center gap-2">
                <TextInput
                  type="number"
                  min={10}
                  step={10}
                  value={rewardCost}
                  className="!w-28 !bg-surface"
                  onChange={(e) => setRewardCost(Math.max(10, Number(e.target.value) || 0))}
                />
                <span className="text-[11px] text-muted">여유</span>
                <Button
                  size="sm"
                  variant="solid"
                  className="ml-auto"
                  disabled={!rewardTitle.trim()}
                  onClick={addCustomReward}
                >
                  추가
                </Button>
              </div>
            </section>

            <p className="px-1 text-[11px] leading-relaxed text-muted">
              휴식권(🛌 150)은 기본으로 들어갑니다. 사두면 그날은 쉬어도 연속 기록이 끊기지 않아요.
            </p>
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
            {step === 2 ? `${pickedRewards.size + customRewards.length}개 선택함` : null}
          </span>

          {step < 2 ? (
            <Button
              variant="solid"
              disabled={step === 1 && totalActions === 0}
              onClick={() => setStep(step + 1)}
            >
              {step === 0 ? '시작하기' : '다음'}
            </Button>
          ) : (
            <Button variant="solid" onClick={finish}>
              완료
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
