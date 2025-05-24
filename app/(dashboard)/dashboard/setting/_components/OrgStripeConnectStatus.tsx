'use client'

import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/common'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowRight, RefreshCw, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Loader2 } from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { ExternalLink } from 'lucide-react'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'

// ステータスの日本語表記
const statusNameMap: Record<string, string> = {
  not_connected: '未連携',
  pending: '連携中',
  incomplete: '登録未完了',
  restricted: '一部制限あり',
  active: '有効',
  deauthorized: '連携解除済み',
}

const statusColorMap: Record<string, string> = {
  not_connected: 'border border-palette-1-foreground text-palette-1-foreground bg-palette-1',
  pending: 'border border-palette-2-foreground text-palette-2-foreground bg-palette-2',
  incomplete: 'border border-palette-3-foreground text-palette-3-foreground bg-palette-3',
  restricted: 'border border-palette-4-foreground text-palette-4-foreground bg-palette-4',
  active: 'border border-palette-5-foreground text-palette-5-foreground bg-palette-5',
}

// ステータスの説明
const statusDescriptionMap: Record<string, string> = {
  not_connected:
    'Stripeアカウントがまだ連携されていません。右上の「Stripeと連携する」ボタンからビジネス情報登録を開始してください。',
  pending:
    '連携プロセスは開始されていますが、登録が完了していません。届いたメールか「設定を完了する」ボタンから残りの手続きを行ってください。',
  incomplete:
    'Stripeから追加書類または情報の提出を求められています。「設定を完了する」をクリックしてダッシュボードで不足項目を入力してください。',
  restricted:
    '決済は利用できますが、入金（振込）が制限されています。ダッシュボードで銀行口座の確認や追加情報を提出し、制限を解除してください。',
  active:
    'Stripeアカウント連携が完了し、決済と振込機能をすべて利用できます。ダッシュボードで取引状況や残高を確認できます。',
  deauthorized:
    'Stripeとの連携が解除されています。売上を受け取るには「Stripeと連携する」ボタンから再接続を行ってください。',
}

