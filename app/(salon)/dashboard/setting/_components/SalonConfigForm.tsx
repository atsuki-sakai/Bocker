'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { ImageDrop, Loading } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fileToBase64 } from '@/lib/utils';
import { useZodForm } from '@/hooks/useZodForm';
import { z } from 'zod';
import { toast } from 'sonner';
import { handleError } from '@/lib/error';
import { motion, AnimatePresence } from 'framer-motion';
import { FormField } from '@/components/common';
import { compressAndConvertToWebP } from '@/lib/utils';
import {
  Mail,
  Phone,
  MapPin,
  FileText,
  Info,
  Save,
  Image as ImageIcon,
  Upload,
  Building,
  Search,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const salonConfigFormSchema = z.object({
  salonId: z.string(),
  salonName: z
    .string()
    .min(1, 'サロン名は必須です')
    .max(120, 'サロン名は120文字以内で入力してください'), // サロン名
  email: z.string().email('メールアドレスの形式が正しくありません').optional(), // メールアドレス（入力された場合はメール形式をチェック）
  phone: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === '' || /^\d{8,11}$/.test(val), {
      message: '電話番号は8-11桁の数字で入力してください',
    }),

  postalCode: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === '' || /^\d{7}$/.test(val), {
      message: '郵便番号は7桁の数字で入力してください',
    }),
  address: z.string().max(200, '住所は200文字以内で入力してください').optional(), // 住所（入力された場合は最低1文字必要）
  reservationRules: z.string().max(2000, '予約ルールは2000文字以内で入力してください').optional(), // 予約ルール（入力された場合は最大500文字）
  description: z.string().max(2000, '説明は2000文字以内で入力してください').optional(), // 説明（入力された場合は最大500文字）
});

export default function SalonConfigForm() {
  const { salonId } = useSalon();
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const salonConfig = useQuery(api.salon.config.get, salonId ? { salonId } : 'skip');
  const updateSalonConfig = useMutation(api.salon.config.upsert);
  const deleteImage = useAction(api.storage.core.deleteImage);
  const uploadImage = useAction(api.storage.core.uploadImage);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useZodForm(salonConfigFormSchema);

  const postalCode = watch('postalCode');

  // 郵便番号から住所を取得する関数（useCallbackでメモ化）
  const fetchAddressByPostalCode = useCallback(
    async (code: string) => {
      if (!code || code.length !== 7) return;

      try {
        setIsSearchingAddress(true);
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const fullAddress = `${result.address1}${result.address2}${result.address3}`;
          setValue('address', fullAddress, { shouldDirty: true });
        } else if (data.message) {
          toast.error(data.message);
        } else {
          toast.error('住所が見つかりませんでした');
        }
      } catch (error) {
        console.error('住所取得エラー:', error);
        toast.error('住所の取得に失敗しました');
      } finally {
        setIsSearchingAddress(false);
      }
    },
    [setValue]
  );

  // 郵便番号が7桁になったら自動的に住所を検索する
  useEffect(() => {
    if (postalCode && postalCode.length === 7) {
      fetchAddressByPostalCode(postalCode);
    }
  }, [postalCode, fetchAddressByPostalCode]);

  // 画像アップロード処理（useCallbackでメモ化）
  const handleSaveImg = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!currentFile || !salonId) return;

      try {
        setIsUploading(true);

        if (salonConfig?.imgPath) {
          await deleteImage({ imgUrl: salonConfig.imgPath });
        }

        // 画像を圧縮してWebP形式に変換
        const processedFile = await compressAndConvertToWebP(currentFile);
        console.log(
          `元のサイズ: ${currentFile.size / 1024} KB, 圧縮後: ${processedFile.size / 1024} KB`
        );

        const base64Data = await fileToBase64(processedFile);
        const filePath = `${Date.now()}-${processedFile.name}`;

        const data = await uploadImage({
          directory: 'salon',
          base64Data,
          filePath,
          contentType: processedFile.type,
        });

        if (data && 'publicUrl' in data) {
          // サロン設定の画像パスを更新
          await updateSalonConfig({
            salonId,
            imgPath: data.publicUrl,
          });

          // アップロード完了したらファイル選択をクリア
          setCurrentFile(null);
          toast.success('画像を保存しました');
        }
      } catch (error) {
        console.error('Error saving image:', error);
        toast.error('画像の保存に失敗しました');
      } finally {
        setIsUploading(false);
      }
    },
    [currentFile, salonConfig, deleteImage, uploadImage, updateSalonConfig, salonId]
  );

  // フォーム送信処理（useCallbackでメモ化）
  const onSubmit = useCallback(
    async (data: z.infer<typeof salonConfigFormSchema>) => {
      if (!salonId) return;

      try {
        await updateSalonConfig({
          ...data,
          salonId: salonId,
        });
        toast.success('サロン設定を保存しました');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('ERROR:', error);
        const errorDetails = handleError(error);
        toast.error(errorDetails.message);
      }
    },
    [updateSalonConfig, salonId, setSaveSuccess]
  );

  // salonConfigが変更されたらフォームをリセット
  useEffect(() => {
    if (salonConfig) {
      reset(salonConfig);
    }
  }, [salonConfig, reset]);

  // 手動で住所検索を行う
  const handleSearchAddress = useCallback(() => {
    if (postalCode && postalCode.length === 7) {
      fetchAddressByPostalCode(postalCode);
    } else {
      toast.error('郵便番号は7桁の数字で入力してください');
    }
  }, [postalCode, fetchAddressByPostalCode]);

  // 画像プレビューURL（useMemoでメモ化）
  const previewUrl = useMemo(() => {
    if (currentFile) {
      return URL.createObjectURL(currentFile);
    }
    return salonConfig?.imgPath && salonConfig?.imgPath !== ''
      ? salonConfig?.imgPath
      : 'https://placehold.co/600x400.png';
  }, [currentFile, salonConfig?.imgPath]);

  if (!salonId) {
    return <Loading />;
  }

  return (
    <motion.div
      className=""
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-md mb-8 border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" />
            サロンのイメージ画像
          </CardTitle>
          <CardDescription>サロンの雰囲気が伝わる画像をアップロードしてください</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <motion.div className="flex flex-col md:flex-row gap-6 items-center" layout>
            <div className="relative w-full md:w-1/2 aspect-video overflow-hidden rounded-lg bg-muted">
              <Image
                src={previewUrl}
                alt="salon logo"
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-4">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.2 }}
              >
                <ImageDrop
                  maxSizeMB={4}
                  onFileSelect={(file) => {
                    setCurrentFile(file);
                  }}
                />
              </motion.div>
              <Button
                onClick={handleSaveImg}
                disabled={!currentFile || isUploading}
                className="w-full"
                variant="default"
              >
                {isUploading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    保存中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    画像を保存
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
          <CardTitle>サロン設定</CardTitle>
          <CardDescription>お客様に表示されるサロン情報を設定してください</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger
                value="basic"
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-100"
              >
                <Building className="mr-2 h-4 w-4" />
                基本情報
              </TabsTrigger>
              <TabsTrigger
                value="detail"
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-100"
              >
                <FileText className="mr-2 h-4 w-4" />
                詳細情報
              </TabsTrigger>
            </TabsList>

            <form
              onSubmit={handleSubmit(onSubmit)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault();
                }
              }}
            >
              <TabsContent value="basic" className="pt-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FormField
                    label="サロン名"
                    icon={<Building className="h-4 w-4 text-muted-foreground" />}
                    error={errors.salonName?.message ?? ''}
                    tooltip="お客様に表示されるサロン名です"
                  >
                    <Input
                      {...register('salonName')}
                      placeholder="サロン名"
                      type="text"
                      className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                    />
                  </FormField>

                  <FormField
                    label="メールアドレス"
                    icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                    error={errors.email?.message ?? ''}
                    tooltip="お客様に表示されるメールアドレスです"
                  >
                    <Input
                      {...register('email')}
                      placeholder="example@salon.com"
                      type="email"
                      className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                    />
                  </FormField>

                  <FormField
                    label="電話番号"
                    icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                    error={errors.phone?.message ?? ''}
                    tooltip="ハイフンなしで入力してください"
                  >
                    <Input
                      {...register('phone')}
                      placeholder="08012345678"
                      type="tel"
                      className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                    />
                  </FormField>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/3">
                      <FormField
                        label="郵便番号"
                        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                        error={errors.postalCode?.message ?? ''}
                        tooltip="7桁の数字で入力してください"
                      >
                        <div className="flex gap-2">
                          <Input
                            {...register('postalCode')}
                            placeholder="1234567"
                            type="text"
                            maxLength={7}
                            className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={handleSearchAddress}
                                  disabled={isSearchingAddress}
                                  className="flex-shrink-0"
                                >
                                  {isSearchingAddress ? (
                                    <svg
                                      className="animate-spin h-4 w-4"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                  ) : (
                                    <Search className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>住所を検索</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </FormField>
                    </div>
                    <div className="w-full md:w-2/3">
                      <FormField
                        label="住所"
                        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                        error={errors.address?.message ?? ''}
                        tooltip="お客様に表示される住所です"
                      >
                        <Input
                          {...register('address')}
                          placeholder="住所"
                          type="text"
                          className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                        />
                      </FormField>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="detail" className="pt-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FormField
                    label="予約ルール"
                    icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                    error={errors.reservationRules?.message ?? ''}
                    tooltip="2000文字以内で入力してください"
                  >
                    <Textarea
                      {...register('reservationRules')}
                      placeholder="予約時のルールやご注意点を入力してください"
                      rows={6}
                      className="resize-y min-h-[150px] transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                    />
                  </FormField>

                  <FormField
                    label="サロン説明"
                    icon={<Info className="h-4 w-4 text-muted-foreground" />}
                    error={errors.description?.message ?? ''}
                    tooltip="2000文字以内で入力してください"
                  >
                    <Textarea
                      {...register('description')}
                      placeholder="サロンの特徴や魅力を記入してください"
                      rows={6}
                      className="resize-y min-h-[150px] transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                    />
                  </FormField>
                </motion.div>
              </TabsContent>

              <motion.div className="mt-6 flex justify-end" layout>
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center mr-4 text-green-600"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      保存しました
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div
                  whileHover={{ scale: isDirty ? 1.03 : 1 }}
                  whileTap={{ scale: isDirty ? 0.97 : 1 }}
                >
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isDirty}
                    className="min-w-[120px]"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存する
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
