// app/(auth)/invite-accept/page.tsx
// 招待受け入れページ - スタッフが招待リンクからアクセスするサインアップページ
'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, CheckCircle } from 'lucide-react'

// サインアップコンポーネント（Suspenseでラップ）
function InviteSignUpContent() {
  const searchParams = useSearchParams()

  // URLパラメータから招待情報を取得（デバッグ用）
  const invitationToken = searchParams.get('__clerk_invitation_token')

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6"
      >
        {/* ヘッダー情報カード */}
        <Card className="border-0 shadow-lg shadow-blue-100/20">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"
            >
              <Users className="h-8 w-8 text-primary" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <CardTitle className="text-2xl font-bold">スタッフ招待</CardTitle>
              <CardDescription className="mt-2">
                招待されたスタッフアカウントを作成してください
              </CardDescription>
            </motion.div>

            {invitationToken && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="flex items-center justify-center gap-2"
              >
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  有効な招待リンク
                </Badge>
              </motion.div>
            )}
          </CardHeader>
        </Card>

        {/* Clerk SignUpコンポーネント */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="shadow-lg rounded-lg overflow-hidden"
        >
          <SignUp
            // サインイン画面への切り替えURL
            signInUrl="/sign-in"
            // サインアップ後のリダイレクト先
            fallbackRedirectUrl="/dashboard"
            // 外観設定 - 既存のサインアップページと統一
            appearance={{
              elements: {
                // フォームの外観調整
                formButtonPrimary:
                  'bg-primary hover:bg-primary/90 text-sm normal-case transition-colors',
                card: 'shadow-none border-0 bg-background',
                headerTitle: 'text-xl font-semibold text-primary',
                headerSubtitle: 'text-sm text-muted-foreground',
                socialButtonsBlockButton:
                  'text-sm normal-case border border-border hover:bg-muted transition-colors',
                formFieldInput:
                  'border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors',
                formFieldLabel: 'text-sm font-medium text-primary',
                identityPreviewText: 'text-sm text-muted-foreground',
                identityPreviewEditButton: 'text-primary hover:text-primary/80',
                formFieldSuccessText: 'text-green-600',
                formFieldErrorText: 'text-destructive',
                footerActionText: 'text-muted-foreground',
                footerActionLink: 'text-primary hover:text-primary/80',
              },
            }}
          />
        </motion.div>

        {/* 注意事項カード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <Card className="bg-blue-50/50 border-blue-200/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="h-3 w-3 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">アカウント作成について</p>
                  <p className="text-xs text-blue-700">
                    アカウント作成後、自動的にサロンメンバーとして登録され、
                    適切な権限が付与されます。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

// メインページコンポーネント
export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </motion.div>
        </div>
      }
    >
      <InviteSignUpContent />
    </Suspense>
  )
}
