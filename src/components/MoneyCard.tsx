import { capitalColor } from '../data/capitals'
import { formatWon } from '../data/tools'
import { moneyEntries, summarizeMoney } from '../lib/entries'
import type { AppState } from '../types'
import { Card, CardHead, TableView } from './ui'

/**
 * 가계부 요약. 적기만 하고 끝나면 소용이 없어서, 어디에 얼마나 썼는지를
 * 돌려주는 것이 이 카드의 일이다.
 */
export function MoneyCard({
  state,
  dates,
  rangeLabel,
}: {
  state: AppState
  dates: string[]
  rangeLabel: string
}) {
  const hasMoneyAction = state.actions.some((a) => a.tool?.kind === 'money' && !a.archived)
  if (!hasMoneyAction) return null

  const entries = moneyEntries(state, dates)
  const s = summarizeMoney(entries, dates.length)
  const color = capitalColor('economy')

  if (entries.length === 0) {
    return (
      <Card>
        <CardHead title="가계부" hint={`${rangeLabel} 기록 없음`} />
        <p className="px-4 pb-4 text-[12px] leading-relaxed text-muted">
          오늘 화면에서 가계부 행동을 누르면 바로 적을 수 있어요. 적은 것은 여기서 분류별로
          정리됩니다.
        </p>
      </Card>
    )
  }

  const spentDays = new Set(entries.filter((e) => e.direction !== 'in').map((e) => e.date)).size

  return (
    <Card>
      <CardHead title="가계부" hint={`${rangeLabel} · ${s.count}건`} />

      <div className="px-4 pb-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-muted">지출</p>
            <p className="tnum mt-1 text-[30px] leading-none font-semibold tracking-tight text-ink">
              {Math.round(s.out).toLocaleString('ko-KR')}
              <span className="ml-1 text-[14px] font-medium text-ink2">원</span>
            </p>
          </div>
          <div className="text-right">
            {s.in > 0 ? (
              <>
                <p className="text-[11px] font-medium text-muted">수입</p>
                <p
                  className="tnum mt-1 text-[16px] leading-none font-semibold"
                  style={{ color: 'var(--good)' }}
                >
                  +{Math.round(s.in).toLocaleString('ko-KR')}
                </p>
              </>
            ) : null}
          </div>
        </div>

        <dl className="tnum mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl bg-sunken px-3 py-2">
            <dt className="text-muted">하루 평균</dt>
            <dd className="mt-0.5 font-medium text-ink">{formatWon(s.perDay)}</dd>
          </div>
          <div className="rounded-xl bg-sunken px-3 py-2">
            <dt className="text-muted">쓴 날</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {spentDays}일 / {dates.length}일
            </dd>
          </div>
        </dl>

        {/* 분류별 지출 — 가로 막대. 항목마다 이름과 금액을 직접 붙인다. */}
        <ul className="mt-4 space-y-2">
          {s.byCategory.slice(0, 6).map((c) => (
            <li key={c.category}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] text-ink2">{c.category}</span>
                <span className="tnum shrink-0 text-[12px] font-medium text-ink">
                  {Math.round(c.amount).toLocaleString('ko-KR')}원
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.max(c.share * 100, 2)}%`, background: color }}
                  />
                </div>
                <span className="tnum w-8 shrink-0 text-right text-[10.5px] text-muted">
                  {Math.round(c.share * 100)}%
                </span>
              </div>
            </li>
          ))}
        </ul>

        {s.byCategory.length > 6 ? (
          <p className="mt-2 text-[10.5px] text-muted">
            그 밖에 {s.byCategory.length - 6}개 분류가 더 있어요
          </p>
        ) : null}
      </div>

      <TableView
        caption="분류별 지출"
        head={['분류', '금액', '비중']}
        rows={s.byCategory.map((c) => [
          c.category,
          `${Math.round(c.amount).toLocaleString('ko-KR')}원`,
          `${Math.round(c.share * 100)}%`,
        ])}
      />

      <div className="px-4 pb-4">
        <p className="mb-1.5 text-[11px] font-medium text-ink2">최근 내역</p>
        <ul className="space-y-1">
          {entries.slice(0, 8).map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-xl bg-sunken px-3 py-2">
              <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-ink2">
                {e.category}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
                {e.memo || e.date.slice(5)}
              </span>
              <span
                className="tnum shrink-0 text-[12.5px] font-medium"
                style={{ color: e.direction === 'in' ? 'var(--good)' : 'var(--ink)' }}
              >
                {e.direction === 'in' ? '+' : '−'}
                {Math.round(e.amount ?? 0).toLocaleString('ko-KR')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
