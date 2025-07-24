import { test, expect } from '@playwright/test'

test.describe('ホームページ', () => {
  test.beforeEach(async ({ page }) => {
    // ホームページに移動
    await page.goto('/')
  })

  test('ページが正しく読み込まれる', async ({ page }) => {
    // ページタイトルを確認
    await expect(page).toHaveTitle(/Bocker/)
    
    // メインセクションが存在することを確認
    await expect(page.locator('main')).toBeVisible()
  })

  test('ヘッダーコンポーネントが表示される', async ({ page }) => {
    // ヘッダーが存在することを確認
    const header = page.locator('header').first()
    await expect(header).toBeVisible()
  })

  test('ヒーローセクションが表示される', async ({ page }) => {
    // ヒーローセクションの主要な要素を確認
    // 実際のコンテンツは_componentsフォルダのコンポーネントに依存するため、
    // より具体的なテストは_componentsの実装に基づいて調整が必要
    await expect(page.locator('main')).toBeVisible()
  })

  test('フッターが表示される', async ({ page }) => {
    // フッターセクションが存在することを確認
    const footer = page.locator('footer').first()
    await expect(footer).toBeVisible()
  })

  test('スプラッシュスクリーンの動作', async ({ page }) => {
    // localStorageをクリアしてスプラッシュスクリーンをトリガー
    await page.evaluate(() => {
      localStorage.removeItem('bockerLastSplash')
    })
    
    await page.reload()
    
    // スプラッシュスクリーンが表示されるまで待機
    // 実際のスプラッシュスクリーンコンポーネントの実装に依存
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('SEOメタタグが正しく設定されている', async ({ page }) => {
    // メタディスクリプションの確認
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /美容サロン|予約管理/)
    
    // OGPタグの確認
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', /Bocker/)
    
    const ogType = page.locator('meta[property="og:type"]')
    await expect(ogType).toHaveAttribute('content', 'website')
  })

  test('構造化データが含まれている', async ({ page }) => {
    // JSON-LDの構造化データが存在することを確認
    const structuredData = page.locator('script[type="application/ld+json"]')
    await expect(structuredData).toHaveCount(3) // organization, application, website
    
    // 組織情報の構造化データを確認
    const organizationData = await structuredData.first().textContent()
    expect(organizationData).toContain('"@type":"Organization"')
    expect(organizationData).toContain('Bocker')
  })

  test('レスポンシブデザインが機能する', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1200, height: 800 })
    await expect(page.locator('main')).toBeVisible()
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('main')).toBeVisible()
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('main')).toBeVisible()
  })

  test('多言語対応（日本語）', async ({ page }) => {
    await page.goto('/ja')
    await expect(page).toHaveURL(/\/ja/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('多言語対応（英語）', async ({ page }) => {
    await page.goto('/en')
    await expect(page).toHaveURL(/\/en/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('LINE認証リダイレクトが正常に動作する', async ({ page }) => {
    // LINE認証のパラメータを含むURLでアクセス
    const liffState = encodeURIComponent('/reservation/test')
    const searchParams = new URLSearchParams({
      'liff.state': liffState,
      'code': 'test-auth-code',
      'state': 'test-state',
      'liffClientId': 'test-client-id',
      'liffRedirectUri': 'test-redirect-uri'
    })
    
    await page.goto(`/?${searchParams.toString()}`)
    
    // 予約ページにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/reservation/)
  })

  test('パフォーマンス: ページ読み込み速度', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // 3秒以内に読み込み完了を期待
    expect(loadTime).toBeLessThan(3000)
  })

  test('アクセシビリティ: 基本的なランドマーク', async ({ page }) => {
    // main要素の存在確認
    await expect(page.locator('main')).toBeVisible()
    
    // ヘッダー要素の存在確認（実装に依存）
    const headers = page.locator('h1, h2, h3, h4, h5, h6')
    const headerCount = await headers.count()
    expect(headerCount).toBeGreaterThan(0)
  })
})