import { cn } from "@/lib/utils";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Shared input styling for the auth pages: a comfortable 44px tap target on the
 * 10px --radius token. Kept as one exported class so `AuthField` and
 * `PasswordInput` stay visually in sync. Uses design tokens only — no hardcoded
 * colors. `text-base` on mobile keeps iOS from zooming on focus.
 */
export const authInputClassName = "h-11 rounded-lg px-3 text-base shadow-xs md:text-sm";

/**
 * A labeled text input in the auth "field box" style. Label stays above the box
 * (accessible + works with inline validation); pass `error` to show a
 * FieldError, or `description` for helper text when there's no error.
 */
export function AuthField({
  label,
  error,
  description,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  description?: React.ReactNode;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={props.id}>{label}</FieldLabel>
      <Input aria-invalid={!!error} className={cn(authInputClassName, className)} {...props} />
      {error ? (
        <FieldError>{error}</FieldError>
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
