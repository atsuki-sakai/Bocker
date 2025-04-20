'use client';

import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import { useSalon } from '@/hooks/useSalon';
import { Loader2, AlertCircle } from 'lucide-react';
import { Loading } from '@/components/common';
import { ZodTextField } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMutation } from 'convex/react';
import { Tag } from 'lucide-react';
import TagBadge from '@/components/common/TagBadge';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { api } from '@/convex/_generated/api';
import { handleError } from '@/lib/error';
import { useRouter } from 'next/navigation';
import { GENDER_VALUES, Gender } from '@/services/convex/shared/types/common';
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
const schemaCustomer = z.object({
  lineId: z.string().max(100, { message: 'LINE IDは100文字以内で入力してください' }).optional(), // LINE ID
  lineUserName: z
    .string()
    .max(100, { message: 'LINEユーザー名は100文字以内で入力してください' })
    .optional(), // LINEユーザー名
  phone: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() === '') {
        return undefined;
      }
      return val;
    },
    z
      .string()
      .max(100, { message: '電話番号は100文字以内で入力してください' })
      .optional()
      .refine((value) => value === undefined || /^[0-9]+$/.test(value), {
        message: '電話番号は数字で入力してください',
      })
  ), // 電話番号
  email: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() === '') {
        return undefined;
      }
      return val;
    },
    z
      .string()
      .max(100, { message: 'メールアドレスは100文字以内で入力してください' })
      .optional()
      .refine(
        (value) =>
          value === undefined || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
        { message: 'メールアドレスの形式が正しくありません' }
      ) // メールアドレス
  ),
  firstName: z.string().max(100, { message: '名前は100文字以内で入力してください' }).optional(), // 名前
  lastName: z.string().max(100, { message: '苗字は100文字以内で入力してください' }).optional(), // 苗字
  useCount: z.number().max(9999, { message: '利用回数は9999回以内で入力してください' }).optional(), // 利用回数
  lastReservationDate_unix: z
    .number()
    .max(9999999999, { message: '最終予約日は9999999999以下で入力してください' })
    .optional(), // 最終予約日
  tags: z.array(z.string()).max(5, { message: 'タグは5つ以内で入力してください' }).optional(), // タグ
  age: z.number().max(9999, { message: '年齢は9999以下で入力してください' }).optional(), // 年齢
  birthday: z.string().max(100, { message: '誕生日は100文字以内で入力してください' }).optional(), // 誕生日
  gender: z.enum(GENDER_VALUES).optional(), // 性別
  notes: z.string().max(1000, { message: 'メモは1000文字以内で入力してください' }).optional(), // メモ
  totalPoints: z
    .number()
    .max(9999999999, { message: 'ポイントは9999999999以下で入力してください' })
    .optional(), // ポイント
});

export default function CustomerAddForm() {
  const { salon } = useSalon();
  const router = useRouter();
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  const createCompleteFields = useMutation(api.customer.core.mutation.createCompleteFields);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty },
    watch,
  } = useZodForm(schemaCustomer);

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
    setValue('tags', updatedTags, { shouldValidate: true });
    setTagInput('');
  };

  const removeTag = (index: number) => {
    const newTags = [...currentTags];
    newTags.splice(index, 1);
    setCurrentTags(newTags);
    setValue('tags', newTags, { shouldValidate: true });
  };

  const onSubmit = async (data: z.infer<typeof schemaCustomer>) => {
    console.log(data);
    if (!salon) return;
    try {
      const body = {
        ...data,
        salonId: salon._id,
        tags: currentTags,
        lastTransactionDate_unix: new Date().getTime() / 1000,
      };

      await createCompleteFields(body);
      toast.success('顧客を追加しました');
      router.push('/dashboard/customer');
    } catch (error) {
      const errorDetail = handleError(error);
      console.log(errorDetail);
      toast.error(errorDetail.message);
    }
  };

  if (!salon) {
    return <Loading />;
  }

  console.log(errors);
  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <ZodTextField label="名前" name="name" register={register} errors={errors} />
          <ZodTextField label="メールアドレス" name="email" register={register} errors={errors} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ZodTextField label="苗字" name="lastName" register={register} errors={errors} />
          <ZodTextField label="名前" name="firstName" register={register} errors={errors} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>性別</Label>
            <Select
              value={watch('gender') ?? 'unselect'}
              onValueChange={(value) => {
                setValue('gender', value as Gender);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="性別を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">男性</SelectItem>
                <SelectItem value="female">女性</SelectItem>
                <SelectItem value="unselect">未選択</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ZodTextField label="電話番号" name="phone" register={register} errors={errors} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ZodTextField label="LINE ID" name="lineId" register={register} errors={errors} />
          <ZodTextField
            label="LINEユーザー名"
            name="lineUserName"
            register={register}
            errors={errors}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ZodTextField label="年齢" type="number" name="age" register={register} errors={errors} />
          <ZodTextField
            label="誕生日"
            type="date"
            name="birthday"
            register={register}
            errors={errors}
          />
        </div>

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

          {errors.tags && (
            <motion.p
              className="text-red-500 text-sm mt-1 flex items-center gap-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AlertCircle size={14} /> {errors.tags.message ?? 'NULL'}
            </motion.p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            例: カット, パーマ, トリートメント（最大5つ）
          </p>
        </div>
        <Textarea
          placeholder="メモを入力"
          {...register('notes')}
          className="resize-none"
          rows={5}
        />

        <div className="grid grid-cols-2 gap-4">
          <ZodTextField
            label="ポイント"
            type="number"
            name="totalPoints"
            register={register}
            errors={errors}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '顧客を追加'}
          </Button>
        </div>
      </form>
    </div>
  );
}
