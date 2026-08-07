import Link from "next/link";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingCancelPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-4 py-16 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-muted-foreground" />
            Checkout canceled
          </CardTitle>
          <CardDescription>
            Nothing was charged. You can pick a plan whenever you&rsquo;re ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/pricing" />} className="w-full">
            Back to plans
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
