import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrivacyPageClient } from './PrivacyPageClient'

// コンポーネントのモック
vi.mock('../_components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

vi.mock('../_components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))

describe('PrivacyPageClient', () => {
  const mockTranslations = {
    title: 'プライバシーポリシー',
    lastUpdated: '2025年1月1日',
    sections: [
      {
        title: 'セクション1',
        content: 'セクション1の内容'
      },
      {
        title: 'セクション2', 
        content: 'セクション2の内容'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<PrivacyPageClient translations={mockTranslations} />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByText('プライバシーポリシー')).toBeInTheDocument()
    })

    it('必要なコンポーネントが表示される', () => {
      render(<PrivacyPageClient translations={mockTranslations} />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('ページ構造が正しい', () => {
      render(<PrivacyPageClient translations={mockTranslations} />)
      
      // 全コンポーネントが存在することを確認
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('コンポーネント統合', () => {
    it('全必要コンポーネントが表示される', () => {
      render(<PrivacyPageClient translations={mockTranslations} />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('レンダリング', () => {
    it('エラーなくレンダリングされる', () => {
      expect(() => render(<PrivacyPageClient translations={mockTranslations} />)).not.toThrow()
    })
  })

  describe('パフォーマンス', () => {
    it('高速レンダリングする', () => {
      const startTime = performance.now()
      render(<PrivacyPageClient translations={mockTranslations} />)
      const endTime = performance.now()
      
      // 100ms以内でレンダリング完了
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('統合テスト', () => {
    it('全コンポーネントが正常に表示される', () => {
      render(<PrivacyPageClient translations={mockTranslations} />)
      
      // 全必要コンポーネントの表示確認
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })
})