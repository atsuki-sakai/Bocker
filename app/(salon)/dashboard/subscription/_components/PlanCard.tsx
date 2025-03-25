"use client";

// PlanCard Component
// ------------------------------------------------------

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BillingPeriod } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { useMemo, useCallback } from "react";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };
interface PlanCardProps {
    title: string;
    description: string;
    price: number;
    savingPercent?: number;
    features: string[];
    currentPlanStr: string | null;
    planId: string;
    billingPeriod: BillingPeriod;
    currentBillingPeriod?: BillingPeriod;
    isActive: boolean;
    onSubscribeAction: () => void;
    onPortalAction: () => void;
    isSubmitting: boolean;
    isPopular?: boolean;
    highlightColor: string;
    delay: number;
  }
  
  export default function PlanCard({
    title,
    description,
    price,
    savingPercent,
    features,
    currentPlanStr,
    planId,
    billingPeriod,
    currentBillingPeriod,
    isActive,
    onSubscribeAction,
    onPortalAction,
    isSubmitting,
    isPopular = false,
    highlightColor,
    delay
  }: PlanCardProps) {
    // 現在のプランかどうかのチェックをメモ化
    const isCurrentPlan = useMemo(() => {
      return currentPlanStr === planId && (!isActive || (currentBillingPeriod === billingPeriod));
    }, [currentPlanStr, planId, isActive, currentBillingPeriod, billingPeriod]);

    // 支払い期間が変更されているかのチェックをメモ化
    const isBillingPeriodChange = useMemo(() => {
      return currentPlanStr === planId && currentBillingPeriod !== billingPeriod;
    }, [currentPlanStr, planId, currentBillingPeriod, billingPeriod]);

    // 月額換算価格をメモ化
    const monthlyEquivalent = useMemo(() => {
      if (billingPeriod === "yearly") {
        return Math.floor(price / 12).toLocaleString();
      }
      return null;
    }, [billingPeriod, price]);

    // サブスクリプションアクションのハンドラーをメモ化
    const handleSubscribe = useCallback(() => {
      onSubscribeAction();
    }, [onSubscribeAction]);

    // ポータルアクションのハンドラーをメモ化
    const handlePortal = useCallback(() => {
      onPortalAction();
    }, [onPortalAction]);

    // カードのスタイリングをメモ化
    const cardStyle = useMemo(() => {
      return cn(
        "h-full shadow-xl border-0 overflow-hidden bg-white dark:bg-slate-800 relative", 
        isPopular ? 'border-2 border-purple-400' : ''
      );
    }, [isPopular]);
  
    return (
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay }}
        className={cn("relative", isPopular ? 'md:-mt-4 md:mb-4' : '')}
      >
        {isPopular && (
          <div className="absolute -top-4 left-0 right-0 z-10 flex justify-center">
            <Badge
              className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md"
            >
              <Star className="w-4 h-4 mr-1" />
              人気プラン
            </Badge>
          </div>
        )}
        
        <Card className={cardStyle}>
          <div className={`absolute h-1.5 bg-gradient-to-r ${highlightColor} top-0 left-0 right-0`} />
          
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className={`text-xl font-bold bg-gradient-to-r ${highlightColor} bg-clip-text text-transparent`}>
                {title}
              </CardTitle>
              {isCurrentPlan && isActive && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                >
                  <Badge
                    variant="default"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  >
                    現在のプラン
                  </Badge>
                </motion.div>
              )}
            </div>
            <CardDescription>
              {description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="mb-4">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">¥{price.toLocaleString()}</span>
                <span className="text-sm text-slate-500 ml-1">/{billingPeriod === "monthly" ? "月" : "年"}</span>
              </div>
              {billingPeriod === "yearly" && savingPercent && (
                <div className="text-xs text-green-500 font-medium mt-1">
                  年間契約で{savingPercent}%お得
                </div>
              )}
              {billingPeriod === "yearly" && (
                <div className="text-xs text-slate-500 mt-1">
                  (月あたり ¥{monthlyEquivalent})
                </div>
              )}
            </div>
            
            <Separator className="my-4" />
            
            <motion.ul
              className="space-y-3 my-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {features.map((feature, index) => (
                <motion.li
                  key={index}
                  variants={itemVariants}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="mt-0.5 text-green-500 flex-shrink-0">
                    <Check className="h-4 w-4" />
                  </span>
                  <span>{feature}</span>
                </motion.li>
              ))}
            </motion.ul>
            
            <PlanActionButton
              isActive={isActive}
              isCurrentPlan={isCurrentPlan}
              isBillingPeriodChange={isBillingPeriodChange}
              currentPlanStr={currentPlanStr}
              planId={planId}
              currentBillingPeriod={currentBillingPeriod}
              billingPeriod={billingPeriod}
              onSubscribeAction={handleSubscribe}
              onPortalAction={handlePortal}
              isSubmitting={isSubmitting}
              highlightColor={highlightColor}
            />
          </CardContent>
          
              <CardFooter className="pt-2 pb-4 px-6 text-xs text-slate-500 text-center">
                <p>※14日間の無料トライアル付き</p>
              </CardFooter>
  
        </Card>
      </motion.div>
    );
  }


