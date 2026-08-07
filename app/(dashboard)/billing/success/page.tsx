"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useWorkflowUsage } from "@/components/workflow-usage-provider";
import type { WorkflowPlan } from "@/types/usage.types";

/*
 * Stripe redirects here the instant checkout succeeds, but access is granted by
 * a webhook that lands separately — so this page doesn't know the plan is
 * active yet either. It polls /runs/usage a handful of times rather than
 * trusting the redirect itself.
 */
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 6;

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

export default function BillingSuccessPage() {
  const { usage, refresh } = useWorkflowUsage();
  const attempts = useRef(0);
  const [timedOut, setTimedOut] = useState(false);

  // `!== null` isn't enough on its own: a free user's response omits `plan`
  // entirely rather than sending it as `null`, so the field is `undefined`
  // at runtime until this poll actually observes a real subscription.
  const confirmed = usage !== null && (Boolean(usage.plan) || usage.unlimited);

  useEffect(() => {
    if (confirmed) return;
    if (attempts.current >= MAX_ATTEMPTS) {
      setTimedOut(true);
      return;
    }
    const id = setTimeout(() => {
      attempts.current += 1;
      refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [confirmed, usage, refresh]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-4 py-16 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {confirmed ? (
              <CheckCircle2 className="size-5 text-run-success" />
            ) : (
              <Spinner className="size-5" />
            )}
            {confirmed ? "You're all set" : "Confirming your payment…"}
          </CardTitle>
          <CardDescription>
            {confirmed
              ? `You're now on the ${planLabel(usage!.plan)} plan.`
              : timedOut
                ? "Your payment is still processing. This can take a minute — check back shortly."
                : "This usually only takes a few seconds."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard" />} className="w-full">
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
