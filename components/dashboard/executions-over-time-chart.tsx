"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, useEffect, useId, useState } from "react";
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  formatChartAxisTick,
  formatChartTooltipDate,
  formatCompactNumber,
  formatInteger,
} from "@/components/dashboard/formater";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteError, getRoute } from "@/lib/api/route-client";
import type { ExecutionsOverTimeDay } from "@/types/dashboard.types";

type PeriodDays = 7 | 30 | 60;

const chartConfig = {
  executions: {
    label: "Executions",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ExecutionsOverTimeChart({ className, ...props }: ComponentProps<typeof Card>) {
  const chartUid = useId().replace(/:/g, "");
  const idAreaGradient = `executions-over-time-area-grad-${chartUid}`;

  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);
  const [rows, setRows] = useState<ExecutionsOverTimeDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by "Try again" to re-run the fetch below. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getRoute<ExecutionsOverTimeDay[]>(
      `/api/dashboard/executions-over-time?days=${periodDays}`,
      controller.signal,
    )
      .then(setRows)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setError(cause instanceof RouteError ? cause.message : "Could not load execution history.");
      });

    return () => controller.abort();
  }, [periodDays, attempt]);

  const changeRange = (value: string | null) => {
    if (value === null) return;
    setRows(null);
    setError(null);
    setPeriodDays(Number(value) as PeriodDays);
  };

  const retry = () => {
    setRows(null);
    setError(null);
    setAttempt((current) => current + 1);
  };

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
          <CardTitle>Executions over time</CardTitle>
          <CardDescription>Workflow runs per day.</CardDescription>
        </div>
        <Select onValueChange={changeRange} value={String(periodDays)}>
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
        {rows === null ? (
          <Skeleton className="aspect-22/8 w-full" />
        ) : error ? (
          <Empty className="aspect-22/8" role="alert">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>Execution history didn’t load</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={retry} size="sm" variant="outline">
                <RotateCwIcon data-icon="inline-start" />
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ChartContainer className="aspect-22/8 w-full" config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={rows}
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
                      const row = payload?.[0]?.payload as ExecutionsOverTimeDay | undefined;
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
        )}
      </CardContent>
    </Card>
  );
}
