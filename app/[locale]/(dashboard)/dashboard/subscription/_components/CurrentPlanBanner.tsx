'use client'

// CurrentPlanBanner Component
// ------------------------------------------------------

import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'

interface CurrentPlanBannerProps {
  currentPlanName: string // プラン名（'Lite', 'Pro'）
  isActive: boolean
  onPortalAction: () => void
  isSubmitting: boolean
}

export default function CurrentPlanBanner({
  currentPlanName,
  isActive,
  onPortalAction,
  isSubmitting,
}: CurrentPlanBannerProps) {
  const t = useTranslations('subscription')

  // 現在のプラン名をメモ化（currentPlanNameは既にプラン名）
  const planName = useMemo(() => {
    return currentPlanName
  }, [currentPlanName])

  // ボタンコンテンツをメモ化
  const buttonContent = useMemo(() => {
    if (isSubmitting) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('processing')}
        </>
      )
    }
    return t('planAction.managePlan')
  }, [isSubmitting, t])

  // ポータルボタンクリックハンドラをメモ化
  const handlePortalClick = useCallback(() => {
    onPortalAction()
  }, [onPortalAction])

  if (!isActive) return null

  return (
    <div className="w-full max-w-xl mb-8 border border-active p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-background border border-active rounded-full p-1 shadow-md">
            <Check className="w-5 h-5 text-active dark:text-active" />
          </div>
          <div>
            <p className="font-semibold text-primary">
              {t('currentPlan')}{' '}
              <span className="font-bold text-active text-2xl ml-1">{planName}</span>
            </p>
          </div>
        </div>
        <Button onClick={handlePortalClick} variant="default" size="sm" disabled={isSubmitting}>
          {buttonContent}
        </Button>
      </div>
      <p className=" text-sm text-muted-foreground mt-3">{t('subscriptionActive')}</p>
    </div>
  )
}
