import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeaturesPage from './page'

// コンポーネントのモック
vi.mock('@/app/[locale]/(home)/_components', () => ({
  Header: () => <div data-testid="header">Header</div>,
  Footer: () => <div data-testid="footer">Footer</div>,
  FeatureSection: () => <div data-testid="feature-section">Feature Section</div>,
}))

describe('FeaturesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<FeaturesPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByTestId('feature-section')).toBeInTheDocument()
    })

    it('必要なコンポーネントが表示される', () => {
      render(<FeaturesPage />)
      
      expect(screen.getByTestId('feature-section')).toBeInTheDocument()
    })

    it('ページ構造が正しい', () => {
      render(<FeaturesPage />)
      
      // 全コンポーネントが存在することを確認
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('feature-section')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('コンポーネント統合', () => {
    it('全必要コンポーネントが表示される', () => {
      render(<FeaturesPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('feature-section')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('レンダリング', () => {
    it('エラーなくレンダリングされる', () => {
      expect(() => render(<FeaturesPage />)).not.toThrow()
    })
  })

  describe('パフォーマンス', () => {
    it('高速レンダリングする', () => {
      const startTime = performance.now()
      render(<FeaturesPage />)
      const endTime = performance.now()
      
      // 100ms以内でレンダリング完了
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('統合テスト', () => {
    it('全コンポーネントが正常に表示される', () => {
      render(<FeaturesPage />)
      
      // 全必要コンポーネントの表示確認
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('feature-section')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })
})