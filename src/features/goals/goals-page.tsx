import { CalendarClock, Link2, Minus, PartyPopper, PiggyBank, Plus } from "lucide-react";
import { createElement, useState } from "react";
import { Amount } from "@/components/ui/amount.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, EmptyState, Skeleton } from "@/components/ui/card.tsx";
import { ProgressRing } from "@/components/ui/progress-ring.tsx";
import { useAccounts, useContributions, useGoals } from "@/data/queries.ts";
import type { Goal } from "@/data/types.ts";
import { fillNode, useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDay } from "@/lib/dates.ts";
import { goalPace } from "@/lib/goals.ts";
import { colourVar, iconFor } from "@/lib/icons.ts";
import { PageHeader } from "../shared.tsx";
import { ContributeSheet, GoalSheet } from "./goal-sheets.tsx";

const percent = (ratio: number, locale: string) =>
  new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(ratio);

function GoalCard({
  goal,
  onEdit,
  onContribute,
}: {
  goal: Goal;
  onEdit: () => void;
  onContribute: (direction: "in" | "out") => void;
}) {
  const { t, locale, fill } = useI18n();
  const contributions = useContributions(goal.accountId ? undefined : goal.id).data ?? [];
  const account = useAccounts().data?.find((a) => a.id === goal.accountId);
  const pace = goalPace(goal, contributions);
  const colour = colourVar(goal.colour);

  const status = {
    done: { text: t.goals.done, tone: "text-positive" },
    "on-track": { text: t.goals.onTrack, tone: "text-positive" },
    behind: { text: t.goals.behind, tone: "text-warning" },
    "no-date": { text: t.goals.noDate, tone: "text-muted" },
    overdue: { text: t.goals.overdue, tone: "text-negative" },
  }[pace.state];

  return (
    <li>
      <Card
        className={cn(
          "flex h-full flex-col gap-4",
          pace.state === "done" && "ring-2 ring-positive/40",
        )}
      >
        <div className="flex items-start gap-4">
          <ProgressRing ratio={pace.ratio} colour={colour}>
            <span>
              <span className="block text-xl font-extrabold tracking-tight">
                {percent(Math.min(pace.ratio, 9.99), locale)}
              </span>
              {createElement(pace.state === "done" ? PartyPopper : iconFor(goal.icon), {
                "aria-hidden": true,
                className: "mx-auto mt-0.5 size-4",
                style: { color: colour },
              })}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{goal.name}</h2>
            <p className="mt-1 text-sm">
              <Amount minor={goal.savedMinor} currency={goal.currency} className="font-bold" />{" "}
              <span className="text-muted">
                / <Amount minor={goal.targetMinor} currency={goal.currency} />
              </span>
            </p>
            <p className={cn("mt-1 text-sm font-semibold", status.tone)}>{status.text}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">{t.goals.left}</dt>
            <dd>
              <Amount minor={pace.leftMinor} currency={goal.currency} className="font-bold" />
            </dd>
          </div>
          <div className="rounded-2xl bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">{t.goals.perMonth}</dt>
            <dd className="font-bold">
              {pace.perMonthMinor === null ? (
                "—"
              ) : (
                <Amount minor={pace.perMonthMinor} currency={goal.currency} />
              )}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {goal.targetDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              {fill(t.goals.until, { date: formatDay(goal.targetDate, locale, "long") })}
            </span>
          )}
          {account && (
            <span className="inline-flex items-center gap-1">
              <Link2 aria-hidden="true" className="size-3.5" />
              {fillNode(t.goals.follows, { account: <strong>{account.name}</strong> })}
            </span>
          )}
          {pace.recentPerMonthMinor !== null && !goal.accountId && (
            <span>
              {fillNode(t.goals.recent, {
                amount: <Amount minor={pace.recentPerMonthMinor} currency={goal.currency} />,
              })}
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          {!goal.accountId && (
            <>
              <Button size="sm" onClick={() => onContribute("in")}>
                <Plus aria-hidden="true" />
                {t.goals.putIn}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onContribute("out")}
                aria-label={`${t.goals.takeOut}: ${goal.name}`}
              >
                <Minus aria-hidden="true" />
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}>
            {t.edit}
          </Button>
        </div>
      </Card>
    </li>
  );
}

export default function GoalsPage() {
  const { t } = useI18n();
  const goals = useGoals();
  const [goalSheet, setGoalSheet] = useState<{ open: boolean; goal?: Goal; key: number }>({
    open: false,
    key: 0,
  });
  const [contribute, setContribute] = useState<{
    open: boolean;
    goal?: Goal;
    direction: "in" | "out";
    key: number;
  }>({
    open: false,
    direction: "in",
    key: 0,
  });
  const openGoal = (goal?: Goal) => setGoalSheet((old) => ({ open: true, goal, key: old.key + 1 }));
  const items = (goals.data ?? []).filter((g) => !g.archived);

  return (
    <>
      <PageHeader title={t.goals.title}>
        <Button onClick={() => openGoal()}>
          <Plus aria-hidden="true" />
          {t.goals.new}
        </Button>
      </PageHeader>
      <p className="-mt-3 mb-5 max-w-2xl text-sm text-muted">{t.goals.lead}</p>

      {goals.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PiggyBank />}
            title={t.goals.empty}
            action={<Button onClick={() => openGoal()}>{t.goals.new}</Button>}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => openGoal(goal)}
              onContribute={(direction) =>
                setContribute((old) => ({ open: true, goal, direction, key: old.key + 1 }))
              }
            />
          ))}
        </ul>
      )}

      {goalSheet.key > 0 && (
        <GoalSheet
          key={goalSheet.key}
          goal={goalSheet.goal}
          open={goalSheet.open}
          onOpenChange={(open) => setGoalSheet((old) => ({ ...old, open }))}
        />
      )}
      {contribute.key > 0 && contribute.goal && (
        <ContributeSheet
          key={contribute.key}
          goal={contribute.goal}
          initialDirection={contribute.direction}
          open={contribute.open}
          onOpenChange={(open) => setContribute((old) => ({ ...old, open }))}
        />
      )}
    </>
  );
}
