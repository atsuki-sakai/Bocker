'use client';

import { useZodForm } from '@/hooks/useZodForm';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { ImageDrop, Loading, Dialog, TagInput } from '@/components/common';
import { ExclusionMenu } from '@/components/common';
import { z } from 'zod';
import { Gender, Role, GENDER_VALUES, ROLE_VALUES } from '@/services/convex/shared/types/common';
import { MAX_NOTES_LENGTH, MAX_TEXT_LENGTH } from '@/services/convex/constants';
import { Textarea } from '@/components/ui/textarea';
import { ZodTextField } from '@/components/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { handleErrorToMsg } from '@/lib/error';
import { useSalon } from '@/hooks/useSalon';
import { compressAndConvertToWebP, fileToBase64, decryptString, encryptString } from '@/lib/utils';
import { Id } from '@/convex/_generated/dataModel';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useParams } from 'next/navigation';
import { generatePinCode } from '@/lib/utils';
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
const staffAddSchema = z.object({
  name: z.string().min(1, { message: '名前は必須です' }).max(MAX_TEXT_LENGTH),
  email: z.string().email({ message: 'メールアドレスが不正です' }).optional(),
  instagramLink: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null
      return val
    },
    z.string().url({ message: 'URLが不正です' }).nullable().optional()
  ),
  pinCode: z
    .string()
    .min(6, { message: 'ピンコードは6文字で入力してください' })
    .max(6, { message: 'ピンコードは6文字で入力してください' })
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
  imgPath: z.string().max(512).optional(),
  isActive: z.boolean(),

  role: z.enum(ROLE_VALUES),
  extraCharge: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null
      // 数値に変換できない場合もnullを返す
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z
      .number()
      .max(99999, { message: '指名料金は99999円以下で入力してください' })
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
  exclusionMenuIds: z.array(z.string()).optional(),
})

