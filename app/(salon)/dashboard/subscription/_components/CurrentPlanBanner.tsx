"use client";

// CurrentPlanBanner Component
// ------------------------------------------------------

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { useMemo, useCallback } from "react";

interface CurrentPlanBannerProps {
    currentPlanStr: string | null;
    isActive: boolean;
    onPortalAction: () => void;
    isSubmitting: boolean;
}

export default function CurrentPlanBanner({ currentPlanStr, isActive, onPortalAction, isSubmitting }: CurrentPlanBannerProps) {
// 現在のプラン名をメモ化
const planName = useMemo(() => {
    return currentPlanStr 
    ? SUBSCRIPTION_PLANS[currentPlanStr.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS]?.name || "Standard" 
    : "Standard";
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
    return "サブスクリプション管理";
}, [isSubmitting]);

// ポータルボタンクリックハンドラをメモ化
const handlePortalClick = useCallback(() => {
    onPortalAction();
}, [onPortalAction]);

if (!isActive) return null;

return (
    <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.2, duration: 0.5 }}
    className="w-full max-w-xl mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-lg"
    >
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <div className="bg-white dark:bg-green-800/30 rounded-full p-1 shadow-md">
            <Check className="w-6 h-6 text-green-500 dark:text-green-300" />
        </div>
        <div>
            <p className="font-semibold text-green-700 dark:text-green-300">
            現在のプラン: <span className="font-bold">{planName}</span>
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
            アクティブなサブスクリプション
            </p>
        </div>
        </div>
        <Button
        onClick={handlePortalClick}
        variant="outline"
        size="sm"
        
        disabled={isSubmitting}
        >
        {buttonContent}
        </Button>
    </div>
    </motion.div>
);
}