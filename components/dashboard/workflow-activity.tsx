import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRightIcon,
  KeyRoundIcon,
  PlayCircleIcon,
  PuzzleIcon,
  TriangleAlertIcon,
} from "lucide-react";

const items = [
  {
    title: "“Stripe → Slack alerts” activated by Amelia Park",
    time: "12 min ago",
    icon: <PlayCircleIcon />,
  },
  {
    title: "Lead enrichment auto-paused after 3 failed runs",
    time: "28 min ago",
    icon: <TriangleAlertIcon />,
  },
  {
    title: "Google Sheets credential rotated",
    time: "1 hr ago",
    icon: <KeyRoundIcon />,
  },
  {
    title: "HTTP Request node updated to v4",
    time: "3 hr ago",
    icon: <PuzzleIcon />,
  },
] as const;

export function WorkflowActivity({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card className={cn("gap-0 shadow-none dark:ring-0", className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>Workflow activity</CardTitle>
        <CardDescription>Recent changes across your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li className="flex h-18 items-center gap-3 px-3" key={item.title}>
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center [&_svg]:size-4"
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="line-clamp-2 text-xs leading-snug text-pretty text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <div className="flex items-center justify-center">
        <Button size="sm" variant="ghost" render={<a href="#/workflows" />} nativeButton={false}>
          View All
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </Card>
  );
}
