'use server'

import { LandingPageClient } from './LandingPageClient'
import { redirect } from 'next/navigation'

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale } = await params
  const searchParamsData = await searchParams

  // LINE認証のコールバックをチェック
  if (searchParamsData['liff.state'] && searchParamsData.code && searchParamsData.state) {
    console.log('[Home] LINE OAuth callback detected')
    console.log('[Home] All search params:', searchParamsData)

    // liff.stateから実際のリダイレクト先を抽出
    const liffState = searchParamsData['liff.state'] as string
    console.log('[Home] liff.state:', liffState)

    if (liffState.includes('/reservation')) {
      // LINE認証のコールバックを予約ページにリダイレクト
      const redirectPath = `/${locale}/reservation`
      const queryParams = new URLSearchParams({
        state: searchParamsData.state as string,
        code: searchParamsData.code as string,
        liffClientId: (searchParamsData.liffClientId as string) || '',
        liffRedirectUri: (searchParamsData.liffRedirectUri as string) || '',
      })

      console.log('[Home] Redirecting to:', `${redirectPath}?${queryParams.toString()}`)
      redirect(`${redirectPath}?${queryParams.toString()}`)
    }
  }

  return <LandingPageClient locale={locale} />
}