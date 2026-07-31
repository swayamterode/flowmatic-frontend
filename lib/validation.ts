/**
 * Shared client-side validators. Each returns an error message or null.
 * Rules mirror the backend constraints in FRONTEND_CONTEXT.md §2.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter your email.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Enter a password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 72) return "Password must be 72 characters or fewer.";
  return null;
}

export function validateFullName(value: string): string | null {
  if (!value.trim()) return "Enter your name.";
  return null;
}

export function validateOtp(value: string): string | null {
  if (!value) return "Enter the 6-digit code.";
  if (!/^\d{6}$/.test(value)) return "The code is 6 digits.";
  return null;
}
