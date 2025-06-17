'use client'

import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Id } from '@/convex/_generated/dataModel'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link } from '@/i18n/navigation'

interface CustomerLoginPageProps {
  params: {
    org_id: string
  }
}

export const CustomerLoginPage = ({ params }: CustomerLoginPageProps) => {
  const { org_id } = params
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    /**
     * 返却されるSessionデータ
     * customerUid: customer.uid,
     * email: customer.email || '',
     * tenantId: validatedData.tenantId,
     * orgId: validatedData.orgId,
     */
    fetch('/api/auth/session', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          console.log('[useEffect] Session check failed:', res)
          // セッションが見つからない場合は正常な動作なので、エラーとして扱わない
          return null
        }
        console.log('[useEffect] Session check successful:', res)
        return res.json()
      })
      .then((data) => {
        console.log('[useEffect] Session check data:', data)
        if (data && data.session) {
          router.push(`/${locale}/customer/${data.session.customerUid}/profile`)
        }
      })
      .catch((error) => {
        // ネットワークエラーなど、本当のエラーのみログ出力
        console.error('Session check failed:', error)
      })
  }, [router])
  return (
    <div>
      <h1>ログイン</h1>
      <Link href={`/${locale}/reservation/${org_id}`}>
        初めての方はこちらから予約を始めましょう ！
      </Link>
      <div>
        <Input type="email" placeholder="メールアドレス" />
        <Input type="password" placeholder="パスワード" />
        <Button>ログイン</Button>

        <div>or</div>

        <div>
          <Button>LINEでログイン</Button>
        </div>
      </div>
    </div>
  )
}

export default CustomerLoginPage
