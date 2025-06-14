'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useZodForm } from '@/hooks/useZodForm'
import { UseFormRegister, FieldError } from 'react-hook-form'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useState, memo, useCallback, useEffect } from 'react'
import {
  EyeOffIcon,
  EyeIcon,
  ShieldCheckIcon,
  KeyIcon,
  LockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2,
} from 'lucide-react'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslations } from 'next-intl'

// パスワード変更用のバリデーションスキーマ
const createChangePasswordSchema = (t: any) => z
  .object({
    currentPassword: z.string().min(6, t('errors.currentPasswordRequired')),
    newPassword: z.string().min(6, t('errors.minimumLength')),
    confirmNewPassword: z.string().min(6, t('errors.minimumLength')),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: t('errors.passwordMismatch'),
    path: ['confirmNewPassword'],
  })

// スキーマの型定義
type ChangePasswordSchema = z.infer<ReturnType<typeof createChangePasswordSchema>>

// パスワード強度を評価する関数
const calculatePasswordStrength = (password: string) => {
  if (!password) return 0

  let strength = 0

  // 長さによるボーナス
  if (password.length >= 8) strength += 20
  if (password.length >= 12) strength += 10

  // 文字種類によるボーナス
  if (/[A-Z]/.test(password)) strength += 20 // 大文字
  if (/[a-z]/.test(password)) strength += 20 // 小文字
  if (/[0-9]/.test(password)) strength += 20 // 数字
  if (/[^A-Za-z0-9]/.test(password)) strength += 20 // 特殊文字

  return Math.min(strength, 100)
}

// パスワード強度のラベルを取得する関数
const getStrengthLabel = (strength: number, t: any) => {
  if (strength < 30) return { label: t('passwordStrength.veryWeak'), color: 'bg-destructive' }
  if (strength < 50) return { label: t('passwordStrength.weak'), color: 'bg-orange-500' }
  if (strength < 70) return { label: t('passwordStrength.fair'), color: 'bg-yellow-500' }
  if (strength < 90) return { label: t('passwordStrength.strong'), color: 'bg-emerald-500' }
  return { label: t('passwordStrength.veryStrong'), color: 'bg-green-500' }
}

// 目のアイコンボタンのコンポーネント（パフォーマンス向上のためmemo化）
const PasswordToggleButton = memo(({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
  <Button
    variant="ghost"
    size="sm"
    type="button"
    onClick={onToggle}
    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-primary"
  >
    {show ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
  </Button>
))
PasswordToggleButton.displayName = 'PasswordToggleButton'

// 入力フィールドコンポーネント（パフォーマンス向上のためmemo化）
const PasswordInput = memo(
  ({
    id,
    label,
    icon,
    placeholder,
    register,
    showPassword,
    togglePassword,
    error,
  }: {
    id: string
    label: string
    icon: React.ReactNode
    placeholder: string
    register: UseFormRegister<ChangePasswordSchema>
    showPassword: boolean
    togglePassword: () => void
    error: FieldError | undefined
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center text-sm font-medium">
        {icon}
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          className="pr-10 transition-all duration-200"
          {...register(id as keyof ChangePasswordSchema)}
        />
        <PasswordToggleButton show={showPassword} onToggle={togglePassword} />
      </div>
      {error && (
        <p className="text-destructive text-xs mt-1 flex items-center">
          <AlertCircleIcon className="h-3 w-3 mr-1" />
          {error.message}
        </p>
      )}
    </div>
  )
)
PasswordInput.displayName = 'PasswordInput'

// パスワード強度インジケーター
const PasswordStrengthIndicator = memo(({ password, t }: { password: string; t: any }) => {
  const strength = calculatePasswordStrength(password)
  const { label, color } = getStrengthLabel(strength, t)

  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span>{t('passwordStrength.label')}:</span>
        <span className="font-medium">{label}</span>
      </div>
      <Progress value={strength} className="h-2" color={color} />

      <div className="grid grid-cols-4 gap-1 mt-2">
        {[
          { label: t('criteria.uppercase'), match: /[A-Z]/ },
          { label: t('criteria.lowercase'), match: /[a-z]/ },
          { label: t('criteria.number'), match: /[0-9]/ },
          { label: t('criteria.symbol'), match: /[^A-Za-z0-9]/ },
        ].map((criteria, index) => (
          <div key={index} className="flex items-center text-xs">
            {criteria.match.test(password) ? (
              <CheckCircle2Icon className="h-3 w-3 mr-1 text-active" />
            ) : (
              <AlertCircleIcon className="h-3 w-3 mr-1 text-muted-foreground" />
            )}
            {criteria.label}
          </div>
        ))}
      </div>
    </div>
  )
})
PasswordStrengthIndicator.displayName = 'PasswordStrengthIndicator'

export default function ChangePasswordPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const t = useTranslations('settings.changePassword')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPasswordValue, setNewPasswordValue] = useState('')
  
  const changePasswordSchema = createChangePasswordSchema(t)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useZodForm(changePasswordSchema)

  // パスワード値を監視して状態を更新
  const newPassword = watch('newPassword')

  // useEffectを使って状態更新を行う（無限ループを防止）
  useEffect(() => {
    if (newPassword !== newPasswordValue) {
      setNewPasswordValue(newPassword || '')
    }
  }, [newPassword, newPasswordValue])

  const toggleCurrentPassword = useCallback(() => {
    setShowCurrentPassword((prev) => !prev)
  }, [])

  const toggleNewPassword = useCallback(() => {
    setShowNewPassword((prev) => !prev)
  }, [])

  const toggleConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev)
  }, [])

  const onSubmit = async (data: z.infer<typeof changePasswordSchema>) => {
    if (!isLoaded) {
      return
    }

    try {
      // 送信アニメーションのために少し遅延
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Clerk の update 関数を利用してパスワード変更を実行
      await user?.updatePassword({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
      })

      toast.success(t('success.title'), {
        description: t('success.description'),
        icon: <CheckCircle2Icon className="h-4 w-4 text-active" />,
      })

      router.push(`/dashboard`)
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || ''
      if (errorMessage.includes('data breach')) {
        toast.error(t('errors.breachedPassword'), {
          description: t('errors.breachedPasswordDescription'),
          icon: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
        })
      } else {
        toast.error(t('errors.updateFailed'), {
          description: t('errors.tryAgain'),
          icon: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
        })
      }
    }
  }

  return (
    <div className="max-w-md mx-auto py-4">
      <div className="space-y-2">
        <div className="space-y-1 pb-2">
          <div className="flex items-center justify-center mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-full bg-muted">
                    <ShieldCheckIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('tooltips.security')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardTitle className="text-2xl font-bold text-center">{t('title')}</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {t('subtitle')}
          </CardDescription>
        </div>

        <Separator className="my-2 w-1/2 mx-auto" />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault()
            }
          }}
        >
          <PasswordInput
            id="currentPassword"
            label={t('currentPassword')}
            icon={<KeyIcon className="h-4 w-4 mr-2 text-muted-foreground" />}
            placeholder={t('currentPasswordPlaceholder')}
            register={register}
            showPassword={showCurrentPassword}
            togglePassword={toggleCurrentPassword}
            error={errors.currentPassword}
          />

          <PasswordInput
            id="newPassword"
            label={t('newPassword')}
            icon={<LockIcon className="h-4 w-4 mr-2 text-muted-foreground" />}
            placeholder={t('newPasswordPlaceholder')}
            register={register}
            showPassword={showNewPassword}
            togglePassword={toggleNewPassword}
            error={errors.newPassword}
          />

          {newPasswordValue && <PasswordStrengthIndicator password={newPasswordValue} t={t} />}

          <PasswordInput
            id="confirmNewPassword"
            label={t('confirmPassword')}
            icon={<ShieldCheckIcon className="h-4 w-4 mr-2 text-muted-foreground" />}
            placeholder={t('confirmPasswordPlaceholder')}
            register={register}
            showPassword={showConfirmPassword}
            togglePassword={toggleConfirmPassword}
            error={errors.confirmNewPassword}
          />

          <div className="">
            <Button type="submit" className="w-full" disabled={isSubmitting} variant="default">
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('processing')}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  {t('submitButton')}
                </span>
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-col justify-center text-xs text-center text-muted-foreground">
          <p>{t('requirementsText')}</p>
        </div>
      </div>
    </div>
  )
}
