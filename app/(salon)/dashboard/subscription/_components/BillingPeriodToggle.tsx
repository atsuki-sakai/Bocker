"use client";

// BillingPeriodToggle Component
// ------------------------------------------------------

import { cn } from "@/lib/utils";
import { BillingPeriod } from "@/lib/types";
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
    () => cn(
      "px-4 py-2 rounded-full text-sm font-bold transition-all duration-200",
      billingPeriod === "monthly"
        ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
    ),
    [billingPeriod]
  );

  const yearlyButtonClasses = useMemo(
    () => cn(
      "px-4 py-2 rounded-full text-sm font-bold transition-all duration-200",
      billingPeriod === "yearly"
        ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
    ),
    [billingPeriod]
  );

  return (
    <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-sm mb-4">
      <button
        onClick={monthlyClickHandler}
        className={monthlyButtonClasses}
      >
        月払い
      </button>
      <button
        onClick={yearlyClickHandler}
        className={yearlyButtonClasses}
      >
        年払い <span className="text-xs text-green-600 font-bold">17%~20%お得</span>
      </button>
    </div>
  );
}