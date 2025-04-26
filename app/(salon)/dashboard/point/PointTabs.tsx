'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Coins, Gift } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Id } from '@/convex/_generated/dataModel';
import { useZodForm } from '@/hooks/useZodForm';
import { ExclusionMenu } from '@/components/common';
import { z } from 'zod';
import { POINT_EXPIRATION_DAYS } from '@/lib/constants';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/common';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle } from 'lucide-react';
import { DollarSign, Percent } from 'lucide-react';
import { ZodTextField } from '@/components/common';
import { Save } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { handleErrorToMsg } from '@/lib/error';
import { useSalon } from '@/hooks/useSalon';
import xor from 'lodash-es/xor';

const pointConfigSchema = z.object({
  id: z.string().optional(),
  isFixedPoint: z.boolean().default(false),
  pointRate: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null;
      // 数値に変換できない場合もnullを返す
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z
      .number()
      .max(100, { message: 'ポイント付与率は100%以下で入力してください' })
      .nullable()
      .optional()
  ),
  fixedPoint: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null;
      // 数値に変換できない場合もnullを返す
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z
      .number()
      .max(99999, { message: '固定ポイントは99999円以下で入力してください' })
      .nullable()
      .optional()
  ),
  pointExpirationDays: z.number().min(1).optional().default(POINT_EXPIRATION_DAYS[0].value),
});

