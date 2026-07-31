import { ModeToggle } from "@/components/mode-toggle";

/**
 * Auth shell: one centered column, nothing else on the screen. A faint top-lit
 * wash keeps the card reading as lifted rather than pasted onto flat gray.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,var(--accent),transparent)]"
      />
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ModeToggle />
      </div>
      <main className="relative w-full max-w-100">{children}</main>
    </div>
  );
}
