'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { setCookie } from '@/lib/utils'
import { useLiff } from '@/hooks/useLiff'
import { Lock, Bell, CheckCircle, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'

export default function ReservePage() {
  const params = useParams()
  const { liff } = useLiff()

  const id = params.id as string

  const handleLogin = () => {
    console.log('liff', liff)
    if (!liff?.isInClient()) {
      console.log('liff?.isInClient()', liff?.isInClient())
      const session = JSON.stringify({
        salonId: id,
      })
      console.log('session', session)

      setCookie(LINE_LOGIN_SESSION_KEY, session, 60)
      liff?.login()
    }
  }

  const benefits = [
    {
      icon: <Bell className="h-5 w-5 text-green-600" />,
      text: '予約の確認や変更の通知をLINEで受け取れます',
    },
    {
      icon: <Lock className="h-5 w-5 text-green-600" />,
      text: '安全なログインで個人情報を保護します',
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      text: '次回からの予約がスムーズになります',
    },
  ]

  return (
    <div className="w-full  mx-auto bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <motion.div
        className="flex items-center justify-center px-4 pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md shadow-lg border-none mt-4">
          <CardHeader className="pb-0">
            <div className="flex flex-col items-start">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                Bcker
              </h1>
              <span className="text-xs scale-75 -ml-5 -mt-1.5 text-gray-600">
                予約を簡単・便利に
              </span>
            </div>
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image src="/assets/images/line-logo.png" alt="LINE" width={40} height={40} />
            </div>
            <CardTitle className="text-center text-xl text-slate-800 tracking-wider">
              LINEで簡単ログイン
            </CardTitle>
            <CardDescription className="text-center pt-2 tracking-wide text-xs">
              予約情報の設定と管理のために
              <br />
              LINEアカウントとの連携が必要です
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-4 mb-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-3 bg-gradient-to-r from-blue-50/50 to-white p-3 rounded-lg"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
                >
                  {benefit.icon}
                  <p className="text-sm text-slate-700">{benefit.text}</p>
                </motion.div>
              ))}
            </div>

            <div className="w-full h-px bg-gray-200 my-5" />

            <p className="text-xs text-center text-gray-600 mb-4">
              ログインすることで、当サービスの
              <span className="underline text-blue-600 cursor-pointer mx-1">利用規約</span>
              および
              <span className="underline text-blue-600 cursor-pointer mx-1">
                プライバシーポリシー
              </span>
              に同意したものとします。
            </p>
          </CardContent>

          <CardFooter className="flex justify-center pb-6">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="bg-green-600 hover:bg-green-500 px-8 py-6 w-full"
                onClick={handleLogin}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-white font-bold text-lg">LINEでログイン</span>
                  <ChevronRight className="h-5 w-5 text-white" />
                </div>
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
