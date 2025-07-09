'use client'

import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useTranslations } from 'next-intl'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Copy, Check, Share2 } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { toast } from 'sonner'
import { Progress } from '../ui/progress'
import { Link } from '@/i18n/navigation'
import { BASE_REFERRAL_DISCOUNT_AMOUNT, MAX_REFERRAL_COUNT } from '@/lib/constants'

export default function ReferralCard() {
  const t = useTranslations('referralCard')
  const { tenantId, subscription } = useTenantAndOrganization()
  const [copied, setCopied] = useState<boolean>(false)

  const referral = useQuery(
    api.tenant.referral.query.findByTenantId,
    tenantId
      ? {
          tenant_id: tenantId,
        }
      : 'skip'
  )

  // コピー状態をリセットするタイマー
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  // 紹介コードをクリップボードにコピーする関数
  const copyToClipboard = (): void => {
    if (referral?.referral_code) {
      navigator.clipboard.writeText(referral.referral_code)
      setCopied(true)
      toast.success(t('copied'), {
        description: t('copiedDescription'),
        duration: 1500,
      })
    }
  }

  // 紹介リンクを共有する関数
  const shareReferralLink = (): void => {
    if (referral?.referral_code) {
      // アプリのベースURLを設定（環境に応じて変更が必要）
      const baseUrl = window.location.origin
      const signupUrl = `${baseUrl}/sign-up?referral_code=${referral.referral_code}`

      // Web Share APIがサポートされている場合
      if (navigator.share) {
        navigator.share({
          title: t('shareTitle'),
          text: t('shareText'),
          url: signupUrl,
        })
      }
    }
  }

  // 招待リンクをクリップボードにコピーし、オプションで新しいタブで開く
  const copySignupLink = (url: string): void => {
    navigator.clipboard.writeText(url)
    toast.success(t('inviteLinkCopied'), {
      description: t('inviteLinkCopiedDescription'),
      action: (
        <Button variant="default" size="sm" onClick={() => window.open(url, '_blank')}>
          {t('openLink')}
        </Button>
      ),
      duration: 5000,
    })
  }

  // 紹介プログレス計算
  const calculateProgress = (): number => {
    if (!referral?.total_referral_count) return 0
    const count = Math.min(referral.total_referral_count, MAX_REFERRAL_COUNT)
    return (count / MAX_REFERRAL_COUNT) * 100
  }

  return (
    <AnimatePresence>
      {referral ? (
        referral.total_referral_count! < MAX_REFERRAL_COUNT ? (
          <Card
            className={`overflow-hidden border-border shadow-none ${subscription && (subscription.status === 'active' || subscription.status === 'trialing') ? '' : ' blur-sm pointer-events-none select-none'}`}
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground mb-1">{t('yourReferralCode')}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base tracking-wide uppercase">
                        {referral.referral_code}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-8 w-8"
                              onClick={copyToClipboard}
                            >
                              {copied ? (
                                <Check size={16} className="text-accent-2" />
                              ) : (
                                <Copy size={16} />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('copyCode')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        copySignupLink(
                          `${window.location.origin}/sign-up?referral_code=${referral.referral_code}`
                        )
                      }}
                    >
                      <Copy size={14} />
                      <span className="hidden md:block">{t('shareReferralLinkCopy')}</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        shareReferralLink()
                      }}
                    >
                      <Share2 size={14} />
                      <span className="hidden md:block">{t('shareReferralLink')}</span>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-3 bg-secondary rounded-lg border border-border">
                  <div className="flex flex-col gap-2 md:flex-row justify-between items-start mb-1">
                    <p className="text-sm font-semibold text-primary">{t('referralBenefit')}</p>
                    <p className="text-sm font-bold text-primary">
                      {t('maxDiscount')}
                      <span className="text-accent-2 text-xl px-1">
                        {(MAX_REFERRAL_COUNT * BASE_REFERRAL_DISCOUNT_AMOUNT).toLocaleString()}
                      </span>
                      {t('receiveDiscount')}
                    </p>
                  </div>
                  <p className="text-xs tracking-wide text-primary">
                    {t('referralExplanation')}
                    <span className="text-accent-2 text-xl px-1">
                      {BASE_REFERRAL_DISCOUNT_AMOUNT.toLocaleString()}
                    </span>
                    {t('discountApplied')}
                    {MAX_REFERRAL_COUNT}
                    {t('timesMax')} {t('checkStatusAt')}
                    <Link
                      className="text-link-foreground font-medium underline"
                      href="/dashboard/subscription"
                    >
                      {t('subscriptionPage')}
                    </Link>
                    {t('canCheckAnytime')}
                  </p>
                  <p className="text-xs tracking-wide  text-primary">
                    {t('bothPartyBenefit')}
                    <span className="text-accent-2 text-xl px-1">
                      {BASE_REFERRAL_DISCOUNT_AMOUNT.toLocaleString()}
                    </span>
                    {t('oneTimeDiscount')}
                    {MAX_REFERRAL_COUNT}
                    {t('carryOverNext')}
                  </p>
                  <p className="text-xs tracking-wide text-primary mt-2">
                    {t('discountApplyDate')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold tracking-tighter text-primary">
                      {t('earnedDiscount')}
                      <span className="text-accent-2 text-2xl px-1">
                        {(
                          referral.total_referral_count! * BASE_REFERRAL_DISCOUNT_AMOUNT
                        ).toLocaleString()}
                      </span>
                      {t('yenIs')}
                    </p>
                    <p className="text-sm text-primary">
                      {referral.total_referral_count &&
                      referral.total_referral_count > MAX_REFERRAL_COUNT
                        ? `${MAX_REFERRAL_COUNT}/${MAX_REFERRAL_COUNT}`
                        : `${referral.total_referral_count ?? 0}/${MAX_REFERRAL_COUNT}`}
                    </p>
                  </div>

                  <Progress
                    value={calculateProgress()}
                    className="h-2 data-[state=indeterminate]:bg-slate-300 bg-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null
      ) : (
        <Skeleton className="h-52 w-full rounded-lg" />
      )}
    </AnimatePresence>
  )
}
