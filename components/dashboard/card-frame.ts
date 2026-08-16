import { cn } from "@/lib/utils";

/**
 * Dashboard adaptation of the auth screens' bordered-card look: square corners,
 * a hairline border in place of the default card ring, and the same quiet
 * radial wash and rise-in on dark mode.
 */
export const dashboardCardFrame = cn(
  "auth-rise relative rounded-none border border-border shadow-none ring-0",
  "dark:bg-[radial-gradient(50%_80%_at_20%_0%,--theme(--color-foreground/.1),transparent)]",
);
