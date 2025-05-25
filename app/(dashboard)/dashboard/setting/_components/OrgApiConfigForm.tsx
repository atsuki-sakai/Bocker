'use client'

import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loading, ZodTextField } from '@/components/common'
import { Key, Save, EyeOff, Eye, Loader2 } from 'lucide-react'
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

        toast.success('API設定を保存しました')
      } catch (error) {
        showErrorToast(error)
      } finally {
        setSubmitting(false)
      }
    },
    [upsertOrganizationApiConfig, orgId, tenantId, showErrorToast]
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
          <p className="text-2xl font-bold">外部サービス連携</p>
        </div>

        <p className="flex items-center mt-1 text-sm text-muted-foreground">
          外部サービスとの連携に必要なAPI設定を行います。
          <br />
          設定を行うと、LINE公式アカウントと連携した予約システムを使用できるようになります。
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
              <div className="flex items-center w-full">
                <ZodTextField
                  label="LINE アクセストークン"
                  icon={<Key className="h-4 w-4 text-primary" />}
                  errors={errors}
                  register={register}
                  name="line_access_token"
                  className="w-full pr-10"
                />
                <Button
                  className=""
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

              <div className="flex items-center w-full">
                <ZodTextField
                  label="LINE チャンネルシークレット"
                  icon={<Key className="h-4 w-4 text-primary" />}
                  errors={errors}
                  register={register}
                  name="line_channel_secret"
                  className="w-full pr-10"
                />
                <Button
                  className=""
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

              <div className="flex items-center w-full">
                <ZodTextField
                  label="LIFF ID"
                  icon={<Key className="h-4 w-4 text-primary" />}
                  errors={errors}
                  register={register}
                  name="liff_id"
                  className="w-full pr-10"
                />
                <Button
                  className=""
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

              <div className="flex items-center w-full">
                <ZodTextField
                  label="LINE チャンネルID"
                  icon={<Key className="h-4 w-4 text-primary" />}
                  errors={errors}
                  register={register}
                  name="line_channel_id"
                  className="w-full pr-10"
                />
                <Button
                  className=""
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
                <p className="text-sm text-muted-foreground mb-2 bg-yellow-50 border border-yellow-400 rounded-md p-1 text-yellow-600 w-fit">
                  近日実装予定
                </p>
                <div className="flex items-center w-full">
                  <ZodTextField
                    label="LINE Destination ID"
                    icon={<Key className="h-4 w-4 text-primary" />}
                    errors={errors}
                    register={register}
                    name="destination_id"
                    className="w-full pr-10"
                  />
                  <Button
                    className=""
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
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  API設定を保存
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
            <p className="font-semibold">取得手順</p>
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
                で対象の <strong>Messaging API チャネル</strong> を開きます。
              </li>
              <li>
                <strong>[Messaging&nbsp;API&nbsp;設定]</strong> タブ最下部の
                <strong>「チャネルアクセストークン（長期）」</strong> を生成します。
              </li>
              <li>
                発行されたトークンを<strong>コピー</strong>し、このフォームの
                「LINE&nbsp;アクセストークン」欄へ貼り付けます。
              </li>
            </ol>
            <p className="text-xs text-secondary-foreground">
              ※ トークンは一度しか表示されません。安全な場所へ保管してください。
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* LINE Channel Secret */}
        <AccordionItem value="line-channel-secret">
          <AccordionTrigger>LINE チャンネルシークレットの取得方法</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold">取得手順</p>
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
                で<strong>基本設定</strong>タブを開きます。
              </li>
              <li>
                「<strong>チャネルシークレット</strong>」横の<strong>コピーアイコン</strong>
                をクリックします。
              </li>
              <li>
                コピーした値を本フォームの「LINE&nbsp;チャンネルシークレット」欄に貼り付けます。
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        {/* LIFF ID */}
        <AccordionItem value="liff-id">
          <AccordionTrigger>LIFF ID の取得方法</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold">取得手順</p>
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
                で<strong>LIFF</strong>タブを開き、「<strong>追加</strong>」をクリックします。
              </li>
              <li>
                <strong>アプリタイプ</strong>を「ウェブアプリ」にし、エンドポイント URL に
                <code className="ml-1 bg-slate-200 px-1 rounded">
                  https://{process.env.NEXT_PUBLIC_SITE_DOMAIN}/liff
                </code>
                を入力して保存します。
              </li>
              <li>
                作成されたアプリの<strong>LIFF&nbsp;ID</strong>
                をコピーし、本フォームの「LIFF&nbsp;ID」欄に貼り付けます。
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export default ApiSettingsCard
