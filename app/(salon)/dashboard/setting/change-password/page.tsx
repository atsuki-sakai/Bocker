"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useZodForm } from "@/hooks/useZodForm";
import { UseFormRegister, FieldError } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, memo, useCallback, useEffect } from 'react';
import {
  EyeOffIcon,
  EyeIcon,
  ShieldCheckIcon,
  KeyIcon,
  LockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2,
} from 'lucide-react';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// パスワード変更用のバリデーションスキーマ
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, '現在のパスワードを入力してください'),
    newPassword: z.string().min(6, '新しいパスワードは6文字以上必要です'),
    confirmNewPassword: z.string().min(6, '確認用パスワードは6文字以上必要です'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: '新しいパスワードと確認用パスワードが一致しません',
    path: ['confirmNewPassword'],
  });

// パスワード強度を評価する関数
const calculatePasswordStrength = (password: string) => {
  if (!password) return 0;

  let strength = 0;

  // 長さによるボーナス
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;

  // 文字種類によるボーナス
  if (/[A-Z]/.test(password)) strength += 20; // 大文字
  if (/[a-z]/.test(password)) strength += 20; // 小文字
  if (/[0-9]/.test(password)) strength += 20; // 数字
  if (/[^A-Za-z0-9]/.test(password)) strength += 20; // 特殊文字

  return Math.min(strength, 100);
};

// パスワード強度のラベルを取得する関数
const getStrengthLabel = (strength: number) => {
  if (strength < 30) return { label: '非常に弱い', color: 'bg-destructive' };
  if (strength < 50) return { label: '弱い', color: 'bg-orange-500' };
  if (strength < 70) return { label: '普通', color: 'bg-yellow-500' };
  if (strength < 90) return { label: '強い', color: 'bg-emerald-500' };
  return { label: '非常に強い', color: 'bg-green-500' };
};

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
));
PasswordToggleButton.displayName = 'PasswordToggleButton';

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
    register: UseFormRegister<z.infer<typeof changePasswordSchema>>
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
          {...register(id as keyof z.infer<typeof changePasswordSchema>)}
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
const PasswordStrengthIndicator = memo(({ password }: { password: string }) => {
  const strength = calculatePasswordStrength(password)
  const { label, color } = getStrengthLabel(strength)

  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span>パスワード強度:</span>
        <span className="font-medium">{label}</span>
      </div>
      <Progress value={strength} className="h-2" color={color} />

      <div className="grid grid-cols-4 gap-1 mt-2">
        {[
          { label: '大文字', match: /[A-Z]/ },
          { label: '小文字', match: /[a-z]/ },
          { label: '数字', match: /[0-9]/ },
          { label: '記号', match: /[^A-Za-z0-9]/ },
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPasswordValue, setNewPasswordValue] = useState('')

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

      toast.success('パスワードが更新されました', {
        description: 'セキュリティが強化されました',
        icon: <CheckCircle2Icon className="h-4 w-4 text-active" />,
      })

      router.push(`/dashboard`)
    } catch (error) {
      console.error(error)
      toast.error('パスワードの更新に失敗しました', {
        description: 'もう一度お試しください',
        icon: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
      })
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
                  <p>セキュリティを強化</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardTitle className="text-2xl font-bold text-center">パスワード変更</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            安全なパスワードを設定して、アカウントを保護しましょう
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
            label="現在のパスワード"
            icon={<KeyIcon className="h-4 w-4 mr-2 text-muted-foreground" />}
            placeholder="現在のパスワードを入力"
            register={register}
            showPassword={showCurrentPassword}
            togglePassword={toggleCurrentPassword}
            error={errors.currentPassword}
          />

          <PasswordInput
            id="newPassword"
            label="新しいパスワード"
            icon={<LockIcon className="h-4 w-4 mr-2 text-muted-foreground" />}
            placeholder="新しいパスワードを入力"
            register={register}
            showPassword={showNewPassword}
            togglePassword={toggleNewPassword}
            error={errors.newPassword}
          />

          {newPasswordValue && <PasswordStrengthIndicator password={newPasswordValue} />}

          <PasswordInput
            id="confirmNewPassword"
            label="新しいパスワード（確認）"
            icon={<ShieldCheckIcon className="h-4 w-4 mr-2 text-muted-foreground" />}
            placeholder="新しいパスワードを再入力"
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
                  処理中...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  パスワードを更新する
                </span>
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-col justify-center text-xs text-center text-muted-foreground">
          <p>強力なパスワードは文字、数字、記号を組み合わせたものがおすすめです</p>
        </div>
      </div>
    </div>
  )
}