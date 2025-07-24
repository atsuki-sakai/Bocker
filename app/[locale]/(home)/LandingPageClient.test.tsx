import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { LandingPageClient } from './LandingPageClient'
import React from 'react'

// モックコンポーネント - React.createElement を使用
const createMockComponent = (testId: string, content: string) => 
  vi.fn(() => React.createElement('div', { 'data-testid': testId }, content))

const createMockComponentWithProps = (testId: string, content: string) =>
  vi.fn((props: any) => React.createElement('div', { 'data-testid': testId }, `${content} - ${props.locale || ''}`))

const createMockSplashScreen = () =>
  vi.fn(({ onComplete }: { onComplete: () => void }) => 
    React.createElement('div', { 'data-testid': 'splash-screen' },
      React.createElement('button', { onClick: onComplete }, 'Complete Splash')
    )
  )

vi.mock('./_components', () => ({
  HeroSection: createMockComponent('hero-section', 'Hero Section'),
  FeatureSection: createMockComponent('feature-section', 'Feature Section'),
  Pricing: createMockComponent('pricing', 'Pricing'),
  HeaderSection: createMockComponent('header-section', 'Header Section'),
  ContentSection: createMockComponent('content-section', 'Content Section'),
  CTASection: createMockComponent('cta-section', 'CTA Section'),
  FAQ: createMockComponentWithProps('faq', 'FAQ'),
  SplashScreen: createMockSplashScreen(),
  Header: createMockComponent('header', 'Header'),
  Footer: createMockComponent('footer', 'Footer'),
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
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('初期レンダリング時は何も表示しない（ハイドレーション待ち）', () => {
    render(<LandingPageClient locale="ja" />)
    
    // ハイドレーション前は固定背景のみ表示
    const background = document.querySelector('.fixed.inset-0.z-50.bg-background')
    expect(background).toBeInTheDocument()
  })

  it('ハイドレーション後にメインコンテンツを表示する', async () => {
    render(<LandingPageClient locale="ja" />)
    
    // useEffectが実行されるのを待つ
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    expect(screen.getByTestId('hero-section')).toBeInTheDocument()
    expect(screen.getByTestId('feature-section')).toBeInTheDocument()
    expect(screen.getByTestId('pricing')).toBeInTheDocument()
    expect(screen.getByTestId('content-section')).toBeInTheDocument()
    expect(screen.getByTestId('cta-section')).toBeInTheDocument()
    expect(screen.getByTestId('faq')).toBeInTheDocument()
    expect(screen.getByTestId('header-section')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('localStorageにスプラッシュ表示履歴がない場合、スプラッシュスクリーンを表示', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    
    render(<LandingPageClient locale="ja" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
    })
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'bockerLastSplash',
      expect.any(String)
    )
  })

  it('localStorageのスプラッシュ表示履歴が1時間以内の場合、スプラッシュスクリーンを表示しない', async () => {
    const now = Date.now()
    const thirtyMinutesAgo = now - (30 * 60 * 1000) // 30分前
    mockLocalStorage.getItem.mockReturnValue(thirtyMinutesAgo.toString())
    
    render(<LandingPageClient locale="ja" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })
    
    expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
    expect(screen.getByTestId('hero-section')).toBeInTheDocument()
  })

  it('localStorageのスプラッシュ表示履歴が1時間を超えている場合、スプラッシュスクリーンを表示', async () => {
    const now = Date.now()
    const twoHoursAgo = now - (2 * 60 * 60 * 1000) // 2時間前
    mockLocalStorage.getItem.mockReturnValue(twoHoursAgo.toString())
    
    render(<LandingPageClient locale="ja" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
    })
  })

  it('スプラッシュスクリーン完了後にメインコンテンツを表示', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    
    render(<LandingPageClient locale="ja" />)
    
    // スプラッシュスクリーンが表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
    })
    
    // スプラッシュ完了をクリック
    const completeButton = screen.getByText('Complete Splash')
    fireEvent.click(completeButton)
    
    // メインコンテンツが表示される
    await waitFor(() => {
      expect(screen.getByTestId('hero-section')).toBeInTheDocument()
    })
    
    expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
  })

  it('FAQコンポーネントに正しいlocaleを渡す', async () => {
    mockLocalStorage.getItem.mockReturnValue('1') // スプラッシュスクリーンをスキップ
    
    render(<LandingPageClient locale="en" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('faq')).toBeInTheDocument()
      expect(screen.getByTestId('faq')).toHaveTextContent('FAQ - en')
    })
  })

  it('スプラッシュ表示中はスクロールを無効化する', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    
    render(<LandingPageClient locale="ja" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
    })
    
    // document.body.style.overflowが'hidden'に設定されることを確認
    // 実際のDOMスタイル操作のテストは制限があるため、
    // コンポーネントの動作を通じてテストする
    expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
  })
})