"use client";

// CurrentPlanBanner Component
// ------------------------------------------------------

import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { useMemo, useCallback } from 'react';

interface CurrentPlanBannerProps {
  currentPlanStr: string | null;
  isActive: boolean;
  onPortalAction: () => void;
  isSubmitting: boolean;
}

export default function CurrentPlanBanner({
  currentPlanStr,
  isActive,
  onPortalAction,
  isSubmitting,
}: CurrentPlanBannerProps) {
  // 現在のプラン名をメモ化
  const planName = useMemo(() => {
    return currentPlanStr
      ? SUBSCRIPTION_PLANS[currentPlanStr.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS]?.name ||
          'Standard'
      : 'Standard';
  }, [currentPlanStr]);

  // ボタンコンテンツをメモ化
  const buttonContent = useMemo(() => {
    if (isSubmitting) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          処理中...
        </>
      );
    }
    return 'サブスクリプション管理';
  }, [isSubmitting]);

  // ポータルボタンクリックハンドラをメモ化
  const handlePortalClick = useCallback(() => {
    onPortalAction();
  }, [onPortalAction]);

  if (!isActive) return null;

  return (
    <div className="w-full max-w-xl mb-8 border border-active p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center  gap-3">
          <div className="bg-background border border-active rounded-full p-1 shadow-md">
            <Check className="w-5 h-5 text-active dark:text-active" />
          </div>
          <div>
            <p className="font-semibold text-primary">
              現在のプラン <span className="font-bold text-active text-2xl ml-1">{planName}</span>
            </p>
          </div>
        </div>
        <Button onClick={handlePortalClick} variant="default" size="sm" disabled={isSubmitting}>
          {buttonContent}
        </Button>
      </div>
      <p className=" text-sm text-slate-500 dark:text-slate-400 mt-3">
        サブスクリプション契約は有効です。
      </p>
    </div>
  )
}