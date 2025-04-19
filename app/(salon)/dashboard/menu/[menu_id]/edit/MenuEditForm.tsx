'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loading, ZodTextField } from '@/components/common';
import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import { useSalon } from '@/hooks/useSalon';
import { ImageDrop } from '@/components/common';
import Image from 'next/image';
import { compressAndConvertToWebP, fileToBase64, cn } from '@/lib/utils';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { handleError } from '@/lib/error';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getMinuteMultiples } from '@/lib/schedule';
import {
  ImageIcon,
  DollarSign,
  Tag,
  Clock,
  Users,
  Repeat,
  CreditCard,
  Wallet,
  ShoppingBag,
  AlertCircle,
  Info,
  Save,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Id } from '@/convex/_generated/dataModel';
import {
  GENDER_VALUES,
  TARGET_VALUES,
  MENU_PAYMENT_METHOD_VALUES,
  Target,
  Gender,
  MenuPaymentMethod,
} from '@/services/convex/shared/types/common';

// バリデーションスキーマ
const schemaMenu = z
  .object({
    name: z
      .string()
      .min(1, { message: 'メニュー名は必須です' })
      .max(100, { message: 'メニュー名は100文字以内で入力してください' })
      .optional(),
    unitPrice: z
      .number()
      .min(1, { message: '価格は必須です' })
      .max(99999, { message: '価格は99999円以下で入力してください' })
      .nullable()
      .optional()
      .refine((val) => val !== null, { message: '価格は必須です' })
      .optional(),
    salePrice: z.preprocess(
      (val) => {
        // 空文字列の場合はnullを返す
        if (val === '' || val === null || val === undefined) return null;
        // 数値に変換できない場合もnullを返す
        const num = Number(val);
        return isNaN(num) ? null : num;
      },
      z
        .number()
        .max(99999, { message: 'セール価格は99999円以下で入力してください' })
        .nullable()
        .optional()
    ),
    timeToMin: z
      .number()
      .refine((val) => val !== null || val !== undefined || val !== 0, {
        message: '時間は必須です',
      })
      .optional(),
    imgFilePath: z.string().max(512, { message: '画像は512文字以内で入力してください' }).optional(), // 編集時は必須ではない
    description: z
      .string()
      .min(1, { message: '説明は必須です' })
      .max(1000, { message: '説明は1000文字以内で入力してください' })
      .optional(),
    targetGender: z.enum(GENDER_VALUES, { message: '性別は必須です' }).optional(),
    targetType: z.enum(TARGET_VALUES, { message: '対象タイプは必須です' }).optional(),
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
    paymentMethod: z
      .enum(MENU_PAYMENT_METHOD_VALUES, { message: '支払い方法は必須です' })
      .optional(),
    isActive: z.boolean({ message: '有効/無効フラグは必須です' }).optional(),
  })
  .refine(
    (data) => {
      // salePriceが存在する場合のみ、priceとの比較を行う
      if (data.salePrice && data.unitPrice && data.salePrice >= data.unitPrice) {
        return false;
      }
      return true;
    },
    {
      message: 'セール価格は通常価格より低く設定してください',
      path: ['salePrice'], // エラーメッセージをsalePriceフィールドに表示
    }
  );

// アニメーション設定
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// エラーメッセージコンポーネント
const ErrorMessage = ({ message }: { message: string | undefined }) => (
  <motion.p
    className="text-red-500 text-sm mt-1 flex items-center gap-1"
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
  >
    <AlertCircle size={14} /> {message ?? 'NULL'}
  </motion.p>
);

// タグバッジコンポーネント
const TagBadge = ({ text, onRemove }: { text: string; onRemove: () => void }) => (
  <Badge variant="secondary" className="px-3 py-1 mr-2 mb-2 flex items-center gap-1 text-sm">
    {text}
    <button onClick={onRemove} className="ml-1 text-gray-500 hover:text-gray-700">
      ×
    </button>
  </Badge>
);

