import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useI18n } from "@/i18n/i18n.tsx";
import { AXIS_TICK, dayLabel, TOOLTIP_STYLE } from "@/lib/chart.ts";
import { formatDay } from "@/lib/dates.ts";
import { formatMoney } from "@/lib/money.ts";

// Recharts is the heaviest library of the app, so the charts load on their own (performance.md: heavy code on demand).
// Each chart has the same numbers as text next to it, so nothing depends on seeing the picture.

export function CashflowChart({
  data,
  currency,
}: {
  data: { start: string; income: number; expenses: number }[];
  currency: string;
}) {
  const { t, locale } = useI18n();
  return (
    <div aria-hidden="true" className="h-44 w-full">
      <ResponsiveContainer>
        <BarChart
          accessibilityLayer={false}
          data={data}
          barGap={2}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="start"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
            tick={AXIS_TICK}
            tickFormatter={(day: string) => formatDay(day, locale)}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={dayLabel(locale)}
            formatter={(value, name) => [
              formatMoney(Number(value), currency, locale),
              name === "income" ? t.dashboard.income : t.dashboard.expenses,
            ]}
          />
          <Bar dataKey="income" fill="var(--positive)" radius={[6, 6, 2, 2]} maxBarSize={18} />
          <Bar dataKey="expenses" fill="var(--accent)" radius={[6, 6, 2, 2]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingDonut({ data }: { data: { id: string; minor: number; colour: string }[] }) {
  return (
    <div aria-hidden="true" className="aspect-square w-full max-w-[200px]">
      <ResponsiveContainer>
        <PieChart accessibilityLayer={false}>
          <Pie
            data={data}
            rootTabIndex={-1}
            dataKey="minor"
            nameKey="id"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={2}
            cornerRadius={6}
            stroke="none"
            isAnimationActive
          >
            {data.map((slice) => (
              <Cell key={slice.id} fill={slice.colour} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
