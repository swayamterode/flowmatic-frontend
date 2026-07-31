"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/dashboard/delta";

type DurationRow = {
  day: string;
  seconds: number;
};

const chartRows: DurationRow[] = [
  { day: "Mon", seconds: 2.0 },
  { day: "Tue", seconds: 2.1 },
  { day: "Wed", seconds: 1.9 },
  { day: "Thu", seconds: 2.0 },
  { day: "Fri", seconds: 1.9 },
  { day: "Sat", seconds: 1.7 },
  { day: "Sun", seconds: 1.8 },
];

const firstSeconds = chartRows[0]?.seconds ?? 0;
const lastSeconds = chartRows.at(-1)?.seconds ?? firstSeconds;

/** Positive when median run duration got faster Mon → Sun. */
const durationImprovementPct =
  firstSeconds > 0 ? ((firstSeconds - lastSeconds) / firstSeconds) * 100 : 0;

const chartConfig = {
  seconds: {
    label: "Seconds",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function RunDurationChart({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card className={cn("shadow-none md:col-span-2 dark:ring-0", className)} {...props}>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Median run duration</CardTitle>
          <Delta value={durationImprovementPct} variant="badge">
            <DeltaIcon variant="trend" />
            <DeltaValue />
          </Delta>
        </div>
        <CardDescription>Seconds from trigger to completion, last 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-video w-full" config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartRows}
            margin={{ top: 24, left: 20, right: 12, bottom: 8 }}
          >
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="day"
              interval={0}
              tickFormatter={(value) => String(value).slice(0, 3)}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
            <Line
              activeDot={{ r: 6 }}
              dataKey="seconds"
              dot={{ fill: "var(--color-seconds)" }}
              stroke="var(--color-seconds)"
              strokeWidth={2}
              type="natural"
            >
              <LabelList
                className="fill-foreground"
                dataKey="seconds"
                fontSize={12}
                formatter={(label) => {
                  const n = Number(label);
                  return Number.isFinite(n) ? `${n.toFixed(1)}s` : String(label ?? "");
                }}
                offset={12}
                position="top"
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
