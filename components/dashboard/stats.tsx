"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { Delta, DeltaIcon, DeltaValue } from "@/components/dashboard/delta";
import { formatInteger, formatPercent } from "@/components/dashboard/formater";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { DashboardSummary } from "@/types/dashboard.types";

type Stat = {
  label: string;
  value: string;
  delta: number | null;
  /** Unit appended to the delta, e.g. percentage points for a rate. */
  deltaSuffix?: string;
  footnote: string;
  /** When true, a negative delta is treated as favorable (e.g. failed runs, run duration). */
  lowerIsBetter: boolean;
};

function buildStats(summary: DashboardSummary): readonly Stat[] {
  return [
    {
      label: "Executions today",
      value: formatInteger(summary.executionsToday),
      delta: summary.executionsTodayDeltaPct,
      footnote: "vs yesterday",
      lowerIsBetter: false,
    },
    {
      label: "Success rate",
      value: formatPercent(summary.successRatePct, 1),
      delta: summary.successRateDeltaPp,
      deltaSuffix: "pp",
      footnote: "vs last week",
      lowerIsBetter: false,
    },
    {
      label: "Failed runs",
      value: formatInteger(summary.failedRuns),
      delta: summary.failedRunsDeltaPct,
      footnote: "vs yesterday",
      lowerIsBetter: true,
    },
    {
      label: "Median run time",
      value: `${(summary.medianRunTimeSeconds ?? 0).toFixed(1)}s`,
      delta: summary.medianRunTimeDeltaPct,
      footnote: "vs last week",
      lowerIsBetter: true,
    },
  ];
}

export function DashboardStats() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by "Try again" to re-run the fetch below. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getRoute<DashboardSummary>("/api/dashboard/summary", controller.signal)
      .then(setSummary)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof RouteError ? cause.message : "Could not load dashboard stats.");
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setSummary(null);
    setError(null);
    setAttempt((current) => current + 1);
  };

  if (error) {
    return (
      <Card className={cn("shadow-none sm:col-span-2 lg:col-span-4 dark:ring-0")}>
        <CardContent>
          <Empty role="alert">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>Dashboard stats didn’t load</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={retry} size="sm" variant="outline">
                <RotateCwIcon data-icon="inline-start" />
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <>
        {Array.from({ length: 4 }, (_, index) => (
          <Card className={cn("shadow-none dark:ring-0")} key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      {buildStats(summary).map((s) => (
        <Card className={cn("shadow-none dark:ring-0")} key={s.label}>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">{s.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            {s.delta !== null && (
              <div className="flex items-center gap-1 text-xs">
                <Delta polarity={s.lowerIsBetter ? "inverse" : "normal"} value={s.delta}>
                  <DeltaIcon />
                  <DeltaValue suffix={s.deltaSuffix} />
                </Delta>
                <span className="text-muted-foreground">{s.footnote}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
