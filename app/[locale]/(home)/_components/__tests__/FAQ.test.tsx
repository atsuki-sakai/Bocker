import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FAQ } from '../FAQ'
import { useTranslations } from 'next-intl'

// Mock useTranslations to return translation keys as-is for testing
vi.mock('next-intl', () => ({
    useTranslations: vi.fn(() => (key: string) => key)
}))

describe('FAQSection', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('正常にレンダリングされる', () => {
        render(<FAQ />)
        expect(screen.getByTestId('faq-section')).toBeInTheDocument()
    })

    describe('FAQが正しくレンダリングされる', () => {
        it('FAQが正しくレンダリングされる', () => {
            render(<FAQ />)
            expect(screen.getByText('title')).toBeInTheDocument()
            expect(screen.getByText('subtitle')).toBeInTheDocument()
            expect(screen.getByText('cta')).toBeInTheDocument()
            expect(screen.getByText('items.0.question')).toBeInTheDocument()
            expect(screen.getByText('items.0.answer')).toBeInTheDocument()
            expect(screen.getByText('items.1.question')).toBeInTheDocument()
            expect(screen.getByText('items.1.answer')).toBeInTheDocument()
            expect(screen.getByText('items.2.question')).toBeInTheDocument()
            expect(screen.getByText('items.2.answer')).toBeInTheDocument()
            expect(screen.getByText('items.3.question')).toBeInTheDocument()
            expect(screen.getByText('items.3.answer')).toBeInTheDocument()
            expect(screen.getByText('items.4.question')).toBeInTheDocument()
            expect(screen.getByText('items.4.answer')).toBeInTheDocument()
        })
    })

    describe('FAQのリンク先', () => {
        it('FAQのリンク先が正しい', () => {
            render(<FAQ />)
            expect(screen.getByText('cta')).toHaveAttribute('href', '/contact')
        })
    })

    describe('多言語対応', () => {
        it('必要な翻訳キーがすべて使用されている', () => {
        const mockT = vi.fn((key: string) => key)
        vi.mocked(useTranslations).mockReturnValue(mockT as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        
        render(<FAQ />)
        
        // 重要な翻訳キーが呼び出されることを確認
        expect(mockT).toHaveBeenCalledWith('title')
        expect(mockT).toHaveBeenCalledWith('subtitle')
        expect(mockT).toHaveBeenCalledWith('cta')
        for (let index = 0; index < 5; index += 1) {
          expect(mockT).toHaveBeenCalledWith(`items.${index}.question`)
          expect(mockT).toHaveBeenCalledWith(`items.${index}.answer`)
        }
        })
    })
})
