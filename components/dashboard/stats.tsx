"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  ClockIcon,
  CircleCheckIcon,
  CircleXIcon,
  RotateCwIcon,
  TriangleAlertIcon,
  ZapIcon,
} from "lucide-react";
import { dashboardCardFrame } from "@/components/dashboard/card-frame";
import { Delta, DeltaIcon, DeltaValue } from "@/components/dashboard/delta";
import { formatInteger, formatPercent } from "@/components/dashboard/formater";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
import type { ComponentType, SVGProps } from "react";

type Stat = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: string;
  delta: number | null;
  deltaSuffix?: string;
  footnote: string;
  lowerIsBetter: boolean;
};

const statsPanelGrid = cn(
  "grid grid-cols-1 gap-0 divide-y divide-border p-0",
  "lg:grid-cols-4 lg:divide-x lg:divide-y-0",
);

function buildStats(summary: DashboardSummary): readonly Stat[] {
  return [
    {
      label: "Executions today",
      icon: ZapIcon,
      value: formatInteger(summary.executionsToday),
      delta: summary.executionsTodayDeltaPct,
      footnote: "vs yesterday",
      lowerIsBetter: false,
    },
    {
      label: "Success rate",
      icon: CircleCheckIcon,
      value: formatPercent(summary.successRatePct, 1),
      delta: summary.successRateDeltaPp,
      deltaSuffix: "pp",
      footnote: "vs last week",
      lowerIsBetter: false,
    },
    {
      label: "Failed runs",
      icon: CircleXIcon,
      value: formatInteger(summary.failedRuns),
      delta: summary.failedRunsDeltaPct,
      footnote: "vs yesterday",
      lowerIsBetter: true,
    },
    {
      label: "Median run time",
      icon: ClockIcon,
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
      <Card className={cn(dashboardCardFrame, "sm:col-span-2 lg:col-span-4")}>
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
      <Card className={cn(dashboardCardFrame, statsPanelGrid, "sm:col-span-2 lg:col-span-4")}>
        {Array.from({ length: 4 }, (_, index) => (
          <div className="flex flex-col gap-3 p-4 sm:p-5" key={index}>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  return (
    <Card className={cn(dashboardCardFrame, statsPanelGrid, "sm:col-span-2 lg:col-span-4")}>
      {buildStats(summary).map((s) => (
        <div className="flex flex-col gap-3 p-4 sm:p-5" key={s.label}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-normal tracking-wide text-muted-foreground">
              <s.icon className="size-3.5" />
              {s.label}
            </div>
            {s.delta !== null && (
              <Delta polarity={s.lowerIsBetter ? "inverse" : "normal"} value={s.delta}>
                <DeltaIcon filled variant="arrow" />
                <DeltaValue suffix={s.deltaSuffix} />
              </Delta>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.footnote}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}
