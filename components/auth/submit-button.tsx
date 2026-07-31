import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Full-width submit button with a built-in loading state. */
export function SubmitButton({
  loading,
  children,
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={loading || disabled}
      className={cn("h-11 w-full rounded-lg text-sm font-medium", className)}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </Button>
  );
}
