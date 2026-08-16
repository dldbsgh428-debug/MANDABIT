import { useEffect, useState } from 'react'
import { Button, Card } from './ui'

/** 크롬 계열이 설치 가능해질 때 던지는 이벤트 (타입 정의에 아직 없다) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'habitus.installDismissed'

/** 이미 홈 화면 앱으로 실행 중인가 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS 사파리는 표준 대신 navigator.standalone을 쓴다
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * 홈 화면에 추가하도록 안내한다.
 * 안드로이드·데스크톱 크롬은 실제 설치 창을 띄울 수 있고, iOS 사파리는
 * 그런 API가 없어 공유 메뉴를 손으로 짚어 줘야 한다.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || dismissed) return null
  // iOS는 설치 이벤트가 없으므로 안내만이라도 띄우고, 그 외 브라우저는
  // 실제로 설치할 수 있을 때만 띄운다.
  if (!deferred && !isIos()) return null

  function close() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // 저장이 막혀도 이번 세션에서는 닫힌 채로 둔다.
    }
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null)
  }

  return (
    <Card className="animate-rise">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          H
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">홈 화면에 추가하세요</p>
          {isIos() && !deferred ? (
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
              사파리 아래 <span className="font-medium text-ink2">공유 􀈂</span> →{' '}
              <span className="font-medium text-ink2">홈 화면에 추가</span>를 누르면 앱처럼 전체
              화면으로 열리고 인터넷 없이도 동작합니다.
            </p>
          ) : (
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
              앱처럼 전체 화면으로 열리고, 인터넷이 없어도 그대로 동작합니다.
            </p>
          )}

          <div className="mt-2.5 flex gap-2">
            {deferred ? (
              <Button size="sm" variant="solid" onClick={() => void install()}>
                설치하기
              </Button>
            ) : null}
            <Button size="sm" variant="quiet" onClick={close}>
              나중에
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
