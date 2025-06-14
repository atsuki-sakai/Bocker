"use client";

import { useState, useEffect, Suspense } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useZodForm } from "@/hooks/useZodForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Loading } from "@/components/common";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import {
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  Send,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import {
  UseFormRegister,
  FieldErrors,
  UseFormHandleSubmit,
} from "react-hook-form";
import { useTranslations } from 'next-intl'

const createResetPasswordSchema = (t: ReturnType<typeof useTranslations>) =>
  z
    .object({
      email: z.string().email({ message: t('auth.validation.emailInvalid') }),
      newPassword: z
        .string()
        .min(1, { message: t('auth.resetPassword.newPasswordRequired') })
        .optional(),
      confirmPassword: z
        .string()
        .min(1, { message: t('auth.validation.confirmPasswordRequired') })
        .optional(),
      code: z.string().optional(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('auth.validation.passwordMismatch'),
      path: ['confirmPassword'],
    })

// 型推論を簡潔に扱うためのエイリアス
type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordSchema>>

// アニメーションバリアント
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 },
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

// フォーム共通のエラーメッセージ表示を含むリセットコード送信用コンポーネント
function ResetCodeForm({
  register,
  errors,
  handleSubmit,
  onSubmit,
  isSubmitting,
}: {
  register: UseFormRegister<ResetPasswordFormValues>
  errors: FieldErrors<ResetPasswordFormValues>
  handleSubmit: UseFormHandleSubmit<ResetPasswordFormValues>
  onSubmit: (data: ResetPasswordFormValues) => void
  isSubmitting: boolean
}) {
  const t = useTranslations('auth.resetPassword')
  return (
    <motion.form
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="email" className="text-xs font-medium">
          {t('auth.resetPassword.accountEmail')}
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder={t('emailPlaceholder')}
            className="pl-10"
            autoFocus
          />
        </div>
        {errors.email && (
          <div className="flex items-center gap-2 text-destructive text-xs mt-1">
            <AlertCircle className="h-3 w-3" />
            <p>{errors.email.message}</p>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('sendingCode')}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {t('sendVerificationCode')}
            </>
          )}
        </Button>
      </motion.div>
    </motion.form>
  )
}

// フォーム共通のエラーメッセージ表示を含むパスワードリセット用コンポーネント
function ResetPasswordForm({
  register,
  errors,
  handleSubmit,
  onSubmit,
  isSubmitting,
}: {
  register: UseFormRegister<ResetPasswordFormValues>
  errors: FieldErrors<ResetPasswordFormValues>
  handleSubmit: UseFormHandleSubmit<ResetPasswordFormValues>
  onSubmit: (data: ResetPasswordFormValues) => void
  isSubmitting: boolean
}) {
  const t = useTranslations('auth.resetPassword')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div
        variants={itemVariants}
        className="mb-6 p-4 bg-secondary rounded-lg border border-secondary flex items-center gap-3"
      >
        <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-primary">{t('codeInstruction')}</p>
      </motion.div>

      <motion.form
        variants={containerVariants}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="code" className="text-xs font-medium">
            {t('code')}
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="code"
              {...register('code')}
              className="pl-10 text-center font-mono tracking-wider"
              placeholder={t('codePlaceholder')}
              maxLength={6}
              autoFocus
            />
          </div>
          {errors.code && (
            <div className="flex items-center gap-2 text-destructive text-xs mt-1">
              <AlertCircle className="h-3 w-3" />
              <p>{errors.code.message}</p>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="newPassword" className="text-xs font-medium">
            {t('newPassword')}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              {...register('newPassword')}
              className="pl-10 pr-10"
              placeholder={t('newPasswordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <div className="flex items-center gap-2 text-destructive text-xs mt-1">
              <AlertCircle className="h-3 w-3" />
              <p>{errors.newPassword.message}</p>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-xs font-medium">
            {t('confirmPassword')}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              className="pl-10 pr-10"
              placeholder={t('confirmPasswordPlaceholderNew')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="flex items-center gap-2 text-destructive text-xs mt-1">
              <AlertCircle className="h-3 w-3" />
              <p>{errors.confirmPassword.message}</p>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('resetPassword')}
              </>
            )}
          </Button>
        </motion.div>
      </motion.form>
    </motion.div>
  )
}

// クライアントコンポーネントでuseSearchParamsを使用するコンポーネント
function ResetPasswordContent() {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn()
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useZodForm(createResetPasswordSchema(t))

  // リセットコード送信処理
  const handleSendResetCode = async (data: ResetPasswordFormValues) => {
    if (!signInLoaded) return
    try {
      const createdSignIn = await signIn.create({
        identifier: data.email,
      })

      const emailAddressId = createdSignIn.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'reset_password_email_code'
      )?.emailAddressId

      if (!emailAddressId) {
        throw new Error('メールアドレスが見つかりませんでした。')
      }

      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId,
      })
      setEmailSent(true)
      toast.success(t('auth.resetPassword.codeSendSuccess'))
    } catch (err) {
      console.error(err)
      toast.error(t('auth.resetPassword.codeSendError'))
    }
  }

  // パスワードリセット処理
  const handleResetPassword = async (data: ResetPasswordFormValues) => {
    console.log(data)
    console.log(signInLoaded)
    if (!signInLoaded) return
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: data.code ?? '',
        password: data.newPassword,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        toast.success(t('resetSuccess'))
        router.push('/sign-in')
      }
    } catch (err) {
      console.error(err)
      toast.error('パスワードのリセットに失敗しました')
    }
  }

  useEffect(() => {
    if (email) {
      setValue('email', email)
    }
  }, [email, setValue])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-2">
        <Card className="border-0 shadow-lg shadow-secondary backdrop-blur-sm bg-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {t('auth.resetPassword.resetPassword')}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground bg-muted rounded-lg p-2 border border-secondary">
              {!emailSent ? t('emailSentSubtitle') : t('newPasswordSubtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {!emailSent ? (
                <ResetCodeForm
                  key="reset-code-form"
                  register={register}
                  errors={errors}
                  handleSubmit={handleSubmit}
                  onSubmit={handleSendResetCode}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <ResetPasswordForm
                  key="reset-password-form"
                  register={register}
                  errors={errors}
                  handleSubmit={handleSubmit}
                  onSubmit={handleResetPassword}
                  isSubmitting={isSubmitting}
                />
              )}
            </AnimatePresence>
          </CardContent>
          <Separator className="my-2 w-1/2 mx-auto" />
          <CardFooter className="flex justify-center pt-2">
            <Link href="/sign-in" className="text-xs text-active flex items-center gap-1">
              {t('backToLogin')}
              <ArrowRight className="h-3 w-3 ml-2" />
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

// メインページコンポーネント
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}