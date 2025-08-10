import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTranslations } from 'next-intl'
import { HeroSection } from '../HeroSection'

// Mock useTranslations to return translation keys as-is for testing
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}))

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<HeroSection />)

      // メインセクションが表示される (note: component uses data-testid instead of data-test-id)
      const container = document.querySelector('[data-testid="hero-section"]')
      expect(container).toBeInTheDocument()
    })

    it('メインタイトルが表示される', () => {
      render(<HeroSection />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('title')
    })

    it('サブタイトルが表示される', () => {
      render(<HeroSection />)

      expect(screen.getByText('subtitle')).toBeInTheDocument()
    })
  })

  describe('CTAボタン', () => {
    it('デモボタンが表示される', () => {
      render(<HeroSection />)

      const demoButton = screen.getByText('cta.demo')
      expect(demoButton).toBeInTheDocument()

      const demoLink = demoButton.closest('a')
      expect(demoLink).toHaveAttribute(
        'href',
        'https://bocker-project.vercel.app/ja/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p'
      )
    })

    it('トライアルリンクが表示される', () => {
      render(<HeroSection />)

      const trialLink = screen.getByText('cta.trial')
      expect(trialLink).toBeInTheDocument()
      expect(trialLink.closest('a')).toHaveAttribute('href', '/sign-up')
    })

    it('資料請求ボタンが表示される', () => {
      render(<HeroSection />)

      const materialButton = screen.getByText('cta.requestMaterial')
      expect(materialButton).toBeInTheDocument()
      expect(materialButton.closest('a')).toHaveAttribute('href', '/contact')
    })

    it('CTAボタンがクリック可能である', () => {
      render(<HeroSection />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(() => fireEvent.click(button)).not.toThrow()
      })
    })
  })

  describe('多言語対応', () => {
    it('必要な翻訳キーがすべて使用されている', () => {
      const mockT = vi.fn((key: string) => key)
      vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      render(<HeroSection />)

      // 重要な翻訳キーが呼び出されることを確認
      expect(mockT).toHaveBeenCalledWith('title')
      expect(mockT).toHaveBeenCalledWith('subtitle')
      expect(mockT).toHaveBeenCalledWith('cta.demo')
      expect(mockT).toHaveBeenCalledWith('cta.trial')
      expect(mockT).toHaveBeenCalledWith('cta.requestMaterial')
    })
  })
})
