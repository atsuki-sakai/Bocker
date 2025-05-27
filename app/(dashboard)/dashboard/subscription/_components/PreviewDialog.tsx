'use client'
// PreviewDialog Component
// ------------------------------------------------------

import { cn, getPriceStrFromPlanAndPeriod } from '@/lib/utils'
import { BillingPeriod } from '@/convex/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Doc } from '@/convex/_generated/dataModel'
import { StripePreviewData } from '@/lib/types'
import { useMemo } from 'react'

// Utility functions
// ------------------------------------------------------

// 英語のプラン名を日本語に変換する関数
const translatePlanName = (description: string | null): string => {
  if (!description) return '不明なプラン'

  if (description.includes('Liteプラン')) return 'Liteプラン'
  if (description.includes('Proプラン')) return 'Proプラン'
  if (description.includes('Enterpriseプラン')) return 'Enterpriseプラン'

  if (description.includes('lite')) return 'Liteプラン'
  if (description.includes('pro')) return 'Proプラン'
  if (description.includes('enterprise')) return 'Enterpriseプラン'

  return description
}

// 説明文を日本語に変換する関数
const translateDescription = (description: string | null): string => {
  if (!description) return '料金項目'

  if (description.includes('Trial period for')) {
    const planName = description.replace('Trial period for ', '')
    return `${planName}の無料トライアル期間`
  }

  if (description.includes('Unused time on')) {
    const planName = translatePlanName(
      description.replace('Unused time on ', '').split(' after')[0]
    )
    return `${planName}の未使用期間分の返金`
  }

  if (description.includes('Remaining time on')) {
    const planName = translatePlanName(
      description.replace('Remaining time on ', '').split(' after')[0]
    )
    return `${planName}の残り期間分の料金`
  }

  if (description.includes('月払い')) {
    return description
  }

  if (description.includes('month')) {
    const match = description.match(/\d+\s×\s(.*?)\s\(at\s¥([\d,]+)/)
    if (match) {
      const planName = translatePlanName(match[1])
      const price = match[2]
      return `${planName} (月額 ¥${price})`
    }
  }

  return description
}

interface PreviewDialogProps {
  open: boolean
  setOpenAction: (open: boolean) => void
  previewData: StripePreviewData | null
  billingPeriod: BillingPeriod
  currentPlanStr: string | null
  updatePlanIdStr: string | null
  tenant: Doc<'tenant'> | null
  subscriptionId: string | null
  isSubmitting: boolean
  onConfirmAction: (subscriptionId: string, newPriceId: string) => Promise<void>
}

export default function PreviewDialog({
  open,
  setOpenAction,
  previewData,
  billingPeriod,
  currentPlanStr,
  updatePlanIdStr,
  tenant,
  subscriptionId,
  isSubmitting,
  onConfirmAction,
}: PreviewDialogProps) {
  // Dialogのcloseハンドラ
  const handleDialogClose = (open: boolean) => setOpenAction(open)

  // 確認ボタン
  const handleConfirm = () => {
    console.log('🔘 PreviewDialog確認ボタンクリック:', {
      subscriptionId,
      updatePlanIdStr,
      billingPeriod,
      newPriceId: getPriceStrFromPlanAndPeriod(updatePlanIdStr || '', billingPeriod),
    })

    if (!subscriptionId || !updatePlanIdStr) {
      console.error('❌ 必要なパラメータが不足:', { subscriptionId, updatePlanIdStr })
      return
    }

    onConfirmAction(subscriptionId, getPriceStrFromPlanAndPeriod(updatePlanIdStr, billingPeriod))
  }

  // キャンセルボタン
  const handleCancel = () => setOpenAction(false)

  // 請求書アイテム
  const invoiceLines = useMemo(() => {
    if (!previewData) return []
    return previewData.previewInvoice.lines.data.map((item, idx) => (
      <div key={idx} className="flex justify-between text-sm">
        <span className="flex-1">{translateDescription(item.description)}</span>
        <span
          className={cn(
            'text-right ml-2',
            item.amount < 0 ? 'text-active' : item.amount === 0 ? 'text-muted-foreground' : ''
          )}
        >
          {item.amount < 0 ? '-' : ''}
          {item.amount === 0 ? '¥0' : `¥${Math.abs(item.amount).toLocaleString()}`}
        </span>
      </div>
    ))
  }, [previewData])

  const totalAmount = useMemo(() => {
    if (!previewData) return '0'
    return previewData.status === 'trialing' ? 0 : previewData.previewInvoice.total.toLocaleString()
  }, [previewData])

  const nextPaymentInfo = useMemo(() => {
    if (!previewData) return null
    const subItem = previewData.previewInvoice.lines.data.find(
      (item) => !item.proration && item.type === 'subscription'
    )
    if (!subItem) return null
    // @ts-expect-error 年払いの場合 amount が plan 内にある
    const amount = subItem?.plan?.amount || 0
    return `次回の定期支払い: ¥${amount.toLocaleString()}/${billingPeriod === 'month' ? '月' : '年'}`
  }, [previewData, billingPeriod])

  const confirmButtonContent = isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      処理中...
    </>
  ) : (
    '変更を確定する'
  )

  if (!previewData || !tenant) return null

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-primary bg-clip-text text-transparent">
            プラン変更の確認
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* 概要 */}
          <div className="p-4 rounded-lg bg-muted">
            <h3 className="font-medium text-xs mb-2">サブスクリプション変更内容</h3>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">現在のプラン</div>
                <div className="font-medium">{currentPlanStr}</div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div>
                <div className="text-sm text-muted-foreground">新しいプラン</div>
                <div className="font-medium">{updatePlanIdStr}</div>
              </div>
            </div>
          </div>

          {/* 料金詳細 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-background p-3 font-medium">料金の詳細</div>
            <div className="p-4 space-y-3">
              {invoiceLines}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>今回のお支払い金額</span>
                <span>¥{totalAmount}</span>
              </div>
              {nextPaymentInfo && (
                <div className="text-xs text-muted-foreground">{nextPaymentInfo}</div>
              )}
            </div>
          </div>

          {/* 注意 */}
          <div className="text-sm text-muted-foreground">
            <p>※ 日割り計算により、既に支払い済みの金額から調整されます。</p>
            <p>※ プラン変更は即時に適用されます。</p>
            {previewData.status === 'trialing' && (
              <p className="text-active font-semibold mt-1">
                ※ 現在トライアル期間中のため、プラン変更による追加料金は発生しません。
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={isSubmitting}>
            {confirmButtonContent}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
