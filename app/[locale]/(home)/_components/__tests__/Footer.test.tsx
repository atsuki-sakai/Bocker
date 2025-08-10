import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Footer } from '../Footer'
import { useTranslations } from 'next-intl'

vi.mock('next-intl', () => ({
    useTranslations: vi.fn(() => (key: string) => key)
}))


describe('Footer', () => {
    it('正常にレンダリングされる', () => {
        render(<Footer />)
        expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    describe('画像が正しくレンダリングされる', () => {
        it('画像が正しくレンダリングされる', () => {
            render(<Footer />)
            expect(screen.getByRole('img')).toHaveAttribute('alt', 'Bocker')
        })
    })

    describe('リンクが正しくレンダリングされる', () => {
        it('リンクが正しくレンダリングされる', () => {
            render(<Footer />)
            const links = screen.getAllByRole('link')
  
            const expectedLinks = [
              { href: '/about' },
              { href: '/privacy' },
              { href: '/terms' },
              { href: '/faq' },
              { href: '/contact' },
              { href: '/features' },
              { href: '/pricing' },
              { href: 'https://www.instagram.com/bocker_fujimoto' },
              { href: 'https://bocker-project.vercel.app/ja/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p' }
            ]
            
            // リンクの数を確認
            expect(links).toHaveLength(expectedLinks.length)
            
            // 各リンクのhref属性を確認
            expectedLinks.forEach(expectedLink => {
                const link = links.find(link => link.getAttribute('href') === expectedLink.href)
                expect(link).toBeInTheDocument()
            })
        })
    })

    describe('必要な翻訳キーがすべて使用されている', () => {
        it('必要な翻訳キーがすべて使用されている', () => {
            const mockT = vi.fn((key: string) => key)
            vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            render(<Footer />)
            expect(mockT).toHaveBeenCalledWith('tagline')
            expect(mockT).toHaveBeenCalledWith('sections.product')
            expect(mockT).toHaveBeenCalledWith('links.features')
            expect(mockT).toHaveBeenCalledWith('links.pricing')
            expect(mockT).toHaveBeenCalledWith('links.demo')
            expect(mockT).toHaveBeenCalledWith('sections.company')
            expect(mockT).toHaveBeenCalledWith('links.about')
            expect(mockT).toHaveBeenCalledWith('links.privacyPolicy')
            expect(mockT).toHaveBeenCalledWith('links.termsOfUse')
            expect(mockT).toHaveBeenCalledWith('sections.support')
            expect(mockT).toHaveBeenCalledWith('links.faq')
            expect(mockT).toHaveBeenCalledWith('links.contact')

            expect(mockT).toHaveBeenCalledWith('copyright')
        })
    })
})