'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchQuery } from 'convex/nextjs'
import { useSignUp, useClerk } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import * as Sentry from '@sentry/nextjs'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Link } from '@/i18n/navigation'
import { useZodForm } from '@/hooks/useZodForm'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle,
  User,
  Loader2,
  Store,
} from 'lucide-react'
import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { z } from 'zod'
import { api } from '@/convex/_generated/api'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { MAX_REFERRAL_COUNT } from '@/lib/constants'

// パスワード強度の型定義
type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong' | 'veryStrong'

// パスワード強度に基づく色を取得
const getStrengthColor = (strength: PasswordStrength) => {
  switch (strength) {
    case 'weak':
      return 'bg-pallet-1'
    case 'medium':
      return 'bg-pallet-2'
    case 'strong':
      return 'bg-pallet-3'
    case 'veryStrong':
      return 'bg-pallet-4'
    default:
      return 'bg-gray-200'
  }
}

// パスワード強度に基づくテキストを取得
const getStrengthText = (t: ReturnType<typeof useTranslations>, strength: PasswordStrength) => {
  switch (strength) {
    case 'weak':
      return t('passwordWeak')
    case 'medium':
      return t('passwordFair')
    case 'strong':
      return t('passwordGood')
    case 'veryStrong':
      return t('passwordStrong')
    default:
      return ''
  }
}

