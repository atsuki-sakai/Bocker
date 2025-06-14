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
const externalLinkCls = 'text-blue-600 underline hover:text-blue-800'
// APIの設定フォーム用のスキーマ
const organizationApiConfigFormSchema = z.object({
  line_access_token: z.string().optional(),
  line_channel_secret: z.string().optional(),
  liff_id: z.string().optional(),
  line_channel_id: z.string().optional(),
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
        {/* LINE Access Token */}
        <AccordionItem value="line-access-token">
          <AccordionTrigger>LINE アクセストークンの取得方法</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
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

            {/* 取得手順（2025年版） */}
            <p className="font-semibold">取得手順（2025年版）</p>
            <ol className="list-decimal list-inside space-y-1 bg-muted p-4 rounded-md">
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
                対象のプロバイダーを選択し、<strong>Messaging API チャネル</strong>
                をクリックします。
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
              </li>
              <li>
                発行されたトークンをコピーし、このフォームの「LINE&nbsp;アクセストークン」欄へ貼り付けます。
              </li>
            </ol>

            {/* 補足情報 */}
            <p className="text-xs text-secondary-foreground">
              ※ 2025年現在、4種類のトークンが利用可能です。初心者の方は
              <strong>長期チャンネルアクセストークン</strong>から始めることをお勧めします。
            </p>
            <p className="text-xs text-secondary-foreground">
              ※ より高いセキュリティが必要な場合は、有効期限付きの
              <strong>チャンネルアクセストークンv2.1</strong>の使用を検討してください。
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* LINE Channel Secret */}
        <AccordionItem value="line-channel-secret">
          <AccordionTrigger>LINE チャンネルシークレットの取得方法</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
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
            <ol className="list-decimal list-inside space-y-1 bg-muted p-4 rounded-md">
              <li>
                <Link
                  href="https://developers.line.biz/console/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={externalLinkCls}
                >
                  LINE Developers コンソール
                </Link>
                にログインし、対象のチャンネルを開きます。
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
                <strong>クリックして表示</strong>させます。
              </li>
              <li>
                表示された32文字以上の英数字を<strong>コピーアイコン</strong>でコピーします。
              </li>
              <li>
                コピーした値を本フォームの「LINE&nbsp;チャンネルシークレット」欄に貼り付けます。
              </li>
            </ol>{' '}
          </AccordionContent>
        </AccordionItem>

        {/* LIFF ID */}
        <AccordionItem value="liff-id">
          <AccordionTrigger>LIFF ID の取得方法</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
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

            {/* 取得手順（2025年版） */}
            <p className="font-semibold">取得手順（2025年版）</p>
            <ol className="list-decimal list-inside space-y-1 bg-muted p-4 rounded-md">
              <li className="text-sm text-secondary-foreground font-semibold my-3">
                📌 重要：LIFF IDを取得するには、まず<strong>LINEログインチャンネル</strong>
                の作成が必要です。
              </li>
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
              <li>
                「<strong>チャンネルを作成</strong>」をクリックし、チャンネルタイプで「
                <strong>LINEログイン</strong>」を選択します。
              </li>
              <li>
                アプリタイプは「ウェブアプリ」を選択し、必要な情報を入力してチャンネルを作成します。
              </li>
              <li>
                作成したLINEログインチャンネルを開き、「<strong>LIFF</strong>」タブを選択します。
              </li>
              <li>
                「<strong>追加</strong>」ボタンをクリックしてLIFFアプリを作成します。
              </li>
              <li>
                LIFFアプリの設定画面で以下を入力します：
                <br />
                ・サイズ：Full、Tall、Compactから選択
                <br />
                ・エンドポイントURL：
                <code className="ml-1 bg-slate-200 px-1 rounded">
                  https://{process.env.NEXT_PUBLIC_SITE_DOMAIN}/liff
                </code>
                <br />
                ・スコープ：必要に応じてprofile、openid、emailなどを選択
              </li>
              <li>
                設定完了後、「<span className="font-mono">1234567890-AbcdEfgh</span>」形式の
                <strong>LIFF ID</strong>が発行されます。
              </li>
              <li>このIDをコピーして、本フォームの「LIFF&nbsp;ID」欄に貼り付けます。</li>
            </ol>

            {/* 補足情報 */}
            <p className="text-xs text-secondary-foreground">※ LIFF IDは公開しても安全な情報です</p>
            <p className="text-xs text-secondary-foreground">
              ※ Messaging
              APIチャンネルと同じプロバイダー内に作成することで、チャンネル間の連携が可能になります
            </p>
            <p className="text-xs text-secondary-foreground">
              ※ 2025年2月以降、LIFFとLINE MINI Appの統合が予定されています
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* LINE Channel ID */}
        <AccordionItem value="line-channel-id">
          <AccordionTrigger>LINE チャンネルID の取得方法</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
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

            {/* 重要な変更点 */}
            <div className="bg-background p-4 rounded-md">
              <p className="text-xs text-secondary-foreground mb-1">2024年9月以降の変更点</p>
              <p className="text-xs text-secondary-foreground font-semibold">
                Messaging
                APIチャンネルは、まずLINE公式アカウントマネージャーで公式アカウントを作成してから、Messaging
                APIを有効化する必要があります。
              </p>
            </div>

            {/* 取得手順（2025年版） */}
            <p className="font-semibold">取得手順（2025年版）</p>
            <ol className="list-decimal list-inside space-y-1 bg-muted p-4 rounded-md">
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
              </li>
              <li>
                画面上部のタブメニューから<strong>基本設定</strong>
                タブが選択されていることを確認します。
              </li>
              <li>
                ページ上部に表示される<strong>「チャンネルID」</strong>
                の数値（例：1234567890）を確認します。
              </li>
              <li>
                チャンネルID横の<strong>コピーアイコン</strong>をクリックしてコピーします。
              </li>
              <li>コピーした値を本フォームの「LINE&nbsp;チャンネルID」欄に貼り付けます。</li>
            </ol>

            {/* 補足情報 */}
            <p className="text-xs text-secondary-foreground font-semibold">💡 初めての方へ</p>
            <p className="text-xs text-secondary-foreground">
              もしMessaging
              APIチャンネルが見つからない場合は、LINE公式アカウントマネージャーとDevelopers
              Consoleで同じアカウントを使用しているか確認してください。
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export default ApiSettingsCard
