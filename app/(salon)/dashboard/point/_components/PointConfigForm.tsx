'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useZodForm } from '@/hooks/useZodForm';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { POINT_EXPIRATION_DAYS } from '@/lib/constants';
import { ZodTextField } from '@/components/common';
import { Coins, Percent, DollarSign, AlertCircle, Gift, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { toast } from 'sonner';

const pointConfigSchema = z.object({
  id: z.string().optional(),
  isFixedPoint: z.boolean().default(false),
  pointRate: z.number().min(0).max(1).optional(),
  fixedPoint: z.number().min(0).optional(),
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

export const PointConfigForm = () => {
  const [isFixedPoint, setIsFixedPoint] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors, isDirty },
  } = useZodForm(pointConfigSchema);

  // ポイント有効期限の選択時に値をセット
  const handleExpirationChange = (value: string) => {
    setValue('pointExpirationDays', parseInt(value), { shouldValidate: true });
  };

  // モード切替時の処理
  useEffect(() => {
    if (isFixedPoint) {
      setValue('pointRate', undefined);
    } else {
      setValue('fixedPoint', undefined);
    }
  }, [isFixedPoint, setValue]);

  const onSubmit = (data: z.infer<typeof pointConfigSchema>) => {
    console.log(data);
    // 保存完了時のフィードバックを追加
    toast.success('設定を保存しました');
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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
                    <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-800">
                      <span className="text-sm">
                        {isFixedPoint ? '固定ポイント' : 'ポイント付与率'}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Switch
                              id="point-type"
                              checked={isFixedPoint}
                              onCheckedChange={setIsFixedPoint}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {isFixedPoint
                                ? '料金に関わらず固定ポイントを付与'
                                : '料金に対する割合でポイントを付与'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {isFixedPoint ? (
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
                            step="0.1"
                            min="0"
                            max="100"
                            onChange={(e) => {
                              const percentValue = parseFloat(e.target.value);
                              if (!isNaN(percentValue)) {
                                // 入力値は％（例：5）だが、内部では小数（0.05）として保存
                                setValue('pointRate', percentValue / 100, {
                                  shouldValidate: true,
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
                      onValueChange={handleExpirationChange}
                      defaultValue={POINT_EXPIRATION_DAYS[0].value.toString()}
                    >
                      <SelectTrigger id="expiration" className="w-full">
                        <SelectValue placeholder="ポイント有効期限（日）" />
                      </SelectTrigger>
                      <SelectContent>
                        {POINT_EXPIRATION_DAYS.map((data) => (
                          <SelectItem key={data.value} value={data.value.toString()}>
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
                <CardDescription>現在の設定内容が適用されるとどのように動作するか</CardDescription>
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
                          {isFixedPoint ? '固定ポイント' : 'ポイント付与率'}
                        </span>
                      </p>
                      {isFixedPoint ? (
                        <p className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">固定ポイント:</span>
                          <span className="font-medium">{watch('fixedPoint') || 0} ポイント</span>
                        </p>
                      ) : (
                        <p className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            ポイント付与率:
                          </span>
                          <span className="font-medium">
                            {((watch('pointRate') || 0) * 100).toFixed(1)}%
                          </span>
                        </p>
                      )}
                      <p className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">
                          ポイント有効期限:
                        </span>
                        <span className="font-medium">
                          {POINT_EXPIRATION_DAYS.find(
                            (d) => d.value === watch('pointExpirationDays')
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
                            {isFixedPoint
                              ? watch('fixedPoint') || 0
                              : Math.floor((watch('pointRate') || 0) * 1000)}{' '}
                            ポイント
                          </p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-700 rounded shadow-sm">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            5,000円のサービス
                          </p>
                          <p className="text-lg font-bold">
                            {isFixedPoint
                              ? watch('fixedPoint') || 0
                              : Math.floor((watch('pointRate') || 0) * 5000)}{' '}
                            ポイント
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <motion.div
              className="flex justify-end mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button type="submit" className="px-8 gap-2" disabled={isSubmitting || !isDirty}>
                <Save className="h-4 w-4" />
                {isSubmitting ? '保存中...' : '設定を保存'}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </form>
  );
};
