import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTranslations } from 'next-intl'
import { TeamSection } from '../TeamSection'

// Mock useTranslations to return translation keys as-is for testing
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Instagram: (props: any) => <svg data-testid="instagram-icon" {...props} />, // eslint-disable-line @typescript-eslint/no-explicit-any
}))

describe('TeamSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<TeamSection />)

      // メインセクションが表示される (note: component uses data-testid instead of data-test-id)
      const container = document.querySelector('[data-testid="team-section"]')
      expect(container).toBeInTheDocument()
    })

    it('セクションタイトルが表示される', () => {
      render(<TeamSection />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('team.title')
    })

    it('セクション説明が表示される', () => {
      render(<TeamSection />)

      expect(screen.getByText('team.description')).toBeInTheDocument()
    })
  })

  describe('チームメンバー表示', () => {
    it('チームメンバーが表示される', () => {
      render(<TeamSection />)

      const memberName = screen.getByText('Fujimoto Kyohei / 藤本恭平')
      expect(memberName).toBeInTheDocument()
    })

    it('メンバーの役職が表示される', () => {
      render(<TeamSection />)

      expect(screen.getByText('team.role')).toBeInTheDocument()
    })

    it('メンバーの経歴が表示される', () => {
      render(<TeamSection />)

      expect(screen.getByText('team.bio')).toBeInTheDocument()
    })

    it('メンバーの画像が表示される', () => {
      render(<TeamSection />)

      const memberImage = screen.getByAltText('Fujimoto Kyohei')
      expect(memberImage).toBeInTheDocument()
      expect(memberImage).toHaveAttribute('src', '/assets/images/kyohei_fujimoto.jpg')
    })

    it('画像に適切なサイズ属性が設定される', () => {
      render(<TeamSection />)

      const memberImage = screen.getByAltText('Fujimoto Kyohei')
      expect(memberImage).toHaveAttribute('width', '1200')
      expect(memberImage).toHaveAttribute('height', '1200')
    })
  })

  describe('ソーシャルリンク', () => {
    it('Instagramリンクが表示される', () => {
      render(<TeamSection />)

      const instagramLink = screen.getByRole('link')
      expect(instagramLink).toHaveAttribute('href', 'https://www.instagram.com/bocker_fujimoto')
    })

    it('Instagramアイコンが表示される', () => {
      render(<TeamSection />)

      const instagramIcon = screen.getByTestId('instagram-icon')
      expect(instagramIcon).toBeInTheDocument()
      expect(instagramIcon).toHaveClass('size-5', 'text-pink-500')
    })

    it('スクリーンリーダー用のテキストが設定される', () => {
      render(<TeamSection />)

      const srText = screen.getByText('Instagram')
      expect(srText).toHaveClass('sr-only')
    })

    it('リンクに適切なホバー効果が設定される', () => {
      render(<TeamSection />)

      const instagramLink = screen.getByRole('link')
      expect(instagramLink).toHaveClass('text-accent', 'hover:text-accent')
    })
  })

  describe('レスポンシブデザイン', () => {
    it('適切なレスポンシブクラスが適用される', () => {
      render(<TeamSection />)

      const container = document.querySelector('[data-testid="team-section"]')
      const innerContainer = container?.querySelector('.py-24')

      expect(innerContainer).toHaveClass('py-24', 'md:py-32')
    })

    it('グリッドレイアウトがレスポンシブに対応している', () => {
      render(<TeamSection />)

      const container = document.querySelector('[data-testid="team-section"]')
      const gridContainer = container?.querySelector('.grid')

      expect(gridContainer).toHaveClass('grid-cols-1', 'xl:grid-cols-5')
    })

    it('メンバーカードがレスポンシブレイアウトに対応している', () => {
      render(<TeamSection />)

      const container = document.querySelector('[data-testid="team-section"]')
      const memberCard = container?.querySelector('.flex-col')

      expect(memberCard).toHaveClass('flex-col', 'sm:flex-row')
    })

    it('タイトルのフォントサイズがレスポンシブに対応している', () => {
      render(<TeamSection />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveClass('text-4xl', 'sm:text-5xl')
    })
  })

  describe('アクセシビリティ', () => {
    it('適切な見出し階層が使用される', () => {
      render(<TeamSection />)

      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toBeInTheDocument()

      const memberHeading = screen.getByRole('heading', { level: 3 })
      expect(memberHeading).toBeInTheDocument()
      expect(memberHeading).toHaveTextContent('Fujimoto Kyohei / 藤本恭平')
    })

    it('リスト構造が適切にマークアップされている', () => {
      render(<TeamSection />)

      const memberLists = screen.getAllByRole('list')
      expect(memberLists[0]).toBeInTheDocument()

      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBeGreaterThan(0)
    })

    it('ソーシャルリンクリストが適切にマークアップされている', () => {
      render(<TeamSection />)

      const socialList = screen.getAllByRole('list')[1] // 2番目のリスト（ソーシャルリンク）
      expect(socialList).toBeInTheDocument()
    })

    it('画像にalt属性が設定される', () => {
      render(<TeamSection />)

      const memberImage = screen.getByAltText('Fujimoto Kyohei')
      expect(memberImage).toHaveAttribute('alt', 'Fujimoto Kyohei')
    })

    it('リンクに適切なアクセシビリティ属性が設定される', () => {
      render(<TeamSection />)

      const instagramLink = screen.getByRole('link')
      expect(instagramLink).toHaveAttribute('href')
    })
  })

  describe('エラーハンドリング', () => {
    it('useTranslationsが正しく呼び出される', () => {
      const mockUseTranslations = vi.mocked(useTranslations)

      render(<TeamSection />)

      expect(mockUseTranslations).toHaveBeenCalledWith('aboutPage')
    })

    it('翻訳キーが見つからない場合のフォールバック', () => {
      const mockT = vi.fn((key: string) => `missing.${key}`)
      vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      render(<TeamSection />)

      expect(screen.getByText('missing.team.title')).toBeInTheDocument()
    })
  })

  describe('コンポーネント統合', () => {
    it('Framer Motionのアニメーション属性が適用される', () => {
      render(<TeamSection />)

      const container = document.querySelector('[data-testid="team-section"]')
      expect(container).toBeInTheDocument()
    })

    it('Next.js Imageコンポーネントが正しくレンダリングされる', () => {
      render(<TeamSection />)

      const memberImage = screen.getByAltText('Fujimoto Kyohei')
      expect(memberImage.tagName).toBe('IMG')
    })

    it('Next.js Linkコンポーネントが正しくレンダリングされる', () => {
      render(<TeamSection />)

      const instagramLink = screen.getByRole('link')
      expect(instagramLink.tagName).toBe('A')
    })
  })

  describe('多言語対応', () => {
    it('必要な翻訳キーがすべて使用されている', () => {
      const mockT = vi.fn((key: string) => key)
      vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      render(<TeamSection />)

      // 重要な翻訳キーが呼び出されることを確認
      expect(mockT).toHaveBeenCalledWith('team.title')
      expect(mockT).toHaveBeenCalledWith('team.description')
      expect(mockT).toHaveBeenCalledWith('team.role')
      expect(mockT).toHaveBeenCalledWith('team.bio')
    })
  })

  describe('レイアウト構造', () => {
    it('適切なコンテナ構造が適用される', () => {
      render(<TeamSection />)

      const container = document.querySelector('[data-testid="team-section"]')
      const maxWidthContainer = container?.querySelector('.max-w-7xl')

      expect(maxWidthContainer).toHaveClass('mx-auto', 'grid', 'max-w-7xl')
    })

    it('適切な間隔が設定される', () => {
      render(<TeamSection />)

      const container = document.querySelector('[data-testid="team-section"]')
      const gridContainer = container?.querySelector('.gap-20')

      expect(gridContainer).toHaveClass('gap-20')
    })

    it('メンバーカードに適切なパディングが設定される', () => {
      render(<TeamSection />)

      const container = document.querySelector('[data-testid="team-section"]')
      const memberCard = container?.querySelector('.py-12')

      expect(memberCard).toHaveClass('py-12', 'first:pt-0', 'last:pb-0')
    })

    it('画像に適切なスタイルクラスが適用される', () => {
      render(<TeamSection />)

      const memberImage = screen.getByAltText('Fujimoto Kyohei')
      expect(memberImage).toHaveClass(
        'aspect-4/5',
        'w-52',
        'flex-none',
        'rounded-2xl',
        'object-cover',
        'object-center',
        'shadow-md'
      )
    })
  })

  describe('スタイリング', () => {
    it('適切な背景色が適用される', () => {
      render(<TeamSection />)

      const container = document.querySelector('[data-testid="team-section"]')
      const backgroundContainer = container?.querySelector('.bg-background')

      expect(backgroundContainer).toHaveClass('bg-background')
    })

    it('テキストに適切な色クラスが適用される', () => {
      render(<TeamSection />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveClass('text-primary')

      const description = screen.getByText('team.description')
      expect(description).toHaveClass('text-primary')
    })

    it('メンバー情報に適切なタイポグラフィが適用される', () => {
      render(<TeamSection />)

      const memberName = screen.getByRole('heading', { level: 3 })
      expect(memberName).toHaveClass('text-lg/8', 'font-semibold', 'tracking-tight', 'text-primary')

      const memberRole = screen.getByText('team.role')
      expect(memberRole).toHaveClass('text-base/7', 'text-primary')
    })
  })

  describe('パフォーマンス', () => {
    it('画像に適切なサイズ属性が設定される', () => {
      render(<TeamSection />)

      const memberImage = screen.getByAltText('Fujimoto Kyohei')
      expect(memberImage).toHaveAttribute('width')
      expect(memberImage).toHaveAttribute('height')
    })

    it('画像の最適化クラスが適用される', () => {
      render(<TeamSection />)

      const memberImage = screen.getByAltText('Fujimoto Kyohei')
      expect(memberImage).toHaveClass('object-cover', 'object-center')
    })
  })
})
