"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { RouteError, postRoute } from "@/lib/api/route-client";
import { validateEmail, validateFullName, validatePassword } from "@/lib/validation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, FieldError, FieldDescription, FieldLabel } from "@/components/ui/field";

type FieldErrors = { fullName?: string; email?: string; password?: string };

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: FieldErrors = {
      fullName: validateFullName(fullName) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.fullName || nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      await postRoute("/api/auth/register", {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      toast.success("Account created.", {
        description: "We sent a 6-digit code to your email.",
      });
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      toast.error(error instanceof RouteError ? error.message : "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start building workflows in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <AuthField
          id="fullName"
          label="Full name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={fullName}
          error={errors.fullName}
          disabled={loading}
          onChange={(e) => setFullName(e.target.value)}
        />

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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            aria-invalid={!!errors.password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password ? (
            <FieldError>{errors.password}</FieldError>
          ) : (
            <FieldDescription>Use 8–72 characters.</FieldDescription>
          )}
        </Field>

        <SubmitButton loading={loading} className="mt-6">
          Create account
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
