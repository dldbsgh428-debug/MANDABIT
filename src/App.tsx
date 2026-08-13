import { useEffect, useState } from 'react'
import { todayKey } from './lib/date'
import { useAppState } from './lib/store'
import { Today } from './pages/Today'
import { Tracker } from './pages/Tracker'
import { Insights } from './pages/Insights'
import { Habits } from './pages/Habits'
import { Settings } from './pages/Settings'

type TabId = 'today' | 'tracker' | 'insights' | 'habits' | 'settings'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'today', label: '오늘', icon: '◎' },
  { id: 'tracker', label: '트래커', icon: '▦' },
  { id: 'insights', label: '아비투스', icon: '◈' },
  { id: 'habits', label: '습관', icon: '☰' },
  { id: 'settings', label: '설정', icon: '⚙' },
]

export default function App() {
  const state = useAppState()
  const [tab, setTab] = useState<TabId>('today')
  const [date, setDate] = useState(todayKey())

  // 테마는 문서 루트의 data-theme으로만 표현한다. 'system'이면 속성을 지운다.
  useEffect(() => {
    const root = document.documentElement
    if (state.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', state.theme)
  }, [state.theme])

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-hair bg-page/85 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 py-3">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-lg text-[13px] font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            H
          </span>
          <div className="min-w-0">
            <div className="text-[13px] leading-none font-bold tracking-[0.18em] text-ink">
              HABITUS
            </div>
            <div className="mt-1 text-[10px] leading-none text-muted">
              반복이 취향이 되고, 취향이 나가 된다
            </div>
          </div>
        </div>

        <nav aria-label="화면 전환" className="hide-scrollbar overflow-x-auto px-2 pb-1.5">
          <ul className="flex gap-1">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                      active ? 'bg-sunken text-ink' : 'text-muted hover:text-ink2'
                    }`}
                  >
                    <span aria-hidden className="text-[11px] opacity-70">
                      {t.icon}
                    </span>
                    {t.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main className="flex-1 px-4 py-4 pb-16">
        {tab === 'today' ? <Today date={date} onDateChange={setDate} /> : null}
        {tab === 'tracker' ? <Tracker onOpenDay={(d) => { setDate(d); setTab('today') }} /> : null}
        {tab === 'insights' ? <Insights /> : null}
        {tab === 'habits' ? <Habits /> : null}
        {tab === 'settings' ? <Settings /> : null}
      </main>

      <footer className="px-4 pb-6 text-center text-[10px] leading-relaxed text-muted">
        모든 기록은 이 브라우저에만 저장됩니다 · 설정에서 백업하세요
      </footer>
    </div>
  )
}
