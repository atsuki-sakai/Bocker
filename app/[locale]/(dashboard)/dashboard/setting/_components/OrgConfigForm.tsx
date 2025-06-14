'use client'

import Image from 'next/image'
import { uploadCompressedImage } from '@/lib/upload-client'
import { fileToBase64 } from '@/lib/file-to-base64'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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

const createOrgAndConfigFormSchema = (t: (key: string) => string) =>
  z.object({
    org_name: z.string().max(120, t('validation.salonNameMax')), // サロン名
    org_email: z
      .string()
      .optional()
      .refine(
        (val) => val === undefined || val === '' || /^[\w\-._]+@[\w\-._]+\.[A-Za-z]{2,}$/.test(val),
        { message: t('validation.emailInvalid') }
      ),
    phone: z
      .string()
      .optional()
      .refine((val) => val === undefined || val === '' || /^\d{8,11}$/.test(val), {
        message: t('validation.phoneFormat'),
      }),
    postal_code: z
      .string()
      .optional()
      .refine((val) => val === undefined || val === '' || /^\d{3}-?\d{4}$/.test(val), {
        message: t('validation.postalCodeFormat'),
      }),
    address: z.string().max(200, t('validation.addressMax')).optional(), // 住所（入力された場合は最低1文字必要）
    reservation_rules: z.string().max(2000, t('validation.reservationRulesMax')).optional(), // 予約ルール（入力された場合は最大500文字）
    description: z.string().max(2000, t('validation.descriptionMax')).optional(), // 説明（入力された場合は最大500文字）
  })

export default function OrgConfigForm() {
  const router = useRouter()
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const t = useTranslations('settings.orgConfig')
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const orgAndConfigFormSchema = createOrgAndConfigFormSchema(t)

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

        // ▼ ここで「フロント圧縮・署名URL・GCS直送」一括
        const base64Data = await fileToBase64(currentFile)
        const result = await uploadCompressedImage({
          base64Data,
          fileName: currentFile.name,
          directory: 'setting',
          orgId,
          aspectType: 'landscape',
          quality: 'high',
        })
        // result.original.publicUrl, result.thumbnail.publicUrl を使ってConvex等に登録
        newUploadedImageUrls = [
          {
            original_url: result.originalUrl,
            thumbnail_url: result.thumbnailUrl,
          },
        ]

        // [ログ] 生成された画像URLリスト
        console.log('[画像アップロード] 生成URLリスト', newUploadedImageUrls)

        // 空URLはエラー扱い
        if (!newUploadedImageUrls[0]?.original_url || !newUploadedImageUrls[0]?.thumbnail_url) {
          toast.error(t('messages.imageUploadFailed'))
          setIsUploading(false)
          return
        }

        console.log('1 newUploadedImageUrls: ', newUploadedImageUrls)

        // サロン設定の画像パスを更新
        if (newUploadedImageUrls.length > 0 && tenantId && orgId) {
          console.log('2 newUploadedImageUrls: ', newUploadedImageUrls)

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
        toast.success(t('messages.imageSaved'))
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
    [currentFile, orgAndConfig, updateImages, orgId, showErrorToast, tenantId, router, t]
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

        toast.success(t('messages.settingsSaved'))
      } catch (error) {
        showErrorToast(error)
      }
    },
    [upsertOrgAndConfig, tenantId, orgId, showErrorToast, orgAndConfig, t]
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
          <h4 className="text-2xl font-bold">{t('title')}</h4>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        <div className="pt-4">
          <div className="flex flex-col gap-3 space-y-2">
            <ZodTextField
              name="org_name"
              register={register}
              label={t('fields.salonName')}
              placeholder={t('placeholders.salonName')}
              icon={<Building className="h-4 w-4 text-muted-foreground" />}
              errors={errors}
            />
            <div>
              <ZodTextField
                name="org_email"
                register={register}
                label={t('fields.email')}
                placeholder={t('placeholders.email')}
                icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                errors={errors}
              />
            </div>

            <ZodTextField
              name="phone"
              register={register}
              label={t('fields.phone')}
              placeholder={t('placeholders.phone')}
              icon={<Phone className="h-4 w-4 text-muted-foreground" />}
              errors={errors}
            />
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <ZodTextField
                  name="postal_code"
                  register={register}
                  label={t('fields.postalCode')}
                  placeholder={t('placeholders.postalCode')}
                  icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                  errors={errors}
                />
              </div>

              <div className="w-full md:w-2/3">
                <ZodTextField
                  name="address"
                  register={register}
                  label={t('fields.address')}
                  placeholder={t('placeholders.address')}
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
            <h4 className="text-2xl font-bold">{t('fields.storeImage')}</h4>
            {orgAndConfig?.config?.images[0]?.original_url && (
              <div className="relative w-full h-full aspect-[16/9] max-h-[350px]">
                <Image
                  src={orgAndConfig.config.images[0].original_url}
                  alt={t('fields.storeImage')}
                  fill
                  className="w-full h-full object-cover rounded-md border border-border"
                />
              </div>
            )}
            <SingleImageDrop
              onFileSelect={(file) => {
                setCurrentFile(file)
              }}
              currentFile={currentFile}
              placeholderText={t('placeholders.storeImage')}
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
                  {t('buttons.saving')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('buttons.saveImage')}
                </>
              )}
            </Button>
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-4 mt-5">
            <Label>{t('fields.description')}</Label>
            <Textarea
              {...register('description')}
              placeholder={t('placeholders.description')}
              rows={12}
            />

            <Label>{t('fields.reservationRules')}</Label>
            <Textarea
              {...register('reservation_rules')}
              placeholder={t('placeholders.reservationRules')}
              rows={12}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('buttons.saving')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('buttons.save')}
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  )
}
