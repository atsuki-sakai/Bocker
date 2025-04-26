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
    <div className="w-full max-w-xl mb-8 border border-green-500 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-green-800/30 border border-green-500 rounded-full p-1 shadow-md">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              現在のプラン{' '}
              <span className="font-bold text-blue-700 dark:text-blue-200 text-2xl ml-1">
                {planName}
              </span>
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-400 mt-1">
              サブスクリプション契約は有効です。
            </p>
          </div>
        </div>
        <Button onClick={handlePortalClick} variant="default" size="sm" disabled={isSubmitting}>
          {buttonContent}
        </Button>
      </div>
    </div>
  );
}