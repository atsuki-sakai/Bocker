'use client';
import { useSalon } from '@/hooks/useSalon';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MAX_TEXT_LENGTH } from '@/services/convex/constants';
import { useZodForm } from '@/hooks/useZodForm';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { TagInput } from '@/components/common';
import { Button } from '@/components/ui/button';
import { ZodTextField } from '@/components/common';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useEffect, useState, memo } from 'react';
import { toast } from 'sonner';
import { DollarSign, ShoppingBag, Clock, Save, Loader2 } from 'lucide-react';
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
import { handleErrorToMsg } from '@/lib/error';

// 施術時間：5〜360分の5分刻みをキャッシュ
const MINUTE_OPTIONS = getMinuteMultiples(5, 360);

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
        if (val === '' || val === null || val === undefined) return null
        // 数値に変換できない場合もnullを返す
        const num = Number(val)
        return isNaN(num) ? null : num
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
        if (val === '' || val === null || val === undefined) return null
        // 数値に変換できない場合もnullを返す
        const num = Number(val)
        return isNaN(num) ? null : num
      },
      z
        .number()
        .max(99999, { message: 'セール価格は99999円以下で入力してください' })
        .nullable()
        .optional()
    ), // セール価格
    orderLimit: z.preprocess(
      (val) => {
        // 空文字列の場合はnullを返す
        if (val === '' || val === null || val === undefined) return null
        // 数値に変換できない場合は1を返す
        const num = Number(val)
        return isNaN(num) ? 1 : num
      },
      z
        .number()
        .min(0, { message: '注文制限は0以上で入力してください' })
        .max(6, { message: '注文制限は6以下で入力してください' })
        .optional()
    ), // 注文制限
    timeToMin: z
      .string()
      .min(1, { message: '時間は必須です' })
      .max(5, { message: '時間は5文字で入力してください' })
      .refine((val) => val !== '', { message: '時間は必須です' }), // 時間(分)
    ensureTimeToMin: z
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
        return false
      }
      return true
    },
    {
      message: 'セール価格は通常価格より低く設定してください',
      path: ['salePrice'], // エラーメッセージをsalePriceフィールドに表示
    }
  )
  .refine(
    (data) => {
      // 両方のフィールドが存在する場合のみ比較を行う
      if (data.timeToMin !== undefined && data.ensureTimeToMin !== undefined) {
        // 検証失敗条件: 確保する時間(ensureTimeToMin)が実際の稼働時間(timeToMin)より大きい場合
        if (data.ensureTimeToMin > data.timeToMin) {
          return false // 検証失敗
        }
      }
      // 上記以外のケース（比較しない場合、または ensureTimeToMin <= timeToMin の場合）は検証成功
      return true
    },
    {
      message: '確保する時間は実際の稼働時間以下に設定してください', // メッセージも少し調整するとより適切かもしれません
      path: ['ensureTimeToMin'], // エラーメッセージをensureTimeToMinフィールドに表示
    }
  )

function OptionAddForm() {
  const { salon } = useSalon();
  const router = useRouter();
  const [currentTags, setCurrentTags] = useState<string[]>([]);

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

  const onSubmit = async (data: z.infer<typeof optionSchema>) => {
    try {
      if (!salon?._id) {
        toast.error('サロン情報が必要です');
        return;
      }

      // APIに送信するデータを作成
      const createData = {
        name: data.name,
        salonId: salon._id,
        timeToMin: Number(data.timeToMin),
        ensureTimeToMin: Number(data.ensureTimeToMin),
        salePrice: data.salePrice ? Number(data.salePrice) : 0,
        unitPrice: Number(data.unitPrice), // 明示的に数値型に変換
        orderLimit: data.orderLimit,
        tags: data.tags,
        description: data.description,
        isActive: data.isActive,
      };
      await addOption(createData);
      toast.success('オプションメニューを登録しました');
      router.push('/dashboard/option');
    } catch (error) {
      toast.error(handleErrorToMsg(error));
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
        ensureTimeToMin: '',
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
            required
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 施術時間 */}
          <div className="w-full">
            <Label className="text-sm flex items-center gap-2 mb-2">
              <Clock size={16} className="text-gray-500" />
              実際にスタッフが稼働する施術時間 <span className="text-red-500 ml-1">*</span>
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
                {MINUTE_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time.toString()}>
                    {time}分
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-500">
              スタッフが手を動かして施術に集中している正味の作業時間を指します。
            </span>
            {errors.timeToMin && (
              <p className="text-red-500 text-sm mt-1">{errors.timeToMin.message}</p>
            )}
          </div>

          {/* 席を確保しておく時間 */}
          <div className="w-full">
            <Label className="text-sm flex items-center gap-2 mb-2">
              <Clock size={16} className="text-gray-500" />
              待ち時間なども含めたトータルの施術時間 <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              onValueChange={(value) => {
                setValue('ensureTimeToMin', value, { shouldValidate: true });
              }}
            >
              <SelectTrigger className="border-gray-200 focus:border-blue-500 transition-colors">
                <SelectValue placeholder="席を確保しておく時間を選択" />
              </SelectTrigger>
              <SelectContent>
                {MINUTE_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time.toString()}>
                    {time}分
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-500">
              施術席を専有する必要はあるものの、スタッフが別の作業に移れる待機時間を指します。
            </span>
            {errors.ensureTimeToMin && (
              <p className="text-red-500 text-sm mt-1">{errors.ensureTimeToMin.message}</p>
            )}
          </div>
        </div>

        {/* タグセクション */}
        <TagInput
          tags={currentTags}
          setTagsAction={setCurrentTags}
          error={errors.tags?.message}
          title="タグ"
          exampleText="例: 期間限定、セール、デートなど"
        />

        {/* 説明セクション */}

        <Label className="flex items-center gap-2 text-sm mt-4">
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
            <p className="text-sm font-bold">オプションメニューを公開する</p>
            <p className="text-xs text-gray-500">
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                追加中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                オプションを追加
              </>
            )}
          </Button>
        </div>
      </div>
      <Accordion type="multiple" className="mt-8 space-y-2">
        {/* 実際の稼働時間と確保する時間の違いについて */}
        <AccordionItem value="line-access-token">
          <AccordionTrigger>
            実際の稼働時間と待機時間を含めたトータルの施術時間の違いについて
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-slate-600">
            <ol className="list-decimal list-inside space-y-1 bg-slate-100 p-4 rounded-md">
              <li>
                <strong>実際の稼働時間 :</strong>
                スタッフが手を動かして施術に集中している正味の作業時間を指します。
                <br />
                例）パーマの薬剤塗布・カット・シャンプーなど。
              </li>
              <li>
                <strong>待機時間を含めたトータルの施術時間 :</strong>
                施術席を専有する必要はあるものの、スタッフが別の作業に移れる待機時間を指します。
                <br />
                例）薬剤の放置時間・髪の乾燥時間など。
              </li>
              <li>
                予約枠のアルゴリズムは <strong>実際の稼働時間</strong> を基準に空き時間を算出し、
                <strong>待機時間を含めたトータルの施術時間</strong>{' '}
                を待機時間として扱うことで、同じ席を効率よく回転させられます。
              </li>
            </ol>

            <p className="text-xs text-slate-500 space-y-1">
              * 両時間とも必須入力です。
              <br />* <strong>入力例：</strong> パーマ 90 分（実際の稼働 45 分 ＋ 確保 45
              分）の場合、スタッフは途中 45 分間ほかの顧客を担当できます。
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </form>
  );
}

export default memo(OptionAddForm);
