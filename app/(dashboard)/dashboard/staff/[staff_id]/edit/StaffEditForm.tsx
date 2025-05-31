'use client'

import { useZodForm } from '@/hooks/useZodForm'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'
import { SingleImageDrop, Loading, TagInput } from '@/components/common'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ExclusionMenu } from '@/components/common'
import { z } from 'zod'
import { Gender, Role, GENDER_VALUES, ROLE_VALUES } from '@/convex/types'
import { MAX_NOTES_LENGTH, MAX_NUM, MAX_TEXT_LENGTH, MAX_PIN_CODE_LENGTH } from '@/convex/constants'
import { Textarea } from '@/components/ui/textarea'
import { ZodTextField } from '@/components/common'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { fileToBase64, encryptStringCryptoJS, decryptStringCryptoJS } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useParams } from 'next/navigation'
import { generatePinCode } from '@/lib/utils'
import {
  Save,
  ArrowLeft,
  Info,
  Calendar,
  Shield,
  Tag,
  Sparkles,
  User,
  Mail,
  Clipboard,
  Check,
  X,
  Image as ImageIcon,
  Instagram,
  Trash,
  Lock,
  Shuffle,
  Copy,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { ProcessedImageResult } from '@/services/gcp/cloud_storage/types'
import Image from 'next/image'

const staffAddSchema = z.object({
  name: z.string().min(1, { message: '名前は必須です' }).max(MAX_TEXT_LENGTH),
  email: z.string().email({ message: 'メールアドレスが不正です' }),
  instagram_link: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null
      return val
    },
    z.string().url({ message: 'URLが不正です' }).nullable().optional()
  ),
  pin_code: z
    .string()
    .min(MAX_PIN_CODE_LENGTH, {
      message: `ピンコードは${MAX_PIN_CODE_LENGTH}文字で入力してください`,
    })
    .max(MAX_PIN_CODE_LENGTH, {
      message: `ピンコードは${MAX_PIN_CODE_LENGTH}文字で入力してください`,
    })
    .optional()
    .refine(
      (val) => {
        if (val === null || val === undefined) return true
        return /^[A-Za-z0-9]+$/.test(val)
      },
      {
        message: 'ピンコードは英大文字、英小文字、数字を含む6文字で入力してください',
      }
    ),
  gender: z.enum(GENDER_VALUES),

  age: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null
      // 数値に変換できない場合もnullを返す
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z.number().max(99, { message: '年齢は99以下で入力してください' }).nullable().optional()
  ),
  description: z.string().min(1, { message: '説明は必須です' }).max(MAX_NOTES_LENGTH),
  images: z.array(
    z.object({
      original_url: z.string(),
      thumbnail_url: z.string(),
    })
  ),
  role: z.enum(ROLE_VALUES),
  extra_charge: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null
      // 数値に変換できない場合もnullを返す
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z
      .number()
      .max(MAX_NUM, { message: `指名料金は${MAX_NUM}円以下で入力してください` })
      .nullable()
      .optional()
  ),
  priority: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null
      // 数値に変換できない場合もnullを返す
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z.number().max(999, { message: '優先度は999以下で入力してください' }).nullable().optional()
  ),
  tags: z.preprocess(
    (val) => (typeof val === 'string' ? val : Array.isArray(val) ? val.join(',') : ''),
    z
      .string()
      .max(100, { message: 'タグは合計100文字以内で入力してください' })
      .transform((val) =>
        val
          ? val
              .replace(/[,、]/g, ',')
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag !== '')
          : []
      )
      .refine((val) => val.length <= 5, { message: 'タグは最大5つまでです' })
      .optional()
  ),
  is_active: z.boolean(),
  exclusion_menu_ids: z.array(z.string()).optional(),
})

export default function StaffEditForm() {
  const router = useRouter()
  const { staff_id } = useParams()
  const { tenantId, orgId } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const [selectedExclusionMenuIds, setSelectedExclusionMenuIds] = useState<Id<'menu'>[]>([])
  const [exclusionInitialized, setExclusionInitialized] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeletingImage, setIsDeletingImage] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [currentTags, setCurrentTags] = useState<string[]>([])

  const updateRole = useMutation(api.staff.auth.mutation.update)

  // FIXME: 一回の呼び出しで複数のテーブルを更新するようにConvexのトランザクションを活用
  const staffUpsert = useMutation(api.staff.mutation.upsert)
  const staffConfigUpsert = useMutation(api.staff.config.mutation.upsert)
  const staffAuthUpsert = useMutation(api.staff.auth.mutation.upsert)
  const menuExclusionStaffUpsert = useMutation(api.menu.menu_exclusion_staff.mutation.upsert)

  // FIXME: 一回の呼び出しで複数のテーブルを更新するようにConvexのトランザクションを活用
  const staffKill = useMutation(api.staff.mutation.killRelatedTables)
  const removeStaffImages = useMutation(api.staff.mutation.removeImages)

  // FIXME: 一回の呼び出しで複数のテーブルを更新するようにConvexのトランザクションを活用
  const exclusionMenus = useQuery(
    api.menu.menu_exclusion_staff.query.listBySalonAndStaffId,
    tenantId && orgId && staff_id
      ? { tenant_id: tenantId, org_id: orgId, staff_id: staff_id as Id<'staff'> }
      : 'skip'
  )
  const staffAllData = useQuery(
    api.staff.query.getRelatedTables,
    tenantId && orgId && staff_id
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: staff_id as Id<'staff'>,
        }
      : 'skip'
  )

  const initialExclusionMenus = useMemo(() => {
    return exclusionMenus ? [...exclusionMenus].sort() : []
  }, [exclusionMenus])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors, isDirty },
    watch,
  } = useZodForm(staffAddSchema)

  const handleGeneratePinCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const pinCode = generatePinCode()
    setValue('pin_code', pinCode, { shouldDirty: true })
  }

  const handleCopyPinCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const pinCode = watch('pin_code')
    if (pinCode) {
      navigator.clipboard.writeText(pinCode)
    }
  }

  const onSubmit = async (data: z.infer<typeof staffAddSchema>) => {
    setIsLoading(true)
    let staffId: Id<'staff'> | null = null
    let staffConfigId: Id<'staff_config'> | null = null
    let staffAuthId: Id<'staff_auth'> | null = null
    let newUploadedImages: { original_url: string; thumbnail_url: string }[] = []

    try {
      if (!tenantId || !orgId) {
        toast.error('店舗が見つかりません')
        return
      }

      if (selectedFile) {
        try {
          // クライアント側で画像処理を行う
          const originalBase64 = await fileToBase64(selectedFile)

          const response = await fetch('/api/storage', {
            method: 'POST',
            body: JSON.stringify({
              base64Data: originalBase64,
              fileName: selectedFile.name,
              directory: 'staff',
              org_id: orgId,
              quality: 'high',
              aspectType: 'square',
            }),
          })

          const result: ProcessedImageResult = await response.json()
          newUploadedImages = [
            {
              original_url: result.originalUrl,
              thumbnail_url: result.thumbnailUrl,
            },
          ]
        } catch (error) {
          console.error('画像アップロードエラー:', error)
          showErrorToast(error)
          setIsLoading(false)
          return
        }
      }

      // スタッフの基本情報を追加
      staffId = await staffUpsert({
        tenant_id: tenantId,
        org_id: orgId,
        staff_id: staff_id as Id<'staff'>,
        name: data.name,
        age: data.age ?? undefined,
        email: data.email,
        instagram_link: data.instagram_link ?? undefined,
        gender: data.gender,
        description: data.description,
        images: newUploadedImages,
        tags: data.tags ?? [],
        is_active: true,
      })

      try {
        // スタッフの設定情報を追加
        staffConfigId = await staffConfigUpsert({
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: staff_id as Id<'staff'>,
          staff_config_id: staffAllData?.staff_config_id as Id<'staff_config'>,
          extra_charge: data.extra_charge ?? undefined,
          priority: data.priority ?? undefined,
        })

        // スタッフの認証情報を追加
        const encryptedPinCode = await encryptStringCryptoJS(data.pin_code ?? '')
        staffAuthId = await staffAuthUpsert({
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: staff_id as Id<'staff'>,
          staff_auth_id: staffAllData?.staff_auth_id as Id<'staff_auth'>,
          role: data.role,
          pin_code: encryptedPinCode,
        })

        // 除外メニューを更新

        await menuExclusionStaffUpsert({
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: staff_id as Id<'staff'>,
          selected_menu_ids: selectedExclusionMenuIds,
        })

        if (staffAllData && data.role !== staffAllData?.role) {
          await updateRole({
            staff_auth_id: staffAllData?.staff_auth_id as Id<'staff_auth'>,
            role: data.role,
          })
        }

        toast.success('スタッフを更新しました', {
          icon: <Check className="h-4 w-4 text-green-500" />,
        })
        router.push('/dashboard/staff')
      } catch (configAuthError) {
        // スタッフ設定または認証の保存に失敗した場合、作成したスタッフを削除
        if (staffId && staffConfigId && staffAuthId) {
          try {
            await staffKill({
              tenant_id: tenantId,
              org_id: orgId,
              staff_id: staff_id as Id<'staff'>,
              staff_config_id: staffConfigId,
              staff_auth_id: staffAuthId,
            })
          } catch (cleanupError) {
            console.error('スタッフ削除中にエラーが発生しました:', cleanupError)
          }
        }
        throw configAuthError // 元のエラーを再スロー
      }
    } catch (error: unknown) {
      // エラー発生時のクリーンアップ
      if (newUploadedImages.length > 0) {
        try {
          await fetch('/api/storage', {
            method: 'DELETE',
            body: JSON.stringify({
              originalUrl: newUploadedImages[0].original_url,
              withThumbnail: true,
            }),
          })
        } catch (deleteError) {
          console.error('画像削除中にエラーが発生しました:', deleteError)
        }
      }

      // staffIdが存在し、configAuthErrorでないケースでスタッフを削除（重複防止）
      if (staffId && !(error instanceof Error && error.name === 'configAuthError')) {
        try {
          if (staffConfigId && staffAuthId && tenantId && orgId) {
            await staffKill({
              tenant_id: tenantId,
              org_id: orgId,
              staff_id: staff_id as Id<'staff'>,
              staff_config_id: staffConfigId,
              staff_auth_id: staffAuthId,
            })
          }
        } catch (killError) {
          console.error('スタッフ削除中にエラーが発生しました:', killError)
        }
      }
      showErrorToast(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowDeleteDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setShowDeleteDialog(true)
  }

  const handleDeleteImage = async () => {
    setIsDeletingImage(true)
    setShowDeleteDialog(false)
    try {
      if (staffAllData?.images && staffAllData?.images.length > 0) {
        // オリジナル画像が存在する場合は削除
        if (staffAllData?.images[0].original_url) {
          await fetch('/api/storage', {
            method: 'DELETE',
            body: JSON.stringify({
              originalUrl: staffAllData.images[0].original_url,
              withThumbnail: true,
            }),
          })
        }

        await removeStaffImages({
          staff_id: staff_id as Id<'staff'>,
        })
        toast.success('画像を削除しました', {
          icon: <Check className="h-4 w-4 text-active" />,
        })
        router.push('/dashboard/staff')
      }
    } catch (error) {
      console.error('画像削除中にエラーが発生しました:', error)
      toast.error('画像削除中にエラーが発生しました', {
        icon: <X className="h-4 w-4 text-destructive-foreground" />,
      })
    } finally {
      setIsDeletingImage(false)
    }
  }

  useEffect(() => {
    if (!exclusionInitialized && exclusionMenus) {
      setSelectedExclusionMenuIds(initialExclusionMenus.map((menu) => menu.menu_id))
      setExclusionInitialized(true)
    }
  }, [exclusionMenus, initialExclusionMenus, exclusionInitialized])

  useEffect(() => {
    if (!staffAllData) return

    const initializeForm = async () => {
      try {
        // PINコードを復号
        let decryptedPinCode: string | null = null
        if (staffAllData.pin_code) {
          decryptedPinCode = await decryptStringCryptoJS(staffAllData.pin_code ?? '')
        }

        // フォームの初期値をリセット
        reset({
          name: staffAllData.name,
          email: staffAllData.email,
          instagram_link: staffAllData.instagram_link,
          gender: staffAllData.gender,
          age: staffAllData.age,
          description: staffAllData.description,
          images: staffAllData.images,
          is_active: staffAllData.is_active,
          role: staffAllData.role,
          extra_charge: staffAllData.extra_charge,
          priority: staffAllData.priority,
          tags: staffAllData.tags,
          // 復号した PIN コードをセット
          pin_code: decryptedPinCode ?? undefined,
        })
        // 既存タグをローカル state に同期
        setCurrentTags(staffAllData.tags || [])
      } catch (error) {
        console.error('ピンコードの復号に失敗しました:', error)
        toast.error('ピンコードの復号に失敗しました', {
          icon: <X className="h-4 w-4 text-red-500" />,
        })
        // 必要ならエラーハンドリング（トースト表示など）を追加
      }
    }

    initializeForm()
  }, [reset, staffAllData, watch])

  const exclusionChanged = useMemo(() => {
    if (exclusionMenus === undefined) return false // データ未ロード時は false
    const currentSorted = [...selectedExclusionMenuIds].sort()
    // initialExclusionMenuIds は既にソート済み
    return JSON.stringify(currentSorted) !== JSON.stringify(initialExclusionMenus)
  }, [selectedExclusionMenuIds, initialExclusionMenus, exclusionMenus])

  if (!staffAllData) {
    return <Loading />
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="exclusion">対応外メニュー</TabsTrigger>
          </TabsList>
          <TabsContent value="basic">
            <Card className="shadow-md border-border">
              <CardContent className="space-y-8 pt-6">
                {/* 基本情報セクション */}
                <div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      {staffAllData?.images && staffAllData?.images.length > 0 && (
                        <div className="flex justify-between gap-2">
                          <div className="mb-2 flex items-center">
                            <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              スタッフ画像
                            </span>
                          </div>
                          {staffAllData?.images[0].original_url && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="mb-2"
                              onClick={handleShowDeleteDialog}
                            >
                              {isDeletingImage ? (
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              ) : (
                                <Trash className="h-3 w-3 mr-2" />
                              )}
                              {isDeletingImage ? '削除中...' : '画像を削除'}
                            </Button>
                          )}
                        </div>
                      )}

                      <div className="w-full flex flex-col md:flex-row items-end justify-center gap-4">
                        <div className="max-w-xl mx-auto">
                          <div className="w-full">
                            {staffAllData.images && staffAllData.images.length > 0 && (
                              <Image
                                src={staffAllData.images[0].original_url}
                                alt="スタッフ画像"
                                width={1600}
                                height={1600}
                                className="transition-all duration-200 hover:opacity-90 aspect-square"
                              />
                            )}
                            <SingleImageDrop
                              onFileSelect={(file) => setSelectedFile(file)}
                              className="transition-all duration-200 hover:opacity-90 aspect-square"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <ZodTextField
                          name="name"
                          label="名前"
                          icon={<User className="h-4 w-4 mr-2 text-muted-foreground" />}
                          register={register}
                          errors={errors}
                          placeholder="名前を入力してください"
                          className="transition-all duration-200"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-1/2">
                          <Label className="flex items-center mb-2 font-medium">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            性別
                          </Label>
                          <Select
                            value={watch('gender') || staffAllData?.gender}
                            onValueChange={(value) =>
                              setValue('gender', value as Gender, { shouldDirty: true })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="性別を選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                              {GENDER_VALUES.map((gender) => (
                                <SelectItem key={gender} value={gender}>
                                  {gender === 'male'
                                    ? '男性'
                                    : gender === 'female'
                                      ? '女性'
                                      : '未選択'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-1/2">
                          <ZodTextField
                            name="age"
                            label="年齢"
                            icon={<Calendar className="h-4 w-4 mr-2 text-muted-foreground" />}
                            type="number"
                            register={register}
                            errors={errors}
                            placeholder="年齢を入力してください"
                          />
                        </div>
                      </div>

                      <TagInput
                        tags={currentTags}
                        setTagsAction={(tags) => {
                          setCurrentTags(tags)
                          setValue('tags', tags, { shouldDirty: true, shouldValidate: true })
                        }}
                        error={errors.tags?.message}
                        title="スタッフの得意なメニュー"
                        exampleText="ヘアセット, カット, メイク"
                      />
                      <div className="flex flex-col space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="is_active"
                            checked={watch('is_active')}
                            onCheckedChange={(checked) =>
                              setValue('is_active', checked, { shouldDirty: true })
                            }
                          />
                          <Label htmlFor="is_active" className="text-sm cursor-pointer">
                            {watch('is_active') ? (
                              <span className="text-active font-medium bg-active-foreground px-2 py-1 rounded-md">
                                有効
                              </span>
                            ) : (
                              <span className="text-destructive font-medium bg-destructive-foreground px-2 py-1 rounded-md">
                                無効
                              </span>
                            )}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          無効にすると予約画面に表示されなくなります。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ZodTextField
                      icon={<Instagram className="h-4 w-4 mr-2 text-muted-foreground" />}
                      name="instagram_link"
                      label="Instagramリンク"
                      register={register}
                      errors={errors}
                      placeholder="スタッフのInstagramリンクを入力してください"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center mb-2">
                      <Clipboard className="h-4 w-4 mr-2 text-muted-foreground" />
                      <Label className="font-medium text-primary">スタッフ紹介</Label>
                    </div>
                    <Textarea
                      value={watch('description')}
                      rows={12}
                      {...register('description')}
                      placeholder="スタッフの紹介を入力してください"
                      className="transition-all duration-200"
                    />
                    {errors.description && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive mt-1"
                      >
                        {errors.description.message}
                      </motion.p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* 認証情報セクション */}
                <div>
                  <div className="flex items-center mb-4">
                    <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">認証情報</h3>
                  </div>

                  <Alert className="bg-muted border-border mb-4">
                    <AlertDescription className="text-muted-foreground text-sm">
                      スタッフがログインする際に使用する認証情報です。スタッフはメールアドレスとピンコードを使用してログインできます。
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                      <div>
                        <ZodTextField
                          name="email"
                          icon={<Mail className="h-4 w-4 mr-2 text-muted-foreground" />}
                          label="メールアドレス"
                          register={register}
                          errors={errors}
                          placeholder="メールアドレスを入力してください"
                        />
                      </div>
                      <div className="flex items-start justify-start gap-2">
                        <div className="w-full">
                          <ZodTextField
                            readOnly={true}
                            name="pin_code"
                            icon={<Lock className="h-4 w-4 mr-2 text-muted-foreground" />}
                            label="ピンコード"
                            register={register}
                            errors={errors}
                            placeholder="ピンコードを入力してください"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 ml-4">
                          <div className="w-fit flex items-center justify-center">
                            <div>
                              <span className="text-xs text-nowrap text-muted-foreground">
                                再生成
                              </span>
                              <Button size={'icon'} onClick={handleGeneratePinCode}>
                                <Shuffle className="h-8 w-8 block" />
                              </Button>
                            </div>
                            <div>
                              <span className="text-xs text-nowrap text-muted-foreground">
                                コピー
                              </span>
                              <Button size={'icon'} onClick={handleCopyPinCode}>
                                <Copy className="h-8 w-8 block" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label className="font-medium text-primary">権限</Label>
                      </div>
                      <div className="mt-1">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {
                              role: 'staff',
                              label: 'スタッフ',
                              desc: '基本的な予約確認と自身の情報管理のみ',
                            },
                            {
                              role: 'manager',
                              label: 'マネージャー',
                              desc: 'スタッフ管理と基本設定の変更が可能',
                            },
                            {
                              role: 'owner',
                              label: 'オーナー',
                              desc: 'すべての機能にアクセス可能',
                            },
                          ].map((item) => (
                            <div
                              key={item.role}
                              className={`border rounded-md p-3 cursor-pointer transition-all ${
                                watch('role') === item.role
                                  ? 'border-active bg-active-foreground text-active'
                                  : 'border-border bg-muted text-muted-foreground'
                              }`}
                              onClick={() =>
                                setValue('role', item.role as Role, { shouldDirty: true })
                              }
                            >
                              <div className="font-medium text-sm mb-1">{item.label}</div>
                              <div className="text-xs text-muted-foreground">{item.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 詳細設定セクション */}
                <div>
                  <div className="flex items-center mb-4">
                    <Sparkles className="h-5 w-5 mr-2 text-primary" />
                    <h3 className="font-semibold text-lg">詳細設定</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label className="font-medium text-muted-foreground">指名料金</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs w-56">
                                お客様がこのスタッフを指名した場合の追加料金です。
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <ZodTextField
                        name="extra_charge"
                        label="指名料金"
                        type="number"
                        register={register}
                        errors={errors}
                        placeholder="指名料金を入力してください"
                        className="transition-all duration-200"
                      />
                    </div>

                    <div>
                      <div className="flex items-center mb-2">
                        <Sparkles className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label className="font-medium text-muted-foreground">優先度</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs w-56">
                                数値が大きいほど予約画面などで上位に表示されます。
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <ZodTextField
                        name="priority"
                        label="優先度"
                        type="number"
                        register={register}
                        errors={errors}
                        placeholder="優先度を入力してください"
                        className="transition-all duration-200"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        数値が大きいほど予約画面などで上位に表示されます。
                        <br />
                        指名無しの予約などで優先的に予約を確保したい場合は高い数値を設定してください。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="exclusion">
            <ExclusionMenu
              title="対応外メニュー"
              selectedMenuIds={selectedExclusionMenuIds}
              setSelectedMenuIdsAction={setSelectedExclusionMenuIds}
            />
            {Object.keys(errors).length > 0 && (
              <ul className="text-destructive-foreground bg-destructive p-2 rounded-md space-y-1 text-xs mt-2 list-disc pl-5">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
        <div className="flex justify-between py-4 ">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/staff')}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || isLoading || (!isDirty && !exclusionChanged && !selectedFile)}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                追加中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                スタッフを更新
              </>
            )}
          </Button>
        </div>
      </form>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スタッフ画像を削除しますか？</DialogTitle>
            <DialogDescription>この操作は元に戻すことができません。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteImage}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div>
        {Object.keys(errors).length > 0 && (
          <ul className="text-red-500 bg-red-50 p-2 rounded-md space-y-1 text-xs mt-2 list-disc pl-5">
            {Object.values(errors).map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
