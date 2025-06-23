'use client'

import { Link } from '@/i18n/navigation'
import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loading, ZodTextField } from '@/components/common'
import { Key, Save, EyeOff, Eye, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Button } from '@/components/ui/button'

import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { useQuery, useMutation } from 'convex/react'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'

// 共通リンクスタイル
const externalLinkCls = 'text-accent underline hover:text-accent-2'
// APIの設定フォーム用のスキーマ
const organizationApiConfigFormSchema = z.object({
  line_access_token: z.string().optional(),
  line_channel_secret: z.string().optional(),
  liff_id: z.string().optional(),
  line_channel_id: z.string()
    .optional()
    .refine(
      (val) => !val || /^\d+$/.test(val),
      'LINE Channel IDは数字のみで入力してください'
    ),
  destination_id: z.string().optional(),
})

// スキーマから型を生成
type OrganizationApiConfigFormValues = z.infer<typeof organizationApiConfigFormSchema>

const ApiSettingsCard = () => {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const t = useTranslations('settings.apiConfig')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [showFields, setShowFields] = useState<{ [key: string]: boolean }>({
    lineAccessToken: false,
    lineChannelSecret: false,
    liffId: false,
    destinationId: false,
    lineChannelId: false,
  })

  // すべてのフックをここでトップレベルで宣言
  const organizationApiConfig = useQuery(
    api.organization.api_config.query.findByTenantAndOrg,
    tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip'
  )
  const upsertOrganizationApiConfig = useMutation(api.organization.api_config.mutation.upsert)

  // フォーム管理（useZodFormを使用）
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useZodForm(organizationApiConfigFormSchema)

  // フォームの初期値が変更されたらリセット
  useEffect(() => {
    if (organizationApiConfig) {
      reset(organizationApiConfig)
    }
  }, [organizationApiConfig, reset])

  // APIの設定を保存する関数
  const onApiSubmit = useCallback(
    async (data: OrganizationApiConfigFormValues) => {
      if (!orgId) return

      try {
        setSubmitting(true)

        await upsertOrganizationApiConfig({
          tenant_id: tenantId!,
          org_id: orgId,
          ...data,
        })

        toast.success(t('messages.settingsSaved'))
      } catch (error) {
        showErrorToast(error)
      } finally {
        setSubmitting(false)
      }
    },
    [upsertOrganizationApiConfig, orgId, tenantId, showErrorToast, t]
  )

  const handleShowFields = (
    e: React.MouseEvent<HTMLButtonElement>,
    field: keyof OrganizationApiConfigFormValues
  ) => {
    e.preventDefault()
    setShowFields({ ...showFields, [field]: !showFields[field] })
  }

  if (organizationApiConfig === undefined) {
    return <Loading />
  }
  if (!isLoaded) {
    return <Loading />
  }

  return (
    <div className="">
      <div className="">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold">{t('title')}</p>
        </div>

        <p className="flex items-center mt-1 text-sm text-muted-foreground">
          {t('description')}
          <br />
          {t('lineIntegrationNote')}
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onApiSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
        autoComplete="off"
        className="space-y-6"
      >
        <div className="space-y-4">
          <div className="p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="flex items-center w-full relative">
                <ZodTextField
                  label={t('fields.lineAccessToken')}
                  icon={<Key className="h-4 w-4 text-primary" />}
                  errors={errors}
                  register={register}
                  name="line_access_token"
                  className="w-full pr-10"
                  type={showFields.line_access_token ? 'text' : 'password'}
                />
                <Button
                  className="absolute right-0 bottom-0"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleShowFields(e, 'line_access_token')}
                >
                  {showFields.line_access_token ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center w-full relative">
                <ZodTextField
                  label={t('fields.lineChannelSecret')}
                  icon={<Key className="h-4 w-4 text-primary" />}
                  errors={errors}
                  register={register}
                  name="line_channel_secret"
                  className="w-full pr-10"
                  type={showFields.line_channel_secret ? 'text' : 'password'}
                />
                <Button
                  className="absolute right-0 bottom-0"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleShowFields(e, 'line_channel_secret')}
                >
                  {showFields.line_channel_secret ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center w-full relative">
                <ZodTextField
                  label="LIFF ID"
                  icon={<Key className="h-4 w-4 text-primary" />}
                  errors={errors}
                  register={register}
                  name="liff_id"
                  type={showFields.liff_id ? 'text' : 'password'}
                  className="w-full pr-10"
                  placeholder="例: 1234567890-AbcdEfgh"
                />
                <Button
                  className="absolute right-0 bottom-0"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleShowFields(e, 'liff_id')}
                >
                  {showFields.liff_id ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center w-full relative">
                <ZodTextField
                  label={t('fields.lineChannelId')}
                  icon={<Key className="h-4 w-4 text-primary" />}
                  errors={errors}
                  register={register}
                  name="line_channel_id"
                  type={showFields.line_channel_id ? 'text' : 'password'}
                  className="w-full pr-10"
                  placeholder="例: 1234567890 (数字のみ)"
                />
                <Button
                  className="absolute right-0 bottom-0"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleShowFields(e, 'line_channel_id')}
                >
                  {showFields.line_channel_id ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="hidden">
                <div className="flex items-center w-full relative">
                  <ZodTextField
                    label="LINE Destination ID"
                    icon={<Key className="h-4 w-4 text-primary" />}
                    errors={errors}
                    register={register}
                    name="destination_id"
                    className="w-full pr-10"
                  />
                  <Button
                    className="absolute right-0 bottom-0"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleShowFields(e, 'destination_id')}
                  >
                    {showFields.destination_id ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-0 pt-4 pb-0 flex justify-end gap-4">
          <motion.div
            whileHover={{ scale: isDirty ? 1.03 : 1 }}
            whileTap={{ scale: isDirty ? 0.97 : 1 }}
          >
            <Button type="submit" disabled={submitting || !isDirty} className="min-w-[140px]">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('messages.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('messages.save')}
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </form>

      <Accordion type="multiple" className="mt-8 space-y-2">
        {/* チャンネル開設ガイド */}
        <AccordionItem value="channel-setup-guide">
          <AccordionTrigger className="text-accent">
            🚀 LINE チャンネル開設ガイド（初回設定）
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="bg-palette-2/20 border border-palette-2/40 p-4 rounded-md">
              <p className="font-semibold text-palette-2-foreground text-base mb-2">
                📋 LINE統合に必要な2つのチャンネル
              </p>
              <p className="text-sm text-accent mb-4">
                Bockerでは以下の2つのチャンネルが必要です。順序を守って作成してください。
              </p>

              <div className="space-y-3">
                <div className="bg-card border border-palette-2/40 p-3 rounded-md">
                  <p className="font-semibold text-palette-2-foreground text-sm mb-1">
                    1️⃣ Messaging APIチャンネル（メッセージ送信用）
                  </p>
                  <p className="text-xs text-accent">
                    • 用途：予約確認メッセージ、リマインダー等の送信
                  </p>
                  <p className="text-xs text-accent">
                    • 必要な設定：アクセストークン、チャンネルシークレット
                  </p>
                </div>
                <div className="bg-card border border-green-200 p-3 rounded-md">
                  <p className="font-semibold text-palette-3-foreground text-sm mb-1">
                    2️⃣ LINEログインチャンネル（ログイン用）
                  </p>
                  <p className="text-xs text-accent-2">
                    • 用途：顧客のLINEログイン、LIFF（LINE内ブラウザ）
                  </p>
                  <p className="text-xs text-accent-2">• 必要な設定：チャンネルID、LIFF ID</p>
                </div>
              </div>
            </div>

            {/* Messaging APIチャンネル開設 */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base text-palette-2-foreground">
                🔵 Step 1: Messaging APIチャンネルの開設
              </h4>

              {/* 2025年版の重要な変更点 */}
              <div className="bg-warning/20 border border-warning/40 p-3 rounded-md">
                <p className="font-semibold text-warning-foreground text-sm mb-2">
                  ⚠️ 2024年9月以降の重要な変更
                </p>
                <p className="text-xs text-warning">
                  Messaging
                  APIチャンネルを作成する前に、必ずLINE公式アカウントマネージャーで公式アカウントを作成する必要があります。
                </p>
              </div>

              <div className="bg-palette-2/20 border border-palette-2/40 p-4 rounded-md">
                <p className="font-semibold text-sm mb-3">📱 手順A: LINE公式アカウントの作成</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    <Link
                      href="https://manager.line.biz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={externalLinkCls}
                    >
                      LINE公式アカウントマネージャー
                    </Link>
                    にアクセス
                  </li>
                  <li>
                    LINEアカウントでログイン
                    <br />
                    <span className="text-xs text-muted-foreground">
                      ※ 必ずサロン運営者本人のアカウントを使用
                    </span>
                  </li>
                  <li>「アカウントを作成」をクリック</li>
                  <li>
                    以下の情報を入力：
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      <p>
                        • <strong>アカウント名</strong>：サロン名（例：「美容室 Bocker」）
                      </p>
                      <p>
                        • <strong>業種</strong>：「美容・健康」→「美容院・理容院」
                      </p>
                      <p>
                        • <strong>サブ業種</strong>：該当するものを選択
                      </p>
                      <p>
                        • <strong>会社・事業者名</strong>：正式な店舗名
                      </p>
                    </div>
                  </li>
                  <li>利用規約に同意して「アカウントを作成」</li>
                  <li>
                    作成完了後、アカウント設定で<strong>「Messaging APIを利用する」</strong>を有効化
                  </li>
                </ol>
              </div>

              <div className="bg-palette-2/20 border border-palette-2/40 p-4 rounded-md">
                <p className="font-semibold text-sm mb-3">
                  ⚙️ 手順B: Messaging APIチャンネルの作成
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    <Link
                      href="https://developers.line.biz/console/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={externalLinkCls}
                    >
                      LINE Developers コンソール
                    </Link>
                    にアクセス
                    <br />
                    <span className="text-xs text-pop">
                      ⚠️ 公式アカウント作成時と同じLINEアカウントでログイン
                    </span>
                  </li>
                  <li>
                    「プロバイダーを作成」または既存プロバイダーを選択
                    <br />
                    <span className="text-xs text-muted-foreground">
                      プロバイダー名例：「サロン名」「会社名」
                    </span>
                  </li>
                  <li>「チャンネルを作成」→「Messaging API」を選択</li>
                  <li>
                    以下の情報を入力：
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      <p>
                        • <strong>チャンネル名</strong>：「サロン名 Bot」（例：「美容室Bocker
                        Bot」）
                      </p>
                      <p>
                        • <strong>チャンネル説明</strong>：「予約管理・顧客連絡用」
                      </p>
                      <p>
                        • <strong>大業種</strong>：「個人」または「法人・団体」
                      </p>
                      <p>
                        • <strong>小業種</strong>：「美容・健康」
                      </p>
                      <p>
                        • <strong>メールアドレス</strong>：連絡可能なメールアドレス
                      </p>
                    </div>
                  </li>
                  <li>利用規約に同意して「作成」</li>
                  <li>
                    作成完了後、チャンネルページで以下を確認：
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      <p>• 「基本設定」タブ：チャンネルシークレット</p>
                      <p>• 「Messaging API」タブ：チャンネルアクセストークン</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* トラブルシューティング */}
              <div className="bg-destructive/20 border border-destructive/40 p-3 rounded-md">
                <p className="font-semibold text-destructive-foreground text-sm mb-2">🚨 よくある問題と解決法</p>
                <ul className="text-xs text-destructive space-y-1">
                  <li>
                    • 「チャンネルが見つからない」→
                    公式アカウントマネージャーと同じLINEアカウントでログインしているか確認
                  </li>
                  <li>
                    • 「Messaging APIが有効化できない」→
                    公式アカウントで業種・事業者情報が正しく入力されているか確認
                  </li>
                  <li>
                    • 「プロバイダーが作成できない」→ LINEアカウントの本人確認が完了しているか確認
                  </li>
                </ul>
              </div>
            </div>

            {/* LINEログインチャンネル開設 */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base text-palette-3-foreground">
                🟢 Step 2: LINEログインチャンネルの開設
              </h4>

              <div className="bg-palette-3/20 border border-palette-3/40 p-4 rounded-md">
                <p className="font-semibold text-sm mb-3">🔐 手順A: LINEログインチャンネルの作成</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    <Link
                      href="https://developers.line.biz/console/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={externalLinkCls}
                    >
                      LINE Developers コンソール
                    </Link>
                    で同じプロバイダーを選択
                    <br />
                    <span className="text-xs text-accent-2">
                      💡 Messaging APIと同じプロバイダー内に作成することを推奨
                    </span>
                  </li>
                  <li>「チャンネルを作成」→「LINEログイン」を選択</li>
                  <li>
                    以下の情報を入力：
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      <p>
                        • <strong>チャンネル名</strong>：「サロン名 Login」（例：「美容室Bocker
                        Login」）
                      </p>
                      <p>
                        • <strong>チャンネル説明</strong>：「顧客ログイン・予約システム用」
                      </p>
                      <p>
                        • <strong>アプリタイプ</strong>：「ウェブアプリ」を選択
                      </p>
                      <p>
                        • <strong>メールアドレス</strong>：連絡可能なメールアドレス
                      </p>
                    </div>
                  </li>
                  <li>利用規約に同意して「作成」</li>
                  <li>
                    作成完了後、「基本設定」タブでチャンネルIDを確認
                    <br />
                    <span className="text-xs text-muted-foreground">数字のみの10桁程度のID</span>
                  </li>
                </ol>
              </div>

              <div className="bg-palette-3/20 border border-palette-3/40 p-4 rounded-md">
                <p className="font-semibold text-sm mb-3">📱 手順B: LIFFアプリの作成</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>作成したLINEログインチャンネルの「LIFF」タブを選択</li>
                  <li>「追加」ボタンをクリック</li>
                  <li>
                    以下の設定を入力：
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      <p>
                        • <strong>LIFFアプリ名</strong>：「サロン名予約システム」
                      </p>
                      <p>
                        • <strong>サイズ</strong>：「Full」を選択（推奨）
                      </p>
                      <p>
                        • <strong>エンドポイントURL</strong>：
                        <br />
                        本番環境：https://bocker.jp/customer/[org_id]/auth/login
                        <br />
                        開発環境：https://bocker-project.vercel.app/customer/[org_id]/auth/login
                        <br />
                        <span className="text-pop">※ [org_id]は実際の組織IDに置き換え</span>
                      </p>
                      <p>
                        • <strong>スコープ</strong>：「profile」「openid」「email」をチェック
                      </p>
                      <p>
                        • <strong>ボットリンク機能</strong>：「On (Aggressive)」を選択
                      </p>
                    </div>
                  </li>
                  <li>「追加」をクリックして作成完了</li>
                  <li>
                    発行されたLIFF IDをコピー
                    <br />
                    <span className="text-xs text-muted-foreground">形式：1234567890-AbcdEfgh</span>
                  </li>
                </ol>
              </div>

              {/* セキュリティ設定 */}
              <div className="bg-palette-1/20 border border-palette-1/40 p-3 rounded-md">
                <p className="font-semibold text-palette-1-foreground text-sm mb-2">
                  🔒 セキュリティ設定（重要）
                </p>
                <ol className="list-decimal list-inside text-xs space-y-1">
                  <li>LINEログインチャンネルの「LINEログイン設定」タブを開く</li>
                  <li>
                    「コールバックURL」に以下を追加：
                    <div className="ml-4 mt-1 space-y-1 font-mono text-xs">
                      <p>https://bocker.jp/api/auth/callback</p>
                      <p>https://bocker-project.vercel.app/api/auth/callback</p>
                    </div>
                  </li>
                  <li>「リンクされたボット」でMessaging APIチャンネルを選択</li>
                  <li>設定を保存</li>
                </ol>
              </div>
            </div>

            {/* 設定完了チェックリスト */}
            <div className="bg-palette-4/20 border border-palette-4/40 p-4 rounded-md">
              <p className="font-semibold text-palette-4-foreground text-base mb-3">
                ✅ 設定完了チェックリスト
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start space-x-2">
                  <input type="checkbox" className="mt-1" disabled />
                  <span>LINE公式アカウントマネージャーで公式アカウント作成済み</span>
                </div>
                <div className="flex items-start space-x-2">
                  <input type="checkbox" className="mt-1" disabled />
                  <span>Messaging APIチャンネル作成済み</span>
                </div>
                <div className="flex items-start space-x-2">
                  <input type="checkbox" className="mt-1" disabled />
                  <span>LINEログインチャンネル作成済み</span>
                </div>
                <div className="flex items-start space-x-2">
                  <input type="checkbox" className="mt-1" disabled />
                  <span>LIFFアプリ作成済み</span>
                </div>
                <div className="flex items-start space-x-2">
                  <input type="checkbox" className="mt-1" disabled />
                  <span>コールバックURL設定済み</span>
                </div>
                <div className="flex items-start space-x-2">
                  <input type="checkbox" className="mt-1" disabled />
                  <span>チャンネル間のリンク設定済み</span>
                </div>
              </div>
            </div>

            {/* 次のステップ */}
            <div className="bg-palette-2/20 border border-palette-2/40 p-3 rounded-md">
              <p className="font-semibold text-palette-2-foreground text-sm mb-2">🎯 次のステップ</p>
              <p className="text-xs text-accent">
                チャンネル作成が完了したら、上記の各アコーディオンを開いて、
                作成したチャンネルから必要な値（アクセストークン、シークレット、チャンネルID、LIFF
                ID）を取得し、 このフォームに設定してください。
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
        {/* 重要な注意事項 */}
        <AccordionItem value="important-notice">
          <AccordionTrigger className="text-destructive">
            ⚠️ 重要：各IDの取得元と設定ミスの防止
          </AccordionTrigger>
          <AccordionContent className="space-y-2">
            <div className="bg-destructive/10 p-4 rounded-md space-y-4">
              <p className="font-semibold text-destructive text-base">
                異なるチャンネルタイプから異なるIDを取得する必要があります！間違いやすいので要注意。
              </p>

              {/* よくある間違い */}
              <div className="bg-destructive/20 border border-destructive/40 p-3 rounded-md">
                <p className="font-semibold text-destructive-foreground text-sm mb-2">❌ よくある間違い</p>
                <ul className="text-xs text-destructive space-y-1">
                  <li>• Messaging APIのChannel IDをLINEログインのChannel IDに設定</li>
                  <li>• LIFF IDをChannel IDの欄に入力</li>
                  <li>• Messaging APIのアクセストークンをLINEログイン用に使用</li>
                </ul>
              </div>

              {/* チャンネルタイプ別の取得元 */}
              <div className="space-y-4">
                <div className="bg-palette-2/20 border border-palette-2/40 p-3 rounded-md">
                  <p className="font-semibold text-palette-2-foreground text-sm mb-2">
                    🔵 Messaging APIチャンネルから取得
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <p className="font-semibold">LINE アクセストークン</p>
                      <p className="text-accent">
                        Messaging API タブ → チャンネルアクセストークン
                      </p>
                      <p className="text-muted-foreground">用途：LINEメッセージ送信</p>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold">LINE チャンネルシークレット</p>
                      <p className="text-accent">基本設定 タブ → チャンネルシークレット</p>
                      <p className="text-muted-foreground">用途：Webhookの署名検証</p>
                    </div>
                  </div>
                </div>

                <div className="bg-palette-3/20 border border-palette-3/40 p-3 rounded-md">
                  <p className="font-semibold text-palette-3-foreground text-sm mb-2">
                    🟢 LINEログインチャンネルから取得
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <p className="font-semibold">LINE Channel ID</p>
                      <p className="text-accent-2">基本設定 タブ → Channel ID（数字のみ）</p>
                      <p className="text-muted-foreground">用途：LINE IDトークンの検証</p>
                      <p className="text-pop font-semibold">
                        ⚠️ Messaging APIのChannel IDとは別物
                      </p>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold">LIFF ID</p>
                      <p className="text-accent-2">LIFF タブ → 作成したLIFFアプリのID</p>
                      <p className="text-muted-foreground">用途：LIFFアプリの初期化</p>
                      <p className="text-muted-foreground">形式：1234567890-AbcdEfgh</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 正しい設定手順 */}
              <div className="bg-background border p-3 rounded-md">
                <p className="text-sm font-semibold mb-2">✅ 正しい設定手順（必須）</p>
                <ol className="list-decimal list-inside text-xs space-y-1">
                  <li>
                    <strong>Messaging APIチャンネル</strong>を作成（メッセージ送信用）
                    <br />
                    <span className="text-muted-foreground">
                      → アクセストークンとチャンネルシークレットを取得
                    </span>
                  </li>
                  <li>
                    <strong>LINEログインチャンネル</strong>を別途作成（ログイン用）
                    <br />
                    <span className="text-muted-foreground">→ Channel IDを取得（数字のみ）</span>
                  </li>
                  <li>
                    LINEログインチャンネル内で<strong>LIFFアプリ</strong>を作成
                    <br />
                    <span className="text-muted-foreground">→ LIFF IDを取得</span>
                  </li>
                  <li>各フィールドに対応するIDを正確に入力</li>
                </ol>
              </div>

              {/* 確認方法 */}
              <div className="bg-warning/20 border border-warning/40 p-3 rounded-md">
                <p className="font-semibold text-warning-foreground text-sm mb-2">🔍 設定値の確認方法</p>
                <ul className="text-xs space-y-1">
                  <li>• LINE Channel ID：数字のみ（10桁程度）であること</li>
                  <li>• LIFF ID：ハイフンを含む英数字であること</li>
                  <li>• アクセストークン：長い英数字の文字列であること</li>
                  <li>• チャンネルシークレット：32文字程度の英数字であること</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        {/* LINE Access Token */}
        <AccordionItem value="line-access-token">
          <AccordionTrigger>LINE アクセストークンの取得方法（Messaging API専用）</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            {/* 重要な注意 */}
            <div className="bg-palette-2/20 border border-palette-2/40 p-3 rounded-md mb-4">
              <p className="font-semibold text-palette-2-foreground text-sm mb-1">📌 重要</p>
              <p className="text-xs text-accent">
                このトークンは<strong>Messaging APIチャンネル</strong>
                から取得します。LINEログインチャンネルからは取得できません。
              </p>
            </div>

            {/* 動画リンク */}
            <div className="flex items-center text-xs text-secondary-foreground">
              <p className="mr-1">動画での取得方法はこちら</p>
              <Link
                href="https://share.zight.com/d5uk5ZQL"
                target="_blank"
                rel="noopener noreferrer"
                className={externalLinkCls}
              >
                https://share.zight.com/d5uk5ZQL
              </Link>
            </div>

            {/* 前提条件 */}
            <div className="bg-warning/20 border border-warning/40 p-3 rounded-md">
              <p className="font-semibold text-warning-foreground text-sm mb-2">🔔 前提条件（2025年版）</p>
              <ol className="text-xs space-y-1">
                <li>1. LINE公式アカウントマネージャーで公式アカウントを作成済み</li>
                <li>2. 作成した公式アカウントでMessaging APIを有効化済み</li>
                <li>3. LINE Developers ConsoleでMessaging APIチャンネルが作成済み</li>
              </ol>
            </div>

            {/* 取得手順（2025年版） */}
            <p className="font-semibold">取得手順（2025年版）</p>
            <ol className="list-decimal list-inside space-y-1 bg-background p-4 rounded-md">
              <li>
                <Link
                  href="https://developers.line.biz/console/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={externalLinkCls}
                >
                  LINE Developers コンソール
                </Link>
                にログインします。
              </li>
              <li>
                対象のプロバイダーを選択し、<strong>Messaging API チャンネル</strong>
                をクリックします。
                <br />
                <span className="text-pop text-xs">
                  ⚠️ LINEログインチャンネルではありません
                </span>
              </li>
              <li>
                画面上部のタブから <strong>Messaging API</strong> タブを選択します。
              </li>
              <li>
                ページをスクロールして<strong>「チャンネルアクセストークン」</strong>
                セクションを探します。
              </li>
              <li>
                初回は<strong>「発行」</strong>ボタンをクリックしてトークンを生成します。
                <br />
                <span className="text-muted-foreground text-xs">
                  既に発行済みの場合は表示されているトークンを使用
                </span>
              </li>
              <li>
                発行されたトークンをコピーし、このフォームの「LINE&nbsp;アクセストークン」欄へ貼り付けます。
              </li>
            </ol>

            {/* トークンの種類と選択 */}
            <div className="bg-background border p-3 rounded-md">
              <p className="font-semibold text-sm mb-2">🔐 トークンの種類（2025年版）</p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-accent-2">
                    ✅ 長期チャンネルアクセストークン（推奨）
                  </p>
                  <p>・有効期限なし、管理が簡単</p>
                  <p>・中小規模サロン向け</p>
                </div>
                <div>
                  <p className="font-semibold text-accent">🔒 チャンネルアクセストークンv2.1</p>
                  <p>・30日の有効期限、定期更新が必要</p>
                  <p>・より高いセキュリティが必要な場合</p>
                </div>
              </div>
            </div>

            {/* トラブルシューティング */}
            <div className="bg-destructive/20 border border-destructive/40 p-3 rounded-md">
              <p className="font-semibold text-destructive-foreground text-sm mb-2">❌ よくあるエラー</p>
              <ul className="text-xs text-destructive space-y-1">
                <li>
                  • 「チャンネルが見つからない」→ 公式アカウントとDevelopers
                  Consoleで同じアカウントを使用しているか確認
                </li>
                <li>• 「トークンが発行できない」→ Messaging APIが有効化されているか確認</li>
                <li>• 「メッセージが送信できない」→ Webhook URLが正しく設定されているか確認</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* LINE Channel Secret */}
        <AccordionItem value="line-channel-secret">
          <AccordionTrigger>
            LINE チャンネルシークレットの取得方法（Messaging API専用）
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            {/* 重要な注意 */}
            <div className="bg-palette-2/20 border border-palette-2/40 p-3 rounded-md mb-4">
              <p className="font-semibold text-palette-2-foreground text-sm mb-1">📌 重要</p>
              <p className="text-xs text-accent">
                このシークレットは<strong>Messaging APIチャンネル</strong>
                から取得します。LINEログインチャンネルとは別物です。
              </p>
              <p className="text-xs text-pop mt-1">
                ⚠️ Webhook署名の検証に使用されるため、セキュリティ上非常に重要な値です
              </p>
            </div>

            {/* 動画リンク */}
            <div className="flex items-center text-xs text-secondary-foreground">
              <p className="mr-1">動画での取得方法はこちら</p>
              <Link
                href="https://share.zight.com/ApuWd52q"
                target="_blank"
                rel="noopener noreferrer"
                className={externalLinkCls}
              >
                https://share.zight.com/ApuWd52q
              </Link>
            </div>

            {/* 取得手順（2025年版） */}
            <p className="font-semibold">取得手順（2025年版）</p>
            <ol className="list-decimal list-inside space-y-1 bg-background p-4 rounded-md">
              <li>
                <Link
                  href="https://developers.line.biz/console/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={externalLinkCls}
                >
                  LINE Developers コンソール
                </Link>
                にログインし、<strong>Messaging APIチャンネル</strong>を開きます。
                <br />
                <span className="text-pop text-xs">
                  ⚠️ LINEログインチャンネルではありません
                </span>
              </li>
              <li>
                画面上部のタブメニューから<strong>基本設定</strong>タブを選択します。
              </li>
              <li>
                ページを下にスクロールして<strong>「チャンネルシークレット」</strong>
                の項目を探します。
              </li>
              <li>
                セキュリティのため初期状態では非表示になっています。
                <strong>「クリックして表示」</strong>または目のアイコンをクリックします。
              </li>
              <li>
                表示された32文字程度の英数字を<strong>コピーアイコン</strong>でコピーします。
                <br />
                <span className="text-muted-foreground text-xs">
                  形式例：a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
                </span>
              </li>
              <li>
                コピーした値を本フォームの「LINE&nbsp;チャンネルシークレット」欄に貼り付けます。
              </li>
            </ol>

            {/* セキュリティ注意事項 */}
            <div className="bg-destructive/20 border border-destructive/40 p-3 rounded-md">
              <p className="font-semibold text-destructive-foreground text-sm mb-2">🔒 セキュリティ上の注意</p>
              <ul className="text-xs text-destructive space-y-1">
                <li>• この値は絶対に公開しないでください</li>
                <li>• GitやSlackなどに誤って投稿しないよう注意</li>
                <li>• 漏洩した場合は即座にLINE Developersで再生成してください</li>
                <li>• 不審なアクセスがある場合も再生成を検討してください</li>
              </ul>
            </div>

            {/* 用途の説明 */}
            <div className="bg-background border p-3 rounded-md">
              <p className="font-semibold text-sm mb-2">🎯 チャンネルシークレットの用途</p>
              <div className="text-xs space-y-1">
                <p>
                  • <strong>Webhook署名の検証</strong>：LINEからのリクエストが正当かどうかを確認
                </p>
                <p>
                  • <strong>セキュリティ確保</strong>：不正なリクエストを防止
                </p>
                <p>
                  • <strong>改ざん検知</strong>：データが途中で変更されていないかチェック
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* LIFF ID */}
        <AccordionItem value="liff-id">
          <AccordionTrigger>LIFF ID の取得方法（LINEログインチャンネル専用）</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            {/* 重要な注意 */}
            <div className="bg-palette-3/20 border border-palette-3/40 p-3 rounded-md mb-4">
              <p className="font-semibold text-palette-3-foreground text-sm mb-1">📌 重要</p>
              <p className="text-xs text-accent-2">
                LIFF IDは<strong>LINEログインチャンネル</strong>から取得します。Messaging
                APIチャンネルからは取得できません。
              </p>
              <p className="text-xs text-pop mt-1">
                ⚠️ LINEログインチャンネルが未作成の場合は、まずチャンネル作成から始めてください
              </p>
            </div>

            {/* 動画リンク */}
            <div className="flex items-center text-xs text-secondary-foreground">
              <p className="mr-1">動画での取得方法はこちら</p>
              <Link
                href="https://share.zight.com/v1uzkZwn"
                target="_blank"
                rel="noopener noreferrer"
                className={externalLinkCls}
              >
                https://share.zight.com/v1uzkZwn
              </Link>
            </div>

            {/* 前提条件 */}
            <div className="bg-warning/20 border border-warning/40 p-3 rounded-md">
              <p className="font-semibold text-warning-foreground text-sm mb-2">📋 前提条件</p>
              <p className="text-xs">
                LINEログインチャンネルが作成済みであること
                <br />※ まだ作成していない場合は、以下の手順で先にチャンネルを作成してください
              </p>
            </div>

            {/* 取得手順（2025年版） */}
            <p className="font-semibold">取得手順（2025年版）</p>
            <ol className="list-decimal list-inside space-y-1 bg-background p-4 rounded-md">
              <li>
                <Link
                  href="https://developers.line.biz/console/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={externalLinkCls}
                >
                  LINE Developers コンソール
                </Link>
                でプロバイダー画面を開きます。
              </li>

              {/* LINEログインチャンネルがない場合の手順 */}
              <li className="bg-palette-2/20 p-2 rounded text-xs">
                <strong>LINEログインチャンネルがない場合：</strong>
                <br />「<strong>チャンネルを作成</strong>」→「<strong>LINEログイン</strong>」を選択
                <br />
                アプリタイプ：「ウェブアプリ」を選択して必要情報を入力
              </li>

              <li>
                作成済みの<strong>LINEログインチャンネル</strong>をクリックして開きます。
                <br />
                <span className="text-pop text-xs">
                  ⚠️ Messaging APIチャンネルではありません
                </span>
              </li>
              <li>
                画面上部のタブから「<strong>LIFF</strong>」タブを選択します。
              </li>
              <li>
                「<strong>追加</strong>」ボタンをクリックしてLIFFアプリを作成します。
              </li>
              <li>
                LIFFアプリの設定画面で以下を入力します：
                <br />
                <div className="ml-4 mt-1 text-xs space-y-1">
                  <p>
                    • <strong>LIFFアプリ名</strong>：任意の名前（例：「Bockerログイン」）
                  </p>
                  <p>
                    • <strong>サイズ</strong>：Full（推奨）、Tall、Compactから選択
                  </p>
                  <p>
                    • <strong>エンドポイントURL</strong>：あなたのWebアプリのURL
                  </p>
                  <p>
                    • <strong>スコープ</strong>：profile、openid、email（必要に応じて）
                  </p>
                </div>
              </li>
              <li>
                設定を保存すると、「<span className="font-mono">1234567890-AbcdEfgh</span>」形式の
                <strong>LIFF ID</strong>が発行されます。
              </li>
              <li>このIDをコピーして、本フォームの「LIFF&nbsp;ID」欄に貼り付けます。</li>
            </ol>

            {/* LIFF IDの特徴 */}
            <div className="bg-background border p-3 rounded-md">
              <p className="font-semibold text-sm mb-2">🔍 LIFF IDの特徴</p>
              <div className="text-xs space-y-1">
                <p>
                  • <strong>形式</strong>：数字-英数字（例：1234567890-AbcdEfgh）
                </p>
                <p>
                  • <strong>セキュリティ</strong>：公開されても安全な値
                </p>
                <p>
                  • <strong>用途</strong>：LIFFアプリの初期化とLINEログイン
                </p>
                <p>
                  • <strong>有効期限</strong>：なし（チャンネルが削除されるまで有効）
                </p>
              </div>
            </div>

            {/* チャンネル連携について */}
            <div className="bg-palette-2/20 border border-palette-2/40 p-3 rounded-md">
              <p className="font-semibold text-palette-2-foreground text-sm mb-2">
                🔗 チャンネル連携のメリット
              </p>
              <div className="text-xs space-y-1">
                <p>• LINEログインとMessaging APIを同じプロバイダー内に作成すると連携が可能</p>
                <p>• ログインしたユーザーにメッセージを送信することができる</p>
                <p>• ユーザーIDの統合により、よりスムーズなUXを提供</p>
              </div>
            </div>

            {/* 今後の変更予定 */}
            <div className="bg-palette-5/20 border border-palette-5/40 p-3 rounded-md">
              <p className="font-semibold text-palette-5-foreground text-sm mb-2">🚀 今後の変更予定</p>
              <p className="text-xs text-palette-5">
                2025年2月以降、LIFFとLINE MINI Appの統合が予定されています。 詳細は
                <Link
                  href="https://developers.line.biz/"
                  className={externalLinkCls}
                  target="_blank"
                >
                  LINE Developers
                </Link>
                で確認してください。
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* LINE Channel ID */}
        <AccordionItem value="line-channel-id">
          <AccordionTrigger>
            LINE チャンネルID の取得方法（LINEログインチャンネル専用）
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            {/* 重要な注意 */}
            <div className="bg-palette-3/20 border border-palette-3/40 p-3 rounded-md mb-4">
              <p className="font-semibold text-palette-3-foreground text-sm mb-1">📌 重要</p>
              <p className="text-xs text-accent-2">
                このChannel IDは<strong>LINEログインチャンネル</strong>から取得します。Messaging
                APIチャンネルのChannel IDとは別物です。
              </p>
              <p className="text-xs text-destructive mt-1">
                ❌ <strong>よくある間違い</strong>：Messaging APIのChannel IDをここに設定してしまう
              </p>
            </div>

            {/* 動画リンク */}
            <div className="flex items-center text-xs text-secondary-foreground">
              <p className="mr-1">動画での取得方法はこちら</p>
              <Link
                href="https://share.zight.com/yAuRqdwK"
                target="_blank"
                rel="noopener noreferrer"
                className={externalLinkCls}
              >
                https://share.zight.com/yAuRqdwK
              </Link>
            </div>

            {/* 前提条件 */}
            <div className="bg-warning/20 border border-warning/40 p-3 rounded-md">
              <p className="font-semibold text-warning-foreground text-sm mb-2">📋 前提条件</p>
              <p className="text-xs">
                <strong>LINEログインチャンネル</strong>が作成済みであること
                <br />※ Messaging APIチャンネルのChannel IDではありません
              </p>
            </div>

            {/* 取得手順（2025年版） */}
            <p className="font-semibold">取得手順（2025年版）</p>
            <ol className="list-decimal list-inside space-y-1 bg-background p-4 rounded-md">
              <li>
                <Link
                  href="https://developers.line.biz/console/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={externalLinkCls}
                >
                  LINE Developers コンソール
                </Link>
                にログインします。
              </li>
              <li>
                対象のプロバイダーを選択し、<strong>LINEログインチャンネル</strong>
                をクリックします。
                <br />
                <span className="text-destructive text-xs font-semibold">
                  ⚠️ Messaging APIチャンネルではありません！
                </span>
              </li>
              <li>
                画面上部のタブメニューから<strong>基本設定</strong>
                タブが選択されていることを確認します。
              </li>
              <li>
                ページ上部に表示される<strong>「チャンネルID」</strong>
                の数値（例：1234567890）を確認します。
                <br />
                <span className="text-muted-foreground text-xs">数字のみの10桁程度のIDです</span>
              </li>
              <li>
                チャンネルID横の<strong>コピーアイコン</strong>をクリックしてコピーします。
              </li>
              <li>コピーした値を本フォームの「LINE&nbsp;チャンネルID」欄に貼り付けます。</li>
            </ol>

            {/* 重要な区別 */}
            <div className="bg-destructive/20 border border-destructive/40 p-3 rounded-md">
              <p className="font-semibold text-destructive-foreground text-sm mb-2">⚡ チャンネルIDの区別</p>
              <div className="space-y-2 text-xs">
                <div className="bg-palette-3/30 p-2 rounded">
                  <p className="font-semibold text-palette-3-foreground">
                    ✅ LINEログインチャンネルのChannel ID
                  </p>
                  <p>• 用途：LINE IDトークンの検証</p>
                  <p>• 形式：数字のみ（例：1234567890）</p>
                  <p>• 取得場所：LINEログインチャンネル 基本設定</p>
                  <p className="text-accent-2 font-semibold">→ このフォームに設定する値</p>
                </div>
                <div className="bg-destructive/30 p-2 rounded">
                  <p className="font-semibold text-destructive-foreground">
                    ❌ Messaging APIチャンネルのChannel ID
                  </p>
                  <p>• 用途：メッセージ送信API</p>
                  <p>• 形式：数字のみ（例：9876543210）</p>
                  <p>• 取得場所：Messaging APIチャンネル 基本設定</p>
                  <p className="text-destructive font-semibold">→ このフォームには設定しない</p>
                </div>
              </div>
            </div>

            {/* チャンネルIDの用途 */}
            <div className="bg-background border p-3 rounded-md">
              <p className="font-semibold text-sm mb-2">🎯 LINEログインChannel IDの用途</p>
              <div className="text-xs space-y-1">
                <p>
                  • <strong>LINE IDトークンの検証</strong>：ログイン時のトークンが正当かどうか確認
                </p>
                <p>
                  • <strong>セキュリティ確保</strong>：不正なログインを防止
                </p>
                <p>
                  • <strong>ユーザー認証</strong>：LINEユーザーの身元確認
                </p>
              </div>
            </div>

            {/* トラブルシューティング */}
            <div className="bg-palette-1/20 border border-palette-1/40 p-3 rounded-md">
              <p className="font-semibold text-palette-1-foreground text-sm mb-2">🔍 よくある問題と解決法</p>
              <ul className="text-xs space-y-1">
                <li>
                  • 「LINEログインチャンネルが見つからない」→ まず
                  LINEログインチャンネルを作成する必要があります
                </li>
                <li>
                  • 「ログインエラーが発生する」→ Messaging APIのChannel
                  IDを間違って設定していないか確認
                </li>
                <li>
                  • 「Token verification failed」→ 正しいLINEログインチャンネルのChannel IDか再確認
                </li>
              </ul>
            </div>

            {/* 確認方法 */}
            <div className="bg-palette-2/20 border border-palette-2/40 p-3 rounded-md">
              <p className="font-semibold text-palette-2-foreground text-sm mb-2">
                ✅ 正しく設定できているかの確認
              </p>
              <div className="text-xs space-y-1">
                <p>1. 設定したChannel IDが数字のみであること</p>
                <p>2. LINEログインチャンネルから取得したIDであること</p>
                <p>3. Messaging APIチャンネルのIDではないこと</p>
                <p>4. LIFFアプリも同じLINEログインチャンネル内に作成されていること</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export default ApiSettingsCard
