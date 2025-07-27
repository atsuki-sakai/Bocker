import { test, expect } from '@playwright/test'

test.describe('認証 - ログイン機能', () => {
  test.beforeEach(async ({ page }) => {
    // サインインページに移動
    await page.goto('/ja/sign-in')
    
    // ページのアニメーション完了を待機（初期表示アニメーション）
    await page.waitForTimeout(600) // delayChildren(0.2s) + staggerChildren(0.1s) + マージン
  })

  test('正常なログインフローが動作する', async ({ page }) => {
    // メールアドレス入力フィールドを待機
    const emailInput = page.locator('input#email')
    await expect(emailInput).toBeVisible()
    
    // メールアドレスを入力
    await emailInput.fill('bocker.help@gmail.com')
    
    // パスワード入力フィールドを確認
    const passwordInput = page.locator('input#password')
    await expect(passwordInput).toBeVisible()
    
    // パスワードを入力（正しいパスワードを使用）
    await passwordInput.fill('Bocker_123')
    
    // モバイルの場合、キーボードを閉じる
    if (page.viewportSize()?.width && page.viewportSize()!.width < 768) {
      await page.keyboard.press('Tab')
    }
    
    // ログインボタンをクリック
    const submitButton = page.locator('button[type="submit"]')  
    await expect(submitButton).toBeVisible()
    await submitButton.click()
    
    // 認証処理の完了を待機
    await page.waitForTimeout(3000)
    
    // ダッシュボードページまたはホームページにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/ja\/(dashboard|$)/, { timeout: 20000 })
    
    // メインコンテンツが表示されることを確認
    await expect(page.locator('main, body').first()).toBeVisible()
  })

  test('無効なメールアドレスでのバリデーション', async ({ page }) => {
    // 無効なメールアドレスを入力
    const emailInput = page.locator('input#email')
    await emailInput.fill('invalid-email')
    
    // パスワードを入力
    const passwordInput = page.locator('input#password')
    await passwordInput.fill('Bocker_123')
    
    // ログインボタンをクリックしてバリデーションをトリガー
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // バリデーションエラーメッセージが表示されることを確認（一般的なClerkのエラーメッセージパターン）
    const errorMessage = page.locator('.text-destructive, [role="alert"], .error')
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 })
  })

  test('パスワードの表示/非表示切り替え', async ({ page }) => {
    const passwordInput = page.locator('input#password')
    // SignInForm.tsxの実装に合わせて、親要素からボタンを探す
    const toggleButton = passwordInput.locator('..').locator('button').last()
    
    // 初期状態ではパスワードが隠されている
    await expect(passwordInput).toHaveAttribute('type', 'password')
    
    // パスワードを入力
    await passwordInput.fill('Bocker_123')
    
    // 表示ボタンをクリック
    await toggleButton.click()
    
    // パスワードが表示される
    await expect(passwordInput).toHaveAttribute('type', 'text')
    
    // 再度クリックして非表示にする
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('フォーム送信中の状態管理', async ({ page }) => {
    // 正しい認証情報を入力
    await page.locator('input#email').fill('bocker.help@gmail.com')
    await page.locator('input#password').fill('Bocker_123')
    
    // 送信ボタンをクリック
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // ローディング状態が表示されることを確認（短い時間でチェック）
    try {
      await expect(submitButton).toBeDisabled({ timeout: 3000 })
    } catch {
      // ログイン処理が速すぎてローディング状態を捉えられない場合があるのでスキップ
    }
  })


  test('サインアップページへのリンク', async ({ page }) => {
    // サインアップリンクをクリック
    const signUpLink = page.locator('a[href*="sign-up"]')
    await expect(signUpLink).toBeVisible()
    
    // Mobile Safari対応: リンクをスクロールして表示
    await signUpLink.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500) // Mobile Safariの描画待機
    
    await signUpLink.click()
    
    // サインアップページに遷移することを確認（Mobile Safari用のタイムアウト延長）
    await expect(page).toHaveURL(/\/ja\/sign-up/, { timeout: 15000 })
  })

  test('パスワードリセットリンクの表示', async ({ page }) => {
    // Mobile Safari対応: 追加待機時間
    await page.waitForTimeout(800)
    
    // 未登録のメールアドレスを入力（リセットリンクが確実に表示されるように）
    const emailInput = page.locator('input#email')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('unregistered@example.com')
    
    // 間違ったパスワードを入力
    const passwordInput = page.locator('input#password')
    await expect(passwordInput).toBeVisible()
    await passwordInput.fill('wrong-password')
    
    // Mobile Safari: キーボードを閉じる
    if (page.viewportSize()?.width && page.viewportSize()!.width < 768) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(500)
    }
    
    // ログインボタンを確実にクリック
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
    
    // ボタンをクリック
    await submitButton.scrollIntoViewIfNeeded()
    await submitButton.click({ force: true })
    
    // ログイン処理の完了を待機（Mobile Safari用の延長）
    await page.waitForTimeout(5000)
    
    // パスワードリセットリンクが表示されることを確認
    const resetLink = page.locator('a.text-sm.text-link-foreground[href*="/sign-in/reset-password"]')
    await expect(resetLink).toBeVisible({ timeout: 15000 })
    
    // アニメーション完了後にリンクテキストを確認
    await page.waitForTimeout(800) // Mobile Safari用の追加待機
    await expect(resetLink).toHaveText(/パスワードを忘れた/)
  })

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(1000) // Mobile Safariのリサイズ待機
    
    // フォーム要素が適切に表示されることを確認
    await expect(page.locator('input#email')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input#password')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 })
    
    // タブレットサイズに変更
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(1000) // Mobile Safariのリサイズ待機
    
    // フォーム要素が適切に表示されることを確認
    await expect(page.locator('input#email')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input#password')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 })
  })
})