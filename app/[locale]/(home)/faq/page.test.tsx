import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FAQPage from './page'

// コンポーネントのモック
vi.mock('../_components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

vi.mock('../_components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))

vi.mock('../_components/FAQ', () => ({
  FAQ: ({ locale }: { locale: string }) => (
    <div data-testid="faq-component">
      FAQ Component - Locale: {locale}
    </div>
  ),
}))

describe('FAQPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<FAQPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByTestId('faq-component')).toBeInTheDocument()
    })

    it('必要なコンポーネントが表示される', () => {
      render(<FAQPage />)
      
      expect(screen.getByTestId('faq-component')).toBeInTheDocument()
    })

    it('FAQコンポーネントにロケールが渡される', () => {
      render(<FAQPage />)
      
      // デフォルトでjaロケールが使用される想定
      expect(screen.getByText('FAQ Component - Locale: ja')).toBeInTheDocument()
    })

    it('ページ構造が正しい', () => {
      render(<FAQPage />)
      
      // 全コンポーネントが存在することを確認
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('faq-component')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('コンポーネント統合', () => {
    it('全必要コンポーネントが表示される', () => {
      render(<FAQPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('faq-component')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('レンダリング', () => {
    it('エラーなくレンダリングされる', () => {
      expect(() => render(<FAQPage />)).not.toThrow()
    })
  })

  describe('パフォーマンス', () => {
    it('高速レンダリングする', () => {
      const startTime = performance.now()
      render(<FAQPage />)
      const endTime = performance.now()
      
      // 100ms以内でレンダリング完了
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('統合テスト', () => {
    it('全コンポーネントが正常に表示される', () => {
      render(<FAQPage />)
      
      // 全必要コンポーネントの表示確認
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('faq-component')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })
})