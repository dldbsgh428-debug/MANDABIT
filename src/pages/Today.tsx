import { addDays, formatDayLabel, monthKey, todayKey } from '../lib/date'
import { entryFor, useAppState } from '../lib/store'
import { dayRate, monthSummary, pct, scheduledOn } from '../lib/stats'
import { Button, StatTile } from '../components/ui'
import { MantraCard } from '../components/today/MantraCard'
import { TimeBlocks } from '../components/today/TimeBlocks'
import { HabitChecklist } from '../components/today/HabitChecklist'
import { ConditionPicker, Reflection } from '../components/today/DayJournal'

function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = todayKey()
  const isToday = date === today
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h1 className="truncate text-[19px] font-semibold tracking-tight text-ink">
          {formatDayLabel(date)}
        </h1>
        <p className="mt-0.5 text-[11px] text-muted">
          {isToday ? '오늘' : date > today ? '앞으로 올 날' : '지난 기록'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="quiet" onClick={() => onChange(addDays(date, -1))} title="이전 날">
          ‹
        </Button>
        {!isToday ? (
          <Button variant="ghost" onClick={() => onChange(today)}>
            오늘
          </Button>
        ) : null}
        <Button variant="quiet" onClick={() => onChange(addDays(date, 1))} title="다음 날">
          ›
        </Button>
      </div>
    </div>
  )
}

export function Today({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) {
  const state = useAppState()
  const entry = entryFor(date)
  const planned = scheduledOn(state.habits, date)
  const rate = dayRate(state, date)
  const summary = monthSummary(state, monthKey(date), todayKey())

  // 아직 오지 않은 날은 계획만 세우고 체크는 막는다.
  const editable = date <= todayKey()

  return (
    <div className="space-y-3">
      <DateNav date={date} onChange={onDateChange} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="오늘 달성"
          value={pct(rate)}
          unit="%"
          meter={rate.value}
          sub={`${rate.done} / ${rate.total}개`}
        />
        <StatTile
          label="연속 달성"
          value={summary.streak}
          unit="일"
          sub={summary.streak > 0 ? '이어가는 중 🔥' : '오늘 다시 시작'}
          accent={summary.streak > 0 ? 'var(--accent)' : undefined}
        />
        <StatTile
          label="이번 주 평균"
          value={pct(summary.week)}
          unit="%"
          meter={summary.week.value}
        />
        <StatTile
          label="이번 달 누적"
          value={pct(summary.month)}
          unit="%"
          meter={summary.month.value}
          sub={`${summary.checks.done} / ${summary.checks.total}칸`}
        />
      </div>

      <MantraCard date={date} entry={entry} pinned={state.pinnedMantra} />
      <TimeBlocks date={date} entry={entry} editable />
      <HabitChecklist date={date} habits={planned} entry={entry} rate={rate} editable={editable} />
      <ConditionPicker date={date} entry={entry} editable={editable} />
      <Reflection date={date} entry={entry} editable={editable} />
    </div>
  )
}