export default function PointTabs() {
  const { salon } = useSalon();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedMenuIds, setSelectedMenuIds] = useState<Id<'menu'>[]>([]);
  const [initialExclusionMenuIds, setInitialExclusionMenuIds] = useState<Id<'menu'>[]>([]);

  const pointConfig = useQuery(
    api.point.config.query.findBySalonId,
    salon ? { salonId: salon._id } : 'skip'
  );
  const initialExclusionIds = useQuery(
    api.point.exclusion_menu.query.list,
    pointConfig?._id ? { salonId: salon!._id, pointConfigId: pointConfig._id } : 'skip'
  );
  const upsertExclusionMenu = useMutation(api.point.exclusion_menu.mutation.upsert);
  const upsertPointConfig = useMutation(api.point.config.mutation.upsert);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting, errors, isDirty },
  } = useZodForm(pointConfigSchema);

  const handleExpirationChange = (value: string) => {
    setValue('pointExpirationDays', parseInt(value), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  useEffect(() => {
    if (pointConfig) {
      reset({
        pointRate: pointConfig.pointRate,
        fixedPoint: pointConfig.fixedPoint,
        pointExpirationDays: pointConfig.pointExpirationDays ?? POINT_EXPIRATION_DAYS[0].value,
        isFixedPoint: pointConfig.isFixedPoint,
      });
      if (initialExclusionIds) {
        setInitialExclusionMenuIds(initialExclusionIds);
        setSelectedMenuIds(initialExclusionIds);
      }
    }
  }, [pointConfig, initialExclusionIds, reset]);

  const isExclusionDirty = useMemo(() => {
    return xor(initialExclusionMenuIds, selectedMenuIds).length > 0;
  }, [initialExclusionMenuIds, selectedMenuIds]);

  const onSubmit = async (data: z.infer<typeof pointConfigSchema>) => {
    console.log(data);
    try {
      if (!salon) {
        toast.error('サロンが見つかりません');
        return;
      }
      const pointConfigId = await upsertPointConfig({
        salonId: salon._id,
        pointRate: data.pointRate ?? undefined,
        fixedPoint: data.fixedPoint ?? undefined,
        pointExpirationDays: data.pointExpirationDays ?? undefined,
        isFixedPoint: data.isFixedPoint ?? undefined,
      });
      await upsertExclusionMenu({
        salonId: salon._id,
        pointConfigId: pointConfigId as Id<'point_config'>,
        selectedMenuIds: selectedMenuIds,
      });
      toast.success('設定を保存しました');
      router.refresh();
    } catch (error) {
      toast.error(handleErrorToMsg(error));
    }
  };

  if (!salon) {
    return <Loading />;
  }

  if (pointConfig === undefined || initialExclusionIds === undefined) {
    return <Loading />;
  }

  const watchedExpirationDays = watch('pointExpirationDays');
  const watchedIsFixedPoint = watch('isFixedPoint');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            基本設定
          </TabsTrigger>
          <TabsTrigger value="exclusions" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            ポイント対象外メニュー
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" key="basic-tab">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <h5 className="flex items-center font-bold gap-2">
                    <Coins className="h-5 w-5 text-blue-600" />
                    ポイント基本設定
                  </h5>
                  <p className="text-sm text-slate-500 py-2 mb-2">
                    サロンを利用した顧客へのポイント付与方法を設定します。
                    <br />
                    ポイントは
                    <span className="font-bold">1ポイント = 1円</span>
                    で付与されます。
                  </p>

                  <span className="text-xs border-yellow-500 border bg-yellow-50 text-yellow-700 rounded-md p-2">
                    ※ポイントを還元しない場合は0を設定してください。
                  </span>
                </div>

                <div className="space-y-6 p-3">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="point-type" className="text-xs">
                      ポイント付与タイプ
                    </Label>
                    <span className="text-xs text-slate-500">
                      利用額に対してポイント付与するか、固定ポイントを付与するかを選択します。
                    </span>
                    <div
                      className={`flex items-center justify-between p-3 rounded-md ${
                        watchedIsFixedPoint
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      <span className="text-sm font-bold">
                        {watchedIsFixedPoint ? '固定ポイント' : 'ポイント付与率'}
                      </span>

                      <Switch
                        id="point-type"
                        checked={watchedIsFixedPoint}
                        onCheckedChange={(checked) => {
                          setValue('isFixedPoint', checked, { shouldDirty: true });
                        }}
                        className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-green-600"
                      />
                    </div>
                  </div>

                  {watchedIsFixedPoint ? (
                    <ZodTextField
                      register={register}
                      errors={errors}
                      name="fixedPoint"
                      label="固定ポイント"
                      type="number"
                      icon={<DollarSign size={16} />}
                      placeholder="例: 100"
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="pointRate" className="flex items-center gap-2">
                        <Percent size={16} />
                        ポイント付与率 (%)
                      </Label>
                      <Input
                        id="pointRate"
                        type="number"
                        placeholder="例: 5 (5%)"
                        step="1"
                        min="0"
                        max="100"
                        value={watch('pointRate') !== undefined ? watch('pointRate') || 0 : ''}
                        onChange={(e) => {
                          const percentValue = parseFloat(e.target.value);
                          if (!isNaN(percentValue)) {
                            setValue('pointRate', percentValue, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          } else {
                            setValue('pointRate', undefined, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }
                        }}
                      />
                      {errors.pointRate && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.pointRate.message as string}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="expiration" className=" font-medium">
                      ポイント有効期限
                    </Label>
                    <Select
                      value={
                        watchedExpirationDays !== undefined
                          ? String(watchedExpirationDays)
                          : String(POINT_EXPIRATION_DAYS[0].value)
                      }
                      onValueChange={handleExpirationChange}
                    >
                      <SelectTrigger id="expiration" className="w-full">
                        <SelectValue placeholder="ポイント有効期限（日）" />
                      </SelectTrigger>
                      <SelectContent>
                        {POINT_EXPIRATION_DAYS.map((data) => (
                          <SelectItem key={data.value} value={String(data.value)}>
                            {data.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-slate-500">
                      顧客のポイントはサロンを利用した最終日から
                      {POINT_EXPIRATION_DAYS.find((d) => d.value === watchedExpirationDays)?.label}
                      後に失効します。
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div>
                <div className="h-full shadow-md hover:shadow-lg transition-shadow duration-300 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 p-3">
                    <h5 className="flex items-center font-bold gap-2">
                      <Gift className="h-5 w-5 text-blue-500" />
                      ポイント設定概要
                    </h5>
                    <div className="text-sm text-slate-500 mt-2">
                      現在の設定内容が適用されるとどのように適応されるのかを確認できます。
                      <br />
                      <p className="text-xs font-bold mt-2">1ポイント = 1円</p>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <p className="flex justify-between pt-2">
                          <span className="text-sm dark:text-slate-400">ポイント付与タイプ:</span>
                          <span className="font-medium text-sm">
                            {watchedIsFixedPoint ? '固定ポイント' : 'ポイント付与率'}
                          </span>
                        </p>
                        {watchedIsFixedPoint ? (
                          <p className="flex justify-between items-end text-sm font-bold">
                            <span className="text-xs dark:text-slate-400">固定ポイント:</span>
                            <span className="font-medium">{watch('fixedPoint') || 0} ポイント</span>
                          </p>
                        ) : (
                          <p className="flex justify-between items-end text-sm font-bold">
                            <span className="text-slate-500 dark:text-slate-400">
                              ポイント付与率:
                            </span>
                            <span className="text-base font-bold tracking-wide">
                              {watch('pointRate') || 0}%
                            </span>
                          </p>
                        )}
                        <p className="flex justify-between items-end text-sm font-bold">
                          <span className="text-slate-500 dark:text-slate-400">
                            ポイント有効期限:
                          </span>
                          <span className="text-base font-bold tracking-wide">
                            {POINT_EXPIRATION_DAYS.find((d) => d.value === watchedExpirationDays)
                              ?.label || POINT_EXPIRATION_DAYS[0].label}
                          </span>
                        </p>
                        <p className="text-sm pt-4 w-full text-slate-700 ">
                          本日付与された場合、有効期限は{' '}
                          <span className="font-bold">
                            {new Date(
                              Date.now() + watchedExpirationDays * 24 * 60 * 60 * 1000
                            ).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </span>
                          です。
                        </p>
                      </div>

                      <div className="space-y-2 py-3">
                        <div className=" bg-white dark:bg-slate-700 rounded shadow-sm">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            1,000円の決済に対して
                          </p>
                          <p className="text-lg font-bold">
                            {watchedIsFixedPoint
                              ? watch('fixedPoint') || 0
                              : Math.floor((watch('pointRate') || 0) * 10)}{' '}
                            <span className="text-xs">ポイント付与</span>
                          </p>
                        </div>
                        <div className=" bg-white dark:bg-slate-700 rounded shadow-sm">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            5,000円の決済に対して
                          </p>
                          <p className="text-lg font-bold">
                            {watchedIsFixedPoint
                              ? watch('fixedPoint') || 0
                              : Math.floor((watch('pointRate') || 0) * 50)}{' '}
                            <span className="text-xs">ポイント付与</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exclusions" key="exclusions-tab">
          <ExclusionMenu
            title="購入されてもポイントを付与しないメニュー"
            selectedMenuIds={selectedMenuIds}
            setSelectedMenuIdsAction={setSelectedMenuIds}
          />
        </TabsContent>
      </Tabs>
      <div className="flex justify-end mt-4">
        <Button
          type="submit"
          className="px-8 gap-2"
          disabled={isSubmitting || (!isDirty && !isExclusionDirty)}
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
              設定を保存
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
