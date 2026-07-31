"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { LabelList, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/dashboard/delta";

type TriggerKey = "webhook" | "schedule" | "manual";

type TriggerDatum = {
  trigger: TriggerKey;
  share: number;
  fill: string;
};

const chartData: TriggerDatum[] = [
  { trigger: "webhook", share: 52, fill: "var(--color-webhook)" },
  { trigger: "schedule", share: 33, fill: "var(--color-schedule)" },
  { trigger: "manual", share: 15, fill: "var(--color-manual)" },
];

const chartConfig = {
  share: {
    label: "Share",
  },
  webhook: {
    label: "Webhook",
    color: "var(--chart-1)",
  },
  schedule: {
    label: "Schedule",
    color: "var(--chart-3)",
  },
  manual: {
    label: "Manual",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function TriggerBreakdownChart({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card className={cn("flex flex-col shadow-none dark:ring-0", className)} {...props}>
      <CardHeader className="items-center space-y-1 pb-0 sm:items-start">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <CardTitle>Executions by trigger</CardTitle>
          <Delta value={2.4} variant="badge">
            <DeltaIcon variant="trend" />
            <DeltaValue suffix="pp" />
          </Delta>
        </div>
        <CardDescription>Share of runs by trigger type in last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="my-auto">
        <ChartContainer className="mx-auto aspect-square max-h-72 w-full" config={chartConfig}>
          <PieChart accessibilityLayer>
            <Pie
              cornerRadius={8}
              data={chartData}
              dataKey="share"
              innerRadius={36}
              nameKey="trigger"
              outerRadius="88%"
              stroke="var(--card)"
              strokeWidth={4}
            >
              <LabelList
                className="fill-background font-medium"
                dataKey="share"
                fill="currentColor"
                fontWeight={500}
                formatter={(label) => {
                  const n = Number(label);
                  return Number.isFinite(n) ? `${n}%` : String(label ?? "");
                }}
                position="inside"
                stroke="none"
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="trigger" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
