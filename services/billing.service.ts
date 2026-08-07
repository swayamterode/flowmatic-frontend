import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PaidPlan,
} from "@/types/billing.types";

/**
 * Subscriptions against Stripe, brokered by Spring Boot.
 *
 * There is no upgrade/downgrade or self-serve cancel yet — a user with an active
 * subscription gets a 409 here, plan or no plan. Changing plans today means
 * canceling in the Stripe Dashboard first, then a fresh checkout.
 */
export const billingService = {
  createCheckoutSession(plan: PaidPlan, token: string) {
    return apiClient<CheckoutSessionResponse>(ENDPOINTS.BILLING.CHECKOUT_SESSION, {
      method: "POST",
      json: { plan } satisfies CheckoutSessionRequest,
      token,
    });
  },
};