export default function StripeConnectStatus() {
  const { tenantId, orgId, isLoading: isLoadingTenantAndOrganization } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  // Stripe Connect アカウント情報を取得
  const connectAccount = useQuery(
    api.organization.query.getConnectAccountDetails,
    tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip'
  )

  // API呼び出しの共通処理
  const fetchApi = async <T,>(
    url: string,
    data: Record<string, unknown>
  ): Promise<{ data?: T; error?: string }> => {
    setIsLoading(true)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMessage = responseData.error || `エラーが発生しました (${response.status})`
        toast.error(errorMessage)
        return { error: errorMessage }
      }

      return { data: responseData }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    } finally {
      setIsLoading(false)
    }
  }

  // URLからクエリパラメータを取得
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const success = query.get('success')
    const refresh = query.get('refresh')

    if (success === 'true') {
      toast.success('Stripeアカウントの連携が完了しました')
      // クエリパラメータを削除
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (refresh === 'true') {
      toast.info('Stripeアカウントの設定を続けてください')
      // クエリパラメータを削除
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Stripe Connectアカウントを作成する処理
  const handleConnectStripe = async () => {
    try {
      console.log('handleConnectStripe')
      const { data } = await fetchApi<{ account: string; accountLink: string }>(
        '/api/stripe/connect',
        { tenant_id: tenantId, org_id: orgId }
      )
      console.log(data)

      if (data && data.account && data.accountLink) {
        console.log(data.accountLink)
        // window.location.href = data.accountLink
      }
    } catch (error) {
      showErrorToast(error)
    }
  }

  // Stripe Dashboardへのリンクを生成
  const handleViewDashboard = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsLoading(true)
    if (!connectAccount?.stripe_connect_id) return

    try {
      // FIXME: このAPIはまだ作成していない
      const { data } = await fetchApi<{ url: string; isOnboarding: boolean }>(
        '/api/stripe/connect/login',
        {
          tenant_id: tenantId,
          org_id: orgId,
          stripe_connect_id: connectAccount.stripe_connect_id,
        }
      )

      if (data?.url) {
        if (data.isOnboarding) {
          toast.info('Stripeアカウントの設定を完了してください')
        }
        router.push(data.url)
      }
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (connectAccount === undefined) {
    return <Loading />
  }
  if (isLoadingTenantAndOrganization) {
    return <Loading />
  }

  const status = connectAccount?.stripe_connect_status || 'not_connected'
  const isConnected = status !== 'not_connected' && status !== 'deauthorized'

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-2xl font-bold mb-1">Stripe決済連携</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Stripeアカウントを連携して、お客様からのクレジットカード決済を受け付けることができます。
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-2 my-6">
        {isConnected && (
          <Button
            onClick={handleViewDashboard}
            disabled={isLoading}
            className={`text-sm ${status === 'active' ? '' : 'opacity-50 pointer-events-none'}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                リダイレクト中...
              </>
            ) : (
              <>
                <ExternalLink className="mr-1 h-4 w-4" />
                {status === 'incomplete' || status === 'pending'
                  ? '設定を完了する'
                  : status === 'restricted'
                    ? '制限を解除する'
                    : 'Stripeダッシュボードを開く'}
              </>
            )}
          </Button>
        )}
      </div>

      <Alert className={`${statusColorMap[status]} mb-4`}>
        <AlertTitle className=" text-sm font-medium mb-2">
          <span
            className={`text-xs tracking-widest font-bold px-3 py-1 rounded-md ${statusColorMap[status]}`}
          >
            {statusNameMap[status]}
          </span>
        </AlertTitle>
        <AlertDescription className="mt-1 text-sm">{statusDescriptionMap[status]}</AlertDescription>
      </Alert>

      {(status === 'pending' || status === 'incomplete' || status === 'restricted') && (
        <motion.div
          className="mt-4 rounded-lg bg-secondary p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="mb-2 font-bold flex items-center">
            <RefreshCw className="mr-2 h-4 w-4 text-active" />
            {status === 'pending'
              ? 'Stripeアカウント設定の完了が必要です'
              : status === 'incomplete'
                ? '追加情報の入力が必要です'
                : '引き出し機能の制限があります'}
          </h3>

          {status === 'pending' && (
            <div className="space-y-3 mt-3 leading-6">
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-link-foreground text-xs font-medium text-link-foreground">
                  1
                </div>
                <div>
                  <p className="font-medium">基本情報の入力</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ビジネス名、住所、事業形態などの基本情報を入力してください
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-link-foreground text-xs font-medium text-link-foreground">
                  2
                </div>
                <div>
                  <p className="font-medium">銀行口座の登録</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    売上金の振込先となる銀行口座情報を登録してください
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-link-foreground text-xs font-medium text-link-foreground">
                  3
                </div>
                <div>
                  <p className="font-medium">本人確認の完了</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    本人確認書類をアップロードして、身元確認を完了してください
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'incomplete' && (
            <div className="space-y-3 mt-3 leading-6">
              <p className="text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
                決済処理は可能ですが、引き出し機能に制限があります。
              </p>
              <ul className="ml-6 list-disc space-y-1 text-sm">
                <li>追加の事業情報を提供</li>
                <li>銀行口座情報の確認</li>
              </ul>
            </div>
          )}

          <div className="mt-4">
            <Button size="sm" className="text-xs" onClick={handleViewDashboard}>
              Stripeで設定を続ける
              <ChevronRight className="mr-1 h-3 w-3" />
            </Button>
          </div>
        </motion.div>
      )}

      <div className="bg-muted px-6 py-4 rounded-md mt-6">
        <div className="w-full flex flex-col-reverse sm:flex-row justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            <p className="text-sm font-semibold mb-1 text-muted-foreground">
              決済手数料: 4% + 40円/件
            </p>
            <div className="flex items-center gap-2 mt-1">
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
                    handleConnectStripe()
                  }
                }}
                className="block mt-2 text-xs text-link-foreground underline"
              >
                アカウントを再作成する
              </button>
            )}
          </div>

          {status === 'not_connected' && (
            <Button
              onClick={handleConnectStripe}
              disabled={isLoading || (isConnected && status !== 'deauthorized')}
              className={`${
                isConnected && status !== 'deauthorized' ? 'bg-muted hover:opacity-80' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  Stripeと連携する <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <Accordion type="multiple" className="mt-8 space-y-2 tracking-normal">
        {/* What is Stripe */}
        <AccordionItem value="stripe-overview">
          <AccordionTrigger>Stripe とは？</AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Stripe（ストライプ）</strong> は、米国発のオンライン決済サービスで、 世界 120
              か国以上・数百万社以上のビジネスで利用されています。Bocker は<strong>Stripe</strong>{' '}
              を採用することで、
              サロン様が複雑な契約やシステム開発を行うことなく、クレジットカード決済を
              すぐに導入できる環境を提供しています。
            </p>
            <p>
              Stripeアカウントを作成すると、カード決済・売上管理・振込管理が すべて Stripe
              で完結。サロン様は「売上を見る」「いつ入金されるか確認する」
              だけのシンプルな運用で済みます。
            </p>
            <p className="bg-muted p-3 rounded-md">
              <strong>ポイント</strong>
              <br />
              ・Bocker もサロン様もカード番号を保持しないため情報漏えいリスクを最小化
              <br />
              ・国内外の主要カードブランド（Visa/Mastercard/JCB 等）に標準対応
              <br />
              ・決済手段の追加（Apple Pay や Google Pay 等）も将来的に拡張可能
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Requirements & Flow */}
        <AccordionItem value="stripe-signup">
          <AccordionTrigger>登録に必要なもの・手続きの流れ</AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium">登録に必要なもの</p>
            <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
              <li>サロンの正式名称・所在地・電話番号</li>
              <li>運営責任者（代表者）の氏名・生年月日・住所</li>
              <li>本人確認書類（運転免許証・パスポート等）の画像</li>
              <li>売上振込用の日本国内銀行口座情報</li>
              <li>連絡用メールアドレスと SMS 受信用携帯番号</li>
            </ul>

            <p className="font-medium">手続きの流れ（所要時間 10〜15 分）</p>
            <ol className="list-decimal list-inside space-y-1 bg-muted p-4 rounded-md">
              <li>
                Bocker で <strong>「Stripeと連携する」</strong> をクリック
              </li>
              <li>Stripe のオンボーディング画面が開く</li>
              <li>ビジネス情報の入力（名称・所在地・業種など）</li>
              <li>運営責任者情報と本人確認書類のアップロード</li>
              <li>銀行口座情報の入力</li>
              <li>
                内容を確認して <strong>送信</strong>
              </li>
              <li>審査完了のメールを受信後、カード決済が利用可能に</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              情報に不備がある場合は Stripe から追加提出のメールが届きます。
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Safety & Security */}
        <AccordionItem value="stripe-safety">
          <AccordionTrigger>安全性・セキュリティ</AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
              <li>
                国際基準 <strong>PCI‑DSS レベル&nbsp;1</strong>（最高位）を取得
              </li>
              <li>
                通信は全て <strong>256bit&nbsp;TLS</strong> で暗号化
              </li>
              <li>
                AI 不正検知システムが <strong>24&nbsp;時間&nbsp;365&nbsp;日</strong> 監視
              </li>
            </ul>
            <p>
              これらの仕組みにより、カード情報の盗難・不正利用リスクを大幅に低減できます。 Bocker /
              サロン様は決済データに直接触れないため、追加で高額な
              セキュリティ認証を取得する必要もありません。
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Liability & Risk */}
        <AccordionItem value="stripe-liability">
          <AccordionTrigger>責任分担とリスクのない理由</AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Bocker とサロン様は <strong>決済代行業務</strong> を Stripe に委託しています。
              そのため、カード情報の保管・不正監視・チャージバック対応など、
              高度なセキュリティ管理は Stripe が担います。
            </p>
            <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
              <li>
                カード番号は <strong>Bocker / サロン様のサーバーに一切保存されません</strong>
              </li>
              <li>
                チャージバック発生時のカード会社対応は Stripe が一次窓口となり、 必要に応じて Bocker
                が仲介します
              </li>
              <li>
                PCI‑DSS、改正割賦販売法、資金決済法 等の
                <strong>法令遵守</strong> は Stripe が実施
              </li>
              <li>決済障害時は Stripe が 24 時間体制で復旧対応・顧客への返金手続きも自動化</li>
            </ul>
            <p>
              これにより、サロン様はクレジットカード決済の
              <strong>法的・技術的リスクから解放</strong>され、 本業に専念できます。
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Payout flow */}
        <AccordionItem value="stripe-payout">
          <AccordionTrigger>売上の入金サイクル</AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-1 bg-muted p-4 rounded-md">
              <li>お客様が Bocker でカード決済</li>
              <li>決済額は Stripe 上の残高に即時反映</li>
              <li>
                毎月 <strong>25&nbsp;日</strong> に前月 1〜末日の総売上をまとめて振込
              </li>
              <li>
                登録口座に <strong>1‑2&nbsp;営業日</strong> で着金
              </li>
            </ol>

            <p>
              振込スケジュールは Stripe ダッシュボードでいつでも確認できるため、
              キャッシュフローの見通しが立てやすくなります。
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Fees */}
        <AccordionItem value="stripe-fee">
          <AccordionTrigger>手数料について</AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
              <li>
                <strong>決済手数料:</strong> 売上の <strong>4%</strong> + <strong>40円</strong> / 件
              </li>
              <li>
                <strong>振込手数料:</strong> 0円（Bocker が負担）
              </li>
              <li>
                <strong>月額固定費:</strong> 0円（Bocker が負担）
              </li>
            </ul>
            <p className="text-sm">
              例）10,000 円のお会計の場合：10,000 × 4% + 40 = <strong>440 円</strong>
              のみが手数料として引かれ、<strong>9,560&nbsp;円</strong> が振込対象額となります。
            </p>
            <p className="text-xs text-muted-foreground">
              ※ 一部ブランドの海外発行カードは追加 1.5% が発生する場合があります。
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* FAQ */}
        <AccordionItem value="stripe-faq">
          <AccordionTrigger>よくある質問</AccordionTrigger>
          <AccordionContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold">カード決済が失敗した場合は？</p>
              <p>
                Stripe が自動で再試行し、それでも失敗した場合は Bocker からお客様へメールで
                お知らせします。サロン側での個別請求も可能です。
              </p>
            </div>
            <div>
              <p className="font-semibold">返金はどう行いますか？</p>
              <p>
                Stripe ダッシュボードからワンクリックで即時返金 できます。返金手数料は
                <strong>無料</strong>です。ただ<strong>決済時に発生した手数料4%</strong>
                は返金されません。
              </p>
            </div>
            <div>
              <p className="font-semibold">導入にどのくらい時間がかかりますか？</p>
              <p>
                オンライン申請のみで<strong>最短 10 分</strong>で利用開始できます。
                本人確認書類の提出が必要ですが、審査状況はダッシュボードでリアルタイムに
                確認できます。
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
