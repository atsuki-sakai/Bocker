'use client';

import { useSalon } from '@/hooks/useSalon';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Copy, Check, Share2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { toast } from 'sonner'
import { Progress } from '../ui/progress'
import Link from 'next/link'
import { BASE_REFERRAL_DISCOUNT_AMOUNT, MAX_REFERRAL_COUNT } from '@/lib/constants'

export default function ReferralCard() {
  const { salonId } = useSalon()
  const [copied, setCopied] = useState<boolean>(false)

  const referral = useQuery(
    api.tenant.referral.query.findByTenantId,
    salonId
      ? {
          tenantId: tenantId,
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
    if (referral?.referralCode) {
      navigator.clipboard.writeText(referral.referralCode)
      setCopied(true)
      toast.success('コピーしました', {
        description: '紹介コードがクリップボードにコピーされました',
        duration: 1500,
      })
    }
  }

  // 紹介リンクを共有する関数
  const shareReferralLink = (): void => {
    if (referral?.referralCode) {
      // アプリのベースURLを設定（環境に応じて変更が必要）
      const baseUrl = window.location.origin
      const signupUrl = `${baseUrl}/sign-up?referral_code=${referral.referralCode}`

      // Web Share APIがサポートされている場合
      if (navigator.share) {
        navigator
          .share({
            title: 'Bockerをお友達を紹介して最大12,000円お得に！',
            text: '今なら紹介コードを入力して登録すると、あなたとお友達に１ヶ月¥2,000円の割引が適用されます。ぜひご利用ください！紹介はおひとり様で最大6回まで受けられます。',
            url: signupUrl,
          })
          .catch((error) => {
            console.error('共有に失敗しました:', error)
            // フォールバック: URLをクリップボードにコピー
            copySignupLink(signupUrl)
          })
      }
    }
  }

  // 招待リンクをクリップボードにコピーし、オプションで新しいタブで開く
  const copySignupLink = (url: string): void => {
    navigator.clipboard.writeText(url)
    toast.success('招待リンクをコピーしました', {
      description: 'クリップボードに招待リンクがコピーされました',
      action: (
        <Button variant="default" size="sm" onClick={() => window.open(url, '_blank')}>
          リンクを開く
        </Button>
      ),
      duration: 5000,
    })
  }

  // 紹介プログレス計算
  const calculateProgress = (): number => {
    if (!referral?.totalReferralCount) return 0
    const count = Math.min(referral.totalReferralCount, MAX_REFERRAL_COUNT)
    return (count / MAX_REFERRAL_COUNT) * 100
  }

  return (
    <AnimatePresence>
      {referral ? (
        referral.totalReferralCount! < MAX_REFERRAL_COUNT ? (
          <Card className="overflow-hidden border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground mb-1">あなたの紹介コード</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base tracking-wide uppercase">
                        {referral.referralCode}
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
                                <Check size={16} className="text-active" />
                              ) : (
                                <Copy size={16} />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>コードをコピー</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <Button size="sm" onClick={shareReferralLink}>
                    <Share2 size={14} />
                    <span className="hidden md:block">紹介リンクを共有する</span>
                  </Button>
                </div>

                <div className="flex flex-col gap-2 p-3 bg-secondary rounded-lg border border-border">
                  <div className="flex flex-col gap-2 md:flex-row justify-between items-start mb-1">
                    <p className="text-sm font-semibold text-primary">紹介特典 🎁</p>
                    <p className="text-sm font-bold text-primary">
                      最大
                      <span className="text-active text-xl px-1">
                        {(MAX_REFERRAL_COUNT * BASE_REFERRAL_DISCOUNT_AMOUNT).toLocaleString()}
                      </span>
                      円分の割引を受け取る
                    </p>
                  </div>
                  <p className="text-xs tracking-wide text-primary">
                    1人紹介するごとに、翌月(25日)のサブスクリプション料金から
                    <span className="text-active text-xl px-1">
                      {BASE_REFERRAL_DISCOUNT_AMOUNT.toLocaleString()}
                    </span>
                    円割引されます（最大{MAX_REFERRAL_COUNT}回まで）。 特典の適用状況は、
                    <Link
                      className="text-link-foreground font-medium underline"
                      href="/dashboard/subscription"
                    >
                      サブスクリプション管理ページ
                    </Link>
                    でいつでもご確認いただけます。
                  </p>
                  <p className="text-xs tracking-wide  text-primary">
                    紹介を受けた方お客様と紹介者のお客様の両方に月
                    <span className="text-active text-xl px-1">
                      {BASE_REFERRAL_DISCOUNT_AMOUNT.toLocaleString()}
                    </span>
                    円の割引を一回受けられます。毎月一回分の紹介料を割引き、余剰分は最大
                    {MAX_REFERRAL_COUNT}回まで翌月に繰り越します。
                  </p>
                  <p className="text-xs tracking-wide text-primary mt-2">
                    割引は、毎月(25日)に契約中のサブスクリプションに適用されます。
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold tracking-tighter text-primary">
                      獲得した割引は
                      <span className="text-active text-2xl px-1">
                        {(
                          referral.totalReferralCount! * BASE_REFERRAL_DISCOUNT_AMOUNT
                        ).toLocaleString()}
                      </span>
                      円です。
                    </p>
                    <p className="text-sm text-primary">
                      {referral.totalReferralCount &&
                      referral.totalReferralCount > MAX_REFERRAL_COUNT
                        ? `${MAX_REFERRAL_COUNT}/${MAX_REFERRAL_COUNT}`
                        : `${referral.totalReferralCount ?? 0}/${MAX_REFERRAL_COUNT}`}
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
