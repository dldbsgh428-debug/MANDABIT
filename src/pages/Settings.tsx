import { useRef, useState } from 'react'
import { exportJson, importJson, resetAll, setTheme, useAppState } from '../lib/store'
import { todayKey } from '../lib/date'
import type { ThemePref } from '../types'
import { Button, Card, CardHeader } from '../components/ui'

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: '시스템' },
  { id: 'light', label: '라이트' },
  { id: 'dark', label: '다크' },
]

export function Settings() {
  const state = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const entryCount = Object.keys(state.entries).length

  function download() {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habitus-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ tone: 'good', text: '백업 파일을 내려받았습니다.' })
  }

  async function upload(file: File) {
    const text = await file.text()
    const result = importJson(text)
    setMessage(
      result.ok
        ? { tone: 'good', text: '백업을 불러왔습니다.' }
        : { tone: 'bad', text: result.error },
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">설정</h1>
        <p className="mt-0.5 text-[11px] text-muted">
          기록 {entryCount}일 · 습관 {state.habits.length}개
        </p>
      </div>

      <Card>
        <CardHeader title="테마" />
        <div className="flex gap-1 px-4 pb-4">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={state.theme === t.id}
              onClick={() => setTheme(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                state.theme === t.id
                  ? 'bg-sunken text-ink ring-1 ring-[var(--accent)]'
                  : 'bg-sunken/60 text-muted hover:text-ink2'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="백업과 복원"
          hint="기록은 이 브라우저에만 저장됩니다. 기기를 바꾸기 전에 내보내세요."
        />
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <Button variant="solid" onClick={download}>
            JSON으로 내보내기
          </Button>
          <Button onClick={() => fileRef.current?.click()}>파일에서 불러오기</Button>
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
            style={{ color: message.tone === 'good' ? 'var(--good)' : 'var(--critical)' }}
          >
            {message.text}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="초기화" hint="습관·기록·회고가 모두 지워집니다. 되돌릴 수 없습니다." />
        <div className="flex items-center gap-2 px-4 pb-4">
          {confirmReset ? (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  resetAll()
                  setConfirmReset(false)
                  setMessage({ tone: 'good', text: '기본 상태로 되돌렸습니다.' })
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

      <Card>
        <CardHeader title="HABITUS 사용법" />
        <ol className="space-y-2 px-4 pb-4 text-[12px] leading-relaxed text-ink2">
          <li>
            <span className="font-medium text-ink">1. 습관에 자본을 붙입니다.</span> 그냥 할 일이
            아니라 &lsquo;무엇을 쌓는 일인지&rsquo;를 정합니다.
          </li>
          <li>
            <span className="font-medium text-ink">2. 아침에 만트라를 읽습니다.</span> 기분이 아니라
            문장으로 하루를 엽니다.
          </li>
          <li>
            <span className="font-medium text-ink">3. 시간에 자본을 배분합니다.</span> 계획표의 블록마다
            어떤 자본을 키울지 태그합니다.
          </li>
          <li>
            <span className="font-medium text-ink">4. 저녁에 세 줄만 남깁니다.</span> 잘한 것, 배운 것,
            내일 할 것.
          </li>
          <li>
            <span className="font-medium text-ink">5. 월말에 균형을 봅니다.</span> 얇아진 자본이
            다음 달의 습관이 됩니다.
          </li>
        </ol>
      </Card>
    </div>
  )
}
