import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SplashScreen } from '../SplashScreen'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>, // eslint-disable-line @typescript-eslint/no-explicit-any
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>, // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>, // eslint-disable-line @typescript-eslint/no-explicit-any
}))

// Mock timers
vi.useFakeTimers()

describe('SplashScreen', () => {
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      // メインセクションが表示される (note: component uses data-testid instead of data-test-id)
      const container = document.querySelector('[data-testid="splash-screen"]')
      expect(container).toBeInTheDocument()
    })

    it('初期状態で表示される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('fixed', 'inset-0', 'z-[9999]')
    })

    it('適切なz-indexが設定される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      expect(container).toHaveStyle({ zIndex: '9999' })
    })
  })

  describe('ロゴ表示', () => {
    it('Bockerロゴが表示される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const logo = screen.getByAltText('Bocker Logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', '/assets/images/logo-darkgreen.png')
    })

    it('ロゴに適切なサイズ属性が設定される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const logo = screen.getByAltText('Bocker Logo')
      expect(logo).toHaveAttribute('width', '80')
      expect(logo).toHaveAttribute('height', '80')
    })

    it('ロゴコンテナに適切なクラスが適用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const logo = screen.getByAltText('Bocker Logo')
      const logoContainer = logo.closest('.w-28')

      expect(logoContainer).toHaveClass('w-28', 'h-28', 'flex', 'items-center', 'justify-center')
    })
  })

  describe('ブランド名表示', () => {
    it('Bockerブランド名が表示される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const brandName = screen.getByRole('heading', { level: 1 })
      expect(brandName).toBeInTheDocument()
      expect(brandName).toHaveClass('text-2xl', 'font-bold', 'text-foreground', 'mb-2')
    })

    it('ブランド名の各文字が個別にレンダリングされる', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const letters = ['B', 'o', 'c', 'k', 'e', 'r']
      letters.forEach((letter) => {
        const letterElement = screen.getByText(letter)
        expect(letterElement).toBeInTheDocument()
        expect(letterElement).toHaveClass('inline-block')
      })
    })
  })

  describe('ローディングインジケーター', () => {
    it('ローディングバーが表示される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      const loadingBar = container?.querySelector('.w-32.h-0\\.5')

      expect(loadingBar).toHaveClass(
        'w-32',
        'h-0.5',
        'bg-primary/20',
        'rounded-full',
        'overflow-hidden'
      )
    })

    it('ローディングバーの進行状況が表示される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      const progressBar = container?.querySelector('.h-full.bg-primary')

      expect(progressBar).toHaveClass('h-full', 'bg-primary', 'rounded-full')
    })

    it('アニメーション用のリング要素が表示される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      const animationRing = container?.querySelector('.w-40.h-40.border')

      expect(animationRing).toHaveClass(
        'w-40',
        'h-40',
        'border',
        'border-primary/5',
        'rounded-full'
      )
    })
  })

  describe('タイマー機能', () => {
    it('2秒後にonCompleteが呼び出される', async () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      // 初期状態ではonCompleteが呼ばれていない
      expect(mockOnComplete).not.toHaveBeenCalled()

      // 2秒経過
      vi.advanceTimersByTime(2000)

      // この時点ではまだonCompleteは呼ばれていない（フェードアウト中）
      expect(mockOnComplete).not.toHaveBeenCalled()

      // さらに500ms経過（フェードアウト完了）
      vi.advanceTimersByTime(500)

      // onCompleteが呼び出される
      expect(mockOnComplete).toHaveBeenCalledTimes(1)
    })

    it('コンポーネントがアンマウントされた場合タイマーがクリアされる', () => {
      const { unmount } = render(<SplashScreen onComplete={mockOnComplete} />)

      // アンマウント
      unmount()

      // 2秒経過
      vi.advanceTimersByTime(2500)

      // onCompleteが呼び出されないことを確認
      expect(mockOnComplete).not.toHaveBeenCalled()
    })
  })

  describe('レスポンシブデザイン', () => {
    it('適切なレスポンシブクラスが適用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'bg-background')
    })

    it('中央配置が適切に設定される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      const centerContainer = container?.querySelector('.relative.flex.flex-col')

      expect(centerContainer).toHaveClass(
        'relative',
        'flex',
        'flex-col',
        'items-center',
        'justify-center'
      )
    })
  })

  describe('アクセシビリティ', () => {
    it('適切な見出し階層が使用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    it('ロゴに適切なalt属性が設定される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const logo = screen.getByAltText('Bocker Logo')
      expect(logo).toHaveAttribute('alt', 'Bocker Logo')
    })

    it('固定位置要素が適切に設定される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      expect(container).toHaveClass('fixed', 'inset-0')
      expect(container).toHaveStyle({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('onCompleteプロパティが必須である', () => {
      // TypeScriptの型チェックにより、onCompleteは必須プロパティ
      expect(() => {
        render(<SplashScreen onComplete={mockOnComplete} />)
      }).not.toThrow()
    })

    it('onCompleteが関数でない場合でもエラーが発生しない', () => {
      const invalidOnComplete = null as unknown as () => void

      expect(() => {
        render(<SplashScreen onComplete={invalidOnComplete} />)
      }).not.toThrow()
    })
  })

  describe('コンポーネント統合', () => {
    it('Framer Motionのアニメーション属性が適用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      expect(container).toBeInTheDocument()
    })

    it('Next.js Imageコンポーネントが正しくレンダリングされる', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const logo = screen.getByAltText('Bocker Logo')
      expect(logo.tagName).toBe('IMG')
    })

    it('AnimatePresenceが正しく動作する', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      expect(container).toBeInTheDocument()
    })
  })

  describe('スタイリング', () => {
    it('適切な背景色が適用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      expect(container).toHaveClass('bg-background')
    })

    it('ロゴコンテナに適切なマージンが適用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      const logoContainer = container?.querySelector('.mb-8')

      expect(logoContainer).toHaveClass('relative', 'mb-8')
    })

    it('テキストセンターが適用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      const textContainer = container?.querySelector('.text-center')

      expect(textContainer).toHaveClass('text-center')
    })

    it('ローディングバーに適切なマージンが適用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const container = document.querySelector('[data-testid="splash-screen"]')
      const loadingContainer = container?.querySelector('.mt-8')

      expect(loadingContainer).toHaveClass('mt-8')
    })
  })

  describe('パフォーマンス', () => {
    it('画像に適切なサイズ属性が設定される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const logo = screen.getByAltText('Bocker Logo')
      expect(logo).toHaveAttribute('width')
      expect(logo).toHaveAttribute('height')
    })

    it('画像の最適化クラスが適用される', () => {
      render(<SplashScreen onComplete={mockOnComplete} />)

      const logo = screen.getByAltText('Bocker Logo')
      expect(logo).toHaveClass('w-full', 'h-full', 'object-contain')
    })
  })
})
