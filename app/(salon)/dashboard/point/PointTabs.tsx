'use client';

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Gift } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Id } from '@/convex/_generated/dataModel';
import { useZodForm } from '@/hooks/useZodForm';
import ExclusionMenu from '../coupon/_components/ExclusionMenu';
import { z } from 'zod';
import { POINT_EXPIRATION_DAYS } from '@/lib/constants';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ZodTextField } from '@/components/common';
import { Save } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { handleError } from '@/lib/errors';
import { useSalon } from '@/hooks/useSalon';
import xor from 'lodash-es/xor';

const pointConfigSchema = z.object({
  id: z.string().optional(),
  isFixedPoint: z.boolean().default(false),
  pointRate: z.number().min(0).max(100).optional(),
  fixedPoint: z.number().min(0).max(10000).optional(),
  pointExpirationDays: z.number().min(1).optional().default(POINT_EXPIRATION_DAYS[0].value),
});

// アニメーション設定
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export default function PointTabs() {
  const { salon } = useSalon();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedMenuIds, setSelectedMenuIds] = useState<Id<'menu'>[]>([]);
  const [initialExclusionMenuIds, setInitialExclusionMenuIds] = useState<Id<'menu'>[]>([]);

  const getPointConfig = useQuery(api.point.config.get, salon ? { salonId: salon._id } : 'skip');
  const initialExclusionData = useQuery(
    api.point.exclusion_menu.list,
    getPointConfig?._id ? { salonId: salon!._id, pointConfigId: getPointConfig._id } : 'skip'
  );
  const upsertPointConfig = useMutation(api.point.config.upsert);
  const upsertExclusionMenu = useMutation(api.point.exclusion_menu.upsert);
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
    if (getPointConfig) {
      reset({
        pointRate: getPointConfig.pointRate,
        fixedPoint: getPointConfig.fixedPoint,
        pointExpirationDays: getPointConfig.pointExpirationDays ?? POINT_EXPIRATION_DAYS[0].value,
        isFixedPoint: getPointConfig.isFixedPoint ?? false,
      });
      if (initialExclusionData) {
        setInitialExclusionMenuIds(initialExclusionData);
        setSelectedMenuIds(initialExclusionData);
      }
    }
  }, [getPointConfig, initialExclusionData, reset]);

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
      const pointConfigId = await upsertPointConfig({ salonId: salon._id, ...data });
      await upsertExclusionMenu({
        salonId: salon._id,
        pointConfigId: pointConfigId as Id<'point_config'>,
        selectedMenuIds: selectedMenuIds,
      });
      toast.success('設定を保存しました');
      router.refresh();
    } catch (error) {
      const errorDetails = handleError(error);
      toast.error(errorDetails.message);
    }
  };

  if (!getPointConfig && !salon) {
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
            除外メニュー
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="basic" key="basic-tab">
            <motion.div variants={cardVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-primary" />
                      ポイント基本設定
                    </CardTitle>
                    <CardDescription>顧客へのポイント付与方法を設定します</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[350px] w-full p-6">
                      <div className="space-y-6">
                        <div className="flex flex-col space-y-2">
                          <Label htmlFor="point-type" className="text-sm font-medium">
                            ポイント付与タイプ
                          </Label>
                          <div
                            className={`flex items-center justify-between p-3 rounded-md ${
                              watchedIsFixedPoint
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            <span className="text-sm">
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

                        <AnimatePresence mode="wait">
                          {watchedIsFixedPoint ? (
                            <motion.div
                              key="fixed-point"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ZodTextField
                                register={register}
                                errors={errors}
                                name="fixedPoint"
                                label="固定ポイント"
                                type="number"
                                icon={<DollarSign size={16} />}
                                placeholder="例: 100"
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="point-rate"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
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
                                  value={
                                    watch('pointRate') !== undefined ? watch('pointRate') || 0 : ''
                                  }
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
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-2">
                          <Label htmlFor="expiration" className="text-sm font-medium">
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
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-7">
                <motion.div variants={cardVariants}>
                  <Card className="h-full shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        ポイント設定概要
                      </CardTitle>
                      <CardDescription>
                        現在の設定内容が適用されるとどのように動作するか
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
                          <h3 className="text-lg font-medium mb-2">設定サマリー</h3>
                          <div className="space-y-2 text-sm">
                            <p className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">
                                ポイント付与タイプ:
                              </span>
                              <span className="font-medium">
                                {watchedIsFixedPoint ? '固定ポイント' : 'ポイント付与率'}
                              </span>
                            </p>
                            {watchedIsFixedPoint ? (
                              <p className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400">
                                  固定ポイント:
                                </span>
                                <span className="font-medium">
                                  {watch('fixedPoint') || 0} ポイント
                                </span>
                              </p>
                            ) : (
                              <p className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400">
                                  ポイント付与率:
                                </span>
                                <span className="font-medium">{watch('pointRate') || 0}%</span>
                              </p>
                            )}
                            <p className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">
                                ポイント有効期限:
                              </span>
                              <span className="font-medium">
                                {POINT_EXPIRATION_DAYS.find(
                                  (d) => d.value === watchedExpirationDays
                                )?.label || POINT_EXPIRATION_DAYS[0].label}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
                          <h3 className="text-lg font-medium mb-2">ポイント計算例</h3>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-white dark:bg-slate-700 rounded shadow-sm">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  1,000円のサービス
                                </p>
                                <p className="text-lg font-bold">
                                  {watchedIsFixedPoint
                                    ? watch('fixedPoint') || 0
                                    : Math.floor((watch('pointRate') || 0) * 10)}{' '}
                                  ポイント
                                </p>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-700 rounded shadow-sm">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  5,000円のサービス
                                </p>
                                <p className="text-lg font-bold">
                                  {watchedIsFixedPoint
                                    ? watch('fixedPoint') || 0
                                    : Math.floor((watch('pointRate') || 0) * 50)}{' '}
                                  ポイント
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="exclusions" key="exclusions-tab">
            <ExclusionMenu
              selectedMenuIds={selectedMenuIds}
              setSelectedMenuIds={setSelectedMenuIds}
            />
          </TabsContent>
        </AnimatePresence>
      </Tabs>
      <motion.div
        className="flex justify-end mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          type="submit"
          className="px-8 gap-2"
          disabled={isSubmitting || (!isDirty && !isExclusionDirty)}
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? '保存中...' : '設定を保存'}
        </Button>
      </motion.div>
    </form>
  );
}
