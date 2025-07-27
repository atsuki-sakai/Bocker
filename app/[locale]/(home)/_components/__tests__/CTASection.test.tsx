import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTranslations } from 'next-intl'
import { CTASection } from '../CTASection'

// Mock useTranslations to return translation keys as-is for testing
vi.mock('next-intl', () => ({
    useTranslations: vi.fn(() => (key: string) => key)
}))

describe('CTASection', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('正常にレンダリングされる', () => {
        render(<CTASection />)
        
        // メインセクションが表示される
        expect(screen.getByTestId('cta-section')).toBeInTheDocument()
        
        // h2要素に両方のタイトルが含まれている
        const heading = screen.getByRole('heading', { level: 2 })
        expect(heading).toHaveTextContent('title')
        expect(heading).toHaveTextContent('title2')
        
        // ボタンが表示される
        expect(screen.getByRole('button')).toBeInTheDocument()
        expect(screen.getByText('button2')).toBeInTheDocument()
    })


    describe('多言語対応', () => {
        it('必要な翻訳キーがすべて使用されている', () => {
        const mockT = vi.fn((key: string) => key)
        vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        
        render(<CTASection />)
        
        // 重要な翻訳キーが呼び出されることを確認
        expect(mockT).toHaveBeenCalledWith('title')
        expect(mockT).toHaveBeenCalledWith('title2')
        expect(mockT).toHaveBeenCalledWith('button')
        expect(mockT).toHaveBeenCalledWith('button2')
        })
    })

    describe('ボタンのリンク先', () => {
        it('ボタンのリンク先が正しい', () => {
            render(<CTASection />)
            expect(screen.getByText('button')).toHaveAttribute('href', '/sign-up')
            expect(screen.getByText('button2')).toHaveAttribute('href', '/features')
        })
    })
})