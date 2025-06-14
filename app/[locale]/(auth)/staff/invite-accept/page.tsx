// app/(auth)/staff/invite-accept/page.tsx
// 招待受け入れページ - スタッフが招待リンクからアクセスするサインアップページ
'use client'

import { SignUp } from '@clerk/nextjs'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'

// サインアップコンポーネント（Suspenseでラップ）
function InviteSignUpContent() {
  const t = useTranslations('auth.staffInvite')
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <SignUp
        // サインイン画面への切り替えURL
        signInUrl="/sign-in"
        // サインアップ後のリダイレクト先
        fallbackRedirectUrl="/dashboard"
        // hash-basedルーティングを使用
        routing="hash"
        // 外観設定 - 既存のサインアップページと統一
        appearance={{
          elements: {
            // フォームの外観調整
            formButtonPrimary: 'bg-primary hover:bg-primary text-sm normal-case transition-colors',
            card: 'shadow-none border-0 bg-background',
            headerTitle: 'text-xl font-semibold text-primary',
            headerSubtitle: 'text-sm text-muted-foreground',
            socialButtonsBlockButton:
              'text-sm normal-case border border-border hover:bg-muted transition-colors',
            formFieldInput:
              'border border-border focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
            formFieldLabel: 'text-sm font-medium text-primary',
            identityPreviewText: 'text-sm text-muted-foreground',
            identityPreviewEditButton: 'text-primary hover:text-primary',
            formFieldSuccessText: 'text-active',
            formFieldErrorText: 'text-destructive',
            footerActionText: 'text-muted-foreground',
            footerActionLink: 'text-primary hover:text-primary',
          },
        }}
      />
      {/* 注意事項カード */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      >
        <Card className="max-w-sm w-full bg-link border border-link-foreground my-5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-link-foreground rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="h-3 w-3 text-background" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-link-foreground">
                  {t('aboutAccountCreation')}
                </p>
                <p className="text-xs text-muted-foreground">{t('instructions')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// メインページコンポーネント
export default function InviteAcceptPage() {
  const t = useTranslations('auth.staffInvite')
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          </motion.div>
        </div>
      }
    >
      <InviteSignUpContent />
    </Suspense>
  )
}
