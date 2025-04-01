'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { UseFormRegister, FieldErrors, Controller } from 'react-hook-form';
import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { handleError } from '@/lib/errors';
import { Loading } from '@/components/common';
import { toast } from 'sonner';
// コンポーネントのインポート
import { DashboardSection } from '@/components/common';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  CalendarIcon,
  Sparkles,
  Check,
  Percent,
  PiggyBank,
  Tag,
  Calendar as CalendarFull,
  Hash,
  AlertCircle,
  Menu,
  Plus,
  Gift,
  Ticket,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MAX_COUPON_UID_LENGTH } from '@/lib/constants';
// スキーマとタイプ定義

const couponSchema = z.object({
  name: z.string().min(1, 'クーポン名を入力してください'),
  couponUid: z
    .string()
    .min(1, '1文字以上の値を入力してください')
    .max(MAX_COUPON_UID_LENGTH, `${MAX_COUPON_UID_LENGTH}文字以内で入力してください`),
  discountType: z.enum(['percentage', 'fixed']),
  percentageDiscountValue: z
    .number()
    .min(0, '0以上の値を入力してください')
    .max(100, '100以下の値を入力してください'),
  fixedDiscountValue: z.number().min(0, '0以上の値を入力してください'),
  isActive: z.boolean(),
  startDate: z.date(),
  endDate: z.date().refine(
    (date) => {
      // 日付の比較時に時刻部分を無視して日付のみで比較
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);

      return compareDate >= today;
    },
    { message: '終了日は現在以降の日付を選択してください' }
  ),
  maxUseCount: z.number().min(0, '0以上の値を入力してください'),
  numberOfUse: z.number().min(0, '0以上の値を入力してください'),
  selectedMenus: z.array(z.number()).optional(),
});

// ダミーデータ
const dammyMenu = [
  { id: 1, name: 'メニュー1', price: 1000, isActive: true },
  { id: 2, name: 'メニュー2', price: 2000, isActive: true },
  { id: 3, name: 'メニュー3', price: 3000, isActive: true },
  { id: 4, name: 'メニュー4', price: 4000, isActive: true },
  { id: 5, name: 'メニュー5', price: 5000, isActive: true },
  { id: 6, name: 'メニュー6', price: 6000, isActive: true },
];

// アニメーション定義
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// ページトランジション用アニメーション
const pageAnimation = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ステッパーアニメーション
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// ZodTextField コンポーネント - 再利用可能なフォームフィールド
function ZodTextField({
  register,
  errors,
  name,
  label,
  type = 'text',
  icon,
  placeholder,
  className,
}: {
  register: UseFormRegister<z.infer<typeof couponSchema>>;
  errors: FieldErrors<z.infer<typeof couponSchema>>;
  name: keyof z.infer<typeof couponSchema>;
  label: string;
  type?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Label htmlFor={name} className="flex items-center gap-2 text-gray-700">
        {icon}
        {label}
      </Label>
      <div className="relative">
        <Input
          id={name}
          type={type}
          {...register(name, {
            valueAsNumber: type === 'number',
          })}
          placeholder={placeholder}
          className={`${errors[name] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
      </div>
      <AnimatePresence>
        {errors[name] && (
          <motion.p
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fadeIn}
            className="mt-1 text-sm text-red-500 flex items-center gap-1"
          >
            <AlertCircle size={14} />
            {errors[name]?.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// クーポンプレビューコンポーネント
function CouponPreview({ data }: { data: z.infer<typeof couponSchema> }) {
  const formatDate = (date: Date | undefined) => {
    if (!date) return '未設定';
    try {
      return format(date, 'yyyy/MM/dd', { locale: ja });
    } catch {
      return '無効な日付';
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="w-full">
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-md overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-indigo-600 to-violet-600">
          <CardTitle className="text-white flex items-center gap-2">
            <Gift size={18} />
            {data.name || 'クーポン名'}
          </CardTitle>
          <CardDescription className="text-indigo-100">
            {data.isActive ? '有効なクーポン' : '無効なクーポン'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="text-center">
              <Badge variant="outline" className="px-3 py-1 text-lg font-bold bg-white">
                {data.discountType === 'percentage'
                  ? `${data.percentageDiscountValue || 0}% OFF`
                  : `¥${data.fixedDiscountValue || 0} OFF`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
              <div className="flex items-center gap-1 text-gray-600">
                <CalendarFull size={14} />
                <span>開始日:</span>
              </div>
              <div className="text-right">{formatDate(data.startDate)}</div>

              <div className="flex items-center gap-1 text-gray-600">
                <CalendarFull size={14} />
                <span>終了日:</span>
              </div>
              <div className="text-right">{formatDate(data.endDate)}</div>

              <div className="flex items-center gap-1 text-gray-600">
                <Hash size={14} />
                <span>利用回数:</span>
              </div>
              <div className="text-right">
                {data.numberOfUse || 0} / {data.maxUseCount || '無制限'}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 pt-2 pb-2 flex justify-between">
          <div className="text-xs text-gray-500">
            対象メニュー: {data.selectedMenus?.length || 0}件
          </div>
          <Badge variant={data.isActive ? 'default' : 'destructive'} className="h-6">
            {data.isActive ? '有効' : '無効'}
          </Badge>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// メインのフォームコンポーネント
function CouponForm() {
  const router = useRouter();
  // 状態管理
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { salon } = useSalon();
  const addCoupon = useMutation(api.coupon.core.add);
  const addCouponConfig = useMutation(api.coupon.config.add);
  // フォーム管理
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useZodForm(couponSchema);

  // フォームの値を監視
  const formValues = watch();
  const discountType = watch('discountType');

  // フォーム送信ハンドラー
  const onSubmit = async (data: z.infer<typeof couponSchema>) => {
    // 選択されたメニューIDsを追加
    const submitData = {
      ...data,
      selectedMenus: selectedMenuIds,
    };

    console.log('送信データ:', submitData);
    setIsSubmitting(true);

    try {
      // 日付をUNIXタイムスタンプに変換（ミリ秒）
      const startDate_unix = data.startDate.getTime();
      const endDate_unix = data.endDate.getTime();

      // 1. クーポンを作成
      const couponId = await addCoupon({
        salonId: salon!._id,
        couponUid: data.couponUid,
        name: data.name,
        discountType: data.discountType,
        percentageDiscountValue: data.percentageDiscountValue,
        fixedDiscountValue: data.fixedDiscountValue,
        isActive: data.isActive,
      });

      // 2. クーポン設定を作成
      await addCouponConfig({
        salonId: salon!._id,
        couponId,
        startDate_unix,
        endDate_unix,
        maxUseCount: data.maxUseCount,
        numberOfUse: data.numberOfUse,
      });

      // 注意: 現在のデモ実装では仮のメニューIDを使用しているため、
      // 実際の本番環境では、以下のコードは実際のメニューIDを使用するように修正が必要です

      // 本来は実際のメニューIDを使って以下のようなコードになります：

      // for (const menuId of selectedMenuIds) {
      //   // ここで実際のメニューIDを使用
      //   await addCouponAvailableMenu({
      //     salonId: salon!._id,
      //     couponId,
      //     menuId: realMenuId, // Convexで管理されている実際のメニューID
      //   });
      // }

      toast.success('クーポンを作成しました');
      router.push(`/dashboard/coupon`);
    } catch (error) {
      const { message } = handleError(error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 初期データの設定
  useEffect(() => {
    // 新規作成用の初期値設定
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(today.getMonth() + 1);

    reset({
      name: '',
      couponUid: '',
      discountType: 'percentage',
      percentageDiscountValue: 10,
      fixedDiscountValue: 1000,
      isActive: true,
      startDate: today,
      endDate: oneMonthLater,
      maxUseCount: 100,
      numberOfUse: 0,
    });
  }, [reset]);

  // メニュー選択の切り替え
  const toggleMenu = (menuId: number) => {
    setSelectedMenuIds((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
    );
  };

  // メニューの全選択・全解除
  const toggleAllMenus = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedMenuIds.length === dammyMenu.length) {
      setSelectedMenuIds([]);
    } else {
      setSelectedMenuIds(dammyMenu.map((menu) => menu.id));
    }
  };

  // 選択されているメニュー名の表示用
  const selectedMenusText = useMemo(() => {
    if (selectedMenuIds.length === 0) return '選択なし';
    if (selectedMenuIds.length === dammyMenu.length) return 'すべて選択';

    return `${selectedMenuIds.length}件選択`;
  }, [selectedMenuIds]);

  // 表示用のプレビューデータ
  const previewData = useMemo(
    () => ({
      ...formValues,
      selectedMenus: selectedMenuIds,
    }),
    [formValues, selectedMenuIds]
  );

  if (!salon) {
    return <Loading />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* フォーム入力部分 */}
        <div className="md:col-span-2 space-y-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-white rounded-lg p-6 shadow-sm border"
          >
            <Accordion type="single" defaultValue="item-1" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full font-bold">
                      1
                    </div>
                    基本情報
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4 py-2"
                  >
                    <motion.div variants={fadeIn}>
                      <ZodTextField
                        register={register}
                        errors={errors}
                        name="name"
                        label="クーポン名"
                        icon={<Tag size={16} />}
                        placeholder="例: 初回限定20%OFF"
                      />
                    </motion.div>
                    <motion.div variants={fadeIn}>
                      <ZodTextField
                        register={register}
                        errors={errors}
                        name="couponUid"
                        label="クーポンコード"
                        icon={<Ticket size={16} />}
                        placeholder="例: CODE12345"
                      />
                    </motion.div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <motion.div variants={fadeIn} className="flex flex-col gap-2">
                        <Label className="flex items-center gap-2 text-gray-700">
                          <Percent size={16} />
                          割引タイプ
                        </Label>
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                          <div
                            className={`flex-1 text-center p-2 rounded-md ${discountType === 'percentage' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500'}`}
                          >
                            割引率
                          </div>
                          <Controller
                            control={control}
                            name="discountType"
                            render={({ field }) => (
                              <Switch
                                checked={field.value === 'fixed'}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked ? 'fixed' : 'percentage');
                                }}
                              />
                            )}
                          />
                          <div
                            className={`flex-1 text-center p-2 rounded-md ${discountType === 'fixed' ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-500'}`}
                          >
                            固定金額
                          </div>
                        </div>
                      </motion.div>

                      <AnimatePresence mode="wait">
                        {discountType === 'percentage' ? (
                          <motion.div
                            key="percentage"
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={fadeIn}
                          >
                            <ZodTextField
                              register={register}
                              errors={errors}
                              name="percentageDiscountValue"
                              label="割引率 (%)"
                              type="number"
                              icon={<Percent size={16} />}
                              placeholder="例: 10"
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="fixed"
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={fadeIn}
                          >
                            <ZodTextField
                              register={register}
                              errors={errors}
                              name="fixedDiscountValue"
                              label="固定割引額 (円)"
                              type="number"
                              icon={<PiggyBank size={16} />}
                              placeholder="例: 1000"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full font-bold">
                      2
                    </div>
                    有効期間と利用回数
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4 py-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <motion.div variants={fadeIn} className="flex flex-col gap-2">
                        <Label className="flex items-center gap-2 text-gray-700">
                          <CalendarIcon size={16} />
                          開始日
                        </Label>
                        <Controller
                          control={control}
                          name="startDate"
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal ${
                                    errors.startDate ? 'border-red-500' : ''
                                  }`}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, 'yyyy年MM月dd日', { locale: ja })
                                  ) : (
                                    <span>日付を選択</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  locale={ja}
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {errors.startDate && (
                          <motion.p
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={fadeIn}
                            className="mt-1 text-sm text-red-500 flex items-center gap-1"
                          >
                            <AlertCircle size={14} />
                            {errors.startDate?.message}
                          </motion.p>
                        )}
                      </motion.div>

                      <motion.div variants={fadeIn} className="flex flex-col gap-2">
                        <Label className="flex items-center gap-2 text-gray-700">
                          <CalendarIcon size={16} />
                          終了日
                        </Label>
                        <Controller
                          control={control}
                          name="endDate"
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal ${
                                    errors.endDate ? 'border-red-500' : ''
                                  }`}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, 'yyyy年MM月dd日', { locale: ja })
                                  ) : (
                                    <span>日付を選択</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  locale={ja}
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {errors.endDate && (
                          <motion.p
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={fadeIn}
                            className="mt-1 text-sm text-red-500 flex items-center gap-1"
                          >
                            <AlertCircle size={14} />
                            {errors.endDate?.message}
                          </motion.p>
                        )}
                      </motion.div>
                    </div>

                    <motion.div variants={fadeIn}>
                      <ZodTextField
                        register={register}
                        errors={errors}
                        name="maxUseCount"
                        label="最大利用回数"
                        type="number"
                        icon={<Hash size={16} />}
                        placeholder="例: 100"
                      />
                    </motion.div>
                  </motion.div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full font-bold">
                      3
                    </div>
                    対象メニューと有効設定
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4 py-2"
                  >
                    <motion.div variants={fadeIn} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <Label className="flex items-center gap-2 text-gray-700">
                          <Menu size={16} />
                          クーポン対象メニュー
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleAllMenus}
                                className="text-xs h-8"
                              >
                                {selectedMenuIds.length === dammyMenu.length
                                  ? '全て解除'
                                  : '全て選択'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                クリックで
                                {selectedMenuIds.length === dammyMenu.length
                                  ? '全てのメニューの選択を解除'
                                  : '全てのメニューを選択'}
                                します
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            <span>{selectedMenusText}</span>
                            <Menu className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>対象メニュー選択</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {dammyMenu.map((menu) => (
                            <DropdownMenuCheckboxItem
                              key={menu.id}
                              checked={selectedMenuIds.includes(menu.id)}
                              onCheckedChange={() => toggleMenu(menu.id)}
                              onSelect={(e) => e.preventDefault()}
                            >
                              <span className="flex justify-between w-full">
                                <span>{menu.name}</span>
                                <span className="text-gray-500 text-sm">
                                  ¥{menu.price.toLocaleString()}
                                </span>
                              </span>
                            </DropdownMenuCheckboxItem>
                          ))}
                          <DropdownMenuSeparator />
                          <div className="p-2">
                            <Button
                              variant="secondary"
                              className="w-full"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDropdownOpen(false);
                              }}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              選択を完了
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>

                    <motion.div variants={fadeIn} className="flex flex-col gap-2 pt-2">
                      <Controller
                        control={control}
                        name="isActive"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="isActive"
                              className="flex items-center gap-2 text-gray-700 cursor-pointer"
                            >
                              クーポンの有効/無効
                            </Label>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={field.value ? 'default' : 'destructive'}
                                className="px-2 py-0.5"
                              >
                                {field.value ? '有効' : '無効'}
                              </Badge>
                              <Switch
                                id="isActive"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </div>
                        )}
                      />
                    </motion.div>
                  </motion.div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        </div>

        {/* プレビュー部分 */}
        <div className="md:col-span-1">
          <div className="sticky top-4 space-y-4">
            <motion.h3
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-lg font-medium flex items-center gap-2"
            >
              <Sparkles size={18} className="text-indigo-500" />
              クーポンプレビュー
            </motion.h3>

            <CouponPreview data={previewData} />

            <motion.div initial="hidden" animate="visible" variants={fadeIn} className="mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
                size="lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    作成中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus size={16} />
                    クーポンを作成
                  </span>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </form>
  );
}

// ページコンポーネント
export default function AddCouponPage() {
  return (
    <DashboardSection
      title="クーポンを作成"
      backLink="/dashboard/coupon"
      backLinkTitle="クーポン一覧へ戻る"
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={pageAnimation}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">
            新しいクーポンの情報を入力して作成できます。ステップに沿って入力を進めてください。
          </p>
          <Separator className="my-2" />
        </div>

        <CouponForm />
      </motion.div>
    </DashboardSection>
  );
}
