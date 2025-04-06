'use client';

import Image from 'next/image';
import { useZodForm } from '@/hooks/useZodForm';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { ImageDrop, Loading, Dialog } from '@/components/common';

import { z } from 'zod';
import { staffGenderType, StaffGenderType } from '@/lib/types';
import { MAX_NOTES_LENGTH, MAX_TEXT_LENGTH, MAX_PIN_CODE_LENGTH } from '@/lib/constants';
import { Textarea } from '@/components/ui/textarea';
import { ZodTextField } from '@/components/common';
import { staffRoleType, StaffRoleType } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors';
import { useSalon } from '@/hooks/useSalon';
import { compressAndConvertToWebP, fileToBase64, encryptString } from '@/lib/utils';
import { Id } from '@/convex/_generated/dataModel';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useParams } from 'next/navigation';
import {
  Save,
  ArrowLeft,
  Info,
  Calendar,
  Shield,
  Clock,
  Tag,
  Hash,
  Sparkles,
  User,
  Mail,
  Clipboard,
  Check,
  X,
  Image as ImageIcon,
  Trash,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { de } from 'date-fns/locale';

const staffAddSchema = z.object({
  name: z.string().min(1, { message: '名前は必須です' }).max(MAX_TEXT_LENGTH),
  email: z.string().email({ message: 'メールアドレスが不正です' }).optional(),
  gender: z.enum(staffGenderType),
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
  pinCode: z.string().min(1, { message: 'ピンコードは必須です' }).max(MAX_PIN_CODE_LENGTH),
  role: z.enum(staffRoleType),
  hourlyRate: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null;
      // 数値に変換できない場合もnullを返す
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z
      .number()
      .max(99999, { message: '時間給は99999円以下で入力してください' })
      .nullable()
      .optional()
  ),
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

export default function StaffEditForm() {
  const router = useRouter();
  const { staff_id } = useParams();
  const { salon } = useSalon();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const staffUpsert = useMutation(api.staff.core.upsert);
  const staffConfigUpsert = useMutation(api.staff.config.upsert);
  const staffAuthUpsert = useMutation(api.staff.auth.upsert);
  const staffKill = useMutation(api.staff.core.kill);
  const uploadImage = useAction(api.storage.core.uploadImage);
  const deleteImage = useAction(api.storage.core.deleteImage);
  const removeImgPath = useMutation(api.staff.core.removeImgPath);
  const staffAllData = useQuery(
    api.staff.core.getRelatedTables,
    salon?._id
      ? {
          staffId: staff_id as Id<'staff'>,
          salonId: salon._id,
        }
      : 'skip'
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors, isDirty },
    watch,
  } = useZodForm(staffAddSchema);

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

      // PINコードの暗号化
      const hashedPinCode = await encryptString(
        data.pinCode,
        process.env.NEXT_PUBLIC_ENCRYPTION_SECRET_KEY!
      );

      // スタッフの基本情報を追加
      staffId = await staffUpsert({
        staffId: staff_id as Id<'staff'>,
        salonId: salon._id,
        name: data.name,
        age: data.age ?? undefined,
        email: data.email,
        gender: data.gender,
        description: data.description,
        imgPath: uploadImageUrl ?? undefined,
        isActive: data.isActive,
      });

      try {
        // スタッフの設定情報を追加
        staffConfigId = await staffConfigUpsert({
          staffConfigId: staffAllData?.staffConfigId as Id<'staff_config'>,
          staffId: staff_id as Id<'staff'>,
          salonId: salon._id,
          hourlyRate: data.hourlyRate ?? undefined,
          extraCharge: data.extraCharge ?? undefined,
          priority: data.priority ?? undefined,
        });

        // スタッフの認証情報を追加
        staffAuthId = await staffAuthUpsert({
          staffAuthId: staffAllData?.staffAuthId as Id<'staff_auth'>,
          staffId: staff_id as Id<'staff'>,
          pinCode: data.pinCode,
          hashPinCode: hashedPinCode,
          role: data.role,
        });

        toast.success('スタッフを更新しました', {
          icon: <Check className="h-4 w-4 text-green-500" />,
        });
        router.push('/dashboard/staff');
      } catch (configAuthError) {
        // スタッフ設定または認証の保存に失敗した場合、作成したスタッフを削除
        if (staffId && staffConfigId && staffAuthId) {
          try {
            await staffKill({
              staffId: staffId,
              staffConfigId: staffConfigId,
              staffAuthId: staffAuthId,
            });
          } catch (cleanupError) {
            console.error('スタッフ削除中にエラーが発生しました:', cleanupError);
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
          console.error('画像削除中にエラーが発生しました:', deleteError);
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
            });
          }
        } catch (killError) {
          console.error('スタッフ削除中にエラーが発生しました:', killError);
        }
      }

      const errorDetails = handleError(error);
      toast.error(errorDetails.message, {
        icon: <X className="h-4 w-4 text-red-500" />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDeleteDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowDeleteDialog(true);
  };

  const handleDeleteImage = async () => {
    setIsDeletingImage(true);
    setShowDeleteDialog(false);
    try {
      if (staffAllData?.imgPath && salon) {
        await deleteImage({
          imgUrl: staffAllData?.imgPath,
        });
        await removeImgPath({
          staffId: staff_id as Id<'staff'>,
        });
        toast.success('画像を削除しました', {
          icon: <Check className="h-4 w-4 text-green-500" />,
        });
        router.push('/dashboard/staff');
      }
    } catch (error) {
      console.error('画像削除中にエラーが発生しました:', error);
    } finally {
      setIsDeletingImage(false);
    }
  };

  useEffect(() => {
    if (staffAllData) {
      reset({
        name: staffAllData?.name,
        email: staffAllData?.email,
        gender: staffAllData?.gender,
        age: staffAllData?.age,
        description: staffAllData?.description,
        imgPath: staffAllData?.imgPath,
        isActive: staffAllData?.isActive,
        pinCode: staffAllData?.pinCode,
        role: staffAllData?.role,
        hourlyRate: staffAllData?.hourlyRate,
        extraCharge: staffAllData?.extraCharge,
        priority: staffAllData?.priority,
      });
    }
  }, [reset, staffAllData, watch]);

  if (!staffAllData) {
    return <Loading />;
  }
  console.log(errors);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-md border-gray-100">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">
            {/* 基本情報セクション */}
            <div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-2 flex items-center">
                    <ImageIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">スタッフ画像</span>
                  </div>

                  <div className="w-full flex flex-col md:flex-row items-start justify-center gap-4">
                    <div className="w-full h-full overflow-hidden">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm text-gray-500">現在の画像</p>
                        <Button variant="destructive" size="sm" onClick={handleShowDeleteDialog}>
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
                      {staffAllData?.imgPath ? (
                        <Image
                          src={staffAllData.imgPath}
                          alt="スタッフ画像"
                          className="object-cover"
                          width={400}
                          height={400}
                        />
                      ) : (
                        <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-md">
                          <ImageIcon className="h-10 w-10 text-gray-400" />
                          <p className="text-sm text-gray-500">画像が設定されていません</p>
                        </div>
                      )}
                    </div>

                    <div className="w-full flex flex-col">
                      <p className="text-sm text-gray-500">変更する画像を設定してください。</p>
                      <ImageDrop
                        onFileSelect={(file) => setSelectedFile(file)}
                        className="transition-all duration-200 hover:opacity-90"
                      />
                    </div>
                  </div>

                  {selectedFile && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
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

                  <div className="flex items-center gap-2">
                    <div className="w-1/2">
                      <Label className="flex items-center mb-2 font-medium text-gray-700">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        性別
                      </Label>
                      <Select
                        value={watch('gender') || staffAllData?.gender}
                        onValueChange={(value) =>
                          setValue('gender', value as StaffGenderType, { shouldDirty: true })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="性別を選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffGenderType.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender === 'male' ? '男性' : gender === 'female' ? '女性' : '未選択'}
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

            {/* 認証情報セクション */}
            <div>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 mr-2 text-blue-500" />
                <h3 className="font-semibold text-lg">認証情報</h3>
              </div>

              <Alert className="bg-blue-50 border-blue-100 mb-4">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-700 text-sm">
                  スタッフがログインする際に使用する認証情報です。安全なピンコードを設定してください。
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center mb-2">
                    <Hash className="h-4 w-4 mr-2 text-gray-500" />
                    <Label className="font-medium text-gray-700">ピンコード</Label>
                  </div>
                  <ZodTextField
                    name="pinCode"
                    label="ピンコード"
                    register={register}
                    errors={errors}
                    placeholder="ピンコードを入力してください"
                    className="transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ※スタッフがログインに使用するピンコードです。数字のみを推奨します。
                  </p>
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
                        { role: 'admin', label: '管理者', desc: 'すべての機能にアクセス可能' },
                      ].map((item) => (
                        <motion.div
                          key={item.role}
                          whileHover={{ scale: 1.02 }}
                          className={`border rounded-md p-3 cursor-pointer transition-all ${
                            watch('role') === item.role
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                          onClick={() =>
                            setValue('role', item.role as StaffRoleType, { shouldDirty: true })
                          }
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

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center mb-2">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    <Label className="font-medium text-gray-700">時間給</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 ml-1 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs w-56">
                            スタッフの時間あたりの給料です。給与計算に使用されます。
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <ZodTextField
                    name="hourlyRate"
                    label="時間給"
                    type="number"
                    register={register}
                    errors={errors}
                    placeholder="時間給を入力してください"
                    className="transition-all duration-200"
                  />
                </div>

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

          <Separator className="my-2" />

          <CardFooter className="flex justify-between py-4 bg-gray-50">
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
              disabled={isSubmitting || isLoading || (!isDirty && !selectedFile)}
            >
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
                  スタッフを更新
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      <Dialog
        title="画像を削除しますか？"
        description="この操作は元に戻すことができません。"
        onConfirmAction={handleDeleteImage}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </motion.div>
  );
}
