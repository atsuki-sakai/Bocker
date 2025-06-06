// app/dashboard/setup/complete/page.tsx
// スタッフ招待完了ページ - サインアップ完了後の案内ページ
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight, Users } from 'lucide-react'

export default function SetupCompletePage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()

  // 5秒後に自動的にダッシュボードへリダイレクト
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  // ユーザー情報読み込み中
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-6"
      >
        {/* 完了メッセージカード */}
        <Card className="border-0 shadow-lg shadow-green-100/20">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="h-10 w-10 text-green-600" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <CardTitle className="text-2xl font-bold text-green-800">
                招待完了！
              </CardTitle>
              <CardDescription className="mt-2 text-green-600">
                {user?.emailAddresses[0]?.emailAddress}
                <br />
                スタッフアカウントが正常に作成されました
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ウェルカムメッセージ */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="bg-blue-50 p-4 rounded-lg border border-blue-200"
            >
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    ようこそ、{user?.firstName || 'スタッフ'}さん！
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    サロンメンバーとして登録され、適切な権限が付与されました。
                    まもなくダッシュボードに移動します。
                  </p>
                </div>
              </div>
            </motion.div>

            {/* アクションボタン */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="flex flex-col gap-3"
            >
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
                size="lg"
              >
                ダッシュボードへ進む
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                5秒後に自動的に移動します
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}