'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { handleError } from '@/lib/error';

// ステータスの日本語表記
const statusNameMap: Record<string, string> = {
  not_connected: '未連携',
  pending: '連携中',
  incomplete: '登録未完了',
  restricted: '一部制限あり',
  active: '有効',
  deauthorized: '連携解除済み',
};

// ステータスの説明
const statusDescriptionMap: Record<string, string> = {
  not_connected:
    'Stripeアカウントが連携されていません。「連携する」ボタンをクリックして始めましょう。',
  pending: '連携プロセスが開始されましたが、Stripeアカウントの設定が完了していません。',
  incomplete:
    '追加情報の入力が必要です。Stripeダッシュボードにアクセスして残りの手続きを完了してください。',
  restricted:
    'アカウントは一部制限付きで有効です。すべての機能を使用するには、Stripeダッシュボードで追加の手続きを完了してください。',
  active: 'Stripeアカウントが完全に連携され、すべての機能が使用可能です。',
  deauthorized:
    'アカウントの連携が解除されました。再度連携するには「連携する」ボタンをクリックしてください。',
};

export default function StripeConnectStatus() {
  const { salonId } = useSalon();
  const [isLoading, setIsLoading] = useState(false);

  // Stripe Connect アカウント情報を取得
  const connectAccount = useQuery(
    api.salon.core.query.getConnectAccountDetails,
    salonId ? { salonId } : 'skip'
  );

  // API呼び出しの共通処理
  const fetchApi = async <T,>(
    url: string,
    data: Record<string, unknown>
  ): Promise<{ data?: T; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || `エラーが発生しました (${response.status})`;
        toast.error(errorMessage);
        return { error: errorMessage };
      }

      return { data: responseData };
    } catch (error) {
      const errorDetails = handleError(error);
      return { error: errorDetails.message };
    } finally {
      setIsLoading(false);
    }
  };

  // URLからクエリパラメータを取得
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const success = query.get('success');
    const refresh = query.get('refresh');

    if (success === 'true') {
      toast.success('Stripeアカウントの連携が完了しました');
      // クエリパラメータを削除
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (refresh === 'true') {
      toast.info('Stripeアカウントの設定を続けてください');
      // クエリパラメータを削除
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Stripe Connectアカウントを作成する処理
  const handleConnectStripe = async () => {
    if (!salonId) return;
    try {
      const { data } = await fetchApi<{ account: string; accountLink: string }>(
        '/api/stripe/connect',
        { salonId }
      );

      if (data && data.account && data.accountLink) {
        window.location.href = data.accountLink;
      }
    } catch (error) {
      const errorDetails = handleError(error);
      toast.error(errorDetails.message);
    }
  };

  // Stripe Dashboardへのリンクを生成
  const handleViewDashboard = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!salonId || !connectAccount?.accountId) return;

    try {
      const { data } = await fetchApi<{ url: string; isOnboarding: boolean }>(
        '/api/stripe/connect/login',
        {
          salonId,
          accountId: connectAccount.accountId,
        }
      );

      if (data?.url) {
        if (data.isOnboarding) {
          toast.info('Stripeアカウントの設定を完了してください');
        }
        window.open(data.url, '_blank');
      }
    } catch (error) {
      const errorDetails = handleError(error);
      toast.error(errorDetails.message);
    }
  };

  if (!salonId) {
    return <Skeleton className="h-60 w-full" />;
  }

  const status = connectAccount?.status || 'not_connected';
  const isConnected = status !== 'not_connected' && status !== 'deauthorized';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
          <CardTitle className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-500"
            >
              <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
              <path d="M10 13h4" />
            </svg>
            Stripe決済連携
          </CardTitle>
          <CardDescription>
            Stripeアカウントを連携して、お客様からのクレジットカード決済を受け付けることができます
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div className="flex items-center gap-2">
              {connectAccount?.accountId && (
                <span className="text-xs text-gray-500">
                  ID: {connectAccount.accountId.slice(0, 8)}...
                </span>
              )}
            </div>
            {isConnected && (
              <Button
                size="sm"
                variant={status === 'active' ? 'outline' : 'default'}
                onClick={handleViewDashboard}
                disabled={isLoading}
                className={`text-sm ${status === 'active' ? '' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                {status === 'incomplete' || status === 'pending'
                  ? '設定を完了する'
                  : status === 'restricted'
                    ? '制限を解除する'
                    : 'Stripeダッシュボードを開く'}
              </Button>
            )}
          </div>

          <Alert className="my-2">
            <AlertTitle className=" text-sm font-medium">
              ステータス -{' '}
              <span className="text-sm bg-indigo-500 text-white tracking-wide font-bold px-3 py-1 rounded-md">
                {statusNameMap[status]}
              </span>
            </AlertTitle>
            <AlertDescription className=" mt-1 text-sm">
              {statusDescriptionMap[status]}
            </AlertDescription>
          </Alert>

          {(status === 'pending' || status === 'incomplete' || status === 'restricted') && (
            <motion.div
              className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="mb-2 font-medium flex items-center">
                <RefreshCw className="mr-2 h-4 w-4 text-blue-500" />
                {status === 'pending'
                  ? 'Stripeアカウント設定の完了が必要です'
                  : status === 'incomplete'
                    ? '追加情報の入力が必要です'
                    : '引き出し機能の制限があります'}
              </h3>

              {status === 'pending' && (
                <div className="space-y-3 mt-3">
                  <div className="flex items-start gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-500 text-xs font-medium text-blue-500">
                      1
                    </div>
                    <div>
                      <p className="font-medium">基本情報の入力</p>
                      <p className="mt-1 text-xs text-gray-500">
                        ビジネス名、住所、事業形態などの基本情報を入力してください
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-500 text-xs font-medium text-blue-500">
                      2
                    </div>
                    <div>
                      <p className="font-medium">銀行口座の登録</p>
                      <p className="mt-1 text-xs text-gray-500">
                        売上金の振込先となる銀行口座情報を登録してください
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-500 text-xs font-medium text-blue-500">
                      3
                    </div>
                    <div>
                      <p className="font-medium">本人確認の完了</p>
                      <p className="mt-1 text-xs text-gray-500">
                        本人確認書類をアップロードして、身元確認を完了してください
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {status === 'incomplete' && (
                <div className="space-y-3 mt-3">
                  <p className="text-sm text-gray-700">
                    以下の情報が不足しています。「設定を完了する」ボタンをクリックして、残りの手続きを完了してください。
                  </p>
                  <ul className="ml-6 list-disc space-y-1 text-sm">
                    <li>不足している情報を入力</li>
                    <li>追加の確認書類を提出</li>
                  </ul>
                </div>
              )}

              {status === 'restricted' && (
                <div className="space-y-3 mt-3">
                  <p className="text-sm text-gray-700">
                    決済処理は可能ですが、引き出し機能に制限があります。
                  </p>
                  <ul className="ml-6 list-disc space-y-1 text-sm">
                    <li>追加の事業情報を提供</li>
                    <li>銀行口座情報の確認</li>
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleViewDashboard}
                >
                  <ArrowRight className="mr-1 h-3 w-3" />
                  Stripeで設定を続ける
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
        <CardFooter className="bg-gray-50 px-6 py-4 dark:bg-gray-800/50">
          <div className="w-full flex flex-col-reverse sm:flex-row justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p className="text-xs font-bold">決済手数料: 4% + 40円/件</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs">※ 売り上げは毎月25日に設定した銀行口座へ振込まれます。</p>
              </div>

              {(status === 'incomplete' || status === 'pending') && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        '現在の連携を解除して、新しくアカウントを作成しますか？\n※以前の設定内容は失われます'
                      )
                    ) {
                      handleConnectStripe();
                    }
                  }}
                  className="block mt-2 text-xs text-blue-500 hover:underline"
                >
                  アカウントを再作成する
                </button>
              )}
            </div>
            <Button
              onClick={handleConnectStripe}
              disabled={isLoading || (isConnected && status !== 'deauthorized')}
              className={`${
                isConnected && status !== 'deauthorized'
                  ? 'bg-gray-400 hover:bg-gray-400'
                  : 'bg-[#635bff] hover:bg-[#8780fa]'
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  処理中...
                </>
              ) : isConnected && status !== 'deauthorized' ? (
                '連携済み'
              ) : (
                <>
                  Stripeと連携する <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
