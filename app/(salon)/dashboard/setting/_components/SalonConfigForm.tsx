'use client';
  
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { ImageDrop, Loading } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fileToBase64 } from '@/lib/utils';
import { useZodForm } from '@/hooks/useZodForm';
import { Separator } from '@/components/ui/separator'
import { z } from 'zod'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'
import { FormField } from '@/components/common'
import { Loader2 } from 'lucide-react'
import { Mail, Phone, MapPin, FileText, Info, Save, Upload, Building } from 'lucide-react'
import { ZodTextField } from '@/components/common'

const salonConfigFormSchema = z.object({
  salonId: z.string(),
  salonName: z.string().max(120, 'サロン名は120文字以内で入力してください'), // サロン名
  email: z.string().email('メールアドレスの形式が正しくありません').optional(), // メールアドレス（入力された場合はメール形式をチェック）
  phone: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === '' || /^\d{8,11}$/.test(val), {
      message: '電話番号は8-11桁の数字で入力してください',
    }),

  postalCode: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === '' || /^\d{3}-?\d{4}$/.test(val), {
      message: '郵便番号は7桁の数字（ハイフンあり/なし）で入力してください',
    }),
  address: z.string().max(200, '住所は200文字以内で入力してください').optional(), // 住所（入力された場合は最低1文字必要）
  reservationRules: z.string().max(2000, '予約ルールは2000文字以内で入力してください').optional(), // 予約ルール（入力された場合は最大500文字）
  description: z.string().max(2000, '説明は2000文字以内で入力してください').optional(), // 説明（入力された場合は最大500文字）
})

export default function SalonConfigForm() {
  const { salonId } = useSalon()
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const salonConfig = useQuery(api.salon.config.query.findBySalonId, salonId ? { salonId } : 'skip')
  const updateSalonConfig = useMutation(api.salon.config.mutation.upsert)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useZodForm(salonConfigFormSchema)

  const postalCode = watch('postalCode')

  // 郵便番号から住所を取得する関数（useCallbackでメモ化）
  const fetchAddressByPostalCode = useCallback(
    async (code: string) => {
      const digits = code.replace(/-/g, '')
      if (!digits || digits.length !== 7) return

      try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`)
        const data = await response.json()

        if (data.results && data.results.length > 0) {
          const result = data.results[0]
          const fullAddress = `${result.address1}${result.address2}${result.address3}`
          setValue('address', fullAddress, { shouldDirty: true })
        } else if (data.message) {
          toast.error(data.message)
        } else {
          toast.error('住所が見つかりませんでした')
        }
      } catch (error) {
        toast.error(handleErrorToMsg(error))
      }
    },
    [setValue]
  )

  // 郵便番号が7桁になったら自動的に住所を検索する
  useEffect(() => {
    if (postalCode) {
      fetchAddressByPostalCode(postalCode)
    }
  }, [postalCode, fetchAddressByPostalCode])

  // 画像アップロード処理（useCallbackでメモ化）
  const handleSaveImg = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (!currentFile || !salonId) return

      let uploadedOriginalUrl: string | null = null
      let uploadedThumbnailUrl: string | null = null
      try {
        setIsUploading(true)

        const originalBase64 = await fileToBase64(currentFile)

        const result = await fetch('/api/storage', {
          method: 'POST',
          body: JSON.stringify({
            base64Data: originalBase64,
            fileName: currentFile!.name,
            directory: 'setting',
            salonId,
            quality: 'high',
          }),
        })
        const data = await result.json()
        uploadedOriginalUrl = data.imgUrl
        uploadedThumbnailUrl = data.thumbnailUrl

        if (result.ok) {
          // サロン設定の画像パスを更新
          if (uploadedOriginalUrl && uploadedThumbnailUrl) {
            await updateSalonConfig({
              salonId,
              imgPath: uploadedOriginalUrl,
              thumbnailPath: uploadedThumbnailUrl,
            })
          }
          if (salonConfig?.imgPath) {
            await fetch('/api/storage/kill', {
              method: 'DELETE',
              body: JSON.stringify({
                imgUrl: salonConfig.imgPath,
                withThumbnail: true,
              }),
            })
          }

          setCurrentFile(null)
          toast.success('画像を保存しました')
        }
      } catch (error) {
        toast.error(handleErrorToMsg(error))
      } finally {
        setIsUploading(false)
      }
    },
    [currentFile, salonConfig, updateSalonConfig, salonId]
  )

  // フォーム送信処理（useCallbackでメモ化）
  const onSubmit = useCallback(
    async (data: z.infer<typeof salonConfigFormSchema>) => {
      if (!salonId) return

      try {
        await updateSalonConfig({
          salonId: salonId,
          salonName: data.salonName ?? '',
          email: data.email,
          phone: data.phone,
          postalCode: data.postalCode,
          address: data.address,
          reservationRules: data.reservationRules,
          description: data.description,
        })

        toast.success('サロン設定を保存しました')
      } catch (error) {
        toast.error(handleErrorToMsg(error))
      }
    },
    [updateSalonConfig, salonId]
  )
  // salonConfigが変更されたらフォームをリセット
  useEffect(() => {
    if (salonConfig) {
      reset(salonConfig)
    }
  }, [salonConfig, reset])

  if (!salonId) {
    return <Loading />
  }
  if (salonConfig === undefined) {
    return <Loading />
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
              name="salonName"
              register={register}
              label="サロン名"
              placeholder="例: ブライダルサロン"
              icon={<Building className="h-4 w-4 text-muted-foreground" />}
              errors={errors}
            />
            <div>
              <ZodTextField
                name="email"
                register={register}
                label="メールアドレス"
                placeholder="例: salon@example.com"
                icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                errors={errors}
                readOnly={true}
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
                  name="postalCode"
                  register={register}
                  label="郵便番号"
                  placeholder="例: 273-5521"
                  icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                  errors={errors}
                />
              </div>

              <div className="w-full md:w-2/3">
                <FormField
                  label="住所"
                  icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                  error={errors.address?.message ?? ''}
                  tooltip="お客様に表示される住所です"
                >
                  <Input
                    {...register('address')}
                    placeholder="住所"
                    type="text"
                    className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>
        <Separator className="my-10 w-2/3 mx-auto" />
        <div className="flex flex-col md:flex-row gap-6 items-start my-4 mt-12">
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <h4 className="text-2xl font-bold">店舗画像</h4>
            <ImageDrop
              initialImageUrl={salonConfig?.imgPath}
              maxSizeMB={4}
              onFileSelect={(files) => {
                setCurrentFile(files[0] ?? null)
              }}
            />
            <Button
              onClick={handleSaveImg}
              disabled={!currentFile || isUploading}
              className="w-full"
              variant="default"
            >
              {isUploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-active"
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
            <FormField
              label="サロンの説明"
              icon={<Info className="h-4 w-4 text-muted-foreground" />}
              error={errors.description?.message ?? ''}
            >
              <Textarea
                {...register('description')}
                placeholder="サロンの特徴や魅力を記入してください"
                rows={12}
              />
            </FormField>
            <FormField
              label="予約時のルール"
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              error={errors.reservationRules?.message ?? ''}
            >
              <Textarea
                {...register('reservationRules')}
                placeholder="予約時のルールやご注意点を入力してください"
                rows={12}
              />
            </FormField>
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
