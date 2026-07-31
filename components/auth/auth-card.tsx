import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/auth/brand-mark";

/**
 * Auth page frame: mark, title and subtitle sit above a plain white card that
 * holds nothing but the form; the switch-page link sits below it. Keeping the
 * header outside the card is what leaves the card itself uncluttered.
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
    <div className={cn("auth-rise", className)}>
      <div className="flex flex-col items-center text-center">
        <BrandMark />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-balance text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="mt-8 rounded-xl border bg-card p-6 shadow-xs sm:p-7">{children}</div>

      {footer ? <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p> : null}
    </div>
  );
}
