import { CONDITION_FACES } from '../../data/presets'
import { setCondition, setReflection } from '../../lib/store'
import type { Condition, DayEntry } from '../../types'
import { Card, CardHeader, Field, TextArea } from '../ui'

const LEVELS: Condition[] = [1, 2, 3, 4, 5]

export function ConditionPicker({
  date,
  entry,
  editable,
}: {
  date: string
  entry: DayEntry
  editable: boolean
}) {
  const current = entry.condition
  return (
    <Card>
      <CardHeader
        title="오늘의 컨디션"
        hint={current ? CONDITION_FACES[current].label : '이모지 하나로 남기면 한 달 상태가 보여요'}
      />
      <div className="flex gap-2 px-4 pb-4" role="group" aria-label="오늘의 컨디션">
        {LEVELS.map((lv) => {
          const active = current === lv
          return (
            <button
              key={lv}
              type="button"
              disabled={!editable}
              aria-pressed={active}
              aria-label={CONDITION_FACES[lv].label}
              onClick={() => setCondition(date, active ? undefined : lv)}
              className={`flex-1 rounded-xl py-2.5 text-2xl transition-all ${
                active
                  ? 'bg-sunken ring-2 ring-[var(--accent)]'
                  : 'opacity-45 ring-1 ring-hair hover:opacity-100'
              }`}
            >
              {CONDITION_FACES[lv].emoji}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export function Reflection({
  date,
  entry,
  editable,
}: {
  date: string
  entry: DayEntry
  editable: boolean
}) {
  return (
    <Card>
      <CardHeader title="저녁 회고" hint="세 줄이면 충분합니다. 기록이 습관을 데려갑니다." />
      <div className="space-y-3 px-4 pb-4">
        <Field label="잘한 것">
          <TextArea
            rows={2}
            disabled={!editable}
            value={entry.kept ?? ''}
            placeholder="오늘 나를 칭찬할 한 가지"
            onChange={(e) => setReflection(date, { kept: e.target.value })}
          />
        </Field>
        <Field label="배운 것">
          <TextArea
            rows={2}
            disabled={!editable}
            value={entry.learned ?? ''}
            placeholder="다음엔 이렇게 해보자"
            onChange={(e) => setReflection(date, { learned: e.target.value })}
          />
        </Field>
        <Field label="내일 가장 중요한 한 가지">
          <TextArea
            rows={2}
            disabled={!editable}
            value={entry.tomorrow ?? ''}
            placeholder="내일 아침에 바로 시작할 일"
            onChange={(e) => setReflection(date, { tomorrow: e.target.value })}
          />
        </Field>
      </div>
    </Card>
  )
}
