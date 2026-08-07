import { CreditCardIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-full p-4 md:p-6">
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CreditCardIcon />
          </EmptyMedia>
          <EmptyTitle>Paid plans are coming soon</EmptyTitle>
          <EmptyDescription>
            Essentials, Pro, and Enterprise plans are on the way. You&rsquo;re on the free plan for
            now — 10 runs, no expiry.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
