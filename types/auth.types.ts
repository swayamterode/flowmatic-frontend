/**
 * Request/response shapes for the auth module, taken verbatim from the backend
 * contract in FRONTEND_CONTEXT.md §2.
 */

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

/** Returned by POST /api/auth/login and /api/auth/refresh-token. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  email: string;
  fullName: string;
}

/** Register, verify-email and resend-otp all answer with a bare message. */
export interface MessageResponse {
  message: string;
}

/**
 * The only part of a session the browser is allowed to see. Tokens stay in
 * httpOnly cookies; this is what GET /api/auth/session hands back for the UI.
 */
export interface SessionUser {
  email: string;
  fullName: string;
}

export interface SessionResponse {
  user: SessionUser;
}
