import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Header } from '../Header'
import { useTranslations } from 'next-intl'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
  useLocale: vi.fn(() => 'ja'),
}))

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    resolvedTheme: 'light',
  })),
}))

// Mock navigation
vi.mock('@/i18n/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
}))

// Mock components
vi.mock('@/components/common', () => ({
  ModeToggle: () => <div data-testid="mode-toggle">Mode Toggle</div>,
  LanguageSwitcher: () => <div data-testid="language-switcher">Language Switcher</div>,
}))

describe('Header', () => {
  it('正常にレンダリングされる', () => {
    render(<Header />)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  describe('画像が正しくレンダリングされる', () => {
    it('画像が正しくレンダリングされる', () => {
      render(<Header />)
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Bocker')
    })
  })

  describe('リンクが正しくレンダリングされる', () => {
    it('リンクが正しくレンダリングされる', () => {
      render(<Header />)
      const links = screen.getAllByRole('link')

      console.log('+oml:', links.length)

      const expectedLinks = [
        { href: '/' },
        { href: '/about' },
        { href: '/faq' },
        { href: '/contact' },
        { href: '/features' },
        { href: '/pricing' },
        { href: '/sign-up' },
        { href: '/sign-in' },
      ]

      // リンクの数を確認
      expect(links).toHaveLength(expectedLinks.length)

      // 各リンクのhref属性を確認
      expectedLinks.forEach((expectedLink) => {
        const link = links.find((link) => link.getAttribute('href') === expectedLink.href)
        expect(link).toBeInTheDocument()
      })
    })
  })

  describe('必要な翻訳キーがすべて使用されている', () => {
    it('必要な翻訳キーがすべて使用されている', () => {
      const mockT = vi.fn((key: string) => key)
      vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      render(<Header />)
      expect(mockT).toHaveBeenCalledWith('hero.tagline')
      expect(mockT).toHaveBeenCalledWith('nav.features')
      expect(mockT).toHaveBeenCalledWith('nav.pricing')
      expect(mockT).toHaveBeenCalledWith('nav.about')
      expect(mockT).toHaveBeenCalledWith('nav.faq')
      expect(mockT).toHaveBeenCalledWith('nav.contact')
      expect(mockT).toHaveBeenCalledWith('nav.signUp')
      expect(mockT).toHaveBeenCalledWith('nav.login')
    })
  })
})
