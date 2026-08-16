import { cn } from "@/lib/utils";
import { DecorCorners } from "@/components/auth/decor-icon";

/**
 * Auth page frame: a bordered card whose hairline frame and corner accents
 * carry the whole page's identity, so title, form and footer link all live
 * inside it rather than a separate header above.
 */
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "auth-rise relative w-full p-6 md:p-8",
        "dark:bg-[radial-gradient(50%_80%_at_20%_0%,--theme(--color-foreground/.1),transparent)]",
        className,
      )}
    >
      <div className="absolute -inset-y-6 -left-px w-px bg-border" />
      <div className="absolute -inset-y-6 -right-px w-px bg-border" />
      <div className="absolute -inset-x-6 -top-px h-px bg-border" />
      <div className="absolute -inset-x-6 -bottom-px h-px bg-border" />
      <DecorCorners variant="diagonal" />

      <div className="space-y-8">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-bold tracking-wide text-balance">{title}</h1>
          {subtitle ? (
            <p className="text-base text-balance text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <div>{children}</div>

        {footer ? <p className="text-sm text-muted-foreground">{footer}</p> : null}
      </div>
    </div>
  );
}
