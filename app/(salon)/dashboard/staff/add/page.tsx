// app/(salon)/dashboard/staff/add/page.tsx
// スタッフの追加ページ
'use client';

import { Loader2 } from 'lucide-react';
import { TagInput } from '@/components/common';
import { DashboardSection } from '@/components/common';
import { useZodForm } from '@/hooks/useZodForm';
import { useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { ImageDrop } from '@/components/common';
import { z } from 'zod';
import { Gender, GENDER_VALUES, Role, ROLE_VALUES } from '@/services/convex/shared/types/common';
import { MAX_NOTES_LENGTH, MAX_TEXT_LENGTH } from '@/services/convex/constants';
import { Textarea } from '@/components/ui/textarea';
import { ZodTextField } from '@/components/common';
import { generatePinCode } from '@/lib/utils';
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
import { fileToBase64, encryptString, createImageWithThumbnail } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ConvexError } from 'convex/values'
import {
  Save,
  ArrowLeft,
  Calendar,
  Shield,
  Sparkles,
  User,
  Mail,
  Clipboard,
  Check,
  Instagram,
  X,
  Image as ImageIcon,
  Lock,
  Shuffle,
  Copy,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExclusionMenu } from '@/components/common'

const staffAddSchema = z.object({
  name: z.string().min(1, { message: '名前は必須です' }).max(MAX_TEXT_LENGTH),
  email: z.string().email({ message: 'メールアドレスが不正です' }).optional(),
  instagramLink: z
    .preprocess(
      (val) => {
        // val が文字列以外なら undefined
        if (typeof val !== 'string') return undefined
        // トリムして空文字なら undefined、それ以外はトリム済み文字列
        const str = val.trim()
        return str === '' ? undefined : str
      },
      // undefined が渡れば optional でスキップ、文字列なら URL バリデーション
      z.string().url({ message: 'URLが不正です' }).optional()
    )
    .nullable(), // null も許容したい場合のみ残します
  pinCode: z
    .string()
    .min(6, { message: 'ピンコードは6文字以上で入力してください' })
    .max(MAX_TEXT_LENGTH)
    .refine((val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/.test(val), {
      message: 'ピンコードは英大文字、英小文字、数字を含む6文字以上で入力してください',
    }),
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
  ),
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
})

export default function StaffAddPage() {
  const router = useRouter()
  const { salon } = useSalon()
  const [exclusionMenuIds, setExclusionMenuIds] = useState<Id<'menu'>[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTags, setCurrentTags] = useState<string[]>([])

  const staffAdd = useMutation(api.staff.core.mutation.create)
  const staffConfigAdd = useMutation(api.staff.config.mutation.create)
  const staffAuthAdd = useMutation(api.staff.auth.mutation.create)
  const staffKill = useMutation(api.staff.core.mutation.killRelatedTables)
  const menuExclusionStaffUpsert = useMutation(api.menu.menu_exclusion_staff.mutation.upsert)
  const uploadImage = useAction(api.storage.action.upload)
  const deleteImage = useAction(api.storage.action.kill)

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
    setValue('pinCode', pinCode)
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
    let staffId: Id<'staff'> | null = null
    let staffConfigId: Id<'staff_config'> | null = null
    let staffAuthId: Id<'staff_auth'> | null = null
    let uploadedOriginalUrl: string | undefined = undefined
    let uploadedThumbnailUrl: string | undefined = undefined

    try {
      if (!salon) {
        toast.error('店舗が見つかりません')
        return
      }

      if (selectedFile) {
        try {
          // クライアント側で画像処理を行う
          const { original, thumbnail } = await createImageWithThumbnail(selectedFile)

          // オリジナル画像をアップロード
          const originalBase64 = await fileToBase64(original)
          const originalResult = await uploadImage({
            base64Data: originalBase64,
            contentType: original.type,
            directory: 'staff/original',
            filePath: `${Date.now()}-original-${original.name}`,
          })
          uploadedOriginalUrl = originalResult.publicUrl

          // サムネイル画像をアップロード
          const thumbnailBase64 = await fileToBase64(thumbnail)
          const thumbnailResult = await uploadImage({
            base64Data: thumbnailBase64,
            contentType: thumbnail.type,
            directory: 'staff/thumbnail',
            filePath: `${Date.now()}-thumbnail-${thumbnail.name}`,
          })
          uploadedThumbnailUrl = thumbnailResult.publicUrl
        } catch (error) {
          console.log('画像アップロードエラー: ', error)

          toast.error(handleErrorToMsg(error), {
            icon: <X className="h-4 w-4 text-red-500" />,
          })
          setIsLoading(false)
          return
        }
      }

      try {
        // スタッフの基本情報を追加
        try {
          staffId = await staffAdd({
            salonId: salon._id,
            name: data.name,
            age: data.age ?? undefined,
            email: data.email,
            instagramLink: data.instagramLink ?? undefined,
            gender: data.gender,
            description: data.description,
            imgPath: uploadedOriginalUrl ?? undefined,
            thumbnailPath: uploadedThumbnailUrl ?? undefined,
            isActive: data.isActive,
            tags: data.tags,
          })
        } catch (creationError) {
          console.log('creationError type: ', typeof creationError)
          console.log('creationError: ', creationError)

          toast.error(handleErrorToMsg(creationError), {
            icon: <X className="h-4 w-4 text-red-500" />,
          })
          setIsLoading(false)
          return
        }
        // スタッフの設定情報を追加
        staffConfigId = await staffConfigAdd({
          staffId: staffId,
          salonId: salon._id,
          extraCharge: data.extraCharge ?? undefined,
          priority: data.priority ?? undefined,
        })
        // スタッフの認証情報を追加
        const encryptedPinCode = await encryptString(
          watch('pinCode'),
          process.env.NEXT_PUBLIC_ENCRYPTION_SECRET_KEY!
        )
        staffAuthId = await staffAuthAdd({
          staffId: staffId,
          pinCode: encryptedPinCode,
          role: data.role,
        })

        // スタッフの対応外メニューを追加
        await menuExclusionStaffUpsert({
          salonId: salon._id,
          staffId: staffId,
          selectedMenuIds: exclusionMenuIds,
        })

        toast.success('スタッフを追加しました', {
          icon: <Check className="h-4 w-4 text-active" />,
        })
        router.push('/dashboard/staff')
      } catch (configAuthError) {
        // スタッフ設定または認証の保存に失敗した場合、作成したスタッフを削除
        if (staffId) {
          try {
            if (staffConfigId && staffAuthId && staffId) {
              await staffKill({
                staffId: staffId,
                staffConfigId: staffConfigId,
                staffAuthId: staffAuthId,
              })
            }
          } catch (cleanupError) {
            throw new ConvexError({
              message: 'スタッフ削除中にエラーが発生しました',
              status: 500,
              code: 'INTERNAL_ERROR',
              title: 'スタッフ削除中にエラーが発生しました',
              details: { Error: JSON.stringify(cleanupError) },
            })
          }
        }
        throw configAuthError // 元のエラーを再スロー
      }
    } catch (error: unknown) {
      // エラー発生時のクリーンアップ
      if (uploadedOriginalUrl) {
        try {
          await deleteImage({
            imgUrl: uploadedOriginalUrl,
          })
        } catch (deleteError) {
          console.error('画像削除中にエラーが発生しました:', deleteError)
        }
      }

      if (uploadedThumbnailUrl) {
        try {
          await deleteImage({
            imgUrl: uploadedThumbnailUrl,
          })
        } catch (deleteError) {
          console.error('サムネイル画像削除中にエラーが発生しました:', deleteError)
        }
      }

      if (staffId) {
        try {
          if (staffConfigId && staffAuthId && staffId) {
            await staffKill({
              staffId: staffId,
              staffConfigId: staffConfigId,
              staffAuthId: staffAuthId,
            })
          }
        } catch (cleanupError) {
          throw new ConvexError({
            message: 'スタッフ削除中にエラーが発生しました',
            status: 500,
            code: 'INTERNAL_ERROR',
            title: 'スタッフ削除中にエラーが発生しました',
            details: { Error: JSON.stringify(cleanupError) },
          })
        }
        toast.error(handleErrorToMsg(error), {
          icon: <X className="h-4 w-4 text-destructive" />,
        })
        return
      }
      toast.error(handleErrorToMsg(error), {
        icon: <X className="h-4 w-4 text-destructive" />,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    reset({
      name: '',
      email: '',
      instagramLink: undefined,
      pinCode: generatePinCode(),
      gender: 'unselected',
      description: '',
      imgPath: '',
      isActive: true,
      role: 'staff',
      extraCharge: undefined,
      priority: undefined,
      tags: [],
    })
    setCurrentTags([])
  }, [reset])

  return (
    <DashboardSection
      title="スタッフを追加"
      backLink="/dashboard/staff"
      backLinkTitle="スタッフ一覧"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="exclusion">対応外メニュー設定</TabsTrigger>
          </TabsList>
          <TabsContent value="basic">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-md border-border">
                <CardContent className="space-y-8 pt-6">
                  {/* 基本情報セクション */}
                  <div>
                    <div className="grid md:grid-cols-2 gap-6 pb-4">
                      <div>
                        <div className="mb-2 flex items-center">
                          <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            スタッフ画像
                          </span>
                        </div>

                        <ImageDrop
                          onFileSelect={(file) => setSelectedFile(file)}
                          className="transition-all duration-200 hover:opacity-90"
                        />
                      </div>

                      <div className="space-y-4">
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

                        <div className="flex items-center gap-2">
                          <div className="w-1/2">
                            <Label className="flex items-center mb-2 font-medium text-muted-foreground">
                              <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              性別
                            </Label>
                            <Select
                              defaultValue="unselected"
                              onValueChange={(value) => setValue('gender', value as Gender)}
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

                        {/* タグセクション */}
                        <TagInput
                          tags={currentTags}
                          setTagsAction={(tags) => {
                            setCurrentTags(tags)

                            setValue('tags', tags, { shouldValidate: true })
                          }}
                          error={errors.tags?.message}
                          title="スタッフに付与するタグ"
                          exampleText="ヘアセット, カット, メイク"
                        />

                        <div className="flex items-center space-x-2 pt-1">
                          <Switch
                            id="isActive"
                            checked={watch('isActive')}
                            onCheckedChange={(checked) => setValue('isActive', checked)}
                          />
                          <Label htmlFor="isActive" className="text-xs cursor-pointer">
                            {watch('isActive') ? (
                              <span className="text-active font-medium">有効</span>
                            ) : (
                              <span className="text-destructive font-medium">無効</span>
                            )}
                          </Label>
                        </div>
                        <span className="text-xs text-gray-500">
                          予約受け付けは有効の場合のみ可能になります。
                        </span>
                      </div>
                    </div>

                    <div className="mt-10">
                      <ZodTextField
                        icon={<Instagram className="h-4 w-4 mr-2 text-muted-foreground" />}
                        name="instagramLink"
                        label="Instagramリンク"
                        register={register}
                        errors={errors}
                        placeholder="スタッフのInstagramリンクを入力してください"
                      />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center mb-2">
                        <Clipboard className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label className="font-medium text-muted-foreground">スタッフ紹介</Label>
                      </div>
                      <Textarea
                        value={watch('description')}
                        rows={10}
                        {...register('description')}
                        placeholder="スタッフの紹介を入力してください"
                        className="resize-none focus:ring-2 focus:ring-border transition-all duration-200"
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

                  {/* 権限設定セクション */}
                  <div>
                    <div className="flex items-center mb-4">
                      <Shield className="h-5 w-5 mr-2 text-active" />
                      <h3 className="font-semibold text-lg">権限設定</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="flex flex-col space-y-4 items-center gap-2 w-full">
                        <div className="w-full">
                          <ZodTextField
                            name="email"
                            icon={<Mail className="h-4 w-4 mr-2 text-muted-foreground" />}
                            label="メールアドレス"
                            register={register}
                            errors={errors}
                            placeholder="メールアドレスを入力してください"
                          />
                        </div>
                        <div className="w-full flex items-center gap-2 justify-between">
                          <div className="w-full">
                            <div className="flex items-start justify-start gap-2">
                              <div className="w-full">
                                <ZodTextField
                                  readOnly={true}
                                  name="pinCode"
                                  icon={<Lock className="h-4 w-4 mr-2 text-muted-foreground" />}
                                  label="ピンコード"
                                  register={register}
                                  errors={errors}
                                  placeholder="ピンコードを生成してください。"
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
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center mb-2">
                          <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                          <Label className="font-medium text-muted-foreground">権限</Label>
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
                              <motion.div
                                key={item.role}
                                whileHover={{ scale: 1.02 }}
                                className={`border rounded-md p-3 cursor-pointer transition-all ${
                                  watch('role') === item.role
                                    ? 'border-active bg-active-foreground text-active'
                                    : 'border-border bg-muted text-muted-foreground'
                                }`}
                                onClick={() => setValue('role', item.role as Role)}
                              >
                                <div className="text-sm mb-1 font-bold">{item.label}</div>
                                <div className="text-xs text-muted-foreground">{item.desc}</div>
                              </motion.div>
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
                        <ZodTextField
                          name="extraCharge"
                          label="指名料金"
                          type="number"
                          register={register}
                          errors={errors}
                          placeholder="指名料金を入力してください"
                          className="transition-all duration-200"
                        />
                        <p className="text-xs mt-1 text-gray-500">
                          お客様がこのスタッフを指名した場合に追加料金を設定します。
                        </p>
                      </div>

                      <div>
                        <ZodTextField
                          name="priority"
                          label="優先度"
                          type="number"
                          register={register}
                          errors={errors}
                          placeholder="優先度を入力してください"
                          className="transition-all duration-200"
                        />
                        <p className="text-xs mt-1 text-gray-500">
                          数値が大きいほど予約画面などで上位に表示されます。
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
          <TabsContent value="exclusion">
            <ExclusionMenu
              title="対応外メニュー"
              selectedMenuIds={exclusionMenuIds}
              setSelectedMenuIdsAction={setExclusionMenuIds}
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
        <div className="flex justify-between py-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/staff')}
            className="flex items-center gap-1 border-border"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>

          <Button type="submit" disabled={isSubmitting || isLoading || !isDirty}>
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                追加中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                保存する
              </>
            )}
          </Button>
        </div>
      </form>
    </DashboardSection>
  )
}
