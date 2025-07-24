import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HeroSection } from './HeroSection'

// next-intlのモック
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'hero.title': '美容サロン向け予約管理システム',
      'hero.subtitle': '効率的な予約・顧客管理を実現',
      'hero.description': 'Bockerは美容サロン向けの包括的な予約管理SaaSプラットフォームです。',
      'hero.cta.primary': '無料で始める',
      'hero.cta.secondary': 'デモを見る',
      'hero.features.booking': '予約管理',
      'hero.features.customer': '顧客管理',
      'hero.features.analytics': '分析機能',
    }
    return translations[key] || key
  }),
}))

// Next.js Linkのモック
vi.mock('next/link', () => {
  return {
    default: ({ children, href, ...props }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  }
})

// アニメーションライブラリのモック
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}))

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本レンダリング', () => {
    it('メインタイトルが表示される', () => {
      render(<HeroSection />)
      expect(screen.getByText('美容サロン向け予約管理システム')).toBeInTheDocument()
    })

    it('サブタイトルが表示される', () => {
      render(<HeroSection />)
      expect(screen.getByText('効率的な予約・顧客管理を実現')).toBeInTheDocument()
    })

    it('説明文が表示される', () => {
      render(<HeroSection />)
      expect(screen.getByText(/Bockerは美容サロン向けの包括的な予約管理/)).toBeInTheDocument()
    })
  })

  describe('CTAボタン', () => {
    it('プライマリCTAボタンが表示される', () => {
      render(<HeroSection />)
      const primaryButton = screen.getByText('無料で始める')
      expect(primaryButton).toBeInTheDocument()
      expect(primaryButton.closest('a')).toHaveAttribute('href', '/signup')
    })

    it('セカンダリCTAボタンが表示される', () => {
      render(<HeroSection />)
      const secondaryButton = screen.getByText('デモを見る')
      expect(secondaryButton).toBeInTheDocument()
      expect(secondaryButton.closest('a')).toHaveAttribute('href', '/demo')
    })

    it('CTAボタンがクリック可能である', () => {
      render(<HeroSection />)
      const primaryButton = screen.getByText('無料で始める')

      expect(() => fireEvent.click(primaryButton)).not.toThrow()
    })
  })

  describe('機能ハイライト', () => {
    it('主要機能が表示される', () => {
      render(<HeroSection />)

      expect(screen.getByText('予約管理')).toBeInTheDocument()
      expect(screen.getByText('顧客管理')).toBeInTheDocument()
      expect(screen.getByText('分析機能')).toBeInTheDocument()
    })

    it('機能アイコンが表示される', () => {
      render(<HeroSection />)

      // アイコンのdata-testidやaria-labelで確認
      const icons = screen.getAllByRole('img', { hidden: true })
      expect(icons.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('レスポンシブデザイン', () => {
    it('モバイル向けクラスが適用される', () => {
      render(<HeroSection />)
      const container = screen.getByRole('banner') || screen.getByTestId('hero-section')

      expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8')
    })

    it('タブレット向けレイアウトが適用される', () => {
      render(<HeroSection />)
      const titleElement = screen.getByText('美容サロン向け予約管理システム')

      expect(titleElement).toHaveClass('text-4xl', 'sm:text-5xl', 'lg:text-6xl')
    })
  })

  describe('アクセシビリティ', () => {
    it('適切な見出し階層が使用される', () => {
      render(<HeroSection />)

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
      expect(mainHeading).toHaveTextContent('美容サロン向け予約管理システム')
    })

    it('CTAボタンに適切なaria-labelが設定される', () => {
      render(<HeroSection />)

      const primaryButton = screen.getByText('無料で始める')
      expect(primaryButton).toHaveAttribute('aria-label', '無料でBockerを始める')
    })

    it('キーボードナビゲーションが可能である', () => {
      render(<HeroSection />)

      const primaryButton = screen.getByText('無料で始める')
      const secondaryButton = screen.getByText('デモを見る')

      expect(primaryButton).toHaveAttribute('tabIndex', '0')
      expect(secondaryButton).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('パフォーマンス', () => {
    it('画像の遅延読み込みが設定される', () => {
      render(<HeroSection />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy')
      })
    })

    it('重要でない画像にdecoding=asyncが設定される', () => {
      render(<HeroSection />)

      const decorativeImages = screen.getAllByRole('img', { hidden: true })
      decorativeImages.forEach((img) => {
        expect(img).toHaveAttribute('decoding', 'async')
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('翻訳キーが見つからない場合のフォールバック', () => {
      const mockUseTranslations = vi.fn(() => (key: string) => `missing.${key}`)
      vi.mocked(require('next-intl').useTranslations).mockReturnValue(mockUseTranslations)

      render(<HeroSection />)

      // フォールバック表示を確認
      expect(screen.getByText(/missing\./)).toBeInTheDocument()
    })

    it('画像読み込みエラー時のフォールバック', async () => {
      render(<HeroSection />)

      const images = screen.getAllByRole('img')
      if (images.length > 0) {
        // 画像エラーをシミュレート
        fireEvent.error(images[0])

        await waitFor(() => {
          // エラー時のフォールバック表示を確認
          expect(images[0]).toHaveAttribute('alt', expect.any(String))
        })
      }
    })
  })

  describe('SEO対応', () => {
    it('構造化データが含まれる', () => {
      const { container } = render(<HeroSection />)

      const structuredData = container.querySelector('script[type="application/ld+json"]')
      expect(structuredData).toBeInTheDocument()
    })

    it('適切なmeta情報が設定される', () => {
      render(<HeroSection />)

      // セクションに適切なaria-labelが設定される
      const section = screen.getByRole('banner') || screen.getByTestId('hero-section')
      expect(section).toHaveAttribute('aria-label', expect.any(String))
    })
  })
})
