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
import { toast } from '../ui/use-toast';
import { Progress } from '../ui/progress';
import Link from 'next/link';

export default function ReferralCard() {
  const { salonId } = useSalon();
  const [copied, setCopied] = useState<boolean>(false);

  const referral = useQuery(
    api.salon.referral.query.findBySalonId,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip'
  );

  // コピー状態をリセットするタイマー
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // 紹介コードをクリップボードにコピーする関数
  const copyToClipboard = (): void => {
    if (referral?.referralCode) {
      navigator.clipboard.writeText(referral.referralCode);
      setCopied(true);
      toast({
        title: 'コピーしました',
        description: '紹介コードがクリップボードにコピーされました',
        duration: 1500,
      });
    }
  };

  // 紹介リンクを共有する関数
  const shareReferralLink = (): void => {
    if (referral?.referralCode) {
      // アプリのベースURLを設定（環境に応じて変更が必要）
      const baseUrl = window.location.origin;
      const signupUrl = `${baseUrl}/sign-up?referral_code=${referral.referralCode}`;

      // Web Share APIがサポートされている場合
      if (navigator.share) {
        navigator
          .share({
            title: 'Bckerをお友達を紹介して最大30,000円お得に！',
            text: '今なら紹介コードを入力して登録すると、あなたとお友達に１ヶ月¥5,000円の割引が適用されます。ぜひご利用ください！紹介はおひとり様で最大6回まで受けられます。',
            url: signupUrl,
          })
          .catch((error) => {
            console.error('共有に失敗しました:', error);
            // フォールバック: URLをクリップボードにコピー
            copySignupLink(signupUrl);
          });
      } else {
        // Web Share APIがサポートされていない場合、URLをクリップボードにコピー
        copySignupLink(signupUrl);
      }
    }
  };

  // 招待リンクをクリップボードにコピーし、オプションで新しいタブで開く
  const copySignupLink = (url: string): void => {
    navigator.clipboard.writeText(url);
    toast({
      title: '招待リンクをコピーしました',
      description: 'クリップボードに招待リンクがコピーされました',
      action: (
        <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
          リンクを開く
        </Button>
      ),
      duration: 5000,
    });
  };

  // 紹介プログレス計算
  const calculateProgress = (): number => {
    if (!referral?.totalReferralCount) return 0;
    const count = Math.min(referral.totalReferralCount, 6);
    return (count / 6) * 100;
  };

  return (
    <AnimatePresence>
      {referral ? (
        referral.totalReferralCount! < 6 ? (
          <Card className="overflow-hidden border-indigo-200 shadow-none">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <p className="text-sm text-gray-500 mb-1">あなたの紹介コード</p>
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
                                <Check size={16} className="text-green-500" />
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareReferralLink}
                    className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <Share2 size={14} />
                    <span className="hidden md:block">紹介リンクを共有する</span>
                  </Button>
                </div>

                <div className="flex flex-col gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-800">紹介特典 🎁</p>
                    <p className="text-sm font-bold text-slate-600">
                      最大<span className="text-green-600 text-xl px-1">30,000</span>
                      円分の割引を受け取れます！
                    </p>
                  </div>
                  <p className="text-xs tracking-wide leading-4 text-gray-700">
                    1人紹介するごとに、翌月(25日)のサブスクリプション料金から
                    <b className="text-green-600">5,000円</b>割引されます（最大6回まで）。
                    特典の適用状況は、
                    <Link
                      className="text-indigo-600 font-medium underline"
                      href="/dashboard/subscription"
                    >
                      サブスクリプション管理ページ
                    </Link>
                    でいつでもご確認いただけます。
                  </p>
                  <p className="text-xs tracking-wide leading-4 text-gray-700">
                    紹介を受けた方お客様と紹介者のお客様の両方に月5000円の割引を一回受けられます。毎月一回分の紹介料を割引き、余剰分は最大６回まで翌月に繰り越します。
                  </p>
                  <p className="text-xs tracking-wide leading-4 text-gray-700 mt-2">
                    割引は、毎月(25日)に契約中のサブスクリプションに適用されます。
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-600">
                      獲得したキャッシュバックは
                      <span className="text-green-600 text-2xl px-1">
                        {referral.totalReferralCount! * 5000}
                      </span>
                      円です。
                    </p>
                    <p className="text-sm text-gray-600">
                      {referral.totalReferralCount && referral.totalReferralCount > 6
                        ? '6/6'
                        : `${referral.totalReferralCount ?? 0}/6`}
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
  );
}
