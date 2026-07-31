import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/dashboard/delta";

type Stat = {
  label: string;
  value: string;
  delta: number;
  /** Unit appended to the delta, e.g. percentage points for a rate. */
  deltaSuffix?: string;
  footnote: string;
  /** When true, a negative delta is treated as favorable (e.g. failed runs, run duration). */
  lowerIsBetter: boolean;
};

const stats: readonly Stat[] = [
  {
    label: "Executions today",
    value: "12,847",
    delta: 8.2,
    footnote: "vs yesterday",
    lowerIsBetter: false,
  },
  {
    label: "Success rate",
    value: "98.6%",
    delta: 0.4,
    deltaSuffix: "pp",
    footnote: "vs last week",
    lowerIsBetter: false,
  },
  {
    label: "Failed runs",
    value: "41",
    delta: -18.0,
    footnote: "vs yesterday",
    lowerIsBetter: true,
  },
  {
    label: "Median run time",
    value: "1.8s",
    delta: -6.0,
    footnote: "vs last week",
    lowerIsBetter: true,
  },
];

export function DashboardStats() {
  return (
    <>
      {stats.map((s) => (
        <Card className={cn("shadow-none dark:ring-0")} key={s.label}>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">{s.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <div className="flex items-center gap-1 text-xs">
              <Delta polarity={s.lowerIsBetter ? "inverse" : "normal"} value={s.delta}>
                <DeltaIcon />
                <DeltaValue suffix={s.deltaSuffix} />
              </Delta>
              <span className="text-muted-foreground">{s.footnote}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
