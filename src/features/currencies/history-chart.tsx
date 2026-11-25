import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n/i18n.tsx";
import { AXIS_TICK, dayLabel, TOOLTIP_STYLE } from "@/lib/chart.ts";
import { formatDay } from "@/lib/dates.ts";

export default function HistoryChart({ points }: { points: { date: string; mid: number }[] }) {
  const { locale } = useI18n();
  const number = (value: number) =>
    value.toLocaleString(locale === "pl" ? "pl-PL" : "en-GB", { minimumFractionDigits: 4 });
  return (
    <div aria-hidden="true" className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart
          accessibilityLayer={false}
          data={points}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="rate-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tick={AXIS_TICK}
            tickFormatter={(day: string) => formatDay(day, locale)}
          />
          <YAxis
            domain={["dataMin", "dataMax"]}
            width={52}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(value: number) => value.toFixed(2)}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={dayLabel(locale)}
            formatter={(value) => [number(Number(value)), "PLN"]}
          />
          <Area
            type="monotone"
            dataKey="mid"
            stroke="var(--accent)"
            strokeWidth={2.25}
            fill="url(#rate-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
