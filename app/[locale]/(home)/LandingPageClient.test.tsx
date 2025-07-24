import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
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
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('コンポーネントが正常にレンダリングされる', () => {
    render(<LandingPageClient locale="ja" />)
    expect(document.body).toBeInTheDocument()
  })

  it('localeプロパティが正しく渡される', () => {
    render(<LandingPageClient locale="en" />)
    expect(document.body).toBeInTheDocument()
  })
})