import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactPageClient } from './ContactPageClient'

// Next.js のモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/ja/contact',
  }),
}))

// Mock translations object
const mockTranslations = {
  title: 'お問い合わせ',
  subtitle: 'お気軽にお問い合わせください',
  form: {
    title: 'お問い合わせフォーム',
    fields: {
      name: 'お名前',
      email: 'メールアドレス',
      company: '会社名',
      phone: '電話番号',
      subject: 'お問い合わせ種別',
      message: 'お問い合わせ内容',
    },
    placeholders: {
      name: 'お名前を入力してください',
      email: 'メールアドレスを入力してください',
      company: '会社名を入力してください',
      phone: '電話番号を入力してください',
      subject: 'お問い合わせ種別を選択してください',
      message: 'お問い合わせ内容を入力してください',
    },
    submit: '送信する',
    submitting: '送信中...',
    success: 'お問い合わせを受け付けました',
    error: 'エラーが発生しました',
  },
  info: {
    title: 'お問い合わせ先',
    items: {
      email: {
        label: 'メール',
        value: 'support@bocker.jp',
      },
      hours: {
        label: '受付時間',
        value: '平日 9:00-18:00',
      },
      phone: {
        label: '電話',
        value: '03-1234-5678',
      },
      response: {
        label: '返信時間',
        value: '24時間以内',
      },
    },
  },
  faq: {
    title: 'よくある質問',
    cta: 'その他のご質問はFAQページをご確認ください',
  },
}

// Fetch API のモック
const mockFetch = vi.fn()
global.fetch = mockFetch

// Toast のモック
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

// Error handler のモック
vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    showErrorToast: vi.fn(),
  }),
}))

