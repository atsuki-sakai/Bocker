"use client";

import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { useZodForm } from "@/hooks/useZodForm";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { toast } from "sonner";
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useTranslations, useLocale } from 'next-intl'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";


export default function SignInForm() {
  const t = useTranslations('auth.signIn')
  const vt = useTranslations('auth.validation')
  const locale = useLocale()
  
  const signInSchema = z.object({
    email: z.string().email({ message: vt('emailInvalid') }),
    password: z.string().min(8, { message: vt('passwordMinLength') }),
  })

  const { isLoaded, signIn, setActive } = useSignIn()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { showErrorToast } = useErrorHandler()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useZodForm(signInSchema)

  const email = watch('email')

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    if (!isLoaded) return

    try {
      // まず既存のサインインセッションを作成
      const signInAttempt = await signIn.create({
        identifier: data.email,
      })

      // 次にパスワードで認証
      const result = await signInAttempt.attemptFirstFactor({
        strategy: 'password',
        password: data.password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.push(`/${locale}/dashboard`)
        toast.success(t('success'))
      } else {
        showErrorToast(result)
      }
    } catch (err: unknown) {
      showErrorToast(err)
    } finally {
      setIsSubmitted(true)
    }
  }

  // パスワード表示/非表示の切り替え
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // アニメーションのバリアント
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
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
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md p-2"
      >
        <Card className="border-0 shadow-lg ">
          <div className="flex justify-end p-2">
            <LanguageSwitcher />
          </div>
          <CardHeader className="space-y-1">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl font-bold text-center flex-1">{t('title')}</CardTitle>
            </motion.div>
            <motion.div variants={itemVariants}>
              <p className="text-sm text-center text-muted-foreground">{t('subtitle')}</p>
            </motion.div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder={t('emailPlaceholder')}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder={t('passwordPlaceholder')}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-3 text-muted-foreground hover:opacity-80 focus:outline-none transition-colors"
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button type="submit" className="w-full " disabled={isSubmitting}>
                  {isSubmitting ? t('loading') : t('submit')}
                  {isSubmitting ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </motion.div>

              {isSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center pt-4"
                >
                  <Link
                    href={`/${locale}/sign-in/reset-password?email=${email}`}
                    className="text-sm text-link-foreground"
                  >
                    {t('forgotPassword')}
                  </Link>
                </motion.div>
              )}
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Separator className="bg-muted w-1/2 mx-auto my-2" />
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-end w-full text-right text-xs"
            >
              <Link
                href={`/${locale}/sign-up`}
                className="inline-flex items-center text-xs text-blue-500"
              >
                {t('signUp')}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
