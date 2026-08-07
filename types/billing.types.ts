import type { WorkflowPlan } from "@/types/usage.types";

/** The plans checkout can actually be started for — unlike `WorkflowPlan`, never `null`. */
export type PaidPlan = Exclude<WorkflowPlan, null>;

export interface CheckoutSessionRequest {
  plan: PaidPlan;
}

/** A Stripe-hosted Checkout page. The browser is redirected here in full, never embedded. */
export interface CheckoutSessionResponse {
  checkoutUrl: string;
}
