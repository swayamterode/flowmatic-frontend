"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useWorkflowUsage } from "@/components/workflow-usage-provider";
import { cn } from "@/lib/utils";
import { RouteError, postRoute } from "@/lib/api/route-client";
import type { CheckoutSessionResponse } from "@/types/billing.types";
import type { WorkflowPlan } from "@/types/usage.types";

type PaidPlan = Exclude<WorkflowPlan, null>;

type PlanDef = {
  id: PaidPlan;
  name: string;
  price: string;
  period: string;
  limit: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: PlanDef[] = [
  {
    id: "ESSENTIALS",
    name: "Essentials",
    price: "₹250.00",
    period: "/mo",
    limit: "100 runs",
    features: ["100 workflow runs, lifetime", "Everything on the free plan"],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₹500.00",
    period: "/mo",
    limit: "1,000 runs",
    features: ["1,000 workflow runs, lifetime", "Everything in Essentials"],
    highlight: true,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "₹950.00",
    period: "/mo",
    limit: "Unlimited runs",
    features: ["Unlimited workflow runs", "Everything in Pro"],
  },
];

function planLabel(plan: WorkflowPlan): string {
  switch (plan) {
    case "ESSENTIALS":
      return "Essentials";
    case "PRO":
      return "Pro";
    case "ENTERPRISE":
      return "Enterprise";
    default:
      return "Free";
  }
}

export default function PricingPage() {
  const { usage, loading, refresh } = useWorkflowUsage();
  const [pending, setPending] = useState<PaidPlan | null>(null);

  async function subscribe(plan: PaidPlan) {
    setPending(plan);
    try {
      const { checkoutUrl } = await postRoute<CheckoutSessionResponse>(
        "/api/billing/checkout-session",
        { plan },
      );
      window.location.assign(checkoutUrl);
    } catch (cause) {
      if (cause instanceof RouteError && cause.status === 409) {
        toast.error("You already have an active plan.");
        refresh();
      } else if (cause instanceof RouteError && cause.status === 502) {
        toast.error("Payment provider is unavailable right now. Try again shortly.");
      } else {
        toast.error(cause instanceof RouteError ? cause.message : "Could not start checkout.");
      }
      setPending(null);
    }
  }

  if (loading || !usage) {
    return (
      <div className="mx-auto w-full max-w-full p-4 md:p-6">
        <p className="px-1 text-sm text-muted-foreground">Loading plans…</p>
      </div>
    );
  }

  const hasActivePlan = Boolean(usage.plan);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Every limit below is a lifetime cap, not a monthly quota — runs never reset.
        </p>
      </div>

      {hasActivePlan ? (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <CheckCircle2 className="size-4.5 shrink-0 text-run-success" />
              You&rsquo;re on the {planLabel(usage.plan)} plan
            </CardTitle>
            <CardDescription>
              {usage.unlimited
                ? "Unlimited workflow runs."
                : `${usage.used} of ${usage.limit} runs used.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            There&rsquo;s no in-app upgrade or downgrade yet. To switch plans, cancel your current
            subscription in Stripe, then subscribe to the new one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col justify-between gap-5",
                plan.highlight && "shadow-lg ring-2 ring-brand",
              )}
            >
              <CardHeader className="gap-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.highlight && (
                    <Badge variant="outline" className="border-brand/40 text-brand">
                      Most popular
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-3xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">{plan.limit}</p>
                  <ul className="flex flex-col gap-1.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-1.5 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={2.5} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  className="mt-auto w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  disabled={pending !== null}
                  onClick={() => void subscribe(plan.id)}
                >
                  {pending === plan.id && <Spinner />}
                  Subscribe
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
