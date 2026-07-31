import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  AuthResponse,
  LoginRequest,
  MessageResponse,
  RefreshRequest,
  RegisterRequest,
  ResendOtpRequest,
  VerifyEmailRequest,
} from "@/types/auth.types";

/**
 * Auth calls against Spring Boot. Every endpoint in FRONTEND_CONTEXT.md §2 is
 * public, so none of these takes a bearer token — and none of them touches
 * cookies or headers; that belongs to the Route Handler above.
 */
export const authService = {
  register(payload: RegisterRequest) {
    return apiClient<MessageResponse>(ENDPOINTS.AUTH.REGISTER, {
      method: "POST",
      json: payload,
    });
  },

  verifyEmail(payload: VerifyEmailRequest) {
    return apiClient<MessageResponse>(ENDPOINTS.AUTH.VERIFY_EMAIL, {
      method: "POST",
      json: payload,
    });
  },

  resendOtp(payload: ResendOtpRequest) {
    return apiClient<MessageResponse>(ENDPOINTS.AUTH.RESEND_OTP, {
      method: "POST",
      json: payload,
    });
  },

  login(payload: LoginRequest) {
    return apiClient<AuthResponse>(ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      json: payload,
    });
  },

  refresh(refreshToken: string) {
    return apiClient<AuthResponse>(ENDPOINTS.AUTH.REFRESH, {
      method: "POST",
      json: { refreshToken } satisfies RefreshRequest,
    });
  },
};
