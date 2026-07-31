import { cn } from "@/lib/utils";

/**
 * The Flowmatic mark: three stacked rules of unequal length — a flow that
 * branches — in the one teal the product is allowed to use. This is the only
 * saturated element on the auth screens, which is what lets it carry the brand.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-11 items-center justify-center rounded-xl bg-brand text-brand-foreground",
        "shadow-sm ring-1 ring-white/20 ring-inset",
        className,
      )}
    >
      <span className="sr-only">Flowmatic</span>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
        <path
          d="M5 7.5h7M5 12h14M5 16.5h10"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
