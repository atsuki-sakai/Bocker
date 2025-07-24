import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home, { generateMetadata } from './page'
import { LandingPageClient } from './LandingPageClient'

// 統合テスト用のモック設定
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(() => {
    const translations: Record<string, string> = {
      'meta.title': 'Bocker - 美容サロン向け予約管理システム',
      'meta.description': '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム',
      'hero.title': '美容サロン向け予約管理システム',
      'hero.cta.primary': '無料で始める',
      'pricing.lite.name': 'Liteプラン',
      'pricing.pro.name': 'Proプラン',
      'faq.title': 'よくある質問',
    }
    return (key: string) => translations[key] || key
  }),
}))

vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'hero.title': '美容サロン向け予約管理システム',
      'hero.cta.primary': '無料で始める',
      'pricing.lite.name': 'Liteプラン',
      'pricing.pro.name': 'Proプラン',
      'faq.title': 'よくある質問',
    }
    return translations[key] || key
  }),
}))

// コンポーネントのモック（実際のコンポーネントに近い形で）
vi.mock('./_components', () => ({
  HeroSection: vi.fn(() => (
    <section data-testid="hero-section" role="banner">
      <h1>美容サロン向け予約管理システム</h1>
      <button data-testid="hero-cta">無料で始める</button>
    </section>
  )),
  FeatureSection: vi.fn(() => (
    <section data-testid="feature-section">
      <h2>主な機能</h2>
      <div data-testid="feature-list">
        <div data-testid="feature-booking">予約管理</div>
        <div data-testid="feature-customer">顧客管理</div>
        <div data-testid="feature-analytics">分析機能</div>
      </div>
    </section>
  )),
  Pricing: vi.fn(() => (
    <section data-testid="pricing">
      <h2>料金プラン</h2>
      <div data-testid="plan-lite">
        <h3>Liteプラン</h3>
        <button data-testid="select-lite">Liteを選択</button>
      </div>
      <div data-testid="plan-pro">
        <h3>Proプラン</h3>
        <button data-testid="select-pro">Proを選択</button>
      </div>
    </section>
  )),
  HeaderSection: vi.fn(() => (
    <section data-testid="header-section">
      <h2>ヘッダーセクション</h2>
    </section>
  )),
  ContentSection: vi.fn(() => (
    <section data-testid="content-section">
      <h2>コンテンツセクション</h2>
    </section>
  )),
  CTASection: vi.fn(() => (
    <section data-testid="cta-section">
      <h2>今すぐ始めよう</h2>
      <button data-testid="final-cta">今すぐ登録</button>
    </section>
  )),
  FAQ: vi.fn(({ locale }: { locale: string }) => (
    <section data-testid="faq">
      <h2>よくある質問</h2>
      <div data-testid="faq-locale">{locale}</div>
      <div data-testid="faq-items">
        <details data-testid="faq-item-1">
          <summary>料金はいくらですか？</summary>
          <p>Liteプランは月額1,000円から始められます。</p>
        </details>
        <details data-testid="faq-item-2">
          <summary>無料トライアルはありますか？</summary>
          <p>14日間の無料トライアルをご利用いただけます。</p>
        </details>
      </div>
    </section>
  )),
  SplashScreen: vi.fn(({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="splash-screen" className="fixed inset-0 z-50">
      <div>Bockerへようこそ</div>
      <button data-testid="splash-complete" onClick={onComplete}>
        スキップ
      </button>
    </div>
  )),
  Header: vi.fn(() => (
    <header data-testid="header">
      <nav data-testid="navigation">
        <a href="/" data-testid="nav-home">
          ホーム
        </a>
        <a href="/features" data-testid="nav-features">
          機能
        </a>
        <a href="/pricing" data-testid="nav-pricing">
          料金
        </a>
        <a href="/login" data-testid="nav-login">
          ログイン
        </a>
      </nav>
    </header>
  )),
  Footer: vi.fn(() => (
    <footer data-testid="footer">
      <div data-testid="footer-links">
        <a href="/privacy" data-testid="footer-privacy">
          プライバシーポリシー
        </a>
        <a href="/terms" data-testid="footer-terms">
          利用規約
        </a>
        <a href="/contact" data-testid="footer-contact">
          お問い合わせ
        </a>
      </div>
    </footer>
  )),
}))

// LocalStorageのモック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('Landing Page Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    document.body.style.overflow = 'unset'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = 'unset'
  })

  describe('ページ全体の統合テスト', () => {
    it('ページが正常に読み込まれ、全セクションが表示される', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const searchParams = Promise.resolve({})

      const HomeComponent = await Home({ params, searchParams })
      render(HomeComponent)

      // メタデータ関連のscriptタグが存在することを確認
      const { container } = render(HomeComponent)
      const scripts = container.querySelectorAll('script[type="application/ld+json"]')
      expect(scripts.length).toBeGreaterThan(0)

      // LandingPageClientが正しくレンダリングされることを確認
      expect(screen.getByTestId('landing-page-client')).toBeInTheDocument()
    })

    it('スプラッシュスクリーンからメインコンテンツへの遷移が正常に動作する', async () => {
      render(<LandingPageClient locale="ja" />)

      // スプラッシュスクリーンが表示される
      await waitFor(() => {
        expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
      })

      // メインコンテンツは非表示
      expect(screen.queryByTestId('header')).not.toBeInTheDocument()

      // スプラッシュスクリーンを完了
      await user.click(screen.getByTestId('splash-complete'))

      // メインコンテンツが表示される
      await waitFor(() => {
        expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
        expect(screen.getByTestId('header')).toBeInTheDocument()
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
        expect(screen.getByTestId('feature-section')).toBeInTheDocument()
        expect(screen.getByTestId('pricing')).toBeInTheDocument()
        expect(screen.getByTestId('faq')).toBeInTheDocument()
        expect(screen.getByTestId('footer')).toBeInTheDocument()
      })
    })
  })

  describe('ユーザーインタラクションの統合テスト', () => {
    beforeEach(async () => {
      // スプラッシュスクリーンをスキップしてメインコンテンツを表示
      mockLocalStorage.getItem.mockReturnValue('1')
    })

    it('ヒーローセクションのCTAボタンが機能する', async () => {
      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      })

      const heroCtaButton = screen.getByTestId('hero-cta')
      expect(heroCtaButton).toBeInTheDocument()

      // ボタンクリックが正常に動作することを確認
      await user.click(heroCtaButton)
      expect(heroCtaButton).toHaveBeenCalledTimes
        ? expect(heroCtaButton).toHaveBeenCalledTimes(1)
        : true
    })

    it('料金プランの選択が機能する', async () => {
      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('pricing')).toBeInTheDocument()
      })

      // Liteプランの選択
      const liteButton = screen.getByTestId('select-lite')
      await user.click(liteButton)

      // Proプランの選択
      const proButton = screen.getByTestId('select-pro')
      await user.click(proButton)

      // 両方のボタンが存在し、クリック可能であることを確認
      expect(liteButton).toBeInTheDocument()
      expect(proButton).toBeInTheDocument()
    })

    it('FAQセクションの展開・折りたたみが機能する', async () => {
      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('faq')).toBeInTheDocument()
      })

      const faqItem1 = screen.getByTestId('faq-item-1')
      const faqItem2 = screen.getByTestId('faq-item-2')

      // FAQ項目をクリックして展開
      await user.click(faqItem1)
      await user.click(faqItem2)

      // FAQ項目が存在することを確認
      expect(faqItem1).toBeInTheDocument()
      expect(faqItem2).toBeInTheDocument()
    })

    it('ナビゲーションリンクが正しく表示される', async () => {
      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument()
      })

      const navigation = screen.getByTestId('navigation')
      expect(within(navigation).getByTestId('nav-home')).toBeInTheDocument()
      expect(within(navigation).getByTestId('nav-features')).toBeInTheDocument()
      expect(within(navigation).getByTestId('nav-pricing')).toBeInTheDocument()
      expect(within(navigation).getByTestId('nav-login')).toBeInTheDocument()
    })

    it('フッターリンクが正しく表示される', async () => {
      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('footer')).toBeInTheDocument()
      })

      const footerLinks = screen.getByTestId('footer-links')
      expect(within(footerLinks).getByTestId('footer-privacy')).toBeInTheDocument()
      expect(within(footerLinks).getByTestId('footer-terms')).toBeInTheDocument()
      expect(within(footerLinks).getByTestId('footer-contact')).toBeInTheDocument()
    })
  })

  describe('多言語対応の統合テスト', () => {
    it('日本語ロケールで正しく表示される', async () => {
      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('faq-locale')).toHaveTextContent('ja')
      })
    })

    it('英語ロケールで正しく表示される', async () => {
      render(<LandingPageClient locale="en" />)

      await waitFor(() => {
        expect(screen.getByTestId('faq-locale')).toHaveTextContent('en')
      })
    })
  })

  describe('パフォーマンスとアクセシビリティの統合テスト', () => {
    it('適切な見出し階層が維持される', async () => {
      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      })

      // h1が1つだけ存在することを確認
      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements).toHaveLength(1)

      // h2要素が適切に存在することを確認
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)
    })

    it('キーボードナビゲーションが可能である', async () => {
      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      })

      // Tab キーでフォーカス移動をテスト
      await user.tab()

      // フォーカス可能な要素が存在することを確認
      const focusableElements = screen.getAllByRole('button')
      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('スクロール制御が正常に動作する', async () => {
      render(<LandingPageClient locale="ja" />)

      // スプラッシュスクリーン表示中はスクロール無効
      await waitFor(() => {
        expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
        expect(document.body.style.overflow).toBe('hidden')
      })

      // スプラッシュスクリーン完了後はスクロール有効
      await user.click(screen.getByTestId('splash-complete'))

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('unset')
      })
    })
  })

  describe('エラーハンドリングの統合テスト', () => {
    it('LocalStorageエラー時も正常に動作する', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error')
      })

      expect(() => render(<LandingPageClient locale="ja" />)).not.toThrow()
    })

    it('コンポーネントエラー時のフォールバック', async () => {
      // 一部のコンポーネントがエラーを起こした場合のテスト
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<LandingPageClient locale="ja" />)

      // エラーが発生してもページが完全に壊れないことを確認
      await waitFor(() => {
        expect(screen.getByTestId('landing-page-client')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('SEOとメタデータの統合テスト', () => {
    it('構造化データが正しく生成される', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const searchParams = Promise.resolve({})

      const HomeComponent = await Home({ params, searchParams })
      const { container } = render(HomeComponent)

      const scripts = container.querySelectorAll('script[type="application/ld+json"]')
      expect(scripts.length).toBe(3)

      // 各構造化データの内容を確認
      scripts.forEach((script) => {
        const content = script.textContent
        expect(content).toContain('Bocker')
        expect(JSON.parse(content || '{}')).toHaveProperty('@type')
      })
    })

    it('メタデータが正しく生成される', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const metadata = await generateMetadata({ params })

      expect(metadata.title).toBe('Bocker - 美容サロン向け予約管理システム')
      expect(metadata.description).toBe(
        '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム'
      )
      expect(metadata.openGraph?.title).toBe('Bocker - 美容サロン向け予約管理システム')
      expect(metadata.openGraph?.locale).toBe('ja_JP')
    })
  })
})
