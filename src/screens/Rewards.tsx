import { useState } from 'react'
import { REST_PASS, REWARD_EMOJIS } from '../data/presets'
import { todayKey } from '../lib/date'
import {
  addReward,
  buyReward,
  deleteReward,
  undoPurchase,
  updateReward,
  useAppState,
  type BuyResult,
} from '../lib/store'
import { balanceXp, isRestDay, lifetimeXp, spentXp } from '../lib/growth'
import type { Reward } from '../types'
import { Bar, Button, Card, CardHead, Empty, Field, TextInput } from '../components/ui'

interface Draft {
  title: string
  cost: number
  emoji: string
  repeatable: boolean
}

const emptyDraft: Draft = { title: '', cost: 300, emoji: '🎁', repeatable: true }

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="hide-scrollbar -mx-1 overflow-x-auto px-1">
      <div className="flex gap-1.5">
        {REWARD_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={value === e}
            aria-label={`${e} 선택`}
            onClick={() => onChange(e)}
            className={`grid size-10 shrink-0 place-items-center rounded-xl text-[18px] transition-colors ${
              value === e ? 'bg-surface ring-2 ring-[var(--accent)]' : 'bg-surface ring-1 ring-hair'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}

function RewardForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  submitLabel: string
  onSubmit: (d: Draft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)

  return (
    <div className="space-y-3 rounded-2xl bg-sunken p-3">
      <Field label="무엇을 상으로 삼을까요?">
        <TextInput
          autoFocus
          value={draft.title}
          placeholder="예) 좋아하는 카페 가기"
          className="!bg-surface"
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </Field>

      <Field label="아이콘">
        <EmojiPicker value={draft.emoji} onChange={(v) => setDraft({ ...draft, emoji: v })} />
      </Field>

      <Field label="가격 (여유)" hint="하루에 보통 100 XP 안팎을 법니다. 며칠치인지 생각해 정하세요.">
        <div className="flex items-center gap-2">
          <TextInput
            type="number"
            min={10}
            step={10}
            value={draft.cost}
            className="!w-32 !bg-surface"
            onChange={(e) => setDraft({ ...draft, cost: Math.max(10, Number(e.target.value) || 0) })}
          />
          <div className="flex gap-1">
            {[150, 400, 1000].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft({ ...draft, cost: c })}
                className="rounded-lg bg-surface px-2 py-1 text-[11px] text-ink2 ring-1 ring-hair"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </Field>

      <label className="flex items-center gap-2 text-[12px] text-ink2">
        <input
          type="checkbox"
          checked={draft.repeatable}
          onChange={(e) => setDraft({ ...draft, repeatable: e.target.checked })}
          className="size-4 accent-[var(--accent)]"
        />
        여러 번 바꿀 수 있는 보상
      </label>

      <div className="flex gap-2">
        <Button variant="solid" disabled={!draft.title.trim()} onClick={() => onSubmit(draft)}>
          {submitLabel}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  )
}

function RewardCard({
  reward,
  balance,
  usedUp,
  restToday,
  onBuy,
}: {
  reward: Reward
  balance: number
  usedUp: boolean
  restToday: boolean
  onBuy: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // 폰에는 hover가 없어 수정·삭제를 숨길 수 없다. 대신 줄을 눌러야 열리게 해
  // 평소 목록은 '바꾸기'만 보이도록 한다.
  const [open, setOpen] = useState(false)
  const isRest = reward.id === REST_PASS.id
  const affordable = balance >= reward.cost
  const blocked = usedUp || (isRest && restToday)
  const short = reward.cost - balance

  if (editing) {
    return (
      <li className="px-1 py-1">
        <RewardForm
          initial={{
            title: reward.title,
            cost: reward.cost,
            emoji: reward.emoji,
            repeatable: reward.repeatable,
          }}
          submitLabel="저장"
          onCancel={() => setEditing(false)}
          onSubmit={(d) => {
            updateReward(reward.id, {
              title: d.title.trim(),
              cost: d.cost,
              emoji: d.emoji,
              repeatable: d.repeatable,
            })
            setEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li className="px-1">
      <div className="rounded-2xl px-2.5 py-2.5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={`grid size-11 shrink-0 place-items-center rounded-2xl text-[20px] ${
              affordable && !blocked ? 'bg-sunken' : 'bg-sunken opacity-50'
            }`}
          >
            {reward.emoji}
          </span>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="min-w-0 flex-1 text-left"
          >
            <p className={`truncate text-[14px] font-medium ${blocked ? 'text-muted' : 'text-ink'}`}>
              {reward.title}
            </p>
            <p className="tnum mt-0.5 text-[11px] text-muted">
              {reward.cost} 여유
              {!reward.repeatable ? ' · 한 번만' : ''}
              {isRest && restToday ? ' · 오늘 사용 중' : ''}
            </p>
          </button>

          <Button
            variant={affordable && !blocked ? 'solid' : 'ghost'}
            size="sm"
            disabled={!affordable || blocked}
            onClick={onBuy}
          >
            {blocked ? '사용함' : affordable ? '바꾸기' : `${short} 부족`}
          </Button>
        </div>

        {!affordable && !blocked ? (
          <div className="mt-2 pl-14">
            <Bar value={balance / reward.cost} height={4} />
          </div>
        ) : null}

        {isRest && open ? (
          <p className="mt-2 pl-14 text-[10.5px] leading-relaxed text-muted">{reward.note}</p>
        ) : null}

        {!open ? null : (
        <div className="animate-rise mt-1.5 flex gap-0.5 pl-14">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg px-2 py-1 text-[11px] text-muted active:bg-sunken"
          >
            수정
          </button>
          {!isRest ? (
            confirmDelete ? (
              <button
                type="button"
                onClick={() => deleteReward(reward.id)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--crit)]"
              >
                정말 삭제
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg px-2 py-1 text-[11px] text-muted active:bg-sunken"
              >
                삭제
              </button>
            )
          ) : null}
        </div>
        )}
      </div>
    </li>
  )
}

const FAIL_MESSAGE: Record<string, string> = {
  balance: '여유가 모자랍니다.',
  'already-used': '한 번만 바꿀 수 있는 보상입니다.',
  'rest-not-needed': '오늘은 이미 휴식권을 쓰고 있어요.',
  missing: '보상을 찾을 수 없습니다.',
}

export function Rewards() {
  const state = useAppState()
  const today = todayKey()
  const balance = balanceXp(state)
  const lifetime = lifetimeXp(state)
  const spent = spentXp(state)
  const restToday = isRestDay(state, today)

  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function handleBuy(reward: Reward) {
    const result: BuyResult = buyReward(reward.id, today)
    setToast(
      result.ok
        ? `${reward.emoji} ${reward.title} — 잘 쓰셨어요!`
        : FAIL_MESSAGE[result.reason] ?? '바꿀 수 없습니다.',
    )
    window.setTimeout(() => setToast(null), 2600)
  }

  const rewards = [...state.rewards].sort((a, b) => a.order - b.order)
  const usedIds = new Set(state.purchases.map((p) => p.rewardId))

  return (
    <div className="space-y-3">
      <header className="px-1 pt-1">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">보상</h1>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
          쌓은 경험치는 레벨로 남고, 같은 양이 여유로도 들어옵니다. 여유는 써도 레벨이 깎이지
          않아요.
        </p>
      </header>

      <Card>
        <div className="px-4 py-4">
          <p className="text-[11px] font-medium text-muted">지금 쓸 수 있는 여유</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="tnum text-[38px] leading-none font-semibold tracking-tight text-ink">
              {balance}
            </span>
            <span className="text-[13px] font-medium text-ink2">여유</span>
          </p>
          <dl className="tnum mt-3 grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-xl bg-sunken px-3 py-2">
              <dt className="text-muted">지금까지 번 경험치</dt>
              <dd className="mt-0.5 font-medium text-ink">{lifetime} XP</dd>
            </div>
            <div className="rounded-xl bg-sunken px-3 py-2">
              <dt className="text-muted">바꿔 쓴 여유</dt>
              <dd className="mt-0.5 font-medium text-ink">{spent}</dd>
            </div>
          </dl>
        </div>
      </Card>

      {restToday ? (
        <div className="animate-rise flex items-start gap-2.5 rounded-2xl bg-sunken px-4 py-3">
          <span aria-hidden className="text-[15px]">
            🛌
          </span>
          <p className="text-[12px] leading-relaxed text-ink2">
            오늘은 <span className="font-medium text-ink">휴식권</span>을 쓰는 날입니다. 아무것도 하지
            않아도 연속 기록은 그대로예요.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHead
          title="바꿀 수 있는 것"
          hint="무엇이 상이 되는지는 본인만 압니다. 직접 정하세요."
          action={
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              + 보상
            </Button>
          }
        />

        {adding ? (
          <div className="px-3 pb-3">
            <RewardForm
              initial={emptyDraft}
              submitLabel="추가"
              onCancel={() => setAdding(false)}
              onSubmit={(d) => {
                addReward({
                  title: d.title.trim(),
                  cost: d.cost,
                  emoji: d.emoji,
                  repeatable: d.repeatable,
                })
                setAdding(false)
              }}
            />
          </div>
        ) : null}

        {rewards.length === 0 ? (
          <Empty title="보상이 없어요" body="경험치를 바꿔 쓸 것을 하나 만들어 보세요." />
        ) : (
          <ul className="space-y-1 pb-3">
            {rewards.map((r) => (
              <RewardCard
                key={r.id}
                reward={r}
                balance={balance}
                usedUp={!r.repeatable && usedIds.has(r.id)}
                restToday={restToday}
                onBuy={() => handleBuy(r)}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHead title="바꾼 기록" hint={`${state.purchases.length}번`} />
        {state.purchases.length === 0 ? (
          <p className="px-4 pb-4 text-[12px] leading-relaxed text-muted">
            아직 없습니다. 쌓기만 하고 쓰지 않으면 오래 못 갑니다.
          </p>
        ) : (
          <ul className="px-2 pb-3">
            {state.purchases.slice(0, 20).map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span aria-hidden className="text-[16px]">
                  {p.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink">{p.title}</p>
                  <p className="tnum text-[10.5px] text-muted">
                    {p.at.slice(0, 10)} · −{p.cost}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => undoPurchase(p.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-muted active:bg-sunken"
                >
                  되돌리기
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {toast ? (
        <div
          role="status"
          className="animate-rise fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl bg-raised px-4 py-3 text-[13px] text-ink shadow-[var(--shadow-pop)] ring-1 ring-hair"
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}
