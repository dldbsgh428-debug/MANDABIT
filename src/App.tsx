import { useEffect, useState } from 'react'
import { todayKey } from './lib/date'
import { balanceXp, capitalGrowth } from './lib/growth'
import { markLevelSeen, useAppState } from './lib/store'
import { Today } from './screens/Today'
import { Growth } from './screens/Growth'
import { Rewards } from './screens/Rewards'
import { More } from './screens/More'
import { Onboarding } from './screens/Onboarding'
import type { CapitalId } from './types'

type TabId = 'today' | 'growth' | 'rewards' | 'plan' | 'more'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'today', label: '오늘', icon: '◎' },
  { id: 'growth', label: '성장', icon: '◈' },
  { id: 'rewards', label: '보상', icon: '◇' },
  { id: 'plan', label: '계획', icon: '▤' },
  { id: 'more', label: '더보기', icon: '⋯' },
]

function LevelUpToast({
  name,
  emoji,
  level,
  color,
  onClose,
}: {
  name: string
  emoji: string
  level: number
  color: string
  onClose: () => void
}) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 4200)
    return () => window.clearTimeout(t)
  }, [onClose])

  return (
    <div
      role="status"
      className="animate-rise fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl bg-raised px-4 py-3 shadow-[var(--shadow-pop)] ring-1 ring-hair"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl text-white"
          style={{ background: color }}
        >
          <span className="text-[9px] leading-none opacity-85">Lv</span>
          <span className="tnum text-[16px] leading-none font-bold">{level}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">
            {emoji} {name} 레벨 {level}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">쌓인 건 사라지지 않습니다.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-muted active:bg-sunken"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const state = useAppState()
  const [tab, setTab] = useState<TabId>('today')
  const [celebrate, setCelebrate] = useState<{
    id: CapitalId
    name: string
    emoji: string
    level: number
    color: string
  } | null>(null)

  // 테마는 문서 루트의 data-theme으로만 표현한다. 'system'이면 속성을 지운다.
  useEffect(() => {
    const root = document.documentElement
    if (state.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', state.theme)
  }, [state.theme])

  // 레벨이 저장된 '본 레벨'을 넘어서면 축하를 한 번 띄운다.
  useEffect(() => {
    if (!state.onboarded) return
    const growth = capitalGrowth(state, todayKey())
    for (const g of growth) {
      const seen = state.seenLevels[g.id] ?? 1
      if (g.level > seen) {
        setCelebrate({ id: g.id, name: g.name, emoji: g.emoji, level: g.level, color: `var(${g.cssVar})` })
        markLevelSeen(g.id, g.level)
        break
      }
      if (g.level < seen) markLevelSeen(g.id, g.level)
    }
  }, [state])

  if (!state.onboarded) return <Onboarding />

  const balance = balanceXp(state)

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <header className="safe-top sticky top-0 z-20 border-b border-hair bg-page/85 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-lg text-[11px] font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            H
          </span>
          <span className="text-[12px] font-bold tracking-[0.18em] text-ink">HABITUS</span>

          {/* 잔고는 늘 보이게 — 쓸 수 있다는 걸 잊지 않도록 */}
          <button
            type="button"
            onClick={() => setTab('rewards')}
            className="tnum ml-auto rounded-full bg-sunken px-2.5 py-1 text-[12px] font-semibold text-ink active:opacity-80"
          >
            {balance} <span className="text-[10px] font-medium text-muted">여유</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-28">
        {tab === 'today' ? <Today /> : null}
        {tab === 'growth' ? <Growth /> : null}
        {tab === 'rewards' ? <Rewards /> : null}
        {tab === 'plan' ? (
          <div className="space-y-3">
            <header className="px-1 pt-1">
              <h1 className="text-[22px] font-semibold tracking-tight text-ink">계획</h1>
            </header>
            <div className="rounded-2xl bg-surface px-5 py-10 text-center ring-1 ring-hair">
              <p className="text-sm font-medium text-ink">다음 단계에서 만듭니다</p>
              <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted">
                시간 블록에 자본을 배분하는 하루 계획표와 주간 보기가 들어갑니다.
              </p>
            </div>
          </div>
        ) : null}
        {tab === 'more' ? <More /> : null}
      </main>

      {celebrate ? (
        <LevelUpToast
          name={celebrate.name}
          emoji={celebrate.emoji}
          level={celebrate.level}
          color={celebrate.color}
          onClose={() => setCelebrate(null)}
        />
      ) : null}

      <nav
        aria-label="화면 전환"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-page/95 backdrop-blur-md"
      >
        <ul className="mx-auto flex max-w-2xl">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <li key={t.id} className="flex-1">
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(t.id)}
                  className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? 'text-ink' : 'text-muted'
                  }`}
                >
                  <span aria-hidden className="text-[15px] leading-none">
                    {t.icon}
                  </span>
                  <span className="text-[10.5px] font-medium">{t.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
