'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { useZodForm } from '@/hooks/useZodForm';
import { z } from 'zod';
import { Loading, ZodTextField } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { handleError } from '@/lib/error';
import { useSalon } from '@/hooks/useSalon';
import { getMinuteMultiples } from '@/lib/schedule'; // getMinuteMultiplesを追加
import { Tag, DollarSign, ShoppingBag, Boxes, Info, AlertCircle, Clock, Save } from 'lucide-react'; // Clockを追加
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'; // Select関連を追加
import { SALON_SCHEDULE_INTERVAL_MINUTES } from '@/lib/constants'; // 定数を追加
import { Badge } from '@/components/ui/badge'; // Badgeを追加

// バリデーションスキーマ
const optionSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: 'オプション名は必須です' })
      .max(100, { message: 'オプション名は100文字以内で入力してください' }),
    unitPrice: z
      .number()
      .min(1, { message: '単価は必須です' })
      .max(99999, { message: '単価は99999円以下で入力してください' })
      .nullable()
      .optional()
      .refine((val): val is number => val !== null && val !== undefined, {
        message: '単価は必須です',
      }), // refineを更新
    salePrice: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
      },
      z
        .number()
        .max(99999, { message: 'セール価格は99999円以下で入力してください' })
        .nullable()
        .optional()
    ),
    orderLimit: z
      .number()
      .min(1, { message: '最大注文数は1以上で入力してください' })
      .max(99, { message: '最大注文数は99個以下で入力してください' })
      .nullable()
      .refine((val): val is number => val !== null && val !== undefined, {
        message: '最大注文数は必須です',
      }), // refineを更新
    timeToMin: z // timeToMinのバリデーションを追加
      .string()
      .min(1, { message: '時間は必須です' })
      .max(5, { message: '時間は5文字で入力してください' })
      .refine((val) => val !== '', { message: '時間は必須です' })
      .optional(),
    tags: z.preprocess(
      // tagsのバリデーションを追加
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
    description: z
      .string()
      .max(1000, { message: '説明は1000文字以内で入力してください' })
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // salePriceが存在し、unitPriceも存在する場合のみ比較
      if (
        data.salePrice !== null &&
        data.salePrice !== undefined &&
        data.unitPrice !== null &&
        data.unitPrice !== undefined &&
        data.salePrice >= data.unitPrice
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'セール価格は通常価格より低く設定してください',
      path: ['salePrice'],
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

// タグバッジコンポーネントを追加
const TagBadge = ({ text, onRemove }: { text: string; onRemove: () => void }) => (
  <Badge variant="secondary" className="px-3 py-1 mr-2 mb-2 flex items-center gap-1 text-sm">
    {text}
    <button onClick={onRemove} className="ml-1 text-gray-500 hover:text-gray-700">
      ×
    </button>
  </Badge>
);

export default function OptionEditForm() {
  const router = useRouter();
  const params = useParams();
  const optionId = params.option_id as Id<'salon_option'>;
  const { salon } = useSalon();
  const optionData = useQuery(api.option.core.get, { salonOptionId: optionId });
  const updateOption = useMutation(api.option.core.update);

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useZodForm(optionSchema);
  const isActive = watch('isActive');
  const watchTimeToMin = watch('timeToMin');

  // データ取得後にフォームを初期化
  useEffect(() => {
    if (optionData && !isInitialized) {
      const timeToMinValueString = optionData.timeToMin?.toString() || undefined;
      const initialTags = optionData.tags || [];

      // Stateの更新
      setCurrentTags(initialTags);

      // setValueで各フィールドの初期値を設定
      setValue('name', optionData.name || '');
      setValue('unitPrice', optionData.unitPrice ?? 1);
      setValue('salePrice', optionData.salePrice ?? undefined);
      setValue('orderLimit', optionData.orderLimit ?? 1);
      setValue('timeToMin', timeToMinValueString);
      setValue('tags', initialTags);
      setValue('description', optionData.description || '');
      setValue('isActive', optionData.isActive ?? true);

      setIsInitialized(true);
    }
  }, [optionData, setValue, isInitialized]);

  // タグの操作ロジックを追加
  const addTag = (
    e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    const newTags = [...currentTags];
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
    setValue('tags', updatedTags, { shouldValidate: true });
    setTagInput('');
  };

  const removeTag = (index: number) => {
    const newTags = [...currentTags];
    newTags.splice(index, 1);
    setCurrentTags(newTags);
    setValue('tags', newTags, { shouldValidate: true });
  };

  // フォーム送信処理
  const onSubmit = async (data: z.infer<typeof optionSchema>) => {
    try {
      if (!salon?._id || !optionId) {
        toast.error('サロン情報またはオプション情報が見つかりません');
        return;
      }

      // APIに送信するデータを作成
      // zod schemaで型変換後のデータを使用
      const updateData: Partial<Doc<'salon_option'>> & { salonOptionId: Id<'salon_option'> } = {
        name: data.name,
        unitPrice: data.unitPrice,
        orderLimit: data.orderLimit,
        timeToMin: data.timeToMin ? Number(data.timeToMin) : undefined, // 文字列を数値 or undefined に変換
        tags: data.tags, // zodで変換された配列 or undefined
        description: data.description,
        isActive: data.isActive,
        salonOptionId: optionId, // idは必須
      };

      // salePriceの処理
      if (
        data.salePrice === null ||
        data.salePrice === undefined ||
        (typeof data.salePrice === 'string' && data.salePrice === '') || // Zodのpreprocessで数値変換されるが念のため残す
        isNaN(Number(data.salePrice))
      ) {
        updateData.salePrice = 0;
      } else {
        updateData.salePrice = Number(data.salePrice);
      }
      // updateOptionの型定義に合わせて不要な undefined プロパティを除外
      const finalUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([, value]) => value !== undefined)
      ) as Partial<Doc<'salon_option'>> & { salonOptionId: Id<'salon_option'> };

      await updateOption(finalUpdateData);

      toast.success('オプションを更新しました');
      router.push('/dashboard/option');
    } catch (error) {
      const errorDetails = handleError(error);
      toast.error(errorDetails.message);
    }
  };

  if (!salon || !optionData) {
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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">オプション基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* オプション名 */}
            <ZodTextField
              name="name"
              label="オプション名"
              icon={<Tag className="text-gray-500" />}
              placeholder="オプション名を入力してください"
              register={register}
              errors={errors}
              required
              className="border-gray-200 focus-within:border-blue-500 transition-colors"
            />

            {/* 価格関連 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ZodTextField
                name="unitPrice"
                label="単価"
                icon={<DollarSign className="text-gray-500" />}
                type="number"
                placeholder="例: 1000"
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
                placeholder="例: 800"
                register={register}
                errors={errors}
                className="border-gray-200 focus-within:border-blue-500 transition-colors"
              />
            </div>

            {/* 施術時間 - Selectコンポーネントを更新 */}
            <div className="max-w-md">
              <Label className="text-sm flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                施術時間（任意）
              </Label>
              <Select
                value={watchTimeToMin?.toString() ?? ''}
                onValueChange={(value) => {
                  if (!value.trim()) return;
                  const numValue = Number(value);
                  setValue('timeToMin', value, { shouldValidate: true });
                  console.log('施術時間を選択:', { value, numValue }); // デバッグ用
                }}
              >
                <SelectTrigger className="border-gray-200 focus:border-blue-500 transition-colors">
                  <SelectValue placeholder="施術時間を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">選択しない</SelectItem>
                  {getMinuteMultiples(SALON_SCHEDULE_INTERVAL_MINUTES[0], 360).map((time) => (
                    <SelectItem key={time} value={time.toString()}>
                      {time}分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timeToMin && <ErrorMessage message={errors.timeToMin.message} />}
            </div>

            {/* 最大注文数 */}
            <ZodTextField
              name="orderLimit"
              label="最大注文数"
              icon={<Boxes className="text-gray-500" />}
              type="number"
              placeholder="例: 5"
              register={register}
              errors={errors}
              required
              className="border-gray-200 focus-within:border-blue-500 transition-colors"
            />

            {/* タグセクションを追加 */}
            <div className="flex flex-col w-full gap-2">
              <Label className=" flex items-center gap-2 text-sm mb-2">
                <Tag size={16} className="text-gray-500" />
                タグ (最大5つ、任意)
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
                        e.preventDefault();
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
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* 説明セクション */}
        <Label className="flex items-center gap-2 text-sm mb-2 mt-4">
          <Info size={16} className="text-gray-500" />
          オプション説明
        </Label>
        <Textarea
          id="description"
          placeholder="オプションの詳細説明を入力してください（任意）"
          {...register('description')}
          onChange={(e) => setValue('description', e.target.value, { shouldValidate: true })}
          rows={5}
          className="border-gray-200 focus-visible:ring-blue-500 resize-none"
        />
        {errors.description && <ErrorMessage message={errors.description?.message} />}

        {/* 公開/非公開スイッチ */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md mb-6 mt-6">
          <div>
            <p className="text-base font-medium">オプションを公開する</p>
            <p className="text-sm text-gray-500">
              オフにすると、このオプションはお客様に表示されません
            </p>
          </div>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) => setValue('isActive', checked)}
            className="data-[state=checked]:bg-green-600"
          />
        </div>

        {/* 送信ボタン */}
        <div className="flex justify-end mt-6">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/option')}
              className="min-w-28"
            >
              戻る
            </Button>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
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
                    オプションを更新
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
