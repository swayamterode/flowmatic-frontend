"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { RouteError, postRoute } from "@/lib/api/route-client";
import { validateEmail, validatePassword } from "@/lib/validation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      // The route handler sets the session cookies; nothing to store here.
      await postRoute("/api/auth/login", { email: email.trim(), password });
      toast.success("Welcome back.");
      router.push("/");
      // The session now lives in cookies the router cache knows nothing about.
      router.refresh();
    } catch (error) {
      if (error instanceof RouteError && error.status === 403) {
        toast.error("Verify your email before signing in.", {
          description: "Check your inbox for the 6-digit code.",
        });
        router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      toast.error(error instanceof RouteError ? error.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Sign in to Flowmatic"
      subtitle="Enter your email and password to open your workspace."
      footer={
        <>
          New to Flowmatic?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <AuthField
          id="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          error={errors.email}
          disabled={loading}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            aria-invalid={!!errors.password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FieldError>{errors.password}</FieldError>
        </Field>

        <SubmitButton loading={loading} className="mt-6">
          Sign in
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