// パスワード要件チェックアイコン - メモ化
const CheckIcon = ({ fulfilled }: { fulfilled: boolean }) => (
  <div
    className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-300 
      ${fulfilled ? 'bg-accent-2-foreground text-accent-2-background border border-accent-2' : 'bg-muted border border-border'}`}
  >
    {fulfilled && <CheckCircle className="w-3 h-3" />}
  </div>
)

export const signUpSchema = (t: ReturnType<typeof useTranslations>) =>
  z
    .object({
      org_name: z
        .string({ required_error: t('validation.orgNameRequired') })
        .min(1, { message: t('validation.orgNameRequired') })
        .max(40, { message: t('validation.orgNameMaxLength') }),
      referralCode: z.string().optional(),
      email: z
        .string()
        .min(1, { message: t('validation.emailRequired') })
        .email({ message: t('validation.emailInvalid') }),
      password: z
        .string()
        .min(8, { message: t('passwordRequirements.length') })
        .max(100, { message: t('passwordRequirements.maxLength') })
        .regex(/[a-z]/, { message: t('passwordRequirements.lowercase') })
        .regex(/[A-Z]/, { message: t('passwordRequirements.uppercase') })
        .regex(/[0-9]/, { message: t('passwordRequirements.number') })
        .regex(/[^A-Za-z0-9]/, { message: t('passwordRequirements.special') }),
      confirmPassword: z.string().min(1, { message: t('validation.passwordRequired') }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordConfirmationError'),
      path: ['confirmPassword'],
    })

type SignUpFormData = z.infer<ReturnType<typeof signUpSchema>>

type PasswordInputProps = {
  register: UseFormRegister<SignUpFormData>
  errors: FieldErrors<SignUpFormData>
  showPassword: boolean
  toggleShowPassword: () => void
}

const PasswordInput = ({
  register,
  showPassword,
  toggleShowPassword,
  errors,
}: PasswordInputProps) => {
  const t = useTranslations('auth.signUp')
  return (
    <div className="space-y-2">
      <div className="flex w-full justify-between items-center">
        <Label htmlFor="password" className="text-sm font-medium">
          {t('password')}
        </Label>
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          {...register('password')}
          placeholder={t('passwordPlaceholder')}
          required
          className="pl-10 pr-10"
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={errors.password ? 'password-error' : undefined}
          autoComplete="new-password"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleShowPassword}
          className="absolute right-0 top-1/2 -translate-y-1/2 text  -muted-foreground focus:outline-none transition-colors"
          aria-label={showPassword ? t('hidePassword') : t('showPassword')}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {errors.password && (
        <p id="password-error" className="text-xs text-destructive" role="alert">
          {errors.password.message}
        </p>
      )}
    </div>
  )
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

export default function SignUpPage() {
  const t = useTranslations('auth.signUp')
  const searchParams = useSearchParams()
  const paramsReferralCode = searchParams.get('referral_code')
  const { showErrorToast } = useErrorHandler()
  const clerk = useClerk()
  const { isLoaded, signUp, setActive } = useSignUp()
  const [pendingVerification, setPendingVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [password, setPassword] = useState('')
  const [showReferralCode, setShowReferralCode] = useState(paramsReferralCode ? true : false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('empty')
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useZodForm(signUpSchema(t))

  const referralCode = watch('referralCode')

  const orgName = watch('org_name')
  const email = watch('email')

  // メモ化されたトグル関数
  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  // パスワード条件の充足状況 - useMemoでメモ化
  const passwordCriteria = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password]
  )

  // パスワード値の監視
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'password') {
        setPassword(value.password || '')
      }
    })
    return () => subscription.unsubscribe()
  }, [watch])

  // パスワード強度を計算 - パスワードが変わった時だけ実行
  useEffect(() => {
    if (!password) {
      setPasswordStrength('empty')
      return
    }

    let strength = 0

    // 長さチェック
    if (password.length >= 8) strength += 1
    if (password.length >= 12) strength += 1

    // 文字種チェック
    if (/[A-Z]/.test(password)) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1

    // 強度の判定
    if (strength <= 2) {
      setPasswordStrength('weak')
    } else if (strength <= 3) {
      setPasswordStrength('medium')
    } else if (strength <= 4) {
      setPasswordStrength('strong')
    } else {
      setPasswordStrength('veryStrong')
    }
  }, [password])

  // メモ化されたパスワード強度表示コンポーネント
  const PasswordStrengthIndicator = useMemo(() => {
    if (!password) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-2"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-primary">{t('passwordStrength')}:</span>
          <span
            className={`text-xs font-medium ${
              passwordStrength === 'weak'
                ? 'text-pallet-1'
                : passwordStrength === 'medium'
                  ? 'text-pallet-2'
                  : passwordStrength === 'strong'
                    ? 'text-pallet-3'
                    : passwordStrength === 'veryStrong'
                      ? 'text-pallet-4'
                      : ''
            }`}
          >
            {getStrengthText(t, passwordStrength)}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width:
                passwordStrength === 'empty'
                  ? '0%'
                  : passwordStrength === 'weak'
                    ? '25%'
                    : passwordStrength === 'medium'
                      ? '50%'
                      : passwordStrength === 'strong'
                        ? '75%'
                        : '100%',
            }}
            transition={{ duration: 0.4 }}
            className={`h-full ${getStrengthColor(passwordStrength)}`}
          ></motion.div>
        </div>
      </motion.div>
    )
  }, [password, passwordStrength, t])

  // メモ化されたパスワード要件チェックリスト
  const PasswordRequirementsList = useMemo(() => {
    if (!password) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-3 space-y-1 bg-background p-3 rounded-lg border border-border shadow-sm"
      >
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center gap-2">
            <CheckIcon fulfilled={passwordCriteria.length} />
            <span
              className={`text-xs ${passwordCriteria.length ? 'text-accent-2 font-medium' : 'text-muted-foreground'}`}
            >
              {t('passwordRequirements.length')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckIcon fulfilled={passwordCriteria.uppercase} />
            <span
              className={`text-xs ${passwordCriteria.uppercase ? 'text-accent-2 font-medium' : 'text-muted-foreground'}`}
            >
              {t('passwordRequirements.uppercase')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckIcon fulfilled={passwordCriteria.lowercase} />
            <span
              className={`text-xs ${passwordCriteria.lowercase ? 'text-accent-2 font-medium' : 'text-muted-foreground'}`}
            >
              {t('passwordRequirements.lowercase')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckIcon fulfilled={passwordCriteria.number} />
            <span
              className={`text-xs ${passwordCriteria.number ? 'text-accent-2 font-medium' : 'text-muted-foreground'}`}
            >
              {t('passwordRequirements.number')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckIcon fulfilled={passwordCriteria.special} />
            <span
              className={`text-xs ${passwordCriteria.special ? 'text-accent-2 font-medium' : 'text-muted-foreground'}`}
            >
              {t('passwordRequirements.special')}
            </span>
          </div>
        </div>
      </motion.div>
    )
  }, [password, passwordCriteria, t])

  // 登録フォーム送信ハンドラ
  const onSignUpSubmit = async (data: { email: string; password: string }) => {
    if (!isLoaded) return

    try {
      // 既存のセッションがあるかチェックして、ある場合はサインアウト
      if (clerk.session) {
        await clerk.signOut()
        toast.info('既存のセッションからサインアウトしました')
      }

      // 招待コードが存在する場合は、招待コードをチェック
      if (referralCode && showReferralCode) {
        const referral = await fetchQuery(api.tenant.referral.query.findByReferralCode, {
          referral_code: referralCode,
        })
        if (!referral) {
          toast.error('招待コードが見つかりません')
          return
        }

        if (referral.total_referral_count && referral.total_referral_count >= MAX_REFERRAL_COUNT) {
          toast.error('招待コードの利用回数が上限に達しています。')
          return
        }
      }

      // Clerkでユーザー作成
      await signUp?.create({
        emailAddress: data.email,
        password: data.password,
        unsafeMetadata: {
          referralCode: showReferralCode && referralCode ? referralCode : null,
          orgName: orgName,
        },
      })

      // メール確認コードを送信
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)

      toast.success('アカウントが作成されました。メールを確認してください')
    } catch (err) {
      showErrorToast(err)
    }
  }

  // 認証コード確認ハンドラ
  const onVerifySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsVerifying(true)
    if (!isLoaded || !verificationCode) return
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      })

      if (result.status === 'complete') {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId })
          toast.success('認証に成功しました')
        }
      } else {
        toast.error('認証に失敗しました')
      }
    } catch (err) {
      Sentry.captureException(err, {
        level: 'error',
        tags: {
          operation: 'signUp.attemptEmailAddressVerification',
          email: email,
        },
      })
      showErrorToast(err)
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    if (paramsReferralCode) {
      setValue('referralCode', paramsReferralCode)
    }
  }, [paramsReferralCode, setValue])

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md p-2"
      >
        <Card className="border-0 shadow-lg shadow-secondary backdrop-blur-sm bg-background">
          <div className="flex justify-end p-2">
            <LanguageSwitcher />
          </div>
          <CardHeader className="space-y-1">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl font-bold text-center">
                {t('ownerAccountTitle')}
              </CardTitle>
            </motion.div>
            <motion.div variants={itemVariants}>
              <CardDescription className="text-center text-muted-foreground">
                {t('subtitle')}
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {!pendingVerification ? (
                <motion.form
                  key="signup-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit(onSignUpSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      {t('storeName')}
                    </Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="org_name"
                        type="text"
                        {...register('org_name')}
                        placeholder={t('storeNamePlaceholder')}
                        className="pl-10"
                        required
                        aria-invalid={errors.org_name ? 'true' : 'false'}
                        aria-describedby={errors.org_name ? 'org_name-error' : undefined}
                        autoComplete="org_name"
                        autoFocus
                      />
                    </div>
                    {errors.org_name && (
                      <p id="org_name-error" className="text-xs text-destructive" role="alert">
                        {errors.org_name.message}
                      </p>
                    )}
                  </motion.div>
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
                        aria-invalid={errors.email ? 'true' : 'false'}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    {errors.email && (
                      <p id="email-error" className="text-xs text-destructive" role="alert">
                        {errors.email.message}
                      </p>
                    )}
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <PasswordInput
                      register={register}
                      showPassword={showPassword}
                      toggleShowPassword={toggleShowPassword}
                      errors={errors}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      {t('confirmPassword')}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...register('confirmPassword')}
                        placeholder={t('confirmPasswordPlaceholder')}
                        className="pl-10"
                        required
                        aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                        aria-describedby={errors.confirmPassword ? 'password-error' : undefined}
                        autoComplete="new-password"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p
                        id="confirmPassword-error"
                        className="text-xs text-destructive"
                        role="alert"
                      >
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2 flex items-center">
                    <Checkbox
                      className="mr-2 mt-2"
                      id="show-referral"
                      checked={showReferralCode}
                      onCheckedChange={(checked) => setShowReferralCode(!!checked)}
                    />
                    <Label htmlFor="show-referral" className="text-sm cursor-pointer">
                      {t('useReferralCode')}
                    </Label>
                  </motion.div>

                  <AnimatePresence mode="sync">
                    {showReferralCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="space-y-2 overflow-hidden"
                      >
                        <Label htmlFor="referralCode" className="text-sm font-medium">
                          {t('referralCode')}
                        </Label>
                        <div className="relative p-1">
                          <Input
                            id="referralCode"
                            type="text"
                            {...register('referralCode')}
                            placeholder={t('referralCodePlaceholder')}
                            className="pl-3"
                            autoFocus
                          />
                        </div>
                        {errors.referralCode && (
                          <p
                            id="referralCode-error"
                            className="text-xs text-destructive"
                            role="alert"
                          >
                            {errors.referralCode.message}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* メモ化されたコンポーネントを使用 */}
                  {PasswordStrengthIndicator}
                  {PasswordRequirementsList}

                  {/* CAPTCHA Widget */}
                  <div id="clerk-captcha" />

                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full "
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? t('processing') : t('register')}
                      {isSubmitting ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <User className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              ) : (
                <motion.form
                  key="verification-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={onVerifySubmit}
                  className="space-y-4"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 bg-link rounded-lg border border-link-foreground"
                  >
                    <h4 className="text-center text-sm font-medium text-link-foreground">
                      {t('verification.title')}
                    </h4>
                    <p className="text-center text-xs text-link-foreground">
                      {t('verification.instruction')}
                    </p>
                  </motion.div>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code" className="text-xs font-medium">
                      {t('verification.codeLabel')}
                    </Label>
                    <Input
                      id="verification-code"
                      value={verificationCode}
                      placeholder={t('verification.codePlaceholder')}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      className="text-center font-mono text-lg tracking-wider"
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!verificationCode || verificationCode.length < 6}
                  >
                    {isVerifying ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <svg className="h-4 w-4 text-background" viewBox="0 0 24 24">
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
                        {t('verification.processing')}
                      </>
                    ) : (
                      t('verification.verify')
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    {t('verification.resendCode')}
                    <button
                      type="button"
                      className="ml-1 text-link-foreground hover:opacity-80 underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-link-foreground rounded"
                      onClick={async () => {
                        try {
                          await signUp?.prepareEmailAddressVerification({
                            strategy: 'email_code',
                          })
                          toast.success(t('verification.resent'))
                        } catch (err) {
                          Sentry.captureException(err, {
                            level: 'error',
                            tags: {
                              operation: 'signUp.prepareEmailAddressVerification',
                              email: email,
                            },
                          })
                          toast.error(t('verification.resendError'))
                        }
                      }}
                    >
                      {t('verification.resend')}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Separator className="bg-muted w-1/2 mx-auto my-2" />
            <motion.div variants={itemVariants} className="w-full text-center">
              <p className="text-xs text-muted-foreground">
                {t('alreadyHaveAccount')}
                <Link
                  href="/sign-in"
                  className="inline-flex items-center text-link-foreground hover:opacity-80 font-medium transition-colors"
                >
                  {t('signInHere')}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </p>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
