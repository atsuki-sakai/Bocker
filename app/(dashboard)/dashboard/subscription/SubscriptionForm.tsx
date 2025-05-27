'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAction, Preloaded, usePreloadedQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { PlanCard, BillingPeriodToggle, PreviewDialog, CurrentPlanBanner } from './_components'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { BillingPeriod } from '@/convex/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'
import { getPriceNameFromPlanName, getPlanNameFromPriceId } from '@/lib/utils'
import { Doc } from '@/convex/_generated/dataModel'
import { StripePreviewData } from '@/lib/types'
import { Id } from '@/convex/_generated/dataModel'
import { PLAN_TRIAL_DAYS } from '@/lib/constants'
import { BASE_URL } from '@/lib/constants'

interface SubscriptionFormProps {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  tenantPreloaded: Preloaded<typeof api.tenant.query.findByUserId>
  subscriptionPreloaded: Preloaded<typeof api.tenant.subscription.query.findByStripeCustomerId>
}

export default function SubscriptionForm({
  tenantId,
  orgId,
  tenantPreloaded,
  subscriptionPreloaded,
}: SubscriptionFormProps) {
  const tenant = usePreloadedQuery(tenantPreloaded)
  const subscription = usePreloadedQuery(subscriptionPreloaded)

  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState<StripePreviewData | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('month')
  const [updatePlanId, setUpdatePlanId] = useState<string | null>(null)

  const createSession = useAction(api.tenant.subscription.action.createSubscriptionSession)
  const createBillingPortal = useAction(api.tenant.subscription.action.createBillingPortalSession)
  const getSubscriptionUpdatePreview = useAction(
    api.tenant.subscription.action.getSubscriptionUpdatePreview
  )
  const confirmSubscriptionUpdate = useAction(
    api.tenant.subscription.action.confirmSubscriptionUpdate
  )

  // データの準備
  // 現在のプラン名を取得（price_idからプラン名に変換）
  const currentPlanName = subscription?.price_id
    ? getPlanNameFromPriceId(subscription.price_id)
    : null

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing' || false

  // メモ化したbillingPeriod設定関数
  const setBillingPeriodAction = useCallback((period: BillingPeriod) => {
    setBillingPeriod(period)
  }, [])

  // ダイアログ状態の変化をログに出力
  useEffect(() => {
    console.log('🎭 PreviewDialog状態変化:', {
      showConfirmDialog,
      hasPreviewData: !!previewData,
      updatePlanId,
      currentPlanName,
      billingPeriod,
      tenantSubscriptionId: tenant?.subscription_id,
    })
  }, [
    showConfirmDialog,
    previewData,
    updatePlanId,
    currentPlanName,
    billingPeriod,
    tenant?.subscription_id,
  ])

  // プレビュー取得関数をメモ化
  const handleGetPreview = useCallback(
    async (planName: string, billingPeriod: BillingPeriod, overrideSubscriptionId?: string) => {
      console.log('🔍 handleGetPreview開始:', { planName, billingPeriod, overrideSubscriptionId })

      try {
        setIsSubmitting(true)
        console.log('⏳ isSubmittingをtrueに設定')

        // より厳密なバリデーション - 引数で渡されたIDを優先
        const subscriptionId =
          overrideSubscriptionId || subscription?.stripe_subscription_id || tenant?.subscription_id
        const customerId = tenant?.stripe_customer_id

        // デバッグ情報をログに出力
        console.log('📋 Preview request params:', {
          planName,
          billingPeriod,
          subscriptionId,
          customerId,
          tenantId: tenant?._id,
          orgId,
          newPriceId: getPriceNameFromPlanName(planName, billingPeriod),
        })

        if (!subscriptionId || subscriptionId === '') {
          console.error('❌ サブスクリプションIDが見つかりません')
          throw new Error('サブスクリプションIDが見つかりません')
        }

        if (!customerId || customerId === '') {
          console.error('❌ Stripe顧客IDが見つかりません')
          throw new Error('Stripe顧客IDが見つかりません')
        }

        console.log('🚀 getSubscriptionUpdatePreview API呼び出し中...')

        // previewデータを取得し状態を更新
        const result = await getSubscriptionUpdatePreview({
          tenant_id: tenant?._id,
          subscription_id: subscriptionId,
          org_id: orgId,
          new_price_id: getPriceNameFromPlanName(planName, billingPeriod),
          stripe_customer_id: customerId,
        })

        console.log('📊 プレビューデータ取得成功:', result)

        // プレビューデータを設定
        setPreviewData(result as StripePreviewData)
        console.log('✅ setPreviewData完了')

        // ダイアログを表示
        setShowConfirmDialog(true)
        console.log('✅ setShowConfirmDialog(true)完了 - ダイアログが表示されるはずです')
      } catch (err) {
        console.error('❌ Preview error details:', err)
        const errorMessage =
          err instanceof Error
            ? `プレビュー取得エラー: ${err.message}`
            : 'プレビューの取得中に予期せぬエラーが発生しました'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsSubmitting(false)
        console.log('🏁 handleGetPreview終了 - isSubmittingをfalseに設定')
      }
    },
    [
      getSubscriptionUpdatePreview,
      subscription?.stripe_subscription_id,
      tenant?.subscription_id,
      tenant?.stripe_customer_id,
      tenant?._id,
      orgId,
    ]
  )

  // サブスクリプション更新確認関数をメモ化
  const handleConfirmUpdate = useCallback(
    async (subscriptionId: string, newPriceId: string) => {
      try {
        console.log('🔍 handleConfirmUpdate開始:', {
          subscriptionId,
          newPriceId,
          previewData,
          tenantId,
          orgId,
        })
        setIsSubmitting(true)
        const result = await confirmSubscriptionUpdate({
          tenant_id: tenantId,
          org_id: orgId,
          subscription_id: subscriptionId,
          new_price_id: newPriceId,
          items: previewData?.items || [],
          proration_date: previewData?.prorationDate || 0,
        })

        console.log('📊 confirmSubscriptionUpdate結果:', result)

        if (result.success) {
          console.log('✅ サブスクリプション更新成功!')
          toast.success('サブスクリプションを更新しました')

          // ダイアログを閉じる
          setShowConfirmDialog(false)

          // プレビューデータをクリア
          setPreviewData(null)
          setUpdatePlanId(null)
        } else {
          console.error('❌ サブスクリプション更新失敗:', result)
          const errorMessage = 'サブスクリプションの更新に失敗しました'
          setError(errorMessage)
          toast.error(errorMessage)
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
    [confirmSubscriptionUpdate, previewData, tenantId, orgId]
  )

  // サブスクリプション作成関数をメモ化
  const handleSubscribe = useCallback(
    async (planName: string, billingPeriod: BillingPeriod) => {
      console.log('🔥 handleSubscribe called with:', {
        planName,
        billingPeriod,
        tenantSubscriptionId: tenant?.subscription_id,
        subscriptionStripeId: subscription?.stripe_subscription_id,
        tenantSubscriptionStatus: tenant?.subscription_status,
        subscriptionStatus: subscription?.status,
        hasSubscriptionId: !!tenant?.subscription_id,
        hasSubscriptionFromQuery: !!subscription?.stripe_subscription_id,
      })

      // subscriptionオブジェクトからサブスクリプションIDを取得
      const subscriptionId = subscription?.stripe_subscription_id || tenant?.subscription_id

      if (
        subscriptionId &&
        (subscription?.status === 'active' || subscription?.status === 'trialing')
      ) {
        // 既契約あり → プレビュー
        console.log('✅ 既存契約あり - プレビューを表示します')
        await handleGetPreview(planName, billingPeriod, subscriptionId)
        setUpdatePlanId(planName)
        console.log('✅ プレビュー処理完了、updatePlanIdStrを設定:', planName)
      } else {
        // 新規 → Checkout
        console.log('🆕 新規契約 - チェックアウトページに遷移します')
        try {
          setIsSubmitting(true)
          const priceId = getPriceNameFromPlanName(planName, billingPeriod)
          const isTrial = !tenant?.subscription_status

          console.log('💳 チェックアウトセッション作成中:', {
            priceId,
            isTrial,
            tenantId,
            orgId,
          })

          const result = await createSession({
            tenant_id: tenantId,
            org_id: orgId,
            stripe_customer_id: tenant?.stripe_customer_id ?? '',
            user_id: tenant?.user_id ?? '',
            price_id: priceId,
            trial_days: isTrial ? 30 : undefined,
          })

          if (result?.checkoutUrl) {
            console.log('✅ チェックアウトURLを取得、リダイレクト中:', result.checkoutUrl)
            window.location.href = result.checkoutUrl
          } else {
            const errorMessage = 'チェックアウトURLの取得に失敗しました'
            console.error('❌ チェックアウトURL取得失敗:', result)
            setError(errorMessage)
            toast.error(errorMessage)
          }
        } catch (err: unknown) {
          console.error('❌ Subscription error:', err)
          const errorMessage =
            err instanceof Error
              ? `サブスクリプションエラー: ${err.message}`
              : 'サブスクリプションの処理中に予期せぬエラーが発生しました'
          setError(errorMessage)
          toast.error(errorMessage)
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [tenant, subscription, createSession, handleGetPreview, tenantId, orgId]
  )

  // 請求ポータル表示関数をメモ化
  const handleBillingPortal = useCallback(async () => {
    try {
      setIsSubmitting(true)

      const result = await createBillingPortal({
        tenant_id: tenantId,
        org_id: orgId,
        stripe_customer_id: tenant?.stripe_customer_id ?? '',
        return_url: `${BASE_URL}/dashboard/subscription`,
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
  }, [createBillingPortal, tenant?.stripe_customer_id, tenantId, orgId])

  // 各プラン用のサブスクリプションハンドラをメモ化
  const handleLiteSubscribe = useCallback(() => {
    console.log('🟦 Liteプランボタンがクリックされました', { billingPeriod })
    handleSubscribe('Lite', billingPeriod)
  }, [handleSubscribe, billingPeriod])

  const handleProSubscribe = useCallback(() => {
    console.log('🟪 Proプランボタンがクリックされました', { billingPeriod })
    handleSubscribe('Pro', billingPeriod)
  }, [handleSubscribe, billingPeriod])

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20vh)]">
      {/* ヘッダー部分 */}
      <div className="mb-4 text-center mt-6">
        <p className="text-muted-foreground font-bold max-w-md mx-auto text-sm mb-6">
          あなたのサロンに最適なプランをお選びください
        </p>

        {/* 支払い期間切り替え */}
        <BillingPeriodToggle
          billingPeriod={billingPeriod}
          setBillingPeriodAction={setBillingPeriodAction}
        />
      </div>

      {/* 現在のプラン表示 */}
      {currentPlanName && (
        <CurrentPlanBanner
          currentPlanName={currentPlanName}
          isActive={isActive}
          onPortalAction={handleBillingPortal}
          isSubmitting={isSubmitting}
        />
      )}
      <Separator className="mb-10 md:mb-16 mt-4 w-1/4" />

      {/* プレビューダイアログ */}
      <PreviewDialog
        open={showConfirmDialog}
        setOpenAction={setShowConfirmDialog}
        previewData={previewData}
        billingPeriod={billingPeriod}
        currentPlanName={currentPlanName}
        updatePlanName={updatePlanId as string}
        tenant={tenant as Doc<'tenant'> | null}
        subscriptionId={subscription?.stripe_subscription_id || tenant?.subscription_id || null}
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
            billingPeriod === 'month'
              ? (SUBSCRIPTION_PLANS.LITE.monthly.price ?? 0)
              : (SUBSCRIPTION_PLANS.LITE.yearly.price ?? 0)
          }
          savingPercent={
            billingPeriod === 'year'
              ? (SUBSCRIPTION_PLANS.LITE.yearly.savingPercent ?? 0)
              : undefined
          }
          features={SUBSCRIPTION_PLANS.LITE.features}
          currentPlanName={currentPlanName}
          planName="Lite"
          billingPeriod={billingPeriod}
          currentBillingPeriod={subscription?.billing_period as BillingPeriod | undefined}
          isActive={isActive}
          onSubscribeAction={handleLiteSubscribe}
          onPortalAction={handleBillingPortal}
          isSubmitting={isSubmitting}
          highlightColor="from-palette-2-foreground to-palette-2-foreground"
          delay={0}
        />

        {/* Pro プラン */}
        <PlanCard
          title="Pro"
          description="中規模サロン向けの標準プラン"
          price={
            billingPeriod === 'month'
              ? (SUBSCRIPTION_PLANS.PRO.monthly.price ?? 0)
              : (SUBSCRIPTION_PLANS.PRO.yearly.price ?? 0)
          }
          savingPercent={
            billingPeriod === 'year'
              ? (SUBSCRIPTION_PLANS.PRO.yearly.savingPercent ?? 0)
              : undefined
          }
          features={SUBSCRIPTION_PLANS.PRO.features}
          currentPlanName={currentPlanName}
          planName="Pro"
          billingPeriod={billingPeriod}
          currentBillingPeriod={subscription?.billing_period as BillingPeriod | undefined}
          isActive={isActive}
          onSubscribeAction={handleProSubscribe}
          onPortalAction={handleBillingPortal}
          isSubmitting={isSubmitting}
          isPopular={false}
          highlightColor="from-palette-3-foreground to-palette-3-foreground"
          delay={0.1}
        />
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
          すべてのプランには{PLAN_TRIAL_DAYS}日間の無料トライアル期間が含まれています。
          <br />
          いつでもキャンセルまたはプラン変更が可能です。
        </p>
      </div>
    </div>
  )
}
