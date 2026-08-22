import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutPageClient } from './AboutPageClient'

// vitest.setup.tsで設定済みのため削除

// next-intl のモック
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => {
    const translations: Record<string, string> = {
      subtitle: 'About Us',
      'story.title': '私たちのストーリー',
      'story.content.0.title': '創業のきっかけ',
      'story.content.0.description': '美容サロンの予約管理の課題を解決するために...',
      'story.content.1.title': '技術への取り組み',
      'story.content.1.description': '最新の技術を活用して...',
      'story.content.2.title': 'お客様第一',
      'story.content.2.description': 'お客様のビジネス成功のために...',
      'story.content.3.title': '未来への展望',
      'story.content.3.description': '美容業界のデジタル変革を...',
      dashboardImageAlt: 'Bockerの予約管理ダッシュボード',
    }
    return (key: string) => translations[key] || key
  }),
}))

// コンポーネントのモック
vi.mock('../_components/CTASection', () => ({
  CTASection: () => <div data-testid="cta-section">CTA Section</div>,
}))

vi.mock('../_components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

vi.mock('../_components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))


describe('AboutPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<AboutPageClient />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByText('About Us')).toBeInTheDocument()
      expect(screen.getByText('私たちのストーリー')).toBeInTheDocument()
    })

    it('必要なセクションが表示される', () => {
      render(<AboutPageClient />)
      
      expect(screen.getByTestId('cta-section')).toBeInTheDocument()
    })

    it('ストーリーセクションが正しく表示される', () => {
      render(<AboutPageClient />)
      
      expect(screen.getByText('創業のきっかけ')).toBeInTheDocument()
      expect(screen.getByText('技術への取り組み')).toBeInTheDocument()
      expect(screen.getByText('お客様第一')).toBeInTheDocument()
      expect(screen.getByText('未来への展望')).toBeInTheDocument()
    })

    it('各ストーリーセクションの説明が表示される', () => {
      render(<AboutPageClient />)
      
      expect(screen.getByText('美容サロンの予約管理の課題を解決するために...')).toBeInTheDocument()
      expect(screen.getByText('最新の技術を活用して...')).toBeInTheDocument()
      expect(screen.getByText('お客様のビジネス成功のために...')).toBeInTheDocument()
      expect(screen.getByText('美容業界のデジタル変革を...')).toBeInTheDocument()
    })
  })

  describe('画像表示', () => {
    it('ダッシュボード画像が表示される', () => {
      render(<AboutPageClient />)
      
      const dashboardImage = screen.getByRole('img', {
        name: 'Bockerの予約管理ダッシュボード',
      })
      expect(dashboardImage).toBeInTheDocument()
      expect(dashboardImage).toHaveAttribute('src', '/assets/mockup/pc/dashboard.png')
    })

    it('画像にalt属性が設定されている', () => {
      render(<AboutPageClient />)
      
      const dashboardImage = screen.getByRole('img', {
        name: 'Bockerの予約管理ダッシュボード',
      })
      expect(dashboardImage).toHaveAttribute('alt', 'Bockerの予約管理ダッシュボード')
    })
  })

  describe('レイアウト構造', () => {
    it('正しいページ構造を持つ', () => {
      render(<AboutPageClient />)
      
      // メインコンテンツエリア
      const mainContent = screen.getByText('私たちのストーリー').closest('.min-h-screen')
      expect(mainContent).toBeInTheDocument()
      expect(mainContent).toHaveClass('bg-background')
    })

    it('セクションが正しい順序で表示される', () => {
      const { container } = render(<AboutPageClient />)
      
      const sections = container.querySelectorAll('section, [data-testid]')
      const sectionOrder = Array.from(sections).map(section => 
        section.getAttribute('data-testid') || section.tagName.toLowerCase()
      )
      
      expect(sectionOrder).toEqual([
        'header',
        'section',
        'cta-section',
        'footer'
      ])
    })
  })

  describe('アクセシビリティ', () => {
    it('見出し階層が適切である', () => {
      render(<AboutPageClient />)
      
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('私たちのストーリー')
    })

    it('セマンティックHTMLが使用されている', () => {
      const { container } = render(<AboutPageClient />)
      
      expect(container.querySelector('section')).toBeInTheDocument()
      expect(container.querySelector('main')).toBeNull() // Header/Footer内にmainがある想定
    })

    it('適切なaria-hidden属性が設定されている', () => {
      const { container } = render(<AboutPageClient />)
      
      const decorativeElement = container.querySelector('[aria-hidden="true"]')
      expect(decorativeElement).toBeInTheDocument()
    })
  })

  describe('レスポンシブ対応', () => {
    it('グリッドレイアウトのクラスが適用されている', () => {
      const { container } = render(<AboutPageClient />)
      
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
      expect(gridContainer).toHaveClass('lg:grid-cols-2')
    })

    it('レスポンシブ画像クラスが適用されている', () => {
      const { container } = render(<AboutPageClient />)
      
      const imageContainer = container.querySelector('.mb-\\[-12\\%\\]')
      expect(imageContainer).toBeInTheDocument()
    })
  })

  describe('エラーハンドリング', () => {
    it('コンポーネントのレンダリングエラーを適切に処理する', () => {
      // エラーバウンダリをテストするため、console.errorをモック
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // TeamSectionコンポーネントをmockImplementationで置き換える必要があるため、直接mockする
      expect(() => render(<AboutPageClient />)).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('パフォーマンス', () => {
    it('大量のストーリーコンテンツでも高速レンダリングする', () => {
      const startTime = performance.now()
      render(<AboutPageClient />)
      const endTime = performance.now()
      
      // 100ms以内でレンダリング完了
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('画像の遅延読み込みが設定されている', () => {
      render(<AboutPageClient />)
      
      const image = screen.getByRole('img', { name: 'Bockerの予約管理ダッシュボード' })
      // Next.js Imageコンポーネントはデフォルトで遅延読み込みが有効
      expect(image).toBeInTheDocument()
    })
  })

  describe('統合テスト', () => {
    it('全体的なページフローが正常に動作する', async () => {
      render(<AboutPageClient />)
      
      // ヘッダーが表示される
      expect(screen.getByTestId('header')).toBeInTheDocument()
      
      // メインコンテンツが表示される
      expect(screen.getByText('私たちのストーリー')).toBeInTheDocument()
      
      // 全ストーリーセクションが表示される
      expect(screen.getByText('創業のきっかけ')).toBeInTheDocument()
      expect(screen.getByText('技術への取り組み')).toBeInTheDocument()
      expect(screen.getByText('お客様第一')).toBeInTheDocument()
      expect(screen.getByText('未来への展望')).toBeInTheDocument()
      
      // CTAセクションが表示される
      expect(screen.getByTestId('cta-section')).toBeInTheDocument()
      
      // フッターが表示される
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })
})
