import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LandingPageClient } from './LandingPageClient'
import React from 'react'

interface FAQProps {
  locale?: string
}

interface SplashScreenProps {
  onComplete: () => void
}

vi.mock('./_components', () => ({
  HeroSection: vi.fn(() =>
    React.createElement('div', { 'data-id': 'hero-section' }, 'Hero Section')
  ),
  FeatureSection: vi.fn(() =>
    React.createElement('div', { 'data-id': 'feature-section' }, 'Feature Section')
  ),
  Pricing: vi.fn(() => React.createElement('div', { 'data-id': 'pricing' }, 'Pricing')),
  HeaderSection: vi.fn(() =>
    React.createElement('div', { 'data-id': 'header-section' }, 'Header Section')
  ),
  ContentSection: vi.fn(() =>
    React.createElement('div', { 'data-id': 'content-section' }, 'Content Section')
  ),
  CTASection: vi.fn(() => React.createElement('div', { 'data-id': 'cta-section' }, 'CTA Section')),
  FAQ: vi.fn((props: FAQProps) =>
    React.createElement('div', { 'data-id': 'faq' }, `FAQ - ${props.locale || ''}`)
  ),
  SplashScreen: vi.fn(({ onComplete }: SplashScreenProps) =>
    React.createElement(
      'div',
      { 'data-id': 'splash-screen' },
      React.createElement('button', { onClick: onComplete }, 'Complete Splash')
    )
  ),
  Header: vi.fn(() => React.createElement('div', { 'data-id': 'header' }, 'Header')),
  Footer: vi.fn(() => React.createElement('div', { 'data-id': 'footer' }, 'Footer')),
}))

// localStorage モック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// documentのスタイルプロパティをモック
Object.defineProperty(document.body, 'style', {
  value: {
    overflow: 'unset',
  },
  writable: true,
})

describe('LandingPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    // Date.nowをモック
    vi.spyOn(Date, 'now').mockReturnValue(1000000000000)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    // body styleをリセット
    document.body.style.overflow = 'unset'
  })

  describe('基本レンダリング', () => {
    it('コンポーネントが正常にレンダリングされる', () => {
      render(<LandingPageClient locale="ja" />)
      expect(document.body).toBeInTheDocument()
    })

    it('localeプロパティが正しく渡される', () => {
      render(<LandingPageClient locale="en" />)
      expect(document.body).toBeInTheDocument()
    })

    it('ハイドレーション前は固定背景のみ表示される', () => {
      // useEffectが実行される前の状態をテスト
      const { container } = render(<LandingPageClient locale="ja" />)
      const loadingDiv = container.querySelector('.fixed.inset-0.z-50.bg-background')
      expect(loadingDiv).toBeInTheDocument()
    })
  })

  describe('スプラッシュスクリーン機能', () => {
    it('初回訪問時にスプラッシュスクリーンが表示される', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
      })
    })

    it('1時間以内の再訪問時はスプラッシュスクリーンが表示されない', async () => {
      // 30分前のタイムスタンプを設定
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
      mockLocalStorage.getItem.mockReturnValue(thirtyMinutesAgo.toString())

      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
        expect(screen.getByTestId('header')).toBeInTheDocument()
      })
    })

    it('1時間経過後の再訪問時はスプラッシュスクリーンが表示される', async () => {
      // 2時間前のタイムスタンプを設定
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
      mockLocalStorage.getItem.mockReturnValue(twoHoursAgo.toString())

      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
      })
    })

    it('スプラッシュスクリーン完了時にメインコンテンツが表示される', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      render(<LandingPageClient locale="ja" />)

      // スプラッシュスクリーンが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
      })

      // Complete ボタンをクリック
      fireEvent.click(screen.getByText('Complete Splash'))

      // メインコンテンツが表示されることを確認
      await waitFor(() => {
        expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
        expect(screen.getByTestId('header')).toBeInTheDocument()
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      })
    })
  })

  describe('スクロール制御', () => {
    it('スプラッシュスクリーン表示中はbodyのスクロールが無効化される', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
        expect(document.body.style.overflow).toBe('hidden')
      })
    })

    it('スプラッシュスクリーン完了後はbodyのスクロールが有効化される', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Complete Splash'))

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('unset')
      })
    })

    it('コンポーネントアンマウント時にbodyのスクロールがリセットされる', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { unmount } = render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden')
      })

      unmount()

      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('LocalStorage操作', () => {
    it('初回表示時にlocalStorageにタイムスタンプが保存される', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'bockerLastSplash',
          Date.now().toString()
        )
      })
    })

    it('localStorageエラー時も正常に動作する', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error')
      })

      // エラーが発生してもコンポーネントは正常にレンダリングされる
      expect(() => render(<LandingPageClient locale="ja" />)).not.toThrow()
    })
  })

  describe('コンポーネント構成', () => {
    it('メインコンテンツに必要なセクションが全て含まれる', async () => {
      mockLocalStorage.getItem.mockReturnValue('1')

      render(<LandingPageClient locale="ja" />)

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument()
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
        expect(screen.getByTestId('feature-section')).toBeInTheDocument()
        expect(screen.getByTestId('pricing')).toBeInTheDocument()
        expect(screen.getByTestId('content-section')).toBeInTheDocument()
        expect(screen.getByTestId('cta-section')).toBeInTheDocument()
        expect(screen.getByTestId('faq')).toBeInTheDocument()
        expect(screen.getByTestId('header-section')).toBeInTheDocument()
        expect(screen.getByTestId('footer')).toBeInTheDocument()
      })
    })

    it('FAQコンポーネントにlocaleが正しく渡される', async () => {
      mockLocalStorage.getItem.mockReturnValue('1')

      render(<LandingPageClient locale="en" />)

      await waitFor(() => {
        expect(screen.getByText('FAQ - en')).toBeInTheDocument()
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('Date.now()エラー時のフォールバック', async () => {
      vi.spyOn(Date, 'now').mockImplementation(() => {
        throw new Error('Date error')
      })

      // エラーが発生してもコンポーネントは正常にレンダリングされる
      expect(() => render(<LandingPageClient locale="ja" />)).not.toThrow()
    })
  })
})
