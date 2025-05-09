"use client";

// BillingPeriodToggle Component
// ------------------------------------------------------

import { cn } from "@/lib/utils";
import { BillingPeriod } from '@/services/convex/shared/types/common';
import { useMemo, useCallback } from "react";

interface BillingPeriodToggleProps {
    billingPeriod: BillingPeriod;
    setBillingPeriodAction: (period: BillingPeriod) => void;
}

export default function BillingPeriodToggle({ billingPeriod, setBillingPeriodAction }: BillingPeriodToggleProps) {
  const monthlyClickHandler = useCallback(
    () => setBillingPeriodAction("monthly"),
    [setBillingPeriodAction]
  );

  const yearlyClickHandler = useCallback(
    () => setBillingPeriodAction("yearly"),
    [setBillingPeriodAction]
  );

  const monthlyButtonClasses = useMemo(
    () =>
      cn(
        'px-4 py-2 rounded-full text-sm font-bold transition-all duration-200',
        billingPeriod === 'monthly'
          ? 'bg-accent shadow-sm text-accent-foreground'
          : 'text-secondary-foreground hover:text-secondary-foreground'
      ),
    [billingPeriod]
  )

  const yearlyButtonClasses = useMemo(
    () =>
      cn(
        'px-4 py-2 rounded-full text-sm font-bold transition-all duration-200',
        billingPeriod === 'yearly'
          ? 'bg-accent shadow-sm text-accent-foreground'
          : 'text-secondary-foreground hover:text-secondary-foreground'
      ),
    [billingPeriod]
  )

  return (
    <div className="inline-flex items-center bg-secondary p-1 rounded-full shadow-sm mb-4">
      <button onClick={monthlyClickHandler} className={monthlyButtonClasses}>
        月払い
      </button>
      <button onClick={yearlyClickHandler} className={yearlyButtonClasses}>
        年払い <span className="text-xs text-active font-bold">17%~20%お得</span>
      </button>
    </div>
  )
}