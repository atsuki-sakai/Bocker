import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from './LanguageSwitcher'

const push = vi.fn()

vi.mock('next-intl', () => ({
  useLocale: () => 'ja',
  useTranslations: () => (key: string) => (key === 'switchLanguage' ? '言語を切り替える' : key),
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dashboard',
}))

describe('LanguageSwitcher', () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false)
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  beforeEach(() => {
    push.mockClear()
  })

  it('日本語、英語、タイ語を選択肢として表示する', async () => {
    render(<LanguageSwitcher />)

    fireEvent.keyDown(screen.getByRole('combobox', { name: '言語を切り替える' }), { key: 'Enter' })

    expect(await screen.findByTestId('language-option-ja')).toHaveTextContent('日本語')
    expect(screen.getByTestId('language-option-en')).toHaveTextContent('English')
    expect(screen.getByTestId('language-option-th')).toHaveTextContent('ไทย')
  })

  it('タイ語を選択すると現在のパスをタイ語ロケールで開く', async () => {
    render(<LanguageSwitcher />)

    fireEvent.keyDown(screen.getByRole('combobox', { name: '言語を切り替える' }), { key: 'Enter' })
    fireEvent.click(await screen.findByTestId('language-option-th'))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/dashboard', { locale: 'th' })
    })
  })
})
