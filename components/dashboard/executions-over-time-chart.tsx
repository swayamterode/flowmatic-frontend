"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  formatChartAxisTick,
  formatChartTooltipDate,
  formatCompactNumber,
  formatInteger,
  parseIsoCalendarDate,
} from "@/components/dashboard/formater";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Delta, DeltaIcon, DeltaValue } from "@/components/dashboard/delta";

type PeriodDays = 7 | 30 | 60;

type ExecutionRow = {
  date: string;
  executions: number;
};

/**
 * Demo data. Weekday-seasonal: scheduled business automations run far less at
 * weekends, so any period comparison has to be like-for-like (see periodDelta).
 * Holds 130 rows so a 60-day window still has a full preceding 60 days.
 */
const chartData: ExecutionRow[] = [
  { date: "2026-03-20", executions: 6110 },
  { date: "2026-03-21", executions: 4060 },
  { date: "2026-03-22", executions: 3800 },
  { date: "2026-03-23", executions: 6290 },
  { date: "2026-03-24", executions: 5980 },
  { date: "2026-03-25", executions: 5870 },
  { date: "2026-03-26", executions: 6120 },
  { date: "2026-03-27", executions: 6030 },
  { date: "2026-03-28", executions: 3990 },
  { date: "2026-03-29", executions: 4210 },
  { date: "2026-03-30", executions: 6680 },
  { date: "2026-03-31", executions: 6210 },
  { date: "2026-04-01", executions: 6630 },
  { date: "2026-04-02", executions: 6670 },
  { date: "2026-04-03", executions: 6530 },
  { date: "2026-04-04", executions: 4340 },
  { date: "2026-04-05", executions: 4220 },
  { date: "2026-04-06", executions: 7100 },
  { date: "2026-04-07", executions: 6560 },
  { date: "2026-04-08", executions: 6480 },
  { date: "2026-04-09", executions: 6800 },
  { date: "2026-04-10", executions: 6690 },
  { date: "2026-04-11", executions: 4520 },
  { date: "2026-04-12", executions: 4660 },
  { date: "2026-04-13", executions: 7250 },
  { date: "2026-04-14", executions: 6710 },
  { date: "2026-04-15", executions: 6760 },
  { date: "2026-04-16", executions: 7210 },
  { date: "2026-04-17", executions: 6840 },
  { date: "2026-04-18", executions: 4570 },
  { date: "2026-04-19", executions: 4500 },
  { date: "2026-04-20", executions: 7420 },
  { date: "2026-04-21", executions: 7060 },
  { date: "2026-04-22", executions: 7020 },
  { date: "2026-04-23", executions: 7210 },
  { date: "2026-04-24", executions: 7210 },
  { date: "2026-04-25", executions: 4610 },
  { date: "2026-04-26", executions: 4790 },
  { date: "2026-04-27", executions: 7830 },
  { date: "2026-04-28", executions: 7700 },
  { date: "2026-04-29", executions: 7350 },
  { date: "2026-04-30", executions: 7770 },
  { date: "2026-05-01", executions: 7380 },
  { date: "2026-05-02", executions: 5190 },
  { date: "2026-05-03", executions: 5150 },
  { date: "2026-05-04", executions: 7830 },
  { date: "2026-05-05", executions: 7730 },
  { date: "2026-05-06", executions: 7560 },
  { date: "2026-05-07", executions: 7480 },
  { date: "2026-05-08", executions: 7550 },
  { date: "2026-05-09", executions: 5060 },
  { date: "2026-05-10", executions: 5400 },
  { date: "2026-05-11", executions: 8570 },
  { date: "2026-05-12", executions: 7950 },
  { date: "2026-05-13", executions: 7670 },
  { date: "2026-05-14", executions: 8210 },
  { date: "2026-05-15", executions: 7720 },
  { date: "2026-05-16", executions: 5500 },
  { date: "2026-05-17", executions: 5220 },
  { date: "2026-05-18", executions: 8610 },
  { date: "2026-05-19", executions: 8400 },
  { date: "2026-05-20", executions: 8360 },
  { date: "2026-05-21", executions: 8320 },
  { date: "2026-05-22", executions: 8020 },
  { date: "2026-05-23", executions: 5280 },
  { date: "2026-05-24", executions: 5700 },
  { date: "2026-05-25", executions: 9100 },
  { date: "2026-05-26", executions: 8440 },
  { date: "2026-05-27", executions: 8530 },
  { date: "2026-05-28", executions: 8600 },
  { date: "2026-05-29", executions: 8880 },
  { date: "2026-05-30", executions: 5880 },
  { date: "2026-05-31", executions: 5500 },
  { date: "2026-06-01", executions: 9150 },
  { date: "2026-06-02", executions: 8500 },
  { date: "2026-06-03", executions: 8870 },
  { date: "2026-06-04", executions: 8650 },
  { date: "2026-06-05", executions: 8840 },
  { date: "2026-06-06", executions: 5730 },
  { date: "2026-06-07", executions: 5660 },
  { date: "2026-06-08", executions: 9510 },
  { date: "2026-06-09", executions: 8620 },
  { date: "2026-06-10", executions: 8770 },
  { date: "2026-06-11", executions: 9050 },
  { date: "2026-06-12", executions: 9340 },
  { date: "2026-06-13", executions: 6260 },
  { date: "2026-06-14", executions: 5960 },
  { date: "2026-06-15", executions: 10150 },
  { date: "2026-06-16", executions: 9430 },
  { date: "2026-06-17", executions: 9200 },
  { date: "2026-06-18", executions: 9690 },
  { date: "2026-06-19", executions: 9030 },
  { date: "2026-06-20", executions: 6000 },
  { date: "2026-06-21", executions: 6490 },
  { date: "2026-06-22", executions: 10410 },
  { date: "2026-06-23", executions: 9530 },
  { date: "2026-06-24", executions: 9210 },
  { date: "2026-06-25", executions: 9520 },
  { date: "2026-06-26", executions: 9450 },
  { date: "2026-06-27", executions: 6570 },
  { date: "2026-06-28", executions: 6230 },
  { date: "2026-06-29", executions: 9960 },
  { date: "2026-06-30", executions: 9420 },
  { date: "2026-07-01", executions: 9850 },
  { date: "2026-07-02", executions: 9970 },
  { date: "2026-07-03", executions: 10080 },
  { date: "2026-07-04", executions: 6500 },
  { date: "2026-07-05", executions: 6630 },
  { date: "2026-07-06", executions: 10970 },
  { date: "2026-07-07", executions: 10180 },
  { date: "2026-07-08", executions: 10010 },
  { date: "2026-07-09", executions: 9900 },
  { date: "2026-07-10", executions: 10020 },
  { date: "2026-07-11", executions: 6960 },
  { date: "2026-07-12", executions: 6670 },
  { date: "2026-07-13", executions: 10580 },
  { date: "2026-07-14", executions: 10130 },
  { date: "2026-07-15", executions: 10340 },
  { date: "2026-07-16", executions: 10190 },
  { date: "2026-07-17", executions: 10850 },
  { date: "2026-07-18", executions: 6650 },
  { date: "2026-07-19", executions: 6740 },
  { date: "2026-07-20", executions: 11250 },
  { date: "2026-07-21", executions: 10480 },
  { date: "2026-07-22", executions: 10420 },
  { date: "2026-07-23", executions: 10590 },
  { date: "2026-07-24", executions: 10920 },
  { date: "2026-07-25", executions: 7290 },
  { date: "2026-07-26", executions: 7420 },
  { date: "2026-07-27", executions: 11870 },
];

const lastChartRow = chartData.at(-1);
if (lastChartRow === undefined) {
  throw new Error("ExecutionsOverTimeChart: chartData must include at least one row");
}
const executionsChartReferenceDate = parseIsoCalendarDate(lastChartRow.date);

const chartConfig = {
  executions: {
    label: "Executions",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

/**
 * Mean of the selected window against the mean of the equally sized window
 * before it. Comparing single first/last days instead would let weekend dips
 * swing the figure by tens of percent.
 */
function periodDelta(rows: readonly ExecutionRow[], periodDays: number): number {
  const series = rows.map((row) => row.executions);
  const current = series.slice(-periodDays);
  const previous = series.slice(-2 * periodDays, -periodDays);

  if (current.length === 0 || previous.length === 0) {
    return 0;
  }

  const previousMean = mean(previous);
  if (previousMean === 0) {
    return 0;
  }

  return ((mean(current) - previousMean) / previousMean) * 100;
}

export function ExecutionsOverTimeChart({ className, ...props }: ComponentProps<typeof Card>) {
  const chartUid = useId().replace(/:/g, "");
  const idAreaGradient = `executions-over-time-area-grad-${chartUid}`;

  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);

  const chartRows = useMemo(() => {
    const startDate = new Date(executionsChartReferenceDate);
    startDate.setDate(startDate.getDate() - periodDays);
    return chartData.filter((item) => parseIsoCalendarDate(item.date) >= startDate);
  }, [periodDays]);

  const growthPctNum = useMemo(() => periodDelta(chartData, periodDays), [periodDays]);

  let xAxisMinTickGap: number | undefined;
  if (periodDays <= 7) {
    xAxisMinTickGap = undefined;
  } else if (periodDays >= 60) {
    xAxisMinTickGap = 20;
  } else {
    xAxisMinTickGap = 28;
  }

  return (
    <Card
      className={cn("shadow-none md:col-span-2 lg:col-span-3 dark:ring-0", className)}
      {...props}
    >
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Executions over time</CardTitle>
            <Delta value={growthPctNum} variant="badge">
              <DeltaIcon variant="trend" />
              <DeltaValue />
            </Delta>
          </div>
          <CardDescription>
            Workflow runs per day, compared with the preceding period.
          </CardDescription>
        </div>
        <Select
          onValueChange={(v) => {
            const n = Number(v);
            setPeriodDays(n as PeriodDays);
          }}
          value={String(periodDays)}
        >
          <SelectTrigger
            aria-label="Executions time range"
            className="w-full min-w-36 sm:w-fit"
            size="sm"
          >
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-22/8 w-full" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartRows}
            margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id={idAreaGradient} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-executions)" stopOpacity={0.45} />
                <stop offset="55%" stopColor="var(--color-executions)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--color-executions)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              interval={periodDays <= 7 ? 0 : "preserveStartEnd"}
              minTickGap={xAxisMinTickGap}
              tickFormatter={(value) => formatChartAxisTick(String(value), periodDays)}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tick={{ className: "tabular-nums" }}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
              tickLine={false}
              tickMargin={8}
              width={44}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-34"
                  formatter={(value) => formatInteger(Number(value))}
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as ExecutionRow | undefined;
                    if (!row?.date) {
                      return "";
                    }
                    return formatChartTooltipDate(row.date, "long");
                  }}
                />
              }
              cursor={false}
            />
            <Area
              dataKey="executions"
              dot={false}
              fill={`url(#${idAreaGradient})`}
              stroke="var(--color-executions)"
              strokeWidth={2}
              type="natural"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
