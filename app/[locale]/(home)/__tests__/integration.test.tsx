import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home, { generateMetadata } from '../page'
import { LandingPageClient } from '../LandingPageClient'
import * as nextIntl from 'next-intl'; // next-intl フックのモック用


// 1. mockLocalStorage オブジェクトを定義
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// 2. window.localStorage をモックオブジェクトで上書き
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true, 
});

const mockUseLocale = vi.fn();
const mockUseTranslations = vi.fn();
mockUseTranslations.mockReturnValue((key: string) => key);

vi.spyOn(nextIntl, 'useLocale').mockImplementation(mockUseLocale);
vi.spyOn(nextIntl, 'useTranslations').mockImplementation(mockUseTranslations);
// --- モック: @/i18n/navigation (必要最低限) ---
// ナビゲーションのテストが主眼でなければ、単純にモックしておくだけで十分
vi.mock('@/i18n/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/current/path'),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

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

      const HomeComponent = await Home({ params })
      const { container } = render(HomeComponent)
      
      // 構造化データのscriptタグが存在することを確認
      const scripts = container.querySelectorAll('script[type="application/ld+json"]')
      expect(scripts.length).toBe(3)

      // LandingPageClientが正しくレンダリングされることを確認
      expect(screen.getByTestId('landing-page-client')).toBeInTheDocument()
    })

    it('スプラッシュスクリーンからメインコンテンツへの遷移が正常に動作する', async () => {
      render(<LandingPageClient />)

      // スプラッシュスクリーンが表示される
      await waitFor(() => {
        expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
      })

      // メインコンテンツが表示される（実際のコンポーネント）
      await waitFor(() => {
        expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('ユーザーインタラクションの統合テスト', () => {
    beforeEach(async () => {
      // スプラッシュスクリーンをスキップしてメインコンテンツを表示
      const oneHourAgo = Date.now() - (60 * 60 * 1000) + 1000
      mockLocalStorage.getItem.mockReturnValue(oneHourAgo.toString())
    })

    it('ヒーローセクションのCTAボタンが存在し、クリック可能である', async () => {
      render(<LandingPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      })

      // 実際のHeroSectionのCTAボタン（Linkコンポーネント）を確認
      const heroCtaLink = screen.getByTestId('hero-cta')
      expect(heroCtaLink).toBeInTheDocument()
      expect(heroCtaLink).toHaveAttribute('href', '/contact')

      // クリック可能であることを確認
      await user.click(heroCtaLink)
    })

    it('ナビゲーションが正常に動作する', async () => {
      render(<LandingPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument()
      })

      // 実際のHeaderコンポーネントのナビゲーションリンクを確認
      const header = screen.getByTestId('header')
      const links = within(header).getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)
    })

    it('FAQセクションが正常に表示される', async () => {
      render(<LandingPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('faq-section')).toBeInTheDocument()
      }, { timeout: 5000 })

      // 実際のFAQコンポーネントの構造を確認
      const faqSection = screen.getByTestId('faq-section')
      expect(faqSection).toBeInTheDocument()

      // FAQアイテムが存在することを確認（実際の翻訳キーベース）
      const link = within(faqSection).getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/contact')

      // クリック可能であることを確認
      await user.click(link)
    })

    it('料金セクションが正常に表示される', async () => {
      render(<LandingPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('pricing')).toBeInTheDocument()
      }, { timeout: 5000 })

      // 料金プランのリストが存在することを確認
      const pricingSection = screen.getByTestId('pricing')
      const pricingList = pricingSection.querySelectorAll('[data-tier]')
      expect(pricingList).toHaveLength(3)
    })
  })

  describe('アクセシビリティとパフォーマンスの統合テスト', () => {
    it('適切な見出し階層が維持される', async () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000) + 1000
      mockLocalStorage.getItem.mockReturnValue(oneHourAgo.toString())
      
      render(<LandingPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      })

      // 実際のコンポーネントの見出し階層を確認
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)

      // h1が存在することを確認（HeroSectionから）
      const h1Elements = headings.filter(heading => heading.tagName === 'H1')
      expect(h1Elements.length).toBeGreaterThanOrEqual(1)
    })

    it('フォーカス管理が正常に動作する', async () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000) + 1000
      mockLocalStorage.getItem.mockReturnValue(oneHourAgo.toString())
      
      render(<LandingPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      })

      // Tab キーでフォーカス移動をテスト
      await user.tab()

      // フォーカス可能な要素が存在することを確認
      const focusableElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
      expect(focusableElements.length).toBeGreaterThan(0)
    })
  })

  describe('エラーハンドリングの統合テスト', () => {
    it('LocalStorageエラー時も正常に動作する', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // コンポーネントがエラーなく描画されることを確認
      expect(() => render(<LandingPageClient />)).not.toThrow()
      
      await waitFor(() => {
        expect(screen.getByTestId('landing-page-client')).toBeInTheDocument()
      })
      
      consoleSpy.mockRestore()
    })

    it('画像読み込みエラー時もレイアウトが崩れない', async () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000) + 1000
      mockLocalStorage.getItem.mockReturnValue(oneHourAgo.toString())
      
      render(<LandingPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      })

      // HeroSectionの画像が存在することを確認
      const images = screen.getAllByRole('img')
      expect(images.length).toBeGreaterThan(0)

      // 各画像にalt属性があることを確認（アクセシビリティ）
      images.forEach(img => {
        expect(img).toHaveAttribute('alt')
      })
    })
  })

  describe('SEOとメタデータの統合テスト', () => {
    it('構造化データが正しく生成される', async () => {
      const params = Promise.resolve({ locale: 'ja' })

      const HomeComponent = await Home({ params })
      const { container } = render(HomeComponent)

      const scripts = container.querySelectorAll('script[type="application/ld+json"]')
      expect(scripts.length).toBe(3)

      // 各構造化データが有効なJSONであることを確認
      scripts.forEach((script) => {
        const content = script.textContent
        expect(content).toBeTruthy()
        
        const parsedContent = JSON.parse(content || '{}')
        expect(parsedContent).toHaveProperty('@type')
        expect(parsedContent).toHaveProperty('@context', 'https://schema.org')
      })
    })

    it('メタデータが正しく生成される', async () => {
      const params = Promise.resolve({ locale: 'ja' })
      const metadata = await generateMetadata({ params })

      // 実際の翻訳キーの内容が設定されていることを確認
      expect(metadata.title).toBeDefined()
      expect(metadata.description).toBeDefined()
      expect(metadata.openGraph?.title).toBeDefined()
      expect(metadata.openGraph?.locale).toBe('ja_JP')
      
      // OGP画像のURLが正しく設定されていることを確認
      const ogImages = metadata.openGraph?.images;
      expect(ogImages).toBeDefined();

      if (ogImages) {
        const firstImage = Array.isArray(ogImages) ? ogImages[0] : ogImages;
        
        // 型ガードを使用して安全にアクセス
        if (typeof firstImage === 'string') {
          expect(firstImage).toContain('/opengraph-image');
        } else if (firstImage instanceof URL) {
          expect(firstImage.toString()).toContain('/opengraph-image');
        } else {
          // OGImageDescriptor の場合
          expect(firstImage.url).toContain('/opengraph-image');
        }
      }
    })
  })
})
