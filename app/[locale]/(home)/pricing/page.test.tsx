import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PricingPage from './page'

// コンポーネントのモック
vi.mock('../_components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

vi.mock('../_components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))

vi.mock('../_components/Pricing', () => ({
  Pricing: () => <div data-testid="pricing-component">Pricing Component</div>,
}))

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<PricingPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByTestId('pricing-component')).toBeInTheDocument()
    })

    it('必要なコンポーネントが表示される', () => {
      render(<PricingPage />)
      
      expect(screen.getByTestId('pricing-component')).toBeInTheDocument()
    })

    it('ページ構造が正しい', () => {
      render(<PricingPage />)
      
      // 全コンポーネントが存在することを確認
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('pricing-component')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('コンポーネント統合', () => {
    it('全必要コンポーネントが表示される', () => {
      render(<PricingPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('pricing-component')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('レンダリング', () => {
    it('エラーなくレンダリングされる', () => {
      expect(() => render(<PricingPage />)).not.toThrow()
    })
  })

  describe('パフォーマンス', () => {
    it('高速レンダリングする', () => {
      const startTime = performance.now()
      render(<PricingPage />)
      const endTime = performance.now()
      
      // 100ms以内でレンダリング完了
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('統合テスト', () => {
    it('全コンポーネントが正常に表示される', () => {
      render(<PricingPage />)
      
      // 全必要コンポーネントの表示確認
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('pricing-component')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })
})