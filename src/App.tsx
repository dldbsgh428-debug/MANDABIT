import { useEffect, useState } from 'react'
import { useAppState } from './lib/store'
import { Today } from './screens/Today'
import { Capitals } from './screens/Capitals'
import { More } from './screens/More'
import { Plan } from './screens/Plan'
import { Onboarding } from './screens/Onboarding'
import { InstallPrompt } from './components/InstallPrompt'

type TabId = 'today' | 'capitals' | 'plan' | 'more'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'today', label: '오늘', icon: '◎' },
  { id: 'capitals', label: '자본', icon: '◈' },
  { id: 'plan', label: '계획', icon: '▤' },
  { id: 'more', label: '더보기', icon: '⋯' },
]

export default function App() {
  const state = useAppState()
  const [tab, setTab] = useState<TabId>('today')

  // 테마는 문서 루트의 data-theme으로만 표현한다. 'system'이면 속성을 지운다.
  useEffect(() => {
    const root = document.documentElement
    if (state.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', state.theme)
  }, [state.theme])

  if (!state.onboarded) return <Onboarding />

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
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-28">
        {tab === 'today' ? (
          <div className="space-y-3">
            <InstallPrompt />
            <Today />
          </div>
        ) : null}
        {tab === 'capitals' ? <Capitals /> : null}
        {tab === 'plan' ? <Plan /> : null}
        {tab === 'more' ? <More /> : null}
      </main>

      {/* 폰에서 엄지로 닿는 자리에 두는 탭 바 */}
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
