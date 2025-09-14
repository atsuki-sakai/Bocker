'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Loading } from '@/components/common'

// LINEコールバックを処理するリダイレクトページ
export default function CustomerRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const [isProcessingCallback, setIsProcessingCallback] = useState(false)

  useEffect(() => {
    async function handleLineCallback() {
      if (isProcessingCallback) return

      // URLパラメータから情報を取得
      const liffRedirectUri = searchParams.get('liffRedirectUri')
      const state = searchParams.get('state')
      const tid = searchParams.get('tid')
      const oid = searchParams.get('oid')

      console.log('[CustomerRedirect] URL params:', {
        liffRedirectUri,
        state,
        tid,
        oid,
      })

      // LINEコールバックではない場合、ホームにリダイレクト
      if (!liffRedirectUri && !state) {
        console.log('[CustomerRedirect] Not a LINE callback, redirecting to home')
        router.push('/')
        return
      }

      setIsProcessingCallback(true)

      try {
        // state検証（skipValidation=trueで二重読み取り防止）
        const stateResponse = await fetch(`/api/auth/line-state?stateId=${state}&skipValidation=true`, {
          method: 'GET',
          credentials: 'include',
        })

        if (stateResponse.ok) {
          const stateData = await stateResponse.json()
          const tenantId = tid || stateData.tenantId
          const orgId = oid || stateData.orgId
          const isCustomerLogin = stateData.isCustomerLogin

          console.log('[CustomerRedirect] State validation successful:', {
            tenantId,
            orgId,
            isCustomerLogin,
          })

          // 顧客ログインの場合、適切なページにリダイレクト
          if (isCustomerLogin && tenantId && orgId) {
            // 元のログインページにパラメータを引き継いでリダイレクト
            const loginUrl = new URL(
              `/${locale}/customer/${orgId}/auth/login`,
              window.location.origin
            )
            
            // LINEコールバックパラメータを追加
            if (liffRedirectUri) loginUrl.searchParams.set('liffRedirectUri', liffRedirectUri)
            if (state) loginUrl.searchParams.set('state', state)
            if (tid) loginUrl.searchParams.set('tid', tid)
            if (oid) loginUrl.searchParams.set('oid', oid)

            console.log('[CustomerRedirect] Redirecting to customer login:', loginUrl.toString())
            router.push(loginUrl.pathname + loginUrl.search)
          } else {
            // 顧客ログインでない場合、エラー
            toast.error('不正なログインフローです')
            router.push('/')
          }
        } else {
          console.error('[CustomerRedirect] State validation failed')
          toast.error('認証情報の検証に失敗しました')
          router.push('/')
        }
      } catch (error) {
        console.error('[CustomerRedirect] Error processing callback:', error)
        toast.error('エラーが発生しました')
        router.push('/')
      }
    }

    handleLineCallback()
  }, [router, locale, searchParams, isProcessingCallback])

  return <Loading />
}