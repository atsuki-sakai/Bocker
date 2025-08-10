import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home, { generateMetadata } from '../page'

// 部分モックを使用して必要な関数のみをモック
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => {
      // 言語に応じた翻訳を返す
      const translations: Record<string, string> = {
        'ja': '日本語',
        'en': 'English',
      }
      return translations[key] || key
    }),
    useLocale: vi.fn(() => 'ja'), // デフォルトのロケールを設定
  }
})


describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateMetadata', () => {
    it('正しいメタデータを生成する', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const metadata = await generateMetadata({ params })

      expect(metadata.title).toBe('Bocker - 美容サロン向け予約管理システム')
      expect(metadata.description).toBe(
        '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム'
      )
      expect(metadata.keywords).toBe('予約管理,美容サロン,SaaS')
    })

    // 他のmetadataテスト...
  })

  describe('Home Component', () => {
    it('LandingPageClientコンポーネントを正しくレンダリングする', async () => {
      // 非同期コンポーネントを解決
      const params = Promise.resolve({ locale: 'ja' })
      const HomeComponent = await Home({ params })
      
      // React要素をレンダリング（すでに解決済みのためawait不要）
      render(HomeComponent)

      // data-testid属性で要素を確認
      expect(screen.getByTestId('landing-page-client')).toBeInTheDocument()
      expect(screen.getByTestId('main')).toBeInTheDocument()
    })

    it('構造化データのscriptタグを含む', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const HomeComponent = await Home({ params })
      const { container } = render(HomeComponent)

      const scripts = container.querySelectorAll('script[type="application/ld+json"]')
      expect(scripts.length).toBeGreaterThanOrEqual(1)

      // 最初のscriptタグの内容を確認
      if (scripts[0]) {
        const scriptContent = scripts[0].textContent
        expect(scriptContent).toBeTruthy()
        if (scriptContent) {
          const json = JSON.parse(scriptContent)
          console.log(json)
          expect(json.url).toBe('https://bocker.jp')
          expect(json.logo).toBe('https://bocker.jp/assets/images/logo.png')
        }
      }
    })
  })
})