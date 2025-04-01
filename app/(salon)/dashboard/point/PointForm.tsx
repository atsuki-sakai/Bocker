'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useZodForm } from '@/hooks/useZodForm';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useSalon } from '@/hooks/useSalon';
import { DashboardSection } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { POINT_EXPIRATION_DAYS } from '@/lib/constants';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Plus, Delete, Coins, CalendarDays, Calendar } from 'lucide-react';

// Schema for a single point configuration
const pointConfigSchema = z.object({
  id: z.string().optional(),
  isFixedPoint: z.boolean().default(false),
  pointRate: z.number().min(0).max(1).optional(),
  fixedPoint: z.number().min(0).optional(),
  pointExpirationDays: z.number().min(1).optional(),
  menuIds: z.array(z.string()).optional(),
});

// Schema for the entire form with multiple configurations
const formSchema = z.object({
  configs: z.array(pointConfigSchema).min(1),
});

export default function PointForm() {
  const { salonId } = useSalon();
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);

  // Get available menus from the salon
  const menusPaginated = useQuery(
    api.menu.core.getBySalonId,
    salonId ? { salonId, paginationOpts: { numItems: 100, cursor: null } } : 'skip'
  );
  const menus = menusPaginated?.page || [];

  // Get existing point configs
  const existingConfigs = useQuery(api.point.config.get, salonId ? { salonId } : 'skip');

  // Get available menus for the selected config
  // FIXME: getByPointConfigAvailableMenusはmenuIdが必須で、特定のポイント設定に関連する全メニューを取得できない
  // 一時的にコメントアウトし、実装を修正する必要あり
  /*
  const availableMenus = usePaginatedQuery(
    api.point.point_available_menu.getByPointConfigAvailableMenus,
    selectedConfig
      ? {
          salonId,
          pointConfigId: selectedConfig as Id<'point_config'>,
          menuId: '0' as Id<'menu'>, // 一時的な修正: 実際のmenuIdに置き換える必要があります
        }
      : 'skip',
      {
        initialNumItems: 10
      }
  );

  // 関連するメニューの配列を変数として定義
  const menuAssociations = availableMenus?.page || [];
  */

  // 一時的に空の配列を使用
  const menuAssociations: { menuId: Id<'menu'> }[] = [];

  // Mutations
  const addConfig = useMutation(api.point.config.add);
  const updateConfig = useMutation(api.point.config.update);
  const addMenuToConfig = useMutation(api.point.point_available_menu.add);
  const removeMenuFromConfig = useMutation(api.point.point_available_menu.trash);

  // Initialize form with default values
  const form = useZodForm(formSchema, {
    defaultValues: {
      configs: [
        {
          isFixedPoint: false,
          pointRate: 0.01,
          fixedPoint: 0,
          pointExpirationDays: 30,
        },
      ],
    },
  });

  // Update form when existing configs are loaded
  // useEffect(() => {
  //   if (existingConfigs && existingConfigs.length > 0) {
  //     const formattedConfigs = existingConfigs.map((config) => ({
  //       id: config._id,
  //       isFixedPoint: config.isFixedPoint || false,
  //       pointRate: config.pointRate || 0.01,
  //       fixedPoint: config.fixedPoint || 0,
  //       pointExpirationDays: config.pointExpirationDays || 30,
  //       menuIds: [],
  //     }));

  //     form.reset({ configs: formattedConfigs });

  //     // Set first config as selected
  //     if (existingConfigs[0]?._id) {
  //       setSelectedConfig(existingConfigs[0]._id);
  //     }
  //   }
  // }, [existingConfigs, form]);

  // Update menuIds when menu associations are loaded
  useEffect(() => {
    if (menuAssociations && menuAssociations.length > 0 && selectedConfig) {
      const menuIds = menuAssociations.map((assoc) => assoc.menuId);

      // Find the index of selected config in form values
      const configIndex = form.getValues().configs.findIndex((c) => c.id === selectedConfig);

      if (configIndex !== -1) {
        // Update just the menuIds field of the selected config
        form.setValue(`configs.${configIndex}.menuIds`, menuIds);
      }
    }
  }, [menuAssociations, selectedConfig, form]);

  // // Handle form submission
  // const onSubmit = async (data: z.infer<typeof formSchema>) => {
  //   if (!salonId) return;

  //   try {
  //     // Process each config
  //     for (const config of data.configs) {
  //       let configId;

  //       if (config.id) {
  //         // Update existing config
  //         await updateConfig({
  //           salonId,
  //           _id: config.id as Id<'point_config'>,
  //           isFixedPoint: config.isFixedPoint,
  //           pointRate: config.isFixedPoint ? undefined : config.pointRate,
  //           fixedPoint: config.isFixedPoint ? config.fixedPoint : undefined,
  //           pointExpirationDays: config.pointExpirationDays,
  //         });
  //         configId = config.id;
  //       } else {
  //         // Add new config
  //         configId = await addConfig({
  //           salonId,
  //           isFixedPoint: config.isFixedPoint,
  //           pointRate: config.isFixedPoint ? undefined : config.pointRate,
  //           fixedPoint: config.isFixedPoint ? config.fixedPoint : undefined,
  //           pointExpirationDays: config.pointExpirationDays,
  //         });
  //       }

  //       // Handle menu associations if this is the selected config
  //       if (configId === selectedConfig && config.menuIds && config.menuIds.length > 0) {
  //         // Get current associations to compare
  //         const currentMenuIds = (menuAssociations || []).map((assoc) => assoc.menuId);

  //         // Add new associations
  //         for (const menuId of config.menuIds) {
  //           if (!currentMenuIds.includes(menuId)) {
  //             await addMenuToConfig({
  //               salonId,
  //               pointConfigId: configId as Id<'point_config'>,
  //               menuId: menuId as Id<'menu'>,
  //             });
  //           }
  //         }

  //         // Remove old associations
  //         for (const menuId of currentMenuIds) {
  //           if (!config.menuIds.includes(menuId)) {
  //             await removeMenuFromConfig({
  //               salonId,
  //               pointConfigId: configId as Id<'point_config'>,
  //               menuId,
  //             });
  //           }
  //         }
  //       }
  //     }

  //     toast({
  //       title: 'ポイント設定を保存しました',
  //       duration: 3000,
  //     });
  //   } catch (error) {
  //     console.error('Error saving point configurations:', error);
  //     toast({
  //       title: 'エラーが発生しました',
  //       description: 'ポイント設定の保存に失敗しました',
  //       variant: 'destructive',
  //       duration: 3000,
  //     });
  //   }
  // };

  // Remove a config
  const removePointConfig = (index: number) => {
    const currentConfigs = form.getValues().configs;
    if (currentConfigs.length <= 1) return;

    // If removing selected config, select first one
    if (currentConfigs[index].id === selectedConfig) {
      // Find next available config to select
      const nextConfig = currentConfigs.find((c, i) => i !== index && c.id);
      setSelectedConfig(nextConfig?.id || null);
    }

    form.setValue(
      'configs',
      currentConfigs.filter((_, i) => i !== index)
    );
  };

  // Select a config to manage its menu associations
  const selectConfig = (configId: string) => {
    setSelectedConfig(configId);
  };

  // Get the current selected config
  const getSelectedConfigIndex = () => {
    const configs = form.getValues().configs;
    return configs.findIndex((c) => c.id === selectedConfig);
  };

  // Find menu by ID
  const getMenuById = (menuId: string) => {
    return menus.find((menu) => menu._id === menuId);
  };

  return (
    <DashboardSection
      title="ポイント設定"
      backLink="/dashboard"
      backLinkTitle="ダッシュボードに戻る"
    >
      <Form {...form}>
        {/* <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8"> */}
        <form className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Point Configurations Column */}
            <div className="lg:col-span-5">
              <Card className="overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Coins className="h-5 w-5" />
                      ポイント基本設定
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[350px] w-full p-4">
                    {form.watch('configs').map((config, index) => (
                      <div key={index} className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`configs.${index}.isFixedPoint`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>固定ポイント</FormLabel>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {form.watch(`configs.${index}.isFixedPoint`) ? (
                          <FormField
                            control={form.control}
                            name={`configs.${index}.fixedPoint`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>固定ポイント (円/ポイント)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="1"
                                    min={0}
                                    max={100000}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name={`configs.${index}.pointRate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ポイント付与率 (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    max={30}
                                    {...field}
                                    value={field.value ? field.value * 100 : undefined}
                                    onChange={(e) =>
                                      field.onChange(parseFloat(e.target.value) / 100)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name={`configs.${index}.pointExpirationDays`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1">
                                <CalendarDays className="h-4 w-4" />
                                ポイント有効期限（日）
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                  <SelectTrigger>
                                    <SelectValue
                                      defaultValue={field.value}
                                      placeholder="ポイント有効期限（日）"
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {POINT_EXPIRATION_DAYS.map((item) => (
                                      <SelectItem key={item.value} value={item.value.toString()}>
                                        {item.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Menu Selection Column */}
            <div className="lg:col-span-7">
              <Card>
                <CardHeader className="bg-slate-50 dark:bg-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    ポイントの適用をしないメニューを選択する
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {selectedConfig ? (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        このポイント設定が適用されるメニューを選択してください
                      </p>

                      <div className="rounded-md border">
                        <FormField
                          control={form.control}
                          name={`configs.${getSelectedConfigIndex()}.menuIds`}
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                onValueChange={(value) => {
                                  const currentMenus = field.value || [];
                                  if (!currentMenus.includes(value)) {
                                    field.onChange([...currentMenus, value]);
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="メニューを選択" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {menus.map((menu) => (
                                    <SelectItem
                                      key={menu._id}
                                      value={menu._id}
                                      disabled={(field.value || []).includes(menu._id)}
                                    >
                                      {menu.name} - {menu.price?.toLocaleString()}円
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                      メニューを設定するポイント設定を選択してください
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="px-8" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </Form>
    </DashboardSection>
  );
}