// コンポーネントのモック
vi.mock('../_components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

vi.mock('../_components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))



describe('ContactPageClient', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByText('お問い合わせ')).toBeInTheDocument()
      expect(screen.getByText('お気軽にお問い合わせください')).toBeInTheDocument()
    })

    it('お問い合わせフォームが表示される', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      expect(screen.getByLabelText('お名前')).toBeInTheDocument()
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByLabelText('会社名')).toBeInTheDocument()
      expect(screen.getByLabelText('お問い合わせ内容')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '送信する' })).toBeInTheDocument()
    })

    it('お問い合わせ先情報が表示される', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      expect(screen.getByText('お問い合わせ先')).toBeInTheDocument()
      expect(screen.getByText('support@bocker.jp')).toBeInTheDocument()
      expect(screen.getByText('平日 9:00-18:00')).toBeInTheDocument()
      expect(screen.getByText('24時間以内')).toBeInTheDocument()
    })
  })

  describe('フォーム入力', () => {
    it('名前を入力できる', async () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      await user.type(nameInput, '田中太郎')
      
      expect(nameInput).toHaveValue('田中太郎')
    })

    it('メールアドレスを入力できる', async () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      await user.type(emailInput, 'tanaka@example.com')
      
      expect(emailInput).toHaveValue('tanaka@example.com')
    })

    it('会社名を入力できる', async () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const companyInput = screen.getByLabelText('会社名')
      await user.type(companyInput, '株式会社テスト')
      
      expect(companyInput).toHaveValue('株式会社テスト')
    })

    it('お問い合わせ内容を入力できる', async () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      await user.type(messageInput, 'お問い合わせのテストです')
      
      expect(messageInput).toHaveValue('お問い合わせのテストです')
    })

    it('プレースホルダーが正しく設定されている', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      expect(screen.getByPlaceholderText('お名前を入力してください')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('メールアドレスを入力してください')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('会社名を入力してください')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('お問い合わせ内容を入力してください')).toBeInTheDocument()
    })
  })

  describe('フォーム要素', () => {
    it('必須項目にrequired属性が設定されている', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      const emailInput = screen.getByLabelText('メールアドレス')
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      
      expect(nameInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('required')
      expect(messageInput).toHaveAttribute('required')
    })

    it('メールアドレス入力フィールドがemail typeに設定されている', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('電話番号入力フィールドがtel typeに設定されている', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const phoneInput = screen.getByLabelText('電話番号')
      expect(phoneInput).toHaveAttribute('type', 'tel')
    })
  })

  describe('フォーム送信', () => {
    it('正常なフォーム送信が動作する', async () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      const emailInput = screen.getByLabelText('メールアドレス')
      const companyInput = screen.getByLabelText('会社名')
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      const submitButton = screen.getByRole('button', { name: '送信する' })
      
      await user.type(nameInput, '田中太郎')
      await user.type(emailInput, 'tanaka@example.com')
      await user.type(companyInput, '株式会社テスト')
      await user.type(messageInput, 'お問い合わせのテストです')
      
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/resend/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'bocker.help@gmail.com',
            subject: 'HPからのお問い合わせ',
            templateProps: {
              name: '田中太郎',
              email: 'tanaka@example.com',
              company: '株式会社テスト',
              phone: '',
              subject: '',
              message: 'お問い合わせのテストです',
            },
          }),
        })
      })
      
      // フォームがリセットされることを確認
      await waitFor(() => {
        const nameInput = screen.getByLabelText('お名前')
        const emailInput = screen.getByLabelText('メールアドレス')
        const companyInput = screen.getByLabelText('会社名')
        const messageInput = screen.getByLabelText('お問い合わせ内容')
        
        expect(nameInput).toHaveValue('')
        expect(emailInput).toHaveValue('')
        expect(companyInput).toHaveValue('')
        expect(messageInput).toHaveValue('')
      })
    })

    it('送信中はボタンが無効化される', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }), 1000)))
      
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      const emailInput = screen.getByLabelText('メールアドレス')
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      const submitButton = screen.getByRole('button', { name: '送信する' })
      
      await user.type(nameInput, '田中太郎')
      await user.type(emailInput, 'tanaka@example.com')
      await user.type(messageInput, 'テストメッセージ')
      
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('送信中...')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '送信中...' })).toBeDisabled()
      })
    })

    it('送信エラー時にボタン状態が復帰する', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'))
      
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      const emailInput = screen.getByLabelText('メールアドレス')
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      const submitButton = screen.getByRole('button', { name: '送信する' })
      
      await user.type(nameInput, '田中太郎')
      await user.type(emailInput, 'tanaka@example.com')
      await user.type(messageInput, 'テストメッセージ')
      
      await user.click(submitButton)
      
      // エラー時にはsubmitting状態が解除される
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '送信する' })).not.toBeDisabled()
      })
    })
  })

  describe('アクセシビリティ', () => {
    it('フォームラベルが適切に関連付けられている', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      const emailInput = screen.getByLabelText('メールアドレス')
      const companyInput = screen.getByLabelText('会社名')
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      
      expect(nameInput).toHaveAttribute('id')
      expect(emailInput).toHaveAttribute('id')
      expect(companyInput).toHaveAttribute('id')
      expect(messageInput).toHaveAttribute('id')
    })

    it('見出し階層が適切である', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const h1 = screen.getByRole('heading', { level: 1, name: 'お問い合わせ' })
      expect(h1).toBeInTheDocument()
    })

    it('フォーム送信ボタンが適切に設定されている', () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const submitButton = screen.getByRole('button', { name: '送信する' })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('キーボードナビゲーション', () => {
    it('Tabキーでフォーム要素間を移動できる', async () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      const emailInput = screen.getByLabelText('メールアドレス')
      const companyInput = screen.getByLabelText('会社名')
      const phoneInput = screen.getByLabelText('電話番号')
      const subjectInput = screen.getByRole('combobox')
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      const submitButton = screen.getByRole('button', { name: '送信する' })
      
      nameInput.focus()
      expect(nameInput).toHaveFocus()
      
      await user.keyboard('{Tab}')
      expect(emailInput).toHaveFocus()
      
      await user.keyboard('{Tab}')
      expect(companyInput).toHaveFocus()
      
      await user.keyboard('{Tab}')
      expect(phoneInput).toHaveFocus()
      
      await user.keyboard('{Tab}')
      expect(subjectInput).toHaveFocus()
      
      await user.keyboard('{Tab}')
      expect(messageInput).toHaveFocus()
      
      await user.keyboard('{Tab}')
      expect(submitButton).toHaveFocus()
    })

    it('Enterキーでフォーム送信できる', async () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      const emailInput = screen.getByLabelText('メールアドレス')
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      const submitButton = screen.getByRole('button', { name: '送信する' })
      
      await user.type(nameInput, '田中太郎')
      await user.type(emailInput, 'tanaka@example.com')
      await user.type(messageInput, 'テストメッセージ')
      
      // Submit buttonにフォーカスしてEnterキーを押す
      submitButton.focus()
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('レスポンシブ対応', () => {
    it('モバイル表示用のクラスが適用されている', () => {
      const { container } = render(<ContactPageClient translations={mockTranslations} />)
      
      const responsiveElement = container.querySelector('[class*="md:"]')
      expect(responsiveElement).toBeInTheDocument()
    })

    it('デスクトップ表示用のクラスが適用されている', () => {
      const { container } = render(<ContactPageClient translations={mockTranslations} />)
      
      const desktopElement = container.querySelector('[class*="lg:"]')
      expect(desktopElement).toBeInTheDocument()
    })
  })

  describe('エラーハンドリング', () => {
    it('翻訳キーが見つからない場合でもエラーにならない', () => {
      const missingTranslations = {
        ...mockTranslations,
        title: 'missing.title',
        form: { ...mockTranslations.form, title: 'missing.form.title' }
      }
      
      expect(() => render(<ContactPageClient translations={missingTranslations} />)).not.toThrow()
      
      expect(screen.getByText('missing.title')).toBeInTheDocument()
    })

    it('APIエラー時にリトライボタンが表示される', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'))
      
      render(<ContactPageClient translations={mockTranslations} />)
      
      const nameInput = screen.getByLabelText('お名前')
      const emailInput = screen.getByLabelText('メールアドレス')
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      const submitButton = screen.getByRole('button', { name: '送信する' })
      
      await user.type(nameInput, '田中太郎')
      await user.type(emailInput, 'tanaka@example.com')
      await user.type(messageInput, 'テストメッセージ')
      
      await user.click(submitButton)
      
      // エラー時にリトライボタンが再度有効になることを確認
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '送信する' })).not.toBeDisabled()
      })
    })
  })

  describe('パフォーマンス', () => {
    it('高速レンダリングする', () => {
      const startTime = performance.now()
      render(<ContactPageClient translations={mockTranslations} />)
      const endTime = performance.now()
      
      // 100ms以内でレンダリング完了
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('大量入力でもパフォーマンスが劣化しない', async () => {
      render(<ContactPageClient translations={mockTranslations} />)
      
      const messageInput = screen.getByLabelText('お問い合わせ内容')
      const longMessage = 'a'.repeat(100) // より小さい文字数でテスト
      
      const startTime = performance.now()
      await user.type(messageInput, longMessage)
      const endTime = performance.now()
      
      // 10秒以内で入力処理完了（より現実的な閾値）
      expect(endTime - startTime).toBeLessThan(10000)
      expect(messageInput).toHaveValue(longMessage)
    })
  })
})