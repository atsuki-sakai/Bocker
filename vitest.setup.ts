import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'
import type { ImageProps } from 'next/image'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock Next.js image

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: ImageProps) => {
    return React.createElement('img', props)
  },
}))

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
  useLocale: vi.fn(() => 'ja'),
  useMessages: vi.fn(() => ({})),
}))

// Mock next-intl/server (for server-side components)
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn((namespace?: string) => {
    const translations: Record<string, Record<string, string> | string> = {
      // Flat structure translations (for generateMetadata)
      'meta.title': 'Bocker - 美容サロン向け予約管理システム',
      'meta.description': '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム',
      'meta.keywords': '予約管理,美容サロン,SaaS',
      'meta.siteName': 'Bocker',
      'ogp.title': 'Bocker - 美容サロン向け予約管理システム',
      'ogp.description': '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム',
      'ogp.imageAlt': 'Bocker予約管理システム',
      'twitter.title': 'Bocker - 美容サロン向け予約管理システム',
      'twitter.description': '美容サロン向けの効率的な予約・顧客管理SaaSプラットフォーム',
      'seo.structuredData.organization.name': 'Bocker',
      'seo.structuredData.organization.alternateName': 'ボッカー',
      'seo.structuredData.organization.description': '美容サロン向け予約管理システム',
      'seo.structuredData.organization.address.locality': '東京',
      'seo.structuredData.organization.address.region': '東京都',
      'seo.structuredData.application.name': 'Bocker',
      'seo.structuredData.application.description': '美容サロン向け予約管理システム',
      'seo.structuredData.application.offers.lite.name': 'Liteプラン',
      'seo.structuredData.application.offers.lite.description': 'スタンダードプラン',
      'seo.structuredData.application.offers.pro.name': 'Proプラン',
      'seo.structuredData.application.offers.pro.description': 'プロフェッショナルプラン',
      'seo.structuredData.website.name': 'Bocker',
      'seo.structuredData.website.description': '美容サロン向け予約管理システム',

      // Namespaced translations (for useTranslations with namespace)
      'landing.cta': {
        title: 'ご利用を開始する',
        title2: '今すぐ無料トライアルを開始',
        button: '30日間無料トライアル',
        button2: '詳細を見る',
      },
    }

    return (key: string) => {
      if (namespace && translations[namespace]) {
        const namespaced = translations[namespace] as Record<string, string>
        return namespaced[key] || key
      }
      return (translations[key] as string) || key
    }
  }),
}))

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(() => ({
    userId: 'test-user-id',
    isSignedIn: true,
    getToken: vi.fn(() => Promise.resolve('test-token')),
  })),
  useUser: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      firstName: 'Test',
      lastName: 'User',
    },
    isLoaded: true,
  })),
  useOrganization: vi.fn(() => ({
    organization: {
      id: 'test-org-id',
      name: 'Test Organization',
    },
    isLoaded: true,
  })),
  SignIn: vi.fn(() => React.createElement('div', {}, 'SignIn Component')),
  SignUp: vi.fn(() => React.createElement('div', {}, 'SignUp Component')),
  UserButton: vi.fn(() => React.createElement('div', {}, 'UserButton Component')),
}))

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
  ConvexReactClient: vi.fn(),
  ConvexProvider: vi.fn(({ children }) => children),
}))

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []

  constructor(
    private callback: IntersectionObserverCallback,
    private options?: IntersectionObserverInit
  ) {}

  observe(): void {
    // 必要に応じてモックの動作を定義
    // 例: 即座にコールバックを呼び出す
    // this.callback([/* mock IntersectionObserverEntry */], this);
  }

  unobserve(): void {
    // 実装は空でも可
  }

  disconnect(): void {
    // 実装は空でも可
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [] // 空の配列を返す
  }
}

// global にモックを割り当て
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// 同様の問題が ResizeObserver にもある場合、こちらも修正
// Mock ResizeObserver (必要に応じて)
class MockResizeObserver implements ResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}

  observe(): void {
    // 必要に応じてモックの動作を定義
  }

  unobserve(): void {
    // 実装は空でも可
  }

  disconnect(): void {
    // 実装は空でも可
  }
}

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Framer Motion
vi.mock('framer-motion', () => {
  // 各モーションコンポーネントを個別に定義し、displayNameを設定
  const MockMotionDiv = React.forwardRef<HTMLDivElement>(({ ...props }, ref) =>
    React.createElement('div', { ...props, ref })
  )
  MockMotionDiv.displayName = 'motion.div' // <-- ここに displayName を設定

  const MockMotionH1 = React.forwardRef<HTMLHeadingElement>(({ ...props }, ref) =>
    React.createElement('h1', { ...props, ref })
  )
  MockMotionH1.displayName = 'motion.h1'

  const MockMotionH2 = React.forwardRef<HTMLHeadingElement>(({ ...props }, ref) =>
    React.createElement('h2', { ...props, ref })
  )
  MockMotionH2.displayName = 'motion.h2'

  const MockMotionP = React.forwardRef<HTMLParagraphElement>(({ ...props }, ref) =>
    React.createElement('p', { ...props, ref })
  )
  MockMotionP.displayName = 'motion.p'

  const MockMotionSection = React.forwardRef<HTMLElement>(({ ...props }, ref) =>
    React.createElement('section', { ...props, ref })
  )
  MockMotionSection.displayName = 'motion.section'

  const MockMotionNav = React.forwardRef<HTMLElement>(({ ...props }, ref) =>
    React.createElement('nav', { ...props, ref })
  )
  MockMotionNav.displayName = 'motion.nav'

  const MockMotionUl = React.forwardRef<HTMLUListElement>(({ ...props }, ref) =>
    React.createElement('ul', { ...props, ref })
  )
  MockMotionUl.displayName = 'motion.ul'

  const MockMotionLi = React.forwardRef<HTMLLIElement>(({ ...props }, ref) =>
    React.createElement('li', { ...props, ref })
  )
  MockMotionLi.displayName = 'motion.li'

  const MockMotionButton = React.forwardRef<HTMLButtonElement>(({ ...props }, ref) =>
    React.createElement('button', { ...props, ref })
  )
  MockMotionButton.displayName = 'motion.button'

  const MockMotionForm = React.forwardRef<HTMLFormElement>(({ ...props }, ref) =>
    React.createElement('form', { ...props, ref })
  )
  MockMotionForm.displayName = 'motion.form'

  const MockMotionInput = React.forwardRef<HTMLInputElement>(({ ...props }, ref) =>
    React.createElement('input', { ...props, ref })
  )
  MockMotionInput.displayName = 'motion.input'

  const MockMotionA = React.forwardRef<HTMLAnchorElement>(({ ...props }, ref) =>
    React.createElement('a', { ...props, ref })
  )
  MockMotionA.displayName = 'motion.a'

  const MockMotionSpan = React.forwardRef<HTMLSpanElement>(({ ...props }, ref) =>
    React.createElement('span', { ...props, ref })
  )
  MockMotionSpan.displayName = 'motion.span'

  const MockMotionDt = React.forwardRef<HTMLElement>(({ ...props }, ref) =>
    React.createElement('dt', { ...props, ref })
  )
  MockMotionDt.displayName = 'motion.dt'

  const MockMotionDd = React.forwardRef<HTMLElement>(({ ...props }, ref) =>
    React.createElement('dd', { ...props, ref })
  )
  MockMotionDd.displayName = 'motion.dd'

  return {
    motion: {
      div: MockMotionDiv,
      h1: MockMotionH1,
      h2: MockMotionH2,
      p: MockMotionP,
      section: MockMotionSection,
      nav: MockMotionNav,
      ul: MockMotionUl,
      li: MockMotionLi,
      button: MockMotionButton,
      form: MockMotionForm,
      input: MockMotionInput,
      a: MockMotionA,
      span: MockMotionSpan,
      dt: MockMotionDt,
      dd: MockMotionDd,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, {}, children),
  }
})

// Mock i18n/navigation
vi.mock('@/i18n/navigation', () => {
  // Link コンポーネントモックを変数に代入
  const MockLink = React.forwardRef<HTMLAnchorElement>((props, ref) =>
    React.createElement('a', { ...props, ref })
  )
  // displayName を設定
  MockLink.displayName = 'MockLink' // または 'i18nNavigation.Link' など任意の名前

  return {
    Link: MockLink, // モックしたコンポーネントを使用
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    })),
    usePathname: vi.fn(() => '/ja'),
    redirect: vi.fn(),
  }
})

// Mock Element.prototype.scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock window.print
Object.defineProperty(window, 'print', {
  value: vi.fn(),
  writable: true,
})

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
  writable: true,
})

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
})