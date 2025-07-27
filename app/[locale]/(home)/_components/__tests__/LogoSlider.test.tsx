import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LogoSlider } from '../LogoSlider'

describe('LogoSlider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<LogoSlider />)

      // メインセクションが表示される (note: component uses data-testid instead of data-test-id)
      const container = document.querySelector('[data-testid="logo-slider"]')
      expect(container).toBeInTheDocument()
    })

    it('適切な背景色が適用される', () => {
      render(<LogoSlider />)

      const container = document.querySelector('[data-testid="logo-slider"]')
      expect(container).toHaveClass('bg-white')
    })
  })

  describe('ロゴ表示', () => {
    it('5つの企業ロゴが表示される', () => {
      render(<LogoSlider />)

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(5)
    })

    it('各ロゴに適切なalt属性が設定される', () => {
      render(<LogoSlider />)

      const expectedCompanies = ['Transistor', 'Reform', 'Tuple', 'SavvyCal', 'Statamic']

      expectedCompanies.forEach((company) => {
        const logo = screen.getByAltText(company)
        expect(logo).toBeInTheDocument()
      })
    })

    it('各ロゴに適切なsrc属性が設定される', () => {
      render(<LogoSlider />)

      const expectedSources = [
        'https://tailwindcss.com/plus-assets/img/logos/158x48/transistor-logo-gray-900.svg',
        'https://tailwindcss.com/plus-assets/img/logos/158x48/reform-logo-gray-900.svg',
        'https://tailwindcss.com/plus-assets/img/logos/158x48/tuple-logo-gray-900.svg',
        'https://tailwindcss.com/plus-assets/img/logos/158x48/savvycal-logo-gray-900.svg',
        'https://tailwindcss.com/plus-assets/img/logos/158x48/statamic-logo-gray-900.svg',
      ]

      const images = screen.getAllByRole('img')
      expectedSources.forEach((src, index) => {
        expect(images[index]).toHaveAttribute('src', src)
      })
    })

    it('各ロゴに適切なサイズ属性が設定される', () => {
      render(<LogoSlider />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('width', '158')
        expect(img).toHaveAttribute('height', '48')
      })
    })
  })

  describe('レスポンシブデザイン', () => {
    it('適切なレスポンシブクラスが適用される', () => {
      render(<LogoSlider />)

      const container = document.querySelector('[data-testid="logo-slider"]')
      expect(container).toHaveClass('py-24', 'sm:py-32')
    })

    it('グリッドレイアウトがレスポンシブに対応している', () => {
      render(<LogoSlider />)

      const container = document.querySelector('[data-testid="logo-slider"]')
      const gridContainer = container?.querySelector('.grid')

      expect(gridContainer).toHaveClass('grid-cols-4', 'sm:grid-cols-6', 'lg:grid-cols-5')
    })

    it('画像に適切なレスポンシブクラスが適用される', () => {
      render(<LogoSlider />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveClass('col-span-2', 'lg:col-span-1')
        expect(img).toHaveClass('max-h-12', 'w-full', 'object-contain')
      })
    })

    it('コンテナの最大幅がレスポンシブに対応している', () => {
      render(<LogoSlider />)

      const container = document.querySelector('[data-testid="logo-slider"]')
      const gridContainer = container?.querySelector('.grid')

      expect(gridContainer).toHaveClass('max-w-lg', 'sm:max-w-xl', 'lg:max-w-none')
    })
  })

  describe('レイアウト構造', () => {
    it('適切なコンテナ構造が適用される', () => {
      render(<LogoSlider />)

      const container = document.querySelector('[data-testid="logo-slider"]')
      const maxWidthContainer = container?.querySelector('.max-w-7xl')

      expect(maxWidthContainer).toHaveClass('mx-auto', 'max-w-7xl', 'px-6', 'lg:px-8')
    })

    it('グリッドに適切な間隔が設定される', () => {
      render(<LogoSlider />)

      const container = document.querySelector('[data-testid="logo-slider"]')
      const gridContainer = container?.querySelector('.grid')

      expect(gridContainer).toHaveClass('gap-x-8', 'gap-y-10', 'sm:gap-x-10')
    })

    it('グリッドアイテムが中央揃えされる', () => {
      render(<LogoSlider />)

      const container = document.querySelector('[data-testid="logo-slider"]')
      const gridContainer = container?.querySelector('.grid')

      expect(gridContainer).toHaveClass('items-center')
    })
  })

  describe('アクセシビリティ', () => {
    it('各ロゴに適切なalt属性が設定される', () => {
      render(<LogoSlider />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt')
        expect(img.getAttribute('alt')).not.toBe('')
      })
    })

    it('画像がスクリーンリーダーで読み上げ可能である', () => {
      render(<LogoSlider />)

      const transistorLogo = screen.getByAltText('Transistor')
      const reformLogo = screen.getByAltText('Reform')
      const tupleLogo = screen.getByAltText('Tuple')
      const savvycalLogo = screen.getByAltText('SavvyCal')
      const stamaticLogo = screen.getByAltText('Statamic')

      expect(transistorLogo).toBeInTheDocument()
      expect(reformLogo).toBeInTheDocument()
      expect(tupleLogo).toBeInTheDocument()
      expect(savvycalLogo).toBeInTheDocument()
      expect(stamaticLogo).toBeInTheDocument()
    })
  })

  describe('パフォーマンス', () => {
    it('画像に適切なサイズ属性が設定される', () => {
      render(<LogoSlider />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('width')
        expect(img).toHaveAttribute('height')
      })
    })

    it('画像の最適化クラスが適用される', () => {
      render(<LogoSlider />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveClass('object-contain')
      })
    })
  })

  describe('コンポーネント統合', () => {
    it('Next.js Imageコンポーネントが正しくレンダリングされる', () => {
      render(<LogoSlider />)

      const images = screen.getAllByRole('img')
      expect(images.length).toBe(5)

      // モックされたImageコンポーネントがimg要素として表示される
      images.forEach((img) => {
        expect(img.tagName).toBe('IMG')
      })
    })
  })

  describe('データ構造', () => {
    it('ロゴデータが正しく処理される', () => {
      render(<LogoSlider />)

      const expectedLogos = [
        {
          company: 'Transistor',
          src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/transistor-logo-gray-900.svg',
        },
        {
          company: 'Reform',
          src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/reform-logo-gray-900.svg',
        },
        {
          company: 'Tuple',
          src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/tuple-logo-gray-900.svg',
        },
        {
          company: 'SavvyCal',
          src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/savvycal-logo-gray-900.svg',
        },
        {
          company: 'Statamic',
          src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/statamic-logo-gray-900.svg',
        },
      ]

      expectedLogos.forEach((logo) => {
        const image = screen.getByAltText(logo.company)
        expect(image).toHaveAttribute('src', logo.src)
      })
    })
  })

  describe('スタイリング', () => {
    it('適切なマージンとパディングが適用される', () => {
      render(<LogoSlider />)

      const container = document.querySelector('[data-testid="logo-slider"]')
      const gridContainer = container?.querySelector('.grid')

      expect(gridContainer).toHaveClass('mx-auto', 'mt-10')
    })

    it('画像の高さ制限が適用される', () => {
      render(<LogoSlider />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveClass('max-h-12')
      })
    })
  })
})