export default function StaffEditForm() {
  const router = useRouter()
  const { staff_id } = useParams()
  const { salon } = useSalon()
  const [selectedExclusionMenuIds, setSelectedExclusionMenuIds] = useState<Id<'menu'>[]>([])
  const [exclusionInitialized, setExclusionInitialized] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeletingImage, setIsDeletingImage] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [currentTags, setCurrentTags] = useState<string[]>([])

  const uploadImage = useAction(api.storage.action.upload)
  const deleteImage = useAction(api.storage.action.kill)
  const updateRole = useMutation(api.staff.auth.mutation.update)

  // FIXME: 一回の呼び出しで複数のテーブルを更新するようにConvexのトランザクションを活用
  const staffUpsert = useMutation(api.staff.core.mutation.upsert)
  const staffConfigUpsert = useMutation(api.staff.config.mutation.upsert)
  const staffAuthUpsert = useMutation(api.staff.auth.mutation.upsert)
  const menuExclusionStaffUpsert = useMutation(api.menu.menu_exclusion_staff.mutation.upsert)

  // FIXME: 一回の呼び出しで複数のテーブルを更新するようにConvexのトランザクションを活用
  const staffKill = useMutation(api.staff.core.mutation.killRelatedTables)
  const removeImgPath = useMutation(api.staff.core.mutation.removeImgPath)

  // FIXME: 一回の呼び出しで複数のテーブルを更新するようにConvexのトランザクションを活用
  const exclusionMenus = useQuery(
    api.menu.menu_exclusion_staff.query.listBySalonAndStaffId,
    salon?._id && staff_id ? { salonId: salon._id, staffId: staff_id as Id<'staff'> } : 'skip'
  )
  const staffAllData = useQuery(
    api.staff.core.query.getRelatedTables,
    salon?._id
      ? {
          staffId: staff_id as Id<'staff'>,
          salonId: salon._id,
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
    setValue('pinCode', pinCode, { shouldDirty: true })
  }

  const handleCopyPinCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const pinCode = watch('pinCode')
    if (pinCode) {
      navigator.clipboard.writeText(pinCode)
    }
  }

  const onSubmit = async (data: z.infer<typeof staffAddSchema>) => {
    setIsLoading(true)
    let uploadImageUrl: string | null = null
    let staffId: Id<'staff'> | null = null
    let staffConfigId: Id<'staff_config'> | null = null
    let staffAuthId: Id<'staff_auth'> | null = null

    try {
      if (!salon) {
        toast.error('店舗が見つかりません')
        return
      }

      if (selectedFile) {
        const compressed = await compressAndConvertToWebP(selectedFile)
        const base64 = await fileToBase64(compressed)
        const filePath = `${Date.now()}-${selectedFile.name}`
        const uploadResult = await uploadImage({
          base64Data: base64,
          contentType: 'image/webp',
          directory: 'staff',
          filePath: filePath,
        })
        uploadImageUrl = uploadResult.publicUrl
      }

      // スタッフの基本情報を追加
      staffId = await staffUpsert({
        staffId: staff_id as Id<'staff'>,
        salonId: salon._id,
        name: data.name,
        age: data.age ?? undefined,
        email: data.email,
        instagramLink: data.instagramLink ?? undefined,
        gender: data.gender,
        description: data.description,
        imgPath: uploadImageUrl ?? undefined,
        isActive: data.isActive,
        tags: data.tags,
      })

      try {
        // スタッフの設定情報を追加
        staffConfigId = await staffConfigUpsert({
          staffConfigId: staffAllData?.staffConfigId as Id<'staff_config'>,
          staffId: staff_id as Id<'staff'>,
          salonId: salon._id,
          extraCharge: data.extraCharge ?? undefined,
          priority: data.priority ?? undefined,
        })

        // スタッフの認証情報を追加
        const encryptedPinCode = await encryptString(
          data.pinCode ?? '',
          process.env.NEXT_PUBLIC_ENCRYPTION_SECRET_KEY!
        )
        staffAuthId = await staffAuthUpsert({
          staffAuthId: staffAllData?.staffAuthId as Id<'staff_auth'>,
          staffId: staff_id as Id<'staff'>,
          role: data.role,
          pinCode: encryptedPinCode,
        })

        // 除外メニューを更新

        await menuExclusionStaffUpsert({
          salonId: salon._id,
          staffId: staff_id as Id<'staff'>,
          selectedMenuIds: selectedExclusionMenuIds,
        })

        if (staffAllData && data.role !== staffAllData?.role) {
          await updateRole({
            staffAuthId: staffAllData.staffAuthId as Id<'staff_auth'>,
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
              staffId: staffId,
              staffConfigId: staffConfigId,
              staffAuthId: staffAuthId,
            })
          } catch (cleanupError) {
            console.error('スタッフ削除中にエラーが発生しました:', cleanupError)
          }
        }
        throw configAuthError // 元のエラーを再スロー
      }
    } catch (error: unknown) {
      // エラー発生時のクリーンアップ
      if (uploadImageUrl) {
        try {
          await deleteImage({
            imgUrl: uploadImageUrl,
          })
        } catch (deleteError) {
          console.error('画像削除中にエラーが発生しました:', deleteError)
        }
      }

      // staffIdが存在し、configAuthErrorでないケースでスタッフを削除（重複防止）
      if (staffId && !(error instanceof Error && error.name === 'configAuthError')) {
        try {
          if (staffConfigId && staffAuthId) {
            await staffKill({
              staffId: staffId,
              staffConfigId: staffConfigId,
              staffAuthId: staffAuthId,
            })
          }
        } catch (killError) {
          console.error('スタッフ削除中にエラーが発生しました:', killError)
        }
      }

      toast.error(handleErrorToMsg(error), {
        icon: <X className="h-4 w-4 text-red-500" />,
      })
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
      if (staffAllData?.imgPath && salon) {
        await deleteImage({
          imgUrl: staffAllData?.imgPath,
        })
        await removeImgPath({
          staffId: staff_id as Id<'staff'>,
        })
        toast.success('画像を削除しました', {
          icon: <Check className="h-4 w-4 text-green-500" />,
        })
        router.push('/dashboard/staff')
      }
    } catch (error) {
      console.error('画像削除中にエラーが発生しました:', error)
    } finally {
      setIsDeletingImage(false)
    }
  }

  useEffect(() => {
    if (!exclusionInitialized && exclusionMenus) {
      setSelectedExclusionMenuIds(initialExclusionMenus.map((menu) => menu.menuId))
      setExclusionInitialized(true)
    }
  }, [exclusionMenus, initialExclusionMenus, exclusionInitialized])

  useEffect(() => {
    if (!staffAllData) return

    const initializeForm = async () => {
      try {
        // PINコードを復号
        let decryptedPinCode: string | null = null
        if (staffAllData.pinCode) {
          decryptedPinCode = await decryptString(
            staffAllData.pinCode ?? '',
            process.env.NEXT_PUBLIC_ENCRYPTION_SECRET_KEY!
          )
        }
        console.log('staffAllData.pinCode', staffAllData.pinCode)

        console.log('decryptedPinCode', decryptedPinCode)

        // フォームの初期値をリセット
        reset({
          name: staffAllData.name,
          email: staffAllData.email,
          instagramLink: staffAllData.instagramLink,
          gender: staffAllData.gender,
          age: staffAllData.age,
          description: staffAllData.description,
          imgPath: staffAllData.imgPath,
          isActive: staffAllData.isActive,
          role: staffAllData.role,
          extraCharge: staffAllData.extraCharge,
          priority: staffAllData.priority,
          tags: staffAllData.tags,
          // 復号した PIN コードをセット
          pinCode: decryptedPinCode ?? undefined,
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
            <Card className="shadow-md border-gray-100">
              <CardContent className="space-y-8 pt-6">
                {/* 基本情報セクション */}
                <div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      {staffAllData?.imgPath && (
                        <div className="flex justify-between gap-2">
                          <div className="mb-2 flex items-center">
                            <ImageIcon className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">スタッフ画像</span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="mb-2"
                            onClick={handleShowDeleteDialog}
                          >
                            {isDeletingImage ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24">
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              </motion.div>
                            ) : (
                              <Trash className="h-3 w-3 mr-2" />
                            )}
                            {isDeletingImage ? '削除中...' : '画像を削除'}
                          </Button>
                        </div>
                      )}

                      <div className="w-full flex flex-col md:flex-row items-end justify-center gap-4">
                        <div className="w-full flex flex-col">
                          <p className="text-sm text-gray-500">スタッフ画像</p>
                          <ImageDrop
                            initialImageUrl={staffAllData?.imgPath}
                            onFileSelect={(file) => setSelectedFile(file)}
                            className="transition-all duration-200 hover:opacity-90"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <ZodTextField
                          name="name"
                          label="名前"
                          icon={<User className="h-4 w-4 mr-2 text-gray-500" />}
                          register={register}
                          errors={errors}
                          placeholder="名前を入力してください"
                          className="transition-all duration-200"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-1/2">
                          <Label className="flex items-center mb-2 font-medium text-gray-700">
                            <User className="h-4 w-4 mr-2 text-gray-500" />
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
                            icon={<Calendar className="h-4 w-4 mr-2 text-gray-500" />}
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
                            id="isActive"
                            className="data-[state=checked]:bg-green-500"
                            checked={watch('isActive')}
                            onCheckedChange={(checked) =>
                              setValue('isActive', checked, { shouldDirty: true })
                            }
                          />
                          <Label htmlFor="isActive" className="text-sm cursor-pointer">
                            {watch('isActive') ? (
                              <span className="text-green-600 font-medium">有効</span>
                            ) : (
                              <span className="text-red-500 font-medium">無効</span>
                            )}
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500">
                          無効にすると予約画面に表示されなくなります。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center mb-2">
                      <Instagram className="h-4 w-4 mr-2 text-gray-500" />
                      <Label className="font-medium text-gray-700">SNS連携</Label>
                    </div>
                    <ZodTextField
                      name="instagramLink"
                      label="Instagramリンク"
                      register={register}
                      errors={errors}
                      placeholder="スタッフのInstagramリンクを入力してください"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center mb-2">
                      <Clipboard className="h-4 w-4 mr-2 text-gray-500" />
                      <Label className="font-medium text-gray-700">スタッフ紹介</Label>
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
                        className="text-sm text-red-500 mt-1"
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
                    <Shield className="h-5 w-5 mr-2 text-blue-500" />
                    <h3 className="font-semibold text-lg">認証情報</h3>
                  </div>

                  <Alert className="bg-blue-50 border-blue-100 mb-4">
                    <AlertDescription className="text-blue-700 text-sm">
                      スタッフがログインする際に使用する認証情報です。スタッフはメールアドレスとピンコードを使用してログインできます。
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                      <div>
                        <ZodTextField
                          name="email"
                          icon={<Mail className="h-4 w-4 mr-2 text-gray-500" />}
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
                            name="pinCode"
                            icon={<Lock className="h-4 w-4 mr-2 text-gray-500" />}
                            label="ピンコード"
                            register={register}
                            errors={errors}
                            placeholder="ピンコードを入力してください"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 ml-4">
                          <div className="w-fit flex items-center justify-center">
                            <div>
                              <span className="text-xs text-nowrap text-gray-500">再生成</span>
                              <Button size={'icon'} onClick={handleGeneratePinCode}>
                                <Shuffle className="h-8 w-8 block" />
                              </Button>
                            </div>
                            <div>
                              <span className="text-xs text-nowrap text-gray-500">コピー</span>
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
                        <Shield className="h-4 w-4 mr-2 text-gray-500" />
                        <Label className="font-medium text-gray-700">権限</Label>
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
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200'
                              }`}
                              onClick={() =>
                                setValue('role', item.role as Role, { shouldDirty: true })
                              }
                            >
                              <div className="font-medium text-sm mb-1">{item.label}</div>
                              <div className="text-xs text-gray-500">{item.desc}</div>
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
                    <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                    <h3 className="font-semibold text-lg">詳細設定</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <Tag className="h-4 w-4 mr-2 text-gray-500" />
                        <Label className="font-medium text-gray-700">指名料金</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1 text-gray-400 cursor-help" />
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
                        name="extraCharge"
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
                        <Sparkles className="h-4 w-4 mr-2 text-gray-500" />
                        <Label className="font-medium text-gray-700">優先度</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1 text-gray-400 cursor-help" />
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
                      <p className="text-xs text-gray-500 mt-1">
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
              <ul className="text-red-500 bg-red-50 p-2 rounded-md space-y-1 text-xs mt-2 list-disc pl-5">
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
            disabled={isSubmitting || isLoading || (!isDirty && !selectedFile && !exclusionChanged)}
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
      <Dialog
        title="画像を削除しますか？"
        description="この操作は元に戻すことができません。"
        onConfirmAction={handleDeleteImage}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </div>
  )
}
