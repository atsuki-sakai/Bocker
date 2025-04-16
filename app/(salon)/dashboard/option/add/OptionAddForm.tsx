'use client';
import { useSalon } from '@/hooks/useSalon';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MAX_TEXT_LENGTH } from '@/services/convex/constants';
import { useZodForm } from '@/hooks/useZodForm';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { Button } from '@/components/ui/button';
import { ZodTextField } from '@/components/common';
import { Label } from '@/components/ui/label';
import { Tag } from 'lucide-react';
import { TagBadge } from '@/components/common';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DollarSign, ShoppingBag, Clock, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { getMinuteMultiples } from '@/lib/schedule';
import { Loading } from '@/components/common';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const optionSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: 'オプションメニュー名は必須です' })
      .max(MAX_TEXT_LENGTH, {
        message: `オプションメニュー名は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      }), // オプションメニュー名
    unitPrice: z.preprocess(
      (val) => {
        // 空文字列の場合はnullを返す
        if (val === '' || val === null || val === undefined) return null;
        // 数値に変換できない場合もnullを返す
        const num = Number(val);
        return isNaN(num) ? null : num;
      },
      z
        .number()
        .min(1, { message: '価格は必須です' })
        .max(99999, { message: '価格は99999円以下で入力してください' })
        .refine((val) => val !== null && val !== undefined, { message: '価格は必須です' })
    ), // 価格
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
    ), // セール価格
    orderLimit: z
      .number()
      .min(0, { message: '注文制限は0以上で入力してください' })
      .max(6, { message: '注文制限は6以下で入力してください' })
      .optional(), // 注文制限
    timeToMin: z
      .string()
      .min(1, { message: '時間は必須です' })
      .max(5, { message: '時間は5文字で入力してください' })
      .refine((val) => val !== '', { message: '時間は必須です' }), // 時間(分)
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
    ), // タグ
    description: z
      .string()
      .min(1, { message: '説明は必須です' })
      .max(1000, { message: '説明は1000文字以内で入力してください' })
      .optional(), // 説明
    isActive: z.boolean({ message: '有効/無効フラグは必須です' }), // 有効/無効フラグ
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

export default function OptionAddForm() {
  const { salon } = useSalon();
  const router = useRouter();
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  const addOption = useMutation(api.option.mutation.create);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
    watch,
    reset,
  } = useZodForm(optionSchema);

  const isActive = watch('isActive');

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
    setValue('tags', updatedTags.join(',') as unknown as string[], { shouldValidate: true });
    setTagInput('');
  };

  const removeTag = (index: number) => {
    const newTags = [...currentTags];
    newTags.splice(index, 1);
    setCurrentTags(newTags);
    setValue('tags', newTags.join(',') as unknown as string[], { shouldValidate: true });
  };

  const onSubmit = async (data: z.infer<typeof optionSchema>) => {
    try {
      console.log('フォーム送信開始', data);
      if (!salon?._id) {
        toast.error('サロン情報が必要です');
        return;
      }

      // APIに送信するデータを作成
      const createData = {
        name: data.name,
        salonId: salon._id,
        timeToMin: Number(data.timeToMin),
        salePrice: data.salePrice ? Number(data.salePrice) : 0,
        unitPrice: Number(data.unitPrice), // 明示的に数値型に変換
        orderLimit: data.orderLimit,
        tags: data.tags,
        description: data.description,
        isActive: data.isActive,
      };
      console.log('APIに送信するデータ', createData);

      const result = await addOption(createData);
      console.log('API応答', result);
      toast.success('オプションメニューを登録しました');
      router.push('/dashboard/option');
    } catch (error) {
      console.error('エラー詳細:', error);
      toast.error('オプションメニュー登録に失敗しました: ' + String(error));
    }
  };

  useEffect(() => {
    if (salon?._id) {
      reset({
        name: '',
        unitPrice: null as unknown as number,
        salePrice: null as unknown as number,
        orderLimit: 1,
        timeToMin: '',
        tags: '' as unknown as string[],
        description: '',
        isActive: true,
      });
      setCurrentTags([]);
    }
  }, [salon?._id, reset]);

  if (!salon) {
    return <Loading />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="w-full">
            <ZodTextField
              register={register}
              name="name"
              label="オプションメニュー名"
              placeholder="オプションメニュー名"
              errors={errors}
              required
            />
          </div>
          <ZodTextField
            name="orderLimit"
            label="一回の最大注文数"
            type="number"
            placeholder="例: 1"
            register={register}
            errors={errors}
            className="border-gray-200 focus-within:border-blue-500 transition-colors"
          />
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="">
            <Label className="text-sm flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              施術時間 <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              onValueChange={(value) => {
                setValue('timeToMin', value, { shouldValidate: true });
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
            {errors.timeToMin && (
              <p className="text-red-500 text-sm mt-1">{errors.timeToMin.message}</p>
            )}
          </div>
        </div>

        {/* タグセクション */}
        <div>
          <Label className="flex items-center gap-2 text-sm mb-2">
            <Tag size={16} className="text-gray-500" />
            タグ (最大5つ)
          </Label>

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
              onKeyDown={(e) => e.key === 'Enter' && addTag(e)}
              placeholder="タグを入力（カンマ区切りで複数入力可）"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 transition-colors"
              disabled={currentTags.length >= 5}
            />
            <Button
              type="button"
              variant="default"
              onClick={addTag}
              disabled={currentTags.length >= 5 || !tagInput.trim()}
              className="text-sm"
            >
              追加
            </Button>
          </div>
        </div>
        {/* 説明セクション */}

        <Label className="flex items-center gap-2 text-sm mb-2 mt-4">
          <Info size={16} className="text-gray-500" />
          オプションメニュー説明 <span className="text-red-500 ml-1">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="オプションメニューの詳細説明を入力してください"
          {...register('description')}
          onChange={(e) => setValue('description', e.target.value, { shouldValidate: true })}
          rows={8}
          className="border-gray-200 focus-visible:ring-blue-500 resize-none"
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
        )}

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md mb-6 mt-4">
          <div>
            <p className="text-base font-medium">オプションメニューを公開する</p>
            <p className="text-sm text-gray-500">
              オフにすると、このオプションメニューはお客様に表示されません
            </p>
          </div>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={() => setValue('isActive', !isActive)}
            className="data-[state=checked]:bg-green-600"
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="default"
            type="submit"
            disabled={isSubmitting}
            onClick={() => {
              console.log('ボタンクリック');
              console.log('フォームバリデーション状態:', errors);
            }}
          >
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
                オプションを追加
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