interface PlanActionButtonProps {
    isActive: boolean;
    isCurrentPlan: boolean;
    isBillingPeriodChange: boolean;
    currentPlanStr: string | null;
    planId: string;
    currentBillingPeriod?: BillingPeriod;
    billingPeriod: BillingPeriod;
    onSubscribeAction: () => void;
    onPortalAction: () => void;
    isSubmitting: boolean;
    highlightColor: string;
}

function PlanActionButton({
isActive,
isCurrentPlan,
isBillingPeriodChange,
currentPlanStr,
planId,
currentBillingPeriod,
billingPeriod,
onSubscribeAction,
onPortalAction,
isSubmitting,
highlightColor
}: PlanActionButtonProps) {
  // ローディングボタンをメモ化
  const loadingButton = useMemo(() => (
    <Button disabled className="w-full">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      処理中...
    </Button>
  ), []);

  // サブスクリプションアクションハンドラをメモ化
  const handleSubscribe = useCallback(() => {
    onSubscribeAction();
  }, [onSubscribeAction]);

  // ポータルアクションハンドラをメモ化
  const handlePortal = useCallback(() => {
    onPortalAction();
  }, [onPortalAction]);

  // ボタンの表示テキストをメモ化
  const buttonText = useMemo(() => {
    if (isBillingPeriodChange) {
      return <span className="flex items-center gap-1">
        {billingPeriod === "yearly" ? "年払いに変更" : "月払いに変更"}
      </span>;
    } else if (currentPlanStr?.toLowerCase() === planId.toLowerCase()) {
      return <span className="flex items-center gap-1">現在のプラン</span>;
    } else {
      return <span className="flex items-center gap-1">プランを変更</span>;
    }
  }, [isBillingPeriodChange, billingPeriod, currentPlanStr, planId]);

  // ボタンが無効かどうかをメモ化
  const isButtonDisabled = useMemo(() => {
    return currentPlanStr?.toLowerCase() === planId.toLowerCase() && currentBillingPeriod === billingPeriod;
  }, [currentPlanStr, planId, currentBillingPeriod, billingPeriod]);

  if (isSubmitting) return loadingButton;

  if (isActive) {
    if (isCurrentPlan) {
      return (
        <Button
          onClick={handlePortal}
          className="w-full bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white"
        >
          プランを管理する
        </Button>
      );
    } else if (isBillingPeriodChange) {
      return (
        <Button
          onClick={handleSubscribe}
          className={`w-full bg-gradient-to-r ${highlightColor} hover:brightness-110 text-white`}
        >
          {buttonText}
        </Button>
      );
    } else {
      return (
        <Button
          onClick={handleSubscribe}
          className={`w-full bg-gradient-to-r ${highlightColor} hover:brightness-110 text-white`}
          disabled={isButtonDisabled}
        >
          {buttonText}
        </Button>
      );
    }
  }

  return (
    <Button
      onClick={handleSubscribe}
      className={`w-full bg-gradient-to-r ${highlightColor} hover:brightness-110 text-white`}
    >
      今すぐ始める
      <ArrowRight className="ml-1.5 h-4 w-4" />
    </Button>
  );
}