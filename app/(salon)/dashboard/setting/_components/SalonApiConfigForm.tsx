'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormField, Loading } from '@/components/common';
import {
  MessageSquare,
  Key,
  Lock,
  Shield,
  Save,
  CheckCircle,
  EyeOff,
  Eye,
  Info,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { handleError } from '@/lib/error';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import { toast } from 'sonner';
import { useSalon } from '@/hooks/useSalon';
import { api } from '@/convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
// APIの設定フォーム用のスキーマ
const salonApiConfigFormSchema = z.object({
  lineAccessToken: z.string().optional(),
  lineChannelSecret: z.string().optional(),
  liffId: z.string().optional(),
  destinationId: z.string().optional(),
});

// スキーマから型を生成
type SalonApiConfigFormValues = z.infer<typeof salonApiConfigFormSchema>;

const ApiSettingsCard = () => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showFields, setShowFields] = useState<{ [key: string]: boolean }>({
    lineAccessToken: false,
    lineChannelSecret: false,
    liffId: false,
    destinationId: false,
  });
  const { salonId } = useSalon();

  // すべてのフックをここでトップレベルで宣言
  const salonApiConfig = useQuery(
    api.salon.api_config.query.findBySalonId,
    salonId ? { salonId } : 'skip'
  );
  const upsertSalonApiConfig = useMutation(api.salon.api_config.mutation.upsert);

  // フォーム管理（useZodFormを使用）
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useZodForm(salonApiConfigFormSchema);

  // フォームの初期値が変更されたらリセット
  useEffect(() => {
    if (salonApiConfig) {
      reset(salonApiConfig);
    }
  }, [salonApiConfig, reset]);

  // APIの設定を保存する関数
  const onApiSubmit = useCallback(
    async (data: SalonApiConfigFormValues) => {
      if (!salonId) return;

      try {
        setSubmitting(true);

        await upsertSalonApiConfig({
          salonId,
          ...data,
        });

        toast.success('API設定を保存しました');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        const errorDetails = handleError(error);
        console.error('API設定の保存に失敗しました:', errorDetails);
        toast.error(errorDetails.message);
      } finally {
        setSubmitting(false);
      }
    },
    [upsertSalonApiConfig, salonId]
  );

  const handleShowFields = (
    e: React.MouseEvent<HTMLButtonElement>,
    field: keyof SalonApiConfigFormValues
  ) => {
    e.preventDefault();
    setShowFields({ ...showFields, [field]: !showFields[field] });
  };

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
      <Card className="overflow-hidden shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <CardTitle>API設定</CardTitle>
          </div>

          <CardDescription className="flex items-center">
            外部サービスとの連携に必要なAPI設定を行います
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="ml-1 h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                  <p>
                    これらの設定はLINEとの連携に必要です。LINE Developers
                    Consoleで取得した情報を入力してください。
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit(onApiSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            autoComplete="off"
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="p-1">
                <motion.div
                  className="space-y-4 mt-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.1,
                      },
                    },
                  }}
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.1, duration: 0.3 },
                      },
                    }}
                  >
                    <FormField
                      label="LINE アクセストークン"
                      icon={<Key className="h-4 w-4 text-blue-500" />}
                      error={errors.lineAccessToken?.message}
                      tooltip="LINE Developers から取得したアクセストークンを入力してください"
                    >
                      <div className="flex items-center gap-2 relative">
                        <Input
                          type={showFields.lineAccessToken ? 'text' : 'password'}
                          autoComplete="new-password"
                          {...register('lineAccessToken')}
                          placeholder="LINE アクセストークン"
                          className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                        />
                        <Button
                          className="absolute right-0"
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleShowFields(e, 'lineAccessToken')}
                        >
                          {showFields.lineAccessToken ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormField>
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.2, duration: 0.3 },
                      },
                    }}
                  >
                    <FormField
                      label="LINE チャンネルシークレット"
                      icon={<Lock className="h-4 w-4 text-blue-500" />}
                      error={errors.lineChannelSecret?.message}
                      tooltip="LINE Developers から取得したチャネルシークレットを入力してください"
                    >
                      <div className="flex items-center gap-2 relative">
                        <Input
                          autoComplete="new-password"
                          type={showFields.lineChannelSecret ? 'text' : 'password'}
                          {...register('lineChannelSecret')}
                          placeholder="LINE チャンネルシークレット"
                          className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                        />
                        <Button
                          className="absolute right-0"
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleShowFields(e, 'lineChannelSecret')}
                        >
                          {showFields.lineChannelSecret ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormField>
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.3, duration: 0.3 },
                      },
                    }}
                  >
                    <FormField
                      label="LIFF ID"
                      icon={<Shield className="h-4 w-4 text-blue-500" />}
                      error={errors.liffId?.message}
                      tooltip="LIFF（LINE Front-end Framework）のIDを入力してください"
                    >
                      <div className="flex items-center gap-2 relative">
                        <Input
                          type={showFields.liffId ? 'text' : 'password'}
                          autoComplete="new-password"
                          {...register('liffId')}
                          placeholder="LIFF ID"
                          className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                        />

                        <Button
                          className="absolute right-0"
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleShowFields(e, 'liffId')}
                        >
                          {showFields.liffId ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormField>
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.4, duration: 0.3 },
                      },
                    }}
                  >
                    <FormField
                      label="LINE公式アカウント識別子"
                      icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
                      error={errors.destinationId?.message}
                      tooltip="LINE公式アカウントの識別子を入力してください"
                    >
                      <div className="flex items-center gap-2 relative">
                        <Input
                          type={showFields.destinationId ? 'text' : 'password'}
                          autoComplete="new-password"
                          {...register('destinationId')}
                          placeholder="LINE公式アカウント識別子"
                          className="transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                        />
                        <Button
                          className="absolute right-0"
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleShowFields(e, 'destinationId')}
                        >
                          {showFields.destinationId ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormField>
                  </motion.div>
                </motion.div>
              </div>
            </div>

            <CardFooter className="px-0 pt-4 pb-0 flex justify-end gap-4">
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center text-green-600"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    保存しました
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                whileHover={{ scale: isDirty ? 1.03 : 1 }}
                whileTap={{ scale: isDirty ? 0.97 : 1 }}
              >
                <Button type="submit" disabled={submitting || !isDirty} className="min-w-[140px]">
                  {submitting ? (
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
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      API設定を保存
                    </>
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ApiSettingsCard;
