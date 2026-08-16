import { ModeToggle } from "@/components/mode-toggle";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div aria-hidden />
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ModeToggle />
      </div>
      <main className="relative w-full max-w-100">{children}</main>
    </div>
  );
}
