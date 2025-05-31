'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { SingleImageDrop, Loading } from '@/components/common'
import { Button } from '@/components/ui/button'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Textarea } from '@/components/ui/textarea'
import { useZodForm } from '@/hooks/useZodForm'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { z } from 'zod'
import { fetchAddressByPostalCode } from '@/lib/helpers'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { ZodTextField } from '@/components/common'
import { Loader2 } from 'lucide-react'
import { Mail, Phone, MapPin, Save, Upload, Building } from 'lucide-react'
import Uploader from '@/components/common/Uploader'
import { createSingleImageFormData, uploadImages } from '@/lib/utils'

const orgAndConfigFormSchema = z.object({
  org_name: z.string().max(120, 'サロン名は120文字以内で入力してください'), // サロン名
  org_email: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val === '' || /^[\w\-._]+@[\w\-._]+\.[A-Za-z]{2,}$/.test(val),
      { message: 'メールアドレスの形式が正しくありません' }
    ),
  phone: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === '' || /^\d{8,11}$/.test(val), {
      message: '電話番号は8-11桁の数字で入力してください',
    }),
  postal_code: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === '' || /^\d{3}-?\d{4}$/.test(val), {
      message: '郵便番号は7桁の数字（ハイフンあり/なし）で入力してください',
    }),
  address: z.string().max(200, '住所は200文字以内で入力してください').optional(), // 住所（入力された場合は最低1文字必要）
  reservation_rules: z.string().max(2000, '予約ルールは2000文字以内で入力してください').optional(), // 予約ルール（入力された場合は最大500文字）
  description: z.string().max(2000, '説明は2000文字以内で入力してください').optional(), // 説明（入力された場合は最大500文字）
})

