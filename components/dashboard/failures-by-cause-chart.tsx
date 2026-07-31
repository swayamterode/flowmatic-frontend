"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Bar, BarChart, Rectangle, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/**
 * Demo data. Daily totals stay in the 30-50 band that the "Failed runs" stat
 * reports — successes are deliberately not stacked here, since ~12.8k of them
 * against ~40 failures would flatten every failure segment to invisibility.
 */
const chartData = [
  { day: "Jul 18", timeout: 9, auth: 6, serverError: 4 },
  { day: "Jul 19", timeout: 7, auth: 5, serverError: 3 },
  { day: "Jul 20", timeout: 18, auth: 12, serverError: 9 },
  { day: "Jul 21", timeout: 15, auth: 11, serverError: 7 },
  { day: "Jul 22", timeout: 14, auth: 9, serverError: 8 },
  { day: "Jul 23", timeout: 16, auth: 10, serverError: 6 },
  { day: "Jul 24", timeout: 13, auth: 8, serverError: 7 },
  { day: "Jul 25", timeout: 8, auth: 5, serverError: 3 },
  { day: "Jul 26", timeout: 6, auth: 4, serverError: 4 },
  { day: "Jul 27", timeout: 19, auth: 13, serverError: 9 },
] as const;

const chartConfig = {
  timeout: {
    label: "Timeout",
    color: "var(--chart-1)",
  },
  auth: {
    label: "Auth",
    color: "var(--chart-3)",
  },
  serverError: {
    label: "HTTP 5xx",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

/** Half of bar width (8) so ends read as fully rounded “caps”. */
const BAR_RADIUS = 5;

/**
 *  column hover background.
 */
function ColumnHoverCursor(props: React.ComponentProps<typeof Rectangle>) {
  return (
    <Rectangle
      fill="var(--muted)"
      fillOpacity={0.5}
      radius={BAR_RADIUS * 2}
      stroke="none"
      {...props}
    />
  );
}

export function FailuresByCauseChart({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card className={cn("shadow-none md:col-span-2 dark:ring-0", className)} {...props}>
      <CardHeader>
        <CardTitle>Failures by cause</CardTitle>
        <CardDescription>
          Failed executions per day, grouped by error type, last 10 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-video w-full" config={chartConfig}>
          <BarChart accessibilityLayer data={[...chartData]}>
            <XAxis
              axisLine={false}
              dataKey="day"
              interval={0}
              minTickGap={8}
              tickFormatter={(value) => String(value)}
              tickLine={false}
              tickMargin={10}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
              cursor={<ColumnHoverCursor />}
            />
            <Bar
              background={{
                fill: "var(--muted)",
                radius: BAR_RADIUS,
              }}
              barSize={8}
              dataKey="serverError"
              fill="var(--color-serverError)"
              overflow="visible"
              radius={[0, 0, BAR_RADIUS, BAR_RADIUS]}
              stackId="failures"
            />
            <Bar
              barSize={8}
              dataKey="auth"
              fill="var(--color-auth)"
              overflow="visible"
              radius={0}
              stackId="failures"
            />
            <Bar
              barSize={8}
              dataKey="timeout"
              fill="var(--color-timeout)"
              overflow="visible"
              radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
              stackId="failures"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
