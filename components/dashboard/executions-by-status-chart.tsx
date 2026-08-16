"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, useEffect, useState } from "react";
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { LabelList, Pie, PieChart } from "recharts";
import { dashboardCardFrame } from "@/components/dashboard/card-frame";
import { formatInteger } from "@/components/dashboard/formater";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteError, getRoute } from "@/lib/api/route-client";
import type { ExecutionsByStatusDatum } from "@/types/dashboard.types";

const chartConfig = {
  count: {
    label: "Executions",
  },
  PENDING: {
    label: "Pending",
    color: "color-mix(in oklch, var(--foreground) 45%, var(--card))",
  },
  RUNNING: {
    label: "Running",
    color: "color-mix(in oklch, var(--foreground) 62%, var(--card))",
  },
  SUCCESS: {
    label: "Success",
    color: "color-mix(in oklch, var(--foreground) 79%, var(--card))",
  },
  FAILED: {
    label: "Failed",
    color: "color-mix(in oklch, var(--foreground) 96%, var(--card))",
  },
} satisfies ChartConfig;

export function ExecutionsByStatusChart({ className, ...props }: ComponentProps<typeof Card>) {
  const [rows, setRows] = useState<ExecutionsByStatusDatum[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by "Try again" to re-run the fetch below. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getRoute<ExecutionsByStatusDatum[]>("/api/dashboard/executions-by-status", controller.signal)
      .then(setRows)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setError(
          cause instanceof RouteError
            ? cause.message
            : "Could not load execution status breakdown.",
        );
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setRows(null);
    setError(null);
    setAttempt((current) => current + 1);
  };

  const total = rows?.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const chartData = (rows ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({ ...row, fill: `var(--color-${row.status})` }));

  return (
    <Card className={cn(dashboardCardFrame, "flex flex-col", className)} size="sm" {...props}>
      <CardHeader className="items-center space-y-1 pb-0 sm:items-start">
        <CardTitle>Executions by status</CardTitle>
        <CardDescription>Runs grouped by outcome</CardDescription>
      </CardHeader>
      <CardContent className="my-auto">
        {rows === null ? (
          <Skeleton className="mx-auto aspect-square max-h-72 w-full rounded-full" />
        ) : error ? (
          <Empty className="aspect-square max-h-72" role="alert">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>Status breakdown didn’t load</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={retry} size="sm" variant="outline">
                <RotateCwIcon data-icon="inline-start" />
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        ) : total === 0 ? (
          <Empty className="aspect-square max-h-72">
            <EmptyHeader>
              <EmptyTitle>No executions yet</EmptyTitle>
              <EmptyDescription>Run a workflow to see its status breakdown here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer className="mx-auto aspect-square max-h-72 w-full" config={chartConfig}>
            <PieChart accessibilityLayer>
              <Pie
                cornerRadius={8}
                data={chartData}
                dataKey="count"
                innerRadius={36}
                nameKey="status"
                outerRadius="88%"
                stroke="var(--card)"
                strokeWidth={2}
              >
                <LabelList
                  className="fill-background font-medium"
                  dataKey="count"
                  fill="currentColor"
                  fontWeight={500}
                  formatter={(label) => formatInteger(Number(label))}
                  position="inside"
                  stroke="none"
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