export default function MenuEditForm() {
  const router = useRouter();
  const params = useParams();
  const menuId = params.menu_id as Id<'menu'>;
  const { salon } = useSalon();
  const menuData = useQuery(api.menu.core.query.get, { menuId });

  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [scheduleTime, setScheduleTime] = useState<number | undefined>(undefined);
  const [targetType, setTargetType] = useState<Target>('all');
  const [targetGender, setTargetGender] = useState<Gender>('unselected');
  const [paymentMethod, setPaymentMethod] = useState<MenuPaymentMethod>('cash');
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  const uploadImage = useAction(api.storage.action.upload);
  const deleteImage = useAction(api.storage.action.kill);
  const updateMenu = useMutation(api.menu.core.mutation.update);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useZodForm(schemaMenu);

  // データ取得後にフォームを初期化
  useEffect(() => {
    if (menuData && !isInitialized) {
      // 値を明示的に取得
      const timeToMinValue = menuData.timeToMin || '';
      const targetGenderValue = menuData.targetGender || 'unselected';
      const targetTypeValue = menuData.targetType || 'all';
      const paymentMethodValue = menuData.paymentMethod || 'cash';

      // timeToMinの処理を改善
      let scheduleTimeValue: number | undefined = undefined;
      if (timeToMinValue) {
        try {
          scheduleTimeValue = Number(timeToMinValue);
          // NaNチェック
          if (isNaN(scheduleTimeValue)) {
            console.error('Invalid timeToMin value:', timeToMinValue);
            scheduleTimeValue = undefined;
          }
        } catch (e) {
          console.error('Error parsing timeToMin:', e);
        }
      }

      // ステート変数を設定
      setExistingImageUrl(menuData.imgPath);
      setCurrentTags(menuData.tags || []);
      setScheduleTime(scheduleTimeValue);
      setTargetGender(targetGenderValue);
      setTargetType(targetTypeValue);
      setPaymentMethod(paymentMethodValue);

      console.log('menuData', menuData);
      // フォームを初期化
      reset({
        name: menuData.name || '',
        unitPrice: menuData.unitPrice ?? undefined,
        salePrice: menuData.salePrice ?? undefined,
        timeToMin: timeToMinValue as number,
        imgFilePath: menuData.imgPath || '',
        description: menuData.description || '',
        targetGender: targetGenderValue,
        targetType: targetTypeValue,
        tags: menuData.tags ?? undefined,
        paymentMethod: paymentMethodValue,
        isActive: menuData.isActive ?? true,
      });

      // 初期化完了フラグを設定
      setIsInitialized(true);
    }
  }, [menuData, reset, setValue, isInitialized]);

  // タグの操作ロジック
  const addTag = (
    e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    const newTags = [...currentTags];

    // カンマで区切られた複数のタグがある場合
    const tagsToAdd = tagInput
      .split(/[,、]/)
      .map((t) => t.trim())
      .filter((t) => t && !currentTags.includes(t));

    if (newTags.length + tagsToAdd.length > 5) {
      toast.warning('タグは最大5つまでです');
      return;
    }

    const updatedTags = [...newTags, ...tagsToAdd].slice(0, 5);
    setCurrentTags(updatedTags);
    setValue('tags', updatedTags, { shouldValidate: true }); // 型アサーションを削除
    setTagInput('');
  };

  const removeTag = (index: number) => {
    const newTags = [...currentTags];
    newTags.splice(index, 1);
    setCurrentTags(newTags);
    setValue('tags', newTags, { shouldValidate: true }); // 型アサーションを削除
  };

  // 支払い方法の選択ロジック
  const handlePaymentMethod = (
    e: React.MouseEvent<HTMLButtonElement>,
    method: MenuPaymentMethod
  ) => {
    e.preventDefault();
    setPaymentMethod(method);
    setValue('paymentMethod', method, { shouldValidate: true });
  };

  // フォーム送信処理
  const onSubmit = async (data: Partial<z.infer<typeof schemaMenu>>) => {
    let uploadImagePath: string | undefined;
    try {
      if (!salon?._id) {
        toast.error('サロン情報が必要です');
        return;
      }

      uploadImagePath = existingImageUrl;
      // 新しいファイルが選択された場合のみアップロード
      if (currentFile) {
        setIsUploading(true);
        const processedFile = await compressAndConvertToWebP(currentFile);
        const base64Data = await fileToBase64(processedFile);
        const filePath = `${Date.now()}-${processedFile.name}`;

        // 既存の画像を削除 (新しい画像をアップロードする場合のみ)
        if (existingImageUrl) {
          try {
            await deleteImage({ imgUrl: existingImageUrl });
          } catch (deleteError) {
            // 削除エラーは警告としてログに残すが、処理は続行
            console.warn('Failed to delete existing image:', deleteError);
          }
        }

        const uploadResult = await uploadImage({
          directory: 'menu',
          base64Data,
          filePath,
          contentType: processedFile.type,
        });
        uploadImagePath = uploadResult?.publicUrl;
        setExistingImageUrl(uploadImagePath); // アップロード成功時に既存画像URLを更新
        setIsUploading(false);
      }

      // APIに送信するデータを作成
      const updateData = {
        ...data,
        imgPath: uploadImagePath || existingImageUrl,
        tags: currentTags,
      };

      // priceフィールドをunitPriceに変換
      if (updateData.unitPrice) {
        updateData.unitPrice = updateData.unitPrice;
        delete updateData.unitPrice;
      }

      // imgFilePathプロパティが残っている場合は明示的に削除
      if ('imgFilePath' in updateData) {
        delete updateData.imgFilePath;
      }

      await updateMenu({
        ...updateData,
        salePrice: updateData.salePrice ?? undefined,
        menuId,
      });

      toast.success('メニューを更新しました');
      router.push('/dashboard/menu');
    } catch (error) {
      // エラーハンドリング：新しくアップロードした画像が存在し、かつ元の画像と異なる場合のみ削除
      if (uploadImagePath && uploadImagePath !== existingImageUrl && currentFile) {
        try {
          await deleteImage({
            imgUrl: uploadImagePath,
          });
          // 削除成功後、表示用の画像URLを元に戻すかクリアする
          setExistingImageUrl(menuData?.imgPath); // menuDataから元のURLを再設定
        } catch (deleteError) {
          console.error('Failed to delete the uploaded image after an error:', deleteError);
          // ここでユーザーに追加の指示を出すことも検討 (例: 手動での削除依頼)
        }
      }
      const errorDetails = handleError(error);
      toast.error(errorDetails.message);
    } finally {
      // isUploading は try ブロック内で適切に false に設定されるため、ここでの再設定は不要な場合がある
      // ただし、tryブロックの途中で予期せず終了する可能性を考慮すると残しておいても安全
      setIsUploading(false);
    }
  };

  // 確実に初期値がレンダリングされることを確認
  const renderTimeToMin =
    scheduleTime !== undefined && scheduleTime > 0 ? scheduleTime : menuData?.timeToMin || 0;
  const renderTargetType = targetType || menuData?.targetType || 'unselected';
  const renderTargetGender = targetGender || menuData?.targetGender || 'unselected';

  if (!salon || !menuData) {
    return <Loading />;
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ duration: 0.5 }}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 左カラム - 画像アップロード */}
          <div className="md:col-span-1">
            <Card className="border border-dashed h-full flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon size={18} className="text-gray-600" />
                  メニュー画像
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center">
                <div className="flex flex-col w-full gap-2">
                  <div className="w-full h-60 rounded-md overflow-hidden my-4">
                    {existingImageUrl ? (
                      <Image
                        src={existingImageUrl}
                        alt="メニュー画像"
                        width={1200}
                        height={1200}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <ImageIcon size={48} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <Label className="text-sm flex items-center gap-2 mb-2">
                    　新しく設定する画像を選択してください
                  </Label>
                  <ImageDrop
                    maxSizeMB={4}
                    onFileSelect={(file) => {
                      setCurrentFile(file);
                      setValue('imgFilePath', file.name, { shouldValidate: true });
                    }}
                    className="h-60 rounded-md"
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                {errors.imgFilePath && <ErrorMessage message={errors.imgFilePath.message} />}
                <p className="text-xs text-gray-500 mt-1">推奨サイズ: 1200 x 800px (最大4MB)</p>
              </CardFooter>
            </Card>
          </div>

          {/* 右カラム - 基本情報 */}
          <div className="md:col-span-2 space-y-5">
            {/* メニュー名 */}
            <ZodTextField
              name="name"
              label="メニュー名"
              icon={<Tag className="text-gray-500" />}
              placeholder="メニュー名を入力してください"
              register={register}
              errors={errors}
              required
              className="border-gray-200 focus-within:border-blue-500 transition-colors"
            />
            {/* 価格関連 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ZodTextField
                name="unitPrice"
                label="通常価格"
                icon={<DollarSign className="text-gray-500" />}
                type="number"
                placeholder="例: 5000"
                register={register}
                errors={errors}
                required
                className="border-gray-200 focus-within:border-blue-500 transition-colors"
              />

              <ZodTextField
                name="salePrice"
                label="セール価格"
                type="number"
                icon={<ShoppingBag className="text-gray-500" />}
                placeholder="例: 4000"
                register={register}
                errors={errors}
                className="border-gray-200 focus-within:border-blue-500 transition-colors"
              />
            </div>
            {/* 施術時間 */}
            <div className="max-w-md">
              <Label className="text-sm flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                施術時間 <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                value={renderTimeToMin.toString() || undefined}
                onValueChange={(value: string) => {
                  if (!value.trim()) return;
                  const numValue = Number(value);
                  setScheduleTime(numValue);
                  setValue('timeToMin', numValue, { shouldValidate: true });
                }}
              >
                <SelectTrigger className="border-gray-200 focus:border-blue-500 transition-colors">
                  <SelectValue placeholder="施術時間を選択" />
                </SelectTrigger>
                <SelectContent>
                  {getMinuteMultiples(5, 360).map((time) => (
                    <SelectItem key={time} value={time.toString()}>
                      {time}分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timeToMin && <ErrorMessage message={errors.timeToMin.message} />}
            </div>
            {/* 対象と性別 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 対象タイプ */}
              <div>
                <Label className="flex items-center gap-2 text-sm">
                  <Repeat size={16} className="text-gray-500" />
                  対象
                </Label>
                <span className="text-xs text-gray-500">
                  メニューを利用できる顧客属性を選択できます。
                </span>
                <Select
                  value={renderTargetType}
                  onValueChange={(value: Target) => {
                    if (!value.trim()) return;
                    const typedValue = value;
                    setTargetType(typedValue);
                    setValue('targetType', typedValue, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="対象を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unselected">全員</SelectItem>
                    <SelectItem value="first">初回</SelectItem>
                    <SelectItem value="repeat">リピート</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 性別 */}
              <div>
                <Label className="flex items-center gap-2 text-sm">
                  <Users size={16} className="text-gray-500" />
                  性別
                </Label>
                <span className="text-xs text-gray-500">メニュー対象の性別を選択してください</span>
                <Select
                  value={renderTargetGender}
                  onValueChange={(value: Gender) => {
                    if (!value.trim()) return;
                    const typedValue = value;
                    setTargetGender(typedValue);
                    setValue('targetGender', typedValue, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="性別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unselected" className="flex items-center gap-2">
                      男性・女性
                    </SelectItem>
                    <SelectItem value="male" className="flex items-center gap-2">
                      男性
                    </SelectItem>
                    <SelectItem value="female" className="flex items-center gap-2">
                      女性
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* タグセクション */}
            <div className="flex flex-col w-full gap-2">
              <Label className=" flex items-center gap-2 text-sm mb-2">
                <Tag size={16} className="text-gray-500" />
                タグ (最大5つ)
              </Label>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap mb-2">
                  {currentTags.map((tag, index) => (
                    <TagBadge key={index} text={tag} onRemove={() => removeTag(index)} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault(); // Enterキーによるフォーム送信を防止
                        addTag(e);
                      }
                    }}
                    placeholder="タグを入力（カンマ区切りで複数入力可）"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    disabled={currentTags.length >= 5}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={currentTags.length >= 5 || !tagInput.trim()}
                    className="text-sm"
                  >
                    追加
                  </Button>
                </div>
              </div>
              {errors.tags && <ErrorMessage message={errors.tags.message} />}
              <p className="text-xs text-gray-500 mt-1">
                例: カット, パーマ, トリートメント（最大5つ）
              </p>
            </div>
            {/* 支払い方法セクション */}
            <div className="flex flex-col w-full gap-2">
              <Label className="flex items-center gap-2 text-sm mb-3 mt-4">
                <CreditCard size={16} className="text-gray-500" />
                支払い方法
              </Label>
              {salon?.stripeConnectStatus === 'active' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm font-medium',
                      paymentMethod === 'cash'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                    onClick={(e) => handlePaymentMethod(e, 'cash')}
                  >
                    <Wallet size={18} />
                    店舗決済のみ
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm font-medium',
                      paymentMethod === 'credit_card'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                    onClick={(e) => handlePaymentMethod(e, 'credit_card')}
                  >
                    <CreditCard size={18} />
                    オンライン決済のみ
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm font-medium',
                      paymentMethod === 'all'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                    onClick={(e) => handlePaymentMethod(e, 'all')}
                  >
                    <ShoppingBag size={18} />
                    両方対応
                  </motion.button>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                  <p className="text-base font-medium text-blue-700 mb-2 flex items-center gap-2">
                    <Wallet size={18} />
                    現在は店舗決済のみ利用可能
                  </p>
                  <p className="text-sm text-gray-600">
                    オンライン決済を利用するには、
                    <Link
                      href="/dashboard/setting"
                      className="text-blue-600 underline px-1 font-medium"
                    >
                      決済設定
                    </Link>
                    を完了してください。
                  </p>
                </div>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 cursor-help">
                    <AlertCircle size={14} />
                    オンライン決済には手数料が発生します
                  </p>
                </TooltipTrigger>
                <TooltipContent className="bg-white p-3 shadow-lg border border-gray-200 text-gray-700 text-xs">
                  <p>オンライン決済手数料: 4% + 40円/件</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator className="my-8" />

        {/* 説明セクション */}
        <Label className="flex items-center gap-2 text-sm mb-2 mt-4">
          <Info size={16} className="text-gray-500" />
          メニュー説明 <span className="text-red-500 ml-1">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="メニューの詳細説明を入力してください"
          {...register('description')}
          onChange={(e) => setValue('description', e.target.value, { shouldValidate: true })}
          rows={8}
          className="border-gray-200 focus-visible:ring-blue-500 resize-none"
        />
        {errors.description && <ErrorMessage message={errors.description?.message} />}

        {/* 公開/非公開スイッチ */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md mb-6 mt-4">
          <div>
            <p className="text-sm font-bold">メニューを公開する</p>
            <p className="mt-1 text-xs text-gray-500">
              オフにすると、このメニューはお客様に表示されません
            </p>
          </div>
          <Switch
            id="isActive"
            checked={watch('isActive')}
            onCheckedChange={(checked) => setValue('isActive', checked)} // onCheckedChangeの引数を直接渡す
            className="data-[state=checked]:bg-green-600"
          />
        </div>

        {/* 送信ボタン */}
        <div className="flex justify-end mt-6">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/menu')}
              className="min-w-28"
            >
              戻る
            </Button>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting || isUploading ? (
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
                    メニューを更新
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
