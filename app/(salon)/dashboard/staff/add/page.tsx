// app/(salon)/dashboard/staff/add/page.tsx
// スタッフの追加ページ
'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { handleError } from '@/lib/error';
import { useSalon } from '@/hooks/useSalon';
import { compressAndConvertToWebP, fileToBase64 } from '@/lib/utils';
import { Id } from '@/convex/_generated/dataModel';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { StorageError, ConvexCustomError } from '@/services/convex/shared/utils/error';
import {
  Save,
  ArrowLeft,
  Info,
  Calendar,
  Shield,
  Tag,
  EyeOff,
  Eye,
  Sparkles,
  User,
  Mail,
  Clipboard,
  Check,
  X,
  Image as ImageIcon,
  Lock,
  Shuffle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExclusionMenu } from '@/components/common';

const staffAddSchema = z.object({
  name: z.string().min(1, { message: '名前は必須です' }).max(MAX_TEXT_LENGTH),
  email: z.string().email({ message: 'メールアドレスが不正です' }).optional(),
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
      if (val === '' || val === null || val === undefined) return null;
      // 数値に変換できない場合もnullを返す
      const num = Number(val);
      return isNaN(num) ? null : num;
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
      if (val === '' || val === null || val === undefined) return null;
      // 数値に変換できない場合もnullを返す
      const num = Number(val);
      return isNaN(num) ? null : num;
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
      if (val === '' || val === null || val === undefined) return null;
      // 数値に変換できない場合もnullを返す
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().max(999, { message: '優先度は999以下で入力してください' }).nullable().optional()
  ),
});

export default function StaffAddPage() {
  const router = useRouter();
  const { salon } = useSalon();
  const [exclusionMenuIds, setExclusionMenuIds] = useState<Id<'menu'>[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPinCode, setShowPinCode] = useState(true);
  const staffAdd = useMutation(api.staff.core.mutation.create);
  const staffConfigAdd = useMutation(api.staff.config.mutation.create);
  const staffAuthAdd = useMutation(api.staff.auth.mutation.create);
  const staffKill = useMutation(api.staff.core.mutation.killRelatedTables);
  const menuExclusionStaffUpsert = useMutation(api.menu.menu_exclusion_staff.mutation.upsert);
  const uploadImage = useAction(api.storage.action.upload);
  const deleteImage = useAction(api.storage.action.kill);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors, isDirty },
    watch,
  } = useZodForm(staffAddSchema);

  const togglePinCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowPinCode(!showPinCode);
  };

  const handleGeneratePinCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const pinCode = Math.random().toString(36).substring(2, 8);
    setValue('pinCode', pinCode);
  };

  const onSubmit = async (data: z.infer<typeof staffAddSchema>) => {
    setIsLoading(true);
    let uploadImageUrl: string | null = null;
    let staffId: Id<'staff'> | null = null;
    let staffConfigId: Id<'staff_config'> | null = null;
    let staffAuthId: Id<'staff_auth'> | null = null;

    try {
      if (!salon) {
        toast.error('店舗が見つかりません');
        return;
      }

      if (selectedFile) {
        const compressed = await compressAndConvertToWebP(selectedFile);
        const base64 = await fileToBase64(compressed);
        const filePath = `${Date.now()}-${selectedFile.name}`;
        const uploadResult = await uploadImage({
          base64Data: base64,
          contentType: 'image/webp',
          directory: 'staff',
          filePath: filePath,
        });
        uploadImageUrl = uploadResult.publicUrl;
      }

      try {
        // スタッフの基本情報を追加
        staffId = await staffAdd({
          salonId: salon._id,
          name: data.name,
          age: data.age ?? undefined,
          email: data.email,
          gender: data.gender,
          description: data.description,
          imgPath: uploadImageUrl ?? undefined,
          isActive: data.isActive,
        });
        // スタッフの設定情報を追加
        staffConfigId = await staffConfigAdd({
          staffId: staffId,
          salonId: salon._id,
          extraCharge: data.extraCharge ?? undefined,
          priority: data.priority ?? undefined,
        });
        // スタッフの認証情報を追加
        staffAuthId = await staffAuthAdd({
          staffId: staffId,
          pinCode: watch('pinCode'),
          role: data.role,
        });

        // スタッフの対応外メニューを追加
        await menuExclusionStaffUpsert({
          salonId: salon._id,
          staffId: staffId,
          selectedMenuIds: exclusionMenuIds,
        });

        toast.success('スタッフを追加しました', {
          icon: <Check className="h-4 w-4 text-green-500" />,
        });
        router.push('/dashboard/staff');
      } catch (configAuthError) {
        // スタッフ設定または認証の保存に失敗した場合、作成したスタッフを削除
        if (staffId) {
          try {
            if (staffConfigId && staffAuthId && staffId) {
              await staffKill({
                staffId: staffId,
                staffConfigId: staffConfigId,
                staffAuthId: staffAuthId,
              });
            }
          } catch (cleanupError) {
            const err = new ConvexCustomError(
              'high',
              'スタッフ削除中にエラーが発生しました',
              'INTERNAL_ERROR',
              500,
              { Error: JSON.stringify(cleanupError) }
            );
            throw err;
          }
        }
        throw configAuthError; // 元のエラーを再スロー
      }
    } catch (error: unknown) {
      // エラー発生時のクリーンアップ
      if (uploadImageUrl) {
        try {
          await deleteImage({
            imgUrl: uploadImageUrl,
          });
        } catch (deleteError) {
          const err = new StorageError(
            'high',
            '画像削除中にエラーが発生しました',
            'INTERNAL_ERROR',
            500,
            { Error: JSON.stringify(deleteError) }
          );
          throw err;
        }

        if (staffId) {
          try {
            if (staffConfigId && staffAuthId && staffId) {
              await staffKill({
                staffId: staffId,
                staffConfigId: staffConfigId,
                staffAuthId: staffAuthId,
              });
            }
          } catch (cleanupError) {
            const err = new ConvexCustomError(
              'high',
              'スタッフ削除中にエラーが発生しました',
              'INTERNAL_ERROR',
              500,
              { Error: JSON.stringify(cleanupError) }
            );
            throw err;
          }
        }
        throw error; // 元のエラーを再スロー
      }
      const errorDetails = handleError(error);
      toast.error(errorDetails.message, {
        icon: <X className="h-4 w-4 text-red-500" />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reset({
      name: '',
      email: '',
      pinCode: '',
      gender: 'unselected',
      description: '',
      imgPath: '',
      isActive: true,
      organizationId: undefined,
      role: 'staff',
      extraCharge: undefined,
      priority: undefined,
    });
  }, [reset]);

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
              <Card className="shadow-md border-gray-100">
                <CardContent className="space-y-8 pt-6">
                  {/* 基本情報セクション */}
                  <div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="mb-2 flex items-center">
                          <ImageIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">スタッフ画像</span>
                        </div>

                        <ImageDrop
                          onFileSelect={(file) => setSelectedFile(file)}
                          className="transition-all duration-200 hover:opacity-90"
                        />

                        {selectedFile && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-2"
                          >
                            <Badge
                              variant="outline"
                              className="flex items-center text-green-600 bg-green-50"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {selectedFile.name}
                            </Badge>
                          </motion.div>
                        )}
                      </div>

                      <div className="space-y-4">
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

                        <div className="flex items-center gap-2">
                          <div className="w-1/2">
                            <Label className="flex items-center mb-2 font-medium text-gray-700">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
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
                              icon={<Calendar className="h-4 w-4 mr-2 text-gray-500" />}
                              type="number"
                              register={register}
                              errors={errors}
                              placeholder="年齢を入力してください"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-1">
                          <Switch
                            id="isActive"
                            className="data-[state=checked]:bg-green-600"
                            checked={watch('isActive')}
                            onCheckedChange={(checked) => setValue('isActive', checked)}
                          />
                          <Label htmlFor="isActive" className="text-xs cursor-pointer">
                            {watch('isActive') ? (
                              <span className="text-green-600 font-medium">有効</span>
                            ) : (
                              <span className="text-red-500 font-medium">無効</span>
                            )}
                          </Label>
                        </div>
                        <span className="text-xs text-gray-500">
                          予約受け付けは有効の場合のみ可能になります。
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center mb-2">
                        <Clipboard className="h-4 w-4 mr-2 text-gray-500" />
                        <Label className="font-medium text-gray-700">スタッフ紹介</Label>
                      </div>
                      <Textarea
                        value={watch('description')}
                        rows={5}
                        {...register('description')}
                        placeholder="スタッフの紹介を入力してください"
                        className="resize-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
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
                      <Shield className="h-5 w-5 mr-2 text-green-500" />
                      <h3 className="font-semibold text-lg">権限設定</h3>
                    </div>

                    <Alert className="bg-blue-50 border-blue-100 mb-4">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-blue-700 text-sm">
                        スタッフが管理画面にログインする際に必要な情報やアクセスできる機能の設定
                      </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="flex flex-col space-y-4 items-center gap-2 w-full">
                        <div className="w-full">
                          <ZodTextField
                            name="email"
                            icon={<Mail className="h-4 w-4 mr-2 text-gray-500" />}
                            label="メールアドレス"
                            register={register}
                            errors={errors}
                            placeholder="メールアドレスを入力してください"
                          />
                        </div>
                        <div className="w-full flex items-center gap-2 justify-between">
                          <div className="w-full">
                            <ZodTextField
                              name="pinCode"
                              label="ピンコード"
                              type={showPinCode ? 'text' : 'password'}
                              register={register}
                              errors={errors}
                              placeholder="EFG5HD"
                              icon={<Lock className="h-4 w-4 mr-2 text-gray-500" />}
                            />
                            <span className="text-xs text-gray-500">
                              ピンコードは6文字の英数字で入力してください
                            </span>
                          </div>
                          <Button size={'icon'} onClick={handleGeneratePinCode}>
                            <Shuffle className="h-8 w-8" />
                          </Button>
                          <Button size="icon" onClick={togglePinCode}>
                            {showPinCode ? (
                              <Eye className="h-8 w-8" />
                            ) : (
                              <EyeOff className="h-8 w-8" />
                            )}
                          </Button>
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
                              <motion.div
                                key={item.role}
                                whileHover={{ scale: 1.02 }}
                                className={`border rounded-md p-3 cursor-pointer transition-all ${
                                  watch('role') === item.role
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200'
                                }`}
                                onClick={() => setValue('role', item.role as Role)}
                              >
                                <div className="font-medium text-sm mb-1">{item.label}</div>
                                <div className="text-xs text-gray-500">{item.desc}</div>
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
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>

          <Button type="submit" disabled={isSubmitting || isLoading || !isDirty}>
            {isSubmitting || isLoading ? (
              <>
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
  );
}
