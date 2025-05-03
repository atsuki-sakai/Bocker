'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLiff } from '@/hooks/useLiff'

import { getCookie, setCookie, deleteCookie } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { handleErrorToMsg } from '@/lib/error'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink } from 'lucide-react'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'

export default function ReserveRedirectPage() {
  const { liff } = useLiff()
  const router = useRouter()
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const createCompleteFields = useMutation(api.customer.core.mutation.createCompleteFields)
  const updateCustomer = useMutation(api.customer.core.mutation.updateRelatedTables)

  useEffect(() => {
    async function initLiff() {
      if (!liff?.isLoggedIn()) {
        console.error('LIFF not logged in')
        throw new Error('LIFF not logged in')
      }

      const profile = await liff?.getProfile()
      const sessionCookie = getCookie(LINE_LOGIN_SESSION_KEY)
      if (sessionCookie === null) {
        console.error('Session cookie not found')
        throw new Error('Session cookie not found')
      }

      const { salonId } = JSON.parse(sessionCookie ?? '')
      if (!salonId) {
        console.error('storeId is missing in session cookie')
        throw new Error('storeId is missing in session cookie')
      }

      const computedRedirectUrl = `/reservation/${salonId}/calendar`
      setRedirectUrl(computedRedirectUrl)
      deleteCookie(LINE_LOGIN_SESSION_KEY)

      let newSession = JSON.stringify({
        salonId: salonId,
        lineId: profile?.userId,
        lineUserName: profile?.displayName,
      })

      try {
        const existingCustomer = await fetchQuery(api.customer.core.query.findByLineId, {
          lineId: profile?.userId ?? '',
          salonId: salonId,
        })

        console.log('既存顧客:', existingCustomer)

        const userEmail = liff?.getDecodedIDToken()?.email || ''
        if (!existingCustomer) {
          await createCompleteFields({
            salonId: salonId,
            lineId: profile?.userId,
            lineUserName: profile?.displayName || '',
            email: userEmail,
            phone: undefined,
            tags: ['LINE'],
          })
          console.log('新規顧客を作成しました')
        } else {
          await updateCustomer({
            customerId: existingCustomer._id,
            salonId: salonId,
            lineId: profile?.userId ?? '',
            lineUserName: profile?.displayName || '',
            email: existingCustomer.email || userEmail,
            phone: existingCustomer.phone || '',
          })
          newSession = JSON.stringify({
            customerId: existingCustomer._id,
            salonId: salonId,
            lineId: profile?.userId,
            email: existingCustomer.email || userEmail,
            phone: existingCustomer.phone || '',
            lineUserName: profile?.displayName || '',
          })
          console.log('既存顧客情報を更新しました')
        }
      } catch (error) {
        const errorMessage = handleErrorToMsg(error)
        console.error(errorMessage)
      }

      // セッションクッキーの保存を確実に行う
      console.log('保存するセッション情報:', newSession)
      setCookie(LINE_LOGIN_SESSION_KEY, newSession, 60)

      // 短いディレイを追加してクッキーの保存を確実にする
      setTimeout(() => {
        // 保存されたかを確認
        const savedSession = getCookie(LINE_LOGIN_SESSION_KEY)
        console.log('保存されたセッション情報:', savedSession)

        if (!savedSession) {
          console.warn('セッションの保存に失敗した可能性があります。再試行します。')
          // 再試行
          setCookie(LINE_LOGIN_SESSION_KEY, newSession, 60)
        }

        // リダイレクト
        router.push(computedRedirectUrl)
      }, 300) // 300ミリ秒待機
    }

    if (liff) {
      initLiff()
    }
  }, [liff, router, createCompleteFields, updateCustomer])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            Bcker
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            ログイン中のユーザー情報を処理しています。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-6 py-6">
          <div className="relative">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-white"></div>
            </div>
          </div>
          <p className="text-center text-gray-700 font-medium animate-pulse">リダイレクト中...</p>
          <p className="text-center text-sm text-gray-500 max-w-xs">
            お客様の情報を確認し、予約ページへ移動しています。しばらくお待ちください。
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-0">
          <div className="text-xs text-gray-500 text-center">
            画面が切り替わらない場合は下のボタンをクリックしてください
          </div>
          <Button
            variant="default"
            className="w-full flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-500"
            asChild
          >
            <Link href={redirectUrl ?? '#'}>
              <span className="text-white font-bold">予約ページへ移動</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
