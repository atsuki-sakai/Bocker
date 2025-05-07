'use client';

import { useState, useCallback } from 'react';
import { useAction, Preloaded, usePreloadedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { PlanCard, BillingPeriodToggle, PreviewDialog, CurrentPlanBanner } from './_components';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { getPriceStrFromPlanAndPeriod } from '@/lib/utils';
import { Doc } from '@/convex/_generated/dataModel';
import { StripePreviewData, BillingPeriod } from '@/lib/type';

const baseUrl =
  process.env.NEXT_PUBLIC_NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_DEVELOP_URL
    : process.env.NEXT_PUBLIC_DEPLOY_URL;

interface SubscriptionFormProps {
  salonPreloaded: Preloaded<typeof api.salon.core.query.findByClerkId>;
  subscriptionPreloaded: Preloaded<typeof api.subscription.query.findByStripeCustomerId>;
}

export default function SubscriptionForm({
  salonPreloaded,
  subscriptionPreloaded,
}: SubscriptionFormProps) {
  const salon = usePreloadedQuery(salonPreloaded)
  const subscription = usePreloadedQuery(subscriptionPreloaded)

  console.log('preloaded salon', salon)
  console.log('preloaded subscription', subscription)

  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState<StripePreviewData | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [updatePlanIdStr, setupdatePlanIdStr] = useState<string | null>(null)

  const createSession = useAction(api.subscription.action.createSubscriptionSession)
  const createBillingPortal = useAction(api.subscription.action.createBillingPortalSession)
  const getSubscriptionUpdatePreview = useAction(
    api.subscription.action.getSubscriptionUpdatePreview
  )
  const confirmSubscriptionUpdate = useAction(api.subscription.action.confirmSubscriptionUpdate)

  // データの準備
  const currentPlanStr = subscription?.planName || null
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing' || false

  // メモ化したbillingPeriod設定関数
  const setBillingPeriodAction = useCallback((period: BillingPeriod) => {
    setBillingPeriod(period)
  }, [])

  // プレビュー取得関数をメモ化
  const handleGetPreview = useCallback(
    async (planStr: string, billingPeriod: BillingPeriod) => {
      try {
        setIsSubmitting(true)

        // より厳密なバリデーション
        const subscriptionId = salon?.subscriptionId
        const customerId = salon?.stripeCustomerId

        // デバッグ情報をログに出力
        console.log('Preview request params:', {
          subscriptionId,
          customerId,
          newPriceId: getPriceStrFromPlanAndPeriod(planStr, billingPeriod),
        })

        if (!subscriptionId || subscriptionId === '') {
          throw new Error('サブスクリプションIDが見つかりません')
        }

        if (!customerId || customerId === '') {
          throw new Error('Stripe顧客IDが見つかりません')
        }

        // previewデータを取得し状態を更新
        const result = await getSubscriptionUpdatePreview({
          subscriptionId,
          newPriceId: getPriceStrFromPlanAndPeriod(planStr, billingPeriod),
          customerId,
        })

        // プレビューデータを設定
        setPreviewData(result as StripePreviewData)
        // ダイアログを表示
        setShowConfirmDialog(true)
      } catch (err) {
        console.error('Preview error details:', err)
        const errorMessage =
          err instanceof Error
            ? `プレビュー取得エラー: ${err.message}`
            : 'プレビューの取得中に予期せぬエラーが発生しました'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsSubmitting(false)
      }
    },
    [getSubscriptionUpdatePreview, salon?.subscriptionId, salon?.stripeCustomerId]
  )

  // サブスクリプション更新確認関数をメモ化
  const handleConfirmUpdate = useCallback(
    async (subscriptionId: string, newPriceId: string) => {
      try {
        setIsSubmitting(true)
        const result = await confirmSubscriptionUpdate({
          subscriptionId,
          newPriceId,
          items: previewData?.items || [],
          prorationDate: previewData?.prorationDate || 0,
        })

        if (result.success) {
          toast.success('サブスクリプションを更新しました')
        }
      } catch (err) {
        console.error('Update confirmation error:', err)
        const errorMessage =
          err instanceof Error
            ? `更新エラー: ${err.message}`
            : 'サブスクリプションの更新中に予期せぬエラーが発生しました'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsSubmitting(false)
      }
    },
    [confirmSubscriptionUpdate, previewData]
  )

  // サブスクリプション作成関数をメモ化
  const handleSubscribe = useCallback(
    async (planStr: string) => {
      try {
        setIsSubmitting(true)

        if (salon?.subscriptionId && salon?.subscriptionStatus !== 'canceled') {
          // 既存サブスクリプションの更新処理
          handleGetPreview(planStr, billingPeriod)
          setupdatePlanIdStr(planStr)
        } else {
          // 新規サブスクリプション作成処理
          const priceId = getPriceStrFromPlanAndPeriod(planStr, billingPeriod)
          const isTrial = !salon?.subscriptionStatus

          const result = await createSession({
            stripeCustomerId: salon?.stripeCustomerId ?? '',
            clerkUserId: salon?.clerkId ?? '',
            priceId: priceId,
            trialDays: isTrial ? 30 : undefined,
          })

          if (result?.checkoutUrl) {
            window.location.href = result.checkoutUrl
          } else {
            const errorMessage = 'チェックアウトURLの取得に失敗しました'
            setError(errorMessage)
            toast.error(errorMessage)
          }
        }
      } catch (err: unknown) {
        console.error('Subscription error:', err)
        const errorMessage =
          err instanceof Error
            ? `サブスクリプションエラー: ${err.message}`
            : 'サブスクリプションの処理中に予期せぬエラーが発生しました'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsSubmitting(false)
      }
    },
    [salon, billingPeriod, createSession, handleGetPreview]
  )

  // 請求ポータル表示関数をメモ化
  const handleBillingPortal = useCallback(async () => {
    try {
      setIsSubmitting(true)

      const result = await createBillingPortal({
        stripeCustomerId: salon?.stripeCustomerId ?? '',
        returnUrl: `${baseUrl}/dashboard/subscription`,
      })

      if (result?.portalUrl) {
        window.location.href = result.portalUrl
      } else {
        const errorMessage = '請求ポータルの取得に失敗しました'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (err) {
      console.error('Billing portal error:', err)
      const errorMessage =
        err instanceof Error
          ? `請求ポータルエラー: ${err.message}`
          : '請求ポータルへのアクセス中に予期せぬエラーが発生しました'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [createBillingPortal, salon?.stripeCustomerId])

  // 各プラン用のサブスクリプションハンドラをメモ化
  const handleLiteSubscribe = useCallback(() => {
    if (salon?.subscriptionId && salon?.subscriptionStatus !== 'canceled') {
      handleGetPreview('Lite', billingPeriod)
      setupdatePlanIdStr('Lite')
    } else {
      handleSubscribe('Lite')
    }
  }, [
    salon?.subscriptionId,
    salon?.subscriptionStatus,
    billingPeriod,
    handleGetPreview,
    handleSubscribe,
  ])

  const handleProSubscribe = useCallback(() => {
    if (salon?.subscriptionId && salon?.subscriptionStatus !== 'canceled') {
      handleGetPreview('Pro', billingPeriod)
      setupdatePlanIdStr('Pro')
    } else {
      handleSubscribe('Pro')
    }
  }, [
    salon?.subscriptionId,
    salon?.subscriptionStatus,
    billingPeriod,
    handleGetPreview,
    handleSubscribe,
  ])

  // const handleEnterpriseSubscribe = useCallback(() => {
  //   if (salon?.subscriptionId && salon?.subscriptionStatus !== 'canceled') {
  //     handleGetPreview('Enterprise', billingPeriod);
  //     setupdatePlanIdStr('Enterprise');
  //   } else {
  //     handleSubscribe('Enterprise');
  //   }
  // }, [
  //   salon?.subscriptionId,
  //   salon?.subscriptionStatus,
  //   billingPeriod,
  //   handleGetPreview,
  //   handleSubscribe,
  // ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20vh)]">
      {/* ヘッダー部分 */}
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-thin bg-primary bg-clip-text text-transparent mb-2">
          Bcker <span className="text-base text-muted-foreground">サブスクリプション</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto text-sm mb-6">
          あなたのサロンに最適なプランをお選びください
        </p>

        {/* 支払い期間切り替え */}
        <BillingPeriodToggle
          billingPeriod={billingPeriod}
          setBillingPeriodAction={setBillingPeriodAction}
        />
      </div>

      {/* 現在のプラン表示 */}
      <CurrentPlanBanner
        currentPlanStr={currentPlanStr}
        isActive={isActive}
        onPortalAction={handleBillingPortal}
        isSubmitting={isSubmitting}
      />
      <Separator className="mb-10 md:mb-16 mt-4 w-1/4" />

      {/* プレビューダイアログ */}
      <PreviewDialog
        open={showConfirmDialog}
        setOpenAction={setShowConfirmDialog}
        previewData={previewData}
        billingPeriod={billingPeriod}
        currentPlanStr={currentPlanStr}
        updatePlanIdStr={updatePlanIdStr}
        salon={salon as Doc<'salon'> | null}
        isSubmitting={isSubmitting}
        onConfirmAction={handleConfirmUpdate}
      />

      {/* プラン一覧 */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lite プラン */}
        <PlanCard
          title="Lite"
          description="スモールサロン向けの基本プラン"
          price={
            billingPeriod === 'monthly'
              ? SUBSCRIPTION_PLANS.LITE.monthly.price
              : SUBSCRIPTION_PLANS.LITE.yearly.price
          }
          savingPercent={
            billingPeriod === 'yearly' ? SUBSCRIPTION_PLANS.LITE.yearly.savingPercent : undefined
          }
          features={SUBSCRIPTION_PLANS.LITE.features}
          currentPlanStr={currentPlanStr}
          planId="Lite"
          billingPeriod={billingPeriod}
          currentBillingPeriod={subscription?.billingPeriod as BillingPeriod | undefined}
          isActive={isActive}
          onSubscribeAction={handleLiteSubscribe}
          onPortalAction={handleBillingPortal}
          isSubmitting={isSubmitting}
          highlightColor="from-blue-800 to-cyan-800"
          delay={0}
        />

        {/* Pro プラン */}
        <PlanCard
          title="Pro"
          description="中規模サロン向けの標準プラン"
          price={
            billingPeriod === 'monthly'
              ? SUBSCRIPTION_PLANS.PRO.monthly.price
              : SUBSCRIPTION_PLANS.PRO.yearly.price
          }
          savingPercent={
            billingPeriod === 'yearly' ? SUBSCRIPTION_PLANS.PRO.yearly.savingPercent : undefined
          }
          features={SUBSCRIPTION_PLANS.PRO.features}
          currentPlanStr={currentPlanStr}
          planId="Pro"
          billingPeriod={billingPeriod}
          currentBillingPeriod={subscription?.billingPeriod as BillingPeriod | undefined}
          isActive={isActive}
          onSubscribeAction={handleProSubscribe}
          onPortalAction={handleBillingPortal}
          isSubmitting={isSubmitting}
          isPopular={false}
          highlightColor="from-purple-800 to-indigo-800"
          delay={0.1}
        />

        {/* Enterprise プラン */}
        {/* <PlanCard
          title="Enterprise"
          description="大規模サロン向けの高機能プラン"
          price={
            billingPeriod === 'monthly'
              ? SUBSCRIPTION_PLANS.ENTERPRISE.monthly.price
              : SUBSCRIPTION_PLANS.ENTERPRISE.yearly.price
          }
          savingPercent={
            billingPeriod === 'yearly'
              ? SUBSCRIPTION_PLANS.ENTERPRISE.yearly.savingPercent
              : undefined
          }
          features={SUBSCRIPTION_PLANS.ENTERPRISE.features}
          currentPlanStr={currentPlanStr}
          planId="Enterprise"
          billingPeriod={billingPeriod}
          currentBillingPeriod={subscription?.billingPeriod as BillingPeriod | undefined}
          isActive={isActive}
          onSubscribeAction={handleEnterpriseSubscribe}
          onPortalAction={handleBillingPortal}
          isSubmitting={isSubmitting}
          highlightColor="from-rose-500 to-pink-500"
          delay={0.2}
        /> */}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mt-8 w-full max-w-5xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* フッター部分 */}
      <div className="mt-12 text-center text-sm text-muted-foreground max-w-md">
        <p>
          すべてのプランには30日間の無料トライアル期間が含まれています。
          <br />
          いつでもキャンセルまたはプラン変更が可能です。
        </p>
      </div>
    </div>
  )
}
