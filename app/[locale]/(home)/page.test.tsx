import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home, { generateMetadata } from './page'
import { redirect } from 'next/navigation'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(() => {
    const translations: Record<string, string> = {
      'meta.title': 'Bocker - 美容サロン向け予約管理システム',
      'meta.description': '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム',
      'meta.keywords': '予約管理,美容サロン,SaaS',
      'meta.siteName': 'Bocker',
      'ogp.title': 'Bocker - 美容サロン向け予約管理システム',
      'ogp.description': '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム',
      'ogp.imageAlt': 'Bocker ロゴ',
      'twitter.title': 'Bocker - 美容サロン向け予約管理システム',
      'twitter.description': '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム',
      'structuredData.organization.name': 'Bocker',
      'structuredData.organization.alternateName': 'ブッカー',
      'structuredData.organization.description': '美容サロン向け予約管理システム',
      'structuredData.organization.address.locality': '東京',
      'structuredData.organization.address.region': '東京都',
      'structuredData.application.name': 'Bocker',
      'structuredData.application.description': '美容サロン向け予約管理システム',
      'structuredData.application.offers.lite.name': 'Liteプラン',
      'structuredData.application.offers.lite.description': '基本的な予約管理機能',
      'structuredData.application.offers.pro.name': 'Proプラン',
      'structuredData.application.offers.pro.description': '高度な予約管理機能',
      'structuredData.website.name': 'Bocker',
      'structuredData.website.description': '美容サロン向け予約管理システム',
    }
    return (key: string) => translations[key] || key
  }),
}))

// LandingPageClient モック
vi.mock('./LandingPageClient', () => {
  const MockLandingPageClient = vi.fn(({ locale }: { locale: string }) => {
    return (
      <div data-testid="landing-page-client">
        <h1>Landing Page</h1>
        <p data-testid="locale-display">Locale: {locale}</p>
      </div>
    )
  })
  
  return {
    LandingPageClient: MockLandingPageClient,
  }
})

// redirect は vitest.setup.ts でモック済み

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateMetadata', () => {
    it('正しいメタデータを生成する', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const metadata = await generateMetadata({ params })

      expect(metadata.title).toBe('Bocker - 美容サロン向け予約管理システム')
      expect(metadata.description).toBe('美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム')
      expect(metadata.keywords).toBe('予約管理,美容サロン,SaaS')
    })

    it('正しいOGPデータを生成する', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const metadata = await generateMetadata({ params })

      expect(metadata.openGraph?.title).toBe('Bocker - 美容サロン向け予約管理システム')
      expect(metadata.openGraph?.description).toBe('美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム')
      expect(metadata.openGraph?.type).toBe('website')
      expect(metadata.openGraph?.locale).toBe('ja_JP')
    })

    it('英語ロケールで正しいURLを設定する', async () => {
      const params = Promise.resolve({ locale: 'en' })
      const metadata = await generateMetadata({ params })

      expect(metadata.alternates?.canonical).toBe('/en/')
      expect(metadata.openGraph?.url).toBe('/en/')
      expect(metadata.openGraph?.locale).toBe('en_US')
    })
  })

  describe('Home Component', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('LandingPageClientコンポーネントを正しくレンダリングする', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const searchParams = Promise.resolve({})

      const HomeComponent = await Home({ params, searchParams })
      render(HomeComponent)

      expect(screen.getByTestId('landing-page-client')).toBeInTheDocument()
      expect(screen.getByText('Landing Page')).toBeInTheDocument()
      expect(screen.getByTestId('locale-display')).toHaveTextContent('Locale: ja')
    })

    it('構造化データのscriptタグを含む', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const searchParams = Promise.resolve({})

      const HomeComponent = await Home({ params, searchParams })
      const { container } = render(HomeComponent)

      const scripts = container.querySelectorAll('script[type="application/ld+json"]')
      expect(scripts.length).toBe(3) // organization, application, website
      
      // 最初のscriptの内容をチェック
      const firstScript = scripts[0]
      const scriptContent = firstScript.textContent
      expect(scriptContent).toContain('"@type":"Organization"')
      expect(scriptContent).toContain('Bocker')
    })

    it('LINE認証パラメータがある場合にリダイレクトする', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const searchParams = Promise.resolve({
        'liff.state': '/reservation/test',
        code: 'auth-code',
        state: 'auth-state',
        liffClientId: 'client-id',
        liffRedirectUri: 'redirect-uri',
      })

      await Home({ params, searchParams })

      expect(redirect).toHaveBeenCalledWith(
        '/ja/reservation?state=auth-state&code=auth-code&liffClientId=client-id&liffRedirectUri=redirect-uri'
      )
    })

    it('LINE認証パラメータがreservationを含まない場合はリダイレクトしない', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const searchParams = Promise.resolve({
        'liff.state': '/other-path',
        code: 'auth-code',
        state: 'auth-state',
      })

      const HomeComponent = await Home({ params, searchParams })
      render(HomeComponent)

      expect(redirect).not.toHaveBeenCalled()
      expect(screen.getByTestId('landing-page-client')).toBeInTheDocument()
    })
  })
})