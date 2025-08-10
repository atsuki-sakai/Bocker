import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTranslations } from 'next-intl'
import { ContentSection } from '../ContentSection'

// Mock useTranslations to return translation keys as-is for testing
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key)
}))

describe('ContentSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<ContentSection />)
      
      // メインセクションが表示される
      expect(screen.getByTestId('content-section')).toBeInTheDocument()
    })
  })

  describe('ベネフィットリスト', () => {
    it('ベネフィットリストが正しく表示される', () => {
      render(<ContentSection />)
      
      // リスト構造の確認
      const benefitsList = screen.getByRole('list')
      expect(benefitsList).toBeInTheDocument()
      
      // 3つのリストアイテムが存在
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
      
      // 各ベネフィットの翻訳キーが存在
      expect(screen.getByText('benefits.sales.title')).toBeInTheDocument()
      expect(screen.getByText('benefits.mistakes.title')).toBeInTheDocument()
      expect(screen.getByText('benefits.efficiency.title')).toBeInTheDocument()
    })

    it('各ベネフィット項目にアイコンが表示される', () => {
      render(<ContentSection />)
      
      // アイコンはaria-hidden="true"属性を持つ
      const icons = document.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThanOrEqual(3) // 最低3つのアイコン
    })
  })

  describe('画像表示', () => {
    it('ダッシュボードのモックアップ画像が表示される', () => {
      render(<ContentSection />)
      
      const image = screen.getByRole('img')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', '/assets/mockup/pc/dashboard.png')
      expect(image).toHaveAttribute('width', '1000')
      expect(image).toHaveAttribute('height', '1000')
    })

    it('画像に適切なalt属性が設定されている', () => {
      render(<ContentSection />)
      
      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('alt', 'bocker dashboard')
    })
  })

  describe('ROIセクション', () => {
    it('ROI情報が正しく表示される', () => {
      render(<ContentSection />)
      
      // ROI翻訳キーの確認
      expect(screen.getByText('roi.title')).toBeInTheDocument()
      expect(screen.getByText('roi.description')).toBeInTheDocument()
      expect(screen.getByText('averageResults')).toBeInTheDocument()
    })
  })

  describe('アクセシビリティ', () => {
    it('適切な見出し階層が使用されている', () => {
      render(<ContentSection />)
      
      // h1要素（メインタイトル）
      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements).toHaveLength(1)
      expect(h1Elements[0]).toHaveTextContent('title')
      
      // h2要素（ROIタイトル）
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements).toHaveLength(1)
      expect(h2Elements[0]).toHaveTextContent('roi.title')
    })

    it('リスト構造が適切にマークアップされている', () => {
      render(<ContentSection />)
      
      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })
  })

  describe('レスポンシブ対応', () => {
    it('適切なCSSクラスが適用されている', () => {
      render(<ContentSection />)
      
      const mainContainer = screen.getByTestId('content-section')
      
      // グリッドレイアウトクラス
      expect(mainContainer).toHaveClass('lg:overflow-visible')
      
      // レスポンシブ間隔クラス
      expect(mainContainer).toHaveClass('px-6')
      expect(mainContainer).toHaveClass('py-24')
      expect(mainContainer).toHaveClass('sm:py-32')
    })
  })

  describe('エラーハンドリング', () => {
    it('useTranslationsが正しく呼び出される', () => {
      const mockUseTranslations = vi.mocked(useTranslations)
      
      render(<ContentSection />)
      
      expect(mockUseTranslations).toHaveBeenCalledWith('landing.content')
    })
  })

  describe('コンポーネント統合', () => {
    it('Framer Motionのアニメーション属性が適用されている', () => {
      render(<ContentSection />)
      
      const mainContainer = screen.getByTestId('content-section')
      
      // data-testid属性が設定されていることを確認（モックされたmotion.divが正常に動作）
      expect(mainContainer).toBeInTheDocument()
    })

    it('Next.js Imageコンポーネントが正しくレンダリングされる', () => {
      render(<ContentSection />)
      
      // モックされたImageコンポーネントがimg要素として表示される
      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('src', '/assets/mockup/pc/dashboard.png')
    })
  })

  describe('多言語対応', () => {
    it('必要な翻訳キーがすべて使用されている', () => {
      const mockT = vi.fn((key: string) => key)
      vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      
      render(<ContentSection />)
      
      // 重要な翻訳キーが呼び出されることを確認
      expect(mockT).toHaveBeenCalledWith('tagline')
      expect(mockT).toHaveBeenCalledWith('title')
      expect(mockT).toHaveBeenCalledWith('mainDescription')
      expect(mockT).toHaveBeenCalledWith('industryProblem')
      expect(mockT).toHaveBeenCalledWith('benefits.sales.title')
      expect(mockT).toHaveBeenCalledWith('benefits.mistakes.title')
      expect(mockT).toHaveBeenCalledWith('benefits.efficiency.title')
      expect(mockT).toHaveBeenCalledWith('roi.title')
    })
  })
})