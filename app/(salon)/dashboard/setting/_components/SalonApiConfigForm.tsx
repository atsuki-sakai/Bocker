'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FormField, Loading } from '@/components/common';
import { MessageSquare, Key, Lock, Shield, Save, EyeOff, Eye, Loader2 } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { handleErrorToMsg } from '@/lib/error';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import { toast } from 'sonner';
import { useSalon } from '@/hooks/useSalon';
import { api } from '@/convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
// 共通リンクスタイル
const externalLinkCls = 'text-blue-600 underline hover:text-blue-800';
// APIの設定フォーム用のスキーマ
const salonApiConfigFormSchema = z.object({
  lineAccessToken: z.string().optional(),
  lineChannelSecret: z.string().optional(),
  liffId: z.string().optional(),
  lineChannelId: z.string().optional(),
  destinationId: z.string().optional(),
})

// スキーマから型を生成
type SalonApiConfigFormValues = z.infer<typeof salonApiConfigFormSchema>

const ApiSettingsCard = () => {
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [showFields, setShowFields] = useState<{ [key: string]: boolean }>({
    lineAccessToken: false,
    lineChannelSecret: false,
    liffId: false,
    destinationId: false,
    lineChannelId: false,
  })
  const { salonId } = useSalon()

  // すべてのフックをここでトップレベルで宣言
  const salonApiConfig = useQuery(
    api.salon.api_config.query.findBySalonId,
    salonId ? { salonId } : 'skip'
  )
  const upsertSalonApiConfig = useMutation(api.salon.api_config.mutation.upsert)

  // フォーム管理（useZodFormを使用）
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useZodForm(salonApiConfigFormSchema)

  // フォームの初期値が変更されたらリセット
  useEffect(() => {
    if (salonApiConfig) {
      reset(salonApiConfig)
    }
  }, [salonApiConfig, reset])

  // APIの設定を保存する関数
  const onApiSubmit = useCallback(
    async (data: SalonApiConfigFormValues) => {
      if (!salonId) return

      try {
        setSubmitting(true)

        await upsertSalonApiConfig({
          salonId,
          ...data,
        })

        toast.success('API設定を保存しました')
      } catch (error) {
        toast.error(handleErrorToMsg(error))
      } finally {
        setSubmitting(false)
      }
    },
    [upsertSalonApiConfig, salonId]
  )

  const handleShowFields = (
    e: React.MouseEvent<HTMLButtonElement>,
    field: keyof SalonApiConfigFormValues
  ) => {
    e.preventDefault()
    setShowFields({ ...showFields, [field]: !showFields[field] })
  }

  if (!salonId) {
    return <Loading />
  }

  if (salonApiConfig === undefined) {
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
              <FormField
                label="LINE アクセストークン"
                icon={<Key className="h-4 w-4 text-primary" />}
                error={errors.lineAccessToken?.message}
                tooltip="LINE Developers から取得したアクセストークンを入力してください"
              >
                <div className="flex items-center gap-2 relative">
                  <Input
                    type={showFields.lineAccessToken ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('lineAccessToken')}
                    placeholder="LINE アクセストークン"
                    className="transition-all pr-10 duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                  />
                  <Button
                    className="absolute right-0"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleShowFields(e, 'lineAccessToken')}
                  >
                    {showFields.lineAccessToken ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  MessagingAPI設定のチャネルアクセストークンからトークンを発行し設定してください。
                </span>
              </FormField>

              <FormField
                label="LINE チャンネルシークレット"
                icon={<Lock className="h-4 w-4 text-primary" />}
                error={errors.lineChannelSecret?.message}
                tooltip="LINE Developers から取得したチャネルシークレットを入力してください"
              >
                <div className="flex items-center gap-2 relative">
                  <Input
                    autoComplete="new-password"
                    type={showFields.lineChannelSecret ? 'text' : 'password'}
                    {...register('lineChannelSecret')}
                    placeholder="LINE チャンネルシークレット"
                    className="transition-all pr-10 duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                  />
                  <Button
                    className="absolute right-0"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleShowFields(e, 'lineChannelSecret')}
                  >
                    {showFields.lineChannelSecret ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  MessagingAPIのチャネルのシークレットキーを入力してください。
                </span>
              </FormField>

              <FormField
                label="LIFF ID"
                icon={<Shield className="h-4 w-4 text-primary" />}
                error={errors.liffId?.message}
                tooltip="LIFF（LINE Front-end Framework）のIDを入力してください"
              >
                <div className="flex items-center gap-2 relative">
                  <Input
                    type={showFields.liffId ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('liffId')}
                    placeholder="LIFF ID"
                    className="transition-all pr-10 duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                  />

                  <Button
                    className="absolute right-0"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleShowFields(e, 'liffId')}
                  >
                    {showFields.liffId ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  LINEログインに紐付けたLIFFアプリのIDを設定してください。
                </span>
              </FormField>

              <FormField
                label="LINEチャンネルID"
                icon={<MessageSquare className="h-4 w-4 text-primary" />}
                error={errors.lineChannelId?.message}
                tooltip="LINEのチャネルIDを入力してください"
              >
                <div className="flex items-center gap-2 relative">
                  <Input
                    type={showFields.lineChannelId ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('lineChannelId')}
                    placeholder="LINEチャンネルID"
                    className="transition-all pr-10 duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                  />

                  <Button
                    className="absolute right-0"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleShowFields(e, 'lineChannelId')}
                  >
                    {showFields.lineChannelId ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  LINEログインを使用しているチャネルのIDを設定してください。
                </span>
              </FormField>

              <div className="hidden">
                <p className="text-sm text-muted-foreground mb-2 bg-yellow-50 border border-yellow-400 rounded-md p-1 text-yellow-600 w-fit">
                  近日実装予定
                </p>
                <FormField
                  label="LINE公式アカウント識別子"
                  icon={<MessageSquare className="h-4 w-4 text-primary" />}
                  error={errors.destinationId?.message}
                  tooltip="LINE公式アカウントの識別子を入力してください"
                >
                  <div className="flex items-center gap-2 relative bg-yellow-50 border border-yellow-400 rounded-md p-1">
                    <Input
                      readOnly
                      type={showFields.destinationId ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...register('destinationId')}
                      placeholder="LINE公式アカウント識別子"
                      className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 pointer-events-none"
                    />

                    <Button
                      className="absolute right-0"
                      variant="outline"
                      size="icon"
                      onClick={(e) => handleShowFields(e, 'destinationId')}
                    >
                      {showFields.destinationId ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormField>
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

export default ApiSettingsCard;