export default function OrgConfigForm() {
  const router = useRouter()
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const orgAndConfig = useQuery(
    api.organization.query.getOrgAndConfig,
    tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip'
  )

  const updateImages = useMutation(api.organization.config.mutation.updateImages)
  const upsertOrgAndConfig = useMutation(api.organization.mutation.upsertOrgAndConfig)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useZodForm(orgAndConfigFormSchema)

  const postalCode = watch('postal_code')

  // 郵便番号から住所を取得する関数（useCallbackでメモ化）
  const fetchAddress = useCallback(
    async (postalCode: string) => {
      try {
        const address = await fetchAddressByPostalCode(postalCode)
        setValue('address', address, { shouldDirty: true })
      } catch (error) {
        showErrorToast(error)
      }
    },
    [setValue, showErrorToast]
  )

  // 郵便番号が7桁になったら自動的に住所を検索する
  useEffect(() => {
    if (postalCode && postalCode.length === 7) {
      fetchAddress(postalCode)
    }
  }, [postalCode, fetchAddress])

  // 画像アップロード処理（useCallbackでメモ化）
  const handleSaveImg = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (!currentFile || !orgId) return

      let newUploadedImageUrls: { original_url: string; thumbnail_url: string }[] = []
      try {
        setIsUploading(true)

        // [ログ] 開始
        console.log('[画像アップロード] handleSaveImg開始', { currentFile, orgId })

        // FormDataを作成してファイルを直接送信
        const formData = createSingleImageFormData(currentFile, orgId, 'setting', {
          quality: 'medium',
          aspectType: 'landscape',
        })

        // [ログ] FormData作成完了
        console.log('[画像アップロード] FormData作成完了', {
          fileName: currentFile.name,
          fileSize: currentFile.size,
          fileType: currentFile.type,
        })

        // 画像アップロード実行
        const responseData = await uploadImages(formData)

        if (responseData.length > 0) {
          newUploadedImageUrls = responseData.map((image) => ({
            original_url: image.originalUrl,
            thumbnail_url: image.thumbnailUrl,
          }))
        }

        // [ログ] 生成された画像URLリスト
        console.log('[画像アップロード] 生成URLリスト', newUploadedImageUrls)

        // 空URLはエラー扱い
        if (!responseData[0]?.originalUrl || !responseData[0]?.thumbnailUrl) {
          toast.error(
            '画像のアップロードに失敗しました。画像形式（HEIC不可）やサイズをご確認ください。'
          )
          setIsUploading(false)
          return
        }

        // サロン設定の画像パスを更新
        if (newUploadedImageUrls.length > 0 && tenantId && orgId) {
          // [ログ] updateImages呼び出し
          console.log('[画像アップロード] updateImages呼び出し', {
            tenantId,
            orgId,
            images: newUploadedImageUrls,
          })
          await updateImages({
            tenant_id: tenantId,
            org_id: orgId,
            images: newUploadedImageUrls,
          })
        }
        if (orgAndConfig?.config?.images[0]?.original_url) {
          // [ログ] 既存画像削除リクエスト
          console.log(
            '[画像アップロード] 既存画像削除リクエスト',
            orgAndConfig?.config?.images[0]?.original_url
          )
          await fetch('/api/storage', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              originalUrl: orgAndConfig.config.images[0].original_url || '',
              withThumbnail: true,
            }),
          })
        }

        setCurrentFile(null)
        router.push('/dashboard/setting')
        toast.success('画像を保存しました')
      } catch (error) {
        // [ログ] エラー発生
        console.error('[画像アップロード] エラー発生', error)
        showErrorToast(error)
      } finally {
        // [ログ] 終了
        console.log('[画像アップロード] handleSaveImg終了', { isUploading: false })
        setIsUploading(false)
      }
    },
    [currentFile, orgAndConfig, updateImages, orgId, showErrorToast, tenantId, router]
  )

  // フォーム送信処理（useCallbackでメモ化）
  const onSubmit = useCallback(
    async (data: z.infer<typeof orgAndConfigFormSchema>) => {
      try {
        console.log('data', data)
        if (!tenantId || !orgId) return
        await upsertOrgAndConfig({
          tenant_id: tenantId,
          org_id: orgId,
          org_name: data.org_name ?? '',
          org_email: data.org_email ?? '',
          is_active: orgAndConfig?.organization?.is_active ?? true,
          phone: data.phone,
          postal_code: data.postal_code,
          address: data.address,
          reservation_rules: data.reservation_rules,
          description: data.description,
        })

        toast.success('サロン設定を保存しました')
      } catch (error) {
        showErrorToast(error)
      }
    },
    [upsertOrgAndConfig, tenantId, orgId, showErrorToast, orgAndConfig]
  )
  // orgConfigが変更されたらフォームをリセット
  useEffect(() => {
    if (orgAndConfig) {
      reset({
        org_name: orgAndConfig.organization.org_name,
        org_email: orgAndConfig.organization.org_email,
        phone: orgAndConfig.config?.phone,
        postal_code: orgAndConfig.config?.postal_code,
        address: orgAndConfig.config?.address,
        reservation_rules: orgAndConfig.config?.reservation_rules,
        description: orgAndConfig.config?.description,
      })
    }
  }, [orgAndConfig, reset])

  if (orgAndConfig === undefined) {
    return <Loading />
  }
  if (!isLoaded) {
    return <Loading />
  }

  if (isUploading) {
    return <Uploader />
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
      >
        <div className="flex items-center gap-2">
          <h4 className="text-2xl font-bold">基本設定</h4>
        </div>
        <p className="text-sm text-muted-foreground mt-1">こちらの情報は顧客に公開されます。</p>
        <div className="pt-4">
          <div className="flex flex-col gap-3 space-y-2">
            <ZodTextField
              name="org_name"
              register={register}
              label="サロン名"
              placeholder="例: ブライダルサロン"
              icon={<Building className="h-4 w-4 text-muted-foreground" />}
              errors={errors}
            />
            <div>
              <ZodTextField
                name="org_email"
                register={register}
                label="メールアドレス"
                placeholder="例: salon@example.com"
                icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                errors={errors}
              />
            </div>

            <ZodTextField
              name="phone"
              register={register}
              label="電話番号"
              placeholder="例: 09012345678"
              icon={<Phone className="h-4 w-4 text-muted-foreground" />}
              errors={errors}
            />
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <ZodTextField
                  name="postal_code"
                  register={register}
                  label="郵便番号"
                  placeholder="例: 273-5521"
                  icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                  errors={errors}
                />
              </div>

              <div className="w-full md:w-2/3">
                <ZodTextField
                  name="address"
                  register={register}
                  label="住所"
                  placeholder="例: 東京都渋谷区渋谷1-2-3"
                  errors={errors}
                  icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            </div>
          </div>
        </div>
        <Separator className="my-10 w-2/3 mx-auto" />
        <div className="flex flex-col md:flex-row gap-6 items-start my-4 mt-12">
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <h4 className="text-2xl font-bold">店舗画像</h4>
            {orgAndConfig?.config?.images[0]?.original_url && (
              <div className="w-full h-full aspect-square max-h-[350px]">
                <Image
                  src={orgAndConfig.config.images[0].original_url}
                  alt="店舗画像"
                  width={1512}
                  height={1512}
                  className="w-full h-full object-cover rounded-md border border-border aspect-[9/16]"
                />
              </div>
            )}
            <SingleImageDrop
              onFileSelect={(file) => {
                setCurrentFile(file)
              }}
              currentFile={currentFile}
              placeholderText="店舗画像を選択してください"
              aspectType="landscape"
            />
            <Button
              onClick={handleSaveImg}
              disabled={!currentFile || isUploading}
              className="w-full"
              variant="default"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  画像を保存
                </>
              )}
            </Button>
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-4 mt-5">
            <Label>店舗説明</Label>
            <Textarea
              {...register('description')}
              placeholder="サロンの特徴や魅力を記入してください"
              rows={12}
            />

            <Label>予約ルール</Label>
            <Textarea
              {...register('reservation_rules')}
              placeholder="予約時のルールやご注意点を入力してください"
              rows={12}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存する
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  )
}
