"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { RouteError, postRoute } from "@/lib/api/route-client";
import { validateOtp } from "@/lib/validation";
import { AuthCard } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const RESEND_COOLDOWN = 30;

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const otpError = validateOtp(otp);
    setError(otpError ?? undefined);
    if (otpError) return;

    setLoading(true);
    try {
      await postRoute("/api/auth/verify-email", { email, otp });
      toast.success("Email verified.", {
        description: "You can sign in now.",
      });
      router.push("/login");
    } catch (err) {
      const message = err instanceof RouteError ? err.message : "Could not verify the code.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await postRoute("/api/auth/resend-otp", { email });
      toast.success("Code sent.", { description: `Check ${email}.` });
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error(err instanceof RouteError ? err.message : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }

  // Landed here without an email in the query — nothing to verify against.
  if (!email) {
    return (
      <AuthCard title="Verify your email" subtitle="We couldn't tell which account to verify.">
        <Button
          render={<Link href="/signup" />}
          size="lg"
          className="h-11 w-full rounded-lg text-sm font-medium"
        >
          Back to sign up
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Check your email"
      subtitle={
        <>
          Enter the 6-digit code we sent to{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </>
      }
      footer={
        <>
          Wrong email?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Start over
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field data-invalid={!!error}>
          <InputOTP
            maxLength={6}
            value={otp}
            aria-invalid={!!error}
            disabled={loading}
            onChange={(value) => {
              setOtp(value);
              if (error) setError(undefined);
            }}
            containerClassName="justify-center"
          >
            <InputOTPGroup className="gap-2 *:size-11 *:rounded-lg *:border *:text-base">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <FieldError className="text-center">{error}</FieldError>
        </Field>

        <SubmitButton loading={loading} className="mt-6">
          Verify email
        </SubmitButton>
      </form>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || resending}
          className="font-medium text-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
