'use client'

// BillingPeriodToggle Component
// ------------------------------------------------------

import { cn } from '@/lib/utils'
import { BillingPeriod } from '@/convex/types'
import { useMemo, useCallback } from 'react'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'
import { useTranslations } from 'next-intl'
interface BillingPeriodToggleProps {
  billingPeriod: BillingPeriod
  setBillingPeriodAction: (period: BillingPeriod) => void
}

export default function BillingPeriodToggle({
  billingPeriod,
  setBillingPeriodAction,
}: BillingPeriodToggleProps) {
  const t = useTranslations('subscription')
  const monthlyClickHandler = useCallback(
    () => setBillingPeriodAction('month'),
    [setBillingPeriodAction]
  )

  const yearlyClickHandler = useCallback(
    () => setBillingPeriodAction('year'),
    [setBillingPeriodAction]
  )

  const monthlyButtonClasses = useMemo(
    () =>
      cn(
        'px-4 py-2 rounded-full text-sm font-bold',
        billingPeriod === 'month'
          ? 'bg-accent-2 shadow-sm text-accent-2-foreground'
          : 'text-secondary-foreground hover:text-secondary-foreground'
      ),
    [billingPeriod]
  )

  const yearlyButtonClasses = useMemo(
    () =>
      cn(
        'px-4 py-2 rounded-full text-sm font-bold',
        billingPeriod === 'year'
          ? 'bg-accent-2 shadow-sm text-accent-2-foreground'
          : 'text-secondary-foreground hover:text-secondary-foreground'
      ),
    [billingPeriod]
  )

  return (
    <div className="inline-flex items-center bg-secondary p-1 rounded-full shadow-sm mb-4">
      <button onClick={monthlyClickHandler} className={monthlyButtonClasses}>
        {t('monthlyPayment')}
      </button>
      <button onClick={yearlyClickHandler} className={yearlyButtonClasses}>
        {t('yearlyPayment')}{' '}
        <span
          className={cn(
            'text-xs font-bold',
            billingPeriod === 'year' ? 'text-muted' : 'text-accent-2'
          )}
        >
          {t('yearlyDiscount', { percent: SUBSCRIPTION_PLANS.PRO.yearly.savingPercent })}
        </span>
      </button>
    </div>
  )
}
