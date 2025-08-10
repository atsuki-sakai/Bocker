import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTranslations } from 'next-intl'
import { HeaderSection } from '../HeaderSection'

// Mock useTranslations to return translation keys as-is for testing
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}))

// Mock Heroicons
vi.mock('@heroicons/react/20/solid', () => ({
  LifebuoyIcon: (props: any) => <svg data-testid="lifebuoy-icon" {...props} />, // eslint-disable-line @typescript-eslint/no-explicit-any
  PhoneIcon: (props: any) => <svg data-testid="phone-icon" {...props} />, // eslint-disable-line @typescript-eslint/no-explicit-any
}))

describe('HeaderSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<HeaderSection />)

      // メインセクションが表示される (note: component uses data-testid instead of data-test-id)
      const container = screen.getByTestId('header-section')
      expect(container).toBeInTheDocument()
    })

    it('メインタイトルが表示される', () => {
      render(<HeaderSection />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('title')
    })

    it('説明文が表示される', () => {
      render(<HeaderSection />)

      expect(screen.getByText('description')).toBeInTheDocument()
    })
  })

  describe('CTAボタン', () => {
    it('コンタクトボタンが表示される', () => {
      render(<HeaderSection />)

      const contactButton = screen.getByRole('button')
      expect(contactButton).toBeInTheDocument()
      expect(contactButton).toHaveTextContent('cards.contact.title')
    })

    it('コンタクトボタンが正しいリンクを持つ', () => {
      render(<HeaderSection />)

      const contactLink = screen.getByRole('link')
      expect(contactLink).toHaveAttribute('href', '/contact')
    })
  })

  describe('アクセシビリティ', () => {
    it('適切な見出し階層が使用される', () => {
      render(<HeaderSection />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('title')
    })

    it('リンクに適切なアクセシビリティ属性が設定される', () => {
      render(<HeaderSection />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/contact')
    })

    it('アイコンがスクリーンリーダーから隠される', () => {
      render(<HeaderSection />)

      const phoneIcon = screen.getByTestId('phone-icon')
      const lifebuoyIcon = screen.getByTestId('lifebuoy-icon')

      expect(phoneIcon).toHaveAttribute('aria-hidden', 'true')
      expect(lifebuoyIcon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('エラーハンドリング', () => {
    it('useTranslationsが正しく呼び出される', () => {
      const mockUseTranslations = vi.mocked(useTranslations)

      render(<HeaderSection />)

      expect(mockUseTranslations).toHaveBeenCalledWith('landing.headerSection')
    })
  })

  describe('多言語対応', () => {
    it('必要な翻訳キーがすべて使用されている', () => {
      const mockT = vi.fn((key: string) => key)
      vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      render(<HeaderSection />)

      // 重要な翻訳キーが呼び出されることを確認
      expect(mockT).toHaveBeenCalledWith('title')
      expect(mockT).toHaveBeenCalledWith('description')
      expect(mockT).toHaveBeenCalledWith('cards.contact.title')
      expect(mockT).toHaveBeenCalledWith('cards.contact.description')
      expect(mockT).toHaveBeenCalledWith('cards.support.title')
      expect(mockT).toHaveBeenCalledWith('cards.support.description')
    })
  })
})
