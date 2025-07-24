import { test, expect } from '@playwright/test'

test.describe('Landing Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ページ読み込み前の設定
    await page.goto('/')
  })

  test.describe('基本機能テスト', () => {
    test('ページが正常に読み込まれる', async ({ page }) => {
      // ページタイトルの確認
      await expect(page).toHaveTitle(/Bocker/)

      // メインコンテンツの確認
      await expect(page.locator('h1')).toContainText('美容サロン向け予約管理システム')
    })

    test('スプラッシュスクリーンが表示され、スキップできる', async ({ page }) => {
      // LocalStorageをクリアして初回訪問をシミュレート
      await page.evaluate(() => localStorage.clear())
      await page.reload()

      // スプラッシュスクリーンの表示を確認
      const splashScreen = page.locator('[data-testid="splash-screen"]')
      await expect(splashScreen).toBeVisible()

      // スキップボタンをクリック
      await page.click('[data-testid="splash-complete"]')

      // メインコンテンツが表示されることを確認
      await expect(splashScreen).not.toBeVisible()
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible()
    })

    test('1時間以内の再訪問時はスプラッシュスクリーンが表示されない', async ({ page }) => {
      // 30分前のタイムスタンプを設定
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
      await page.evaluate((timestamp) => {
        localStorage.setItem('bockerLastSplash', timestamp.toString())
      }, thirtyMinutesAgo)

      await page.reload()

      // スプラッシュスクリーンが表示されないことを確認
      await expect(page.locator('[data-testid="splash-screen"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible()
    })
  })

  test.describe('ナビゲーションテスト', () => {
    test('ヘッダーナビゲーションが機能する', async ({ page }) => {
      // スプラッシュスクリーンをスキップ
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // ナビゲーションリンクの確認
      await expect(page.locator('[data-testid="nav-home"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-features"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-pricing"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-login"]')).toBeVisible()

      // リンクのクリックテスト（実際のページ遷移は発生しないが、クリック可能性を確認）
      await page.click('[data-testid="nav-features"]')
      await page.click('[data-testid="nav-pricing"]')
    })

    test('フッターリンクが表示される', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // フッターまでスクロール
      await page.locator('[data-testid="footer"]').scrollIntoViewIfNeeded()

      // フッターリンクの確認
      await expect(page.locator('[data-testid="footer-privacy"]')).toBeVisible()
      await expect(page.locator('[data-testid="footer-terms"]')).toBeVisible()
      await expect(page.locator('[data-testid="footer-contact"]')).toBeVisible()
    })
  })

  test.describe('コンテンツセクションテスト', () => {
    test.beforeEach(async ({ page }) => {
      // スプラッシュスクリーンをスキップ
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()
    })

    test('ヒーローセクションが正しく表示される', async ({ page }) => {
      const heroSection = page.locator('[data-testid="hero-section"]')
      await expect(heroSection).toBeVisible()

      // タイトルとCTAボタンの確認
      await expect(page.locator('h1')).toContainText('美容サロン向け予約管理システム')
      await expect(page.locator('[data-testid="hero-cta"]')).toBeVisible()
      await expect(page.locator('[data-testid="hero-cta"]')).toContainText('無料で始める')
    })

    test('機能セクションが表示される', async ({ page }) => {
      const featureSection = page.locator('[data-testid="feature-section"]')
      await featureSection.scrollIntoViewIfNeeded()
      await expect(featureSection).toBeVisible()

      // 主要機能の確認
      await expect(page.locator('[data-testid="feature-booking"]')).toContainText('予約管理')
      await expect(page.locator('[data-testid="feature-customer"]')).toContainText('顧客管理')
      await expect(page.locator('[data-testid="feature-analytics"]')).toContainText('分析機能')
    })

    test('料金プランセクションが表示される', async ({ page }) => {
      const pricingSection = page.locator('[data-testid="pricing"]')
      await pricingSection.scrollIntoViewIfNeeded()
      await expect(pricingSection).toBeVisible()

      // プラン選択ボタンの確認
      await expect(page.locator('[data-testid="plan-lite"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-pro"]')).toBeVisible()
      await expect(page.locator('[data-testid="select-lite"]')).toBeVisible()
      await expect(page.locator('[data-testid="select-pro"]')).toBeVisible()
    })

    test('FAQセクションが機能する', async ({ page }) => {
      const faqSection = page.locator('[data-testid="faq"]')
      await faqSection.scrollIntoViewIfNeeded()
      await expect(faqSection).toBeVisible()

      // FAQ項目の展開テスト
      const faqItem1 = page.locator('[data-testid="faq-item-1"]')
      const faqItem2 = page.locator('[data-testid="faq-item-2"]')

      await expect(faqItem1).toBeVisible()
      await expect(faqItem2).toBeVisible()

      // FAQ項目をクリックして展開
      await faqItem1.click()
      await faqItem2.click()

      // 展開された内容の確認
      await expect(faqItem1.locator('p')).toContainText('Liteプランは月額1,000円')
      await expect(faqItem2.locator('p')).toContainText('14日間の無料トライアル')
    })
  })

  test.describe('インタラクションテスト', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()
    })

    test('CTAボタンのクリックが機能する', async ({ page }) => {
      // ヒーローセクションのCTAボタン
      const heroCtaButton = page.locator('[data-testid="hero-cta"]')
      await expect(heroCtaButton).toBeVisible()
      await heroCtaButton.click()

      // 最終CTAボタン
      const finalCtaSection = page.locator('[data-testid="cta-section"]')
      await finalCtaSection.scrollIntoViewIfNeeded()

      const finalCtaButton = page.locator('[data-testid="final-cta"]')
      await expect(finalCtaButton).toBeVisible()
      await finalCtaButton.click()
    })

    test('料金プラン選択ボタンが機能する', async ({ page }) => {
      const pricingSection = page.locator('[data-testid="pricing"]')
      await pricingSection.scrollIntoViewIfNeeded()

      // Liteプラン選択
      const liteButton = page.locator('[data-testid="select-lite"]')
      await expect(liteButton).toBeVisible()
      await liteButton.click()

      // Proプラン選択
      const proButton = page.locator('[data-testid="select-pro"]')
      await expect(proButton).toBeVisible()
      await proButton.click()
    })
  })

  test.describe('レスポ��シブデザインテスト', () => {
    test('モバイル表示が正常に動作する', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // モバイルでの表示確認
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible()
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('[data-testid="hero-cta"]')).toBeVisible()

      // ナビゲーションの確認（モバイルメニューがある場合）
      await expect(page.locator('[data-testid="header"]')).toBeVisible()
    })

    test('タブレット表示が正常に動作する', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // タブレットでの表示確認
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="feature-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="pricing"]')).toBeVisible()
    })

    test('デスクトップ表示が正常に動作する', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // デスクトップでの表示確認
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="feature-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="pricing"]')).toBeVisible()
      await expect(page.locator('[data-testid="faq"]')).toBeVisible()
    })
  })

  test.describe('パフォーマンステスト', () => {
    test('ページ読み込み時間が適切である', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // 3秒以内に読み込まれることを確認
      expect(loadTime).toBeLessThan(3000)
    })

    test('画像の遅延読み込みが機能する', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // 画像要素の確認
      const images = page.locator('img')
      const imageCount = await images.count()

      if (imageCount > 0) {
        // 最初の画像のloading属性を確認
        const firstImage = images.first()
        const loadingAttr = await firstImage.getAttribute('loading')
        expect(loadingAttr).toBe('lazy')
      }
    })
  })

  test.describe('アクセシビリティテスト', () => {
    test('キーボードナビゲーションが機能する', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // Tabキーでフォーカス移動
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // フォーカスされた要素が存在することを確認
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })

    test('適切な見出し階層が使用されている', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // h1が1つだけ存在することを確認
      const h1Elements = page.locator('h1')
      await expect(h1Elements).toHaveCount(1)

      // h2要素が適切に存在することを確認
      const h2Elements = page.locator('h2')
      const h2Count = await h2Elements.count()
      expect(h2Count).toBeGreaterThan(0)
    })

    test('alt属性が適切に設定されている', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      // 画像要素のalt属性確認
      const images = page.locator('img')
      const imageCount = await images.count()

      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i)
        const altText = await image.getAttribute('alt')
        expect(altText).not.toBeNull()
      }
    })
  })

  test.describe('多言語対応テスト', () => {
    test('日本語ページが正しく表示される', async ({ page }) => {
      await page.goto('/ja')
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      await expect(page.locator('h1')).toContainText('美容サロン向け予約管理システム')

      const faqSection = page.locator('[data-testid="faq"]')
      await faqSection.scrollIntoViewIfNeeded()
      await expect(page.locator('[data-testid="faq-locale"]')).toContainText('ja')
    })

    test('英語ページが正しく表示される', async ({ page }) => {
      await page.goto('/en')
      await page.evaluate(() => localStorage.setItem('bockerLastSplash', '1'))
      await page.reload()

      const faqSection = page.locator('[data-testid="faq"]')
      await faqSection.scrollIntoViewIfNeeded()
      await expect(page.locator('[data-testid="faq-locale"]')).toContainText('en')
    })
  })

  test.describe('エラーハンドリングテスト', () => {
    test('JavaScriptエラー時のフォールバック', async ({ page }) => {
      // JavaScriptエラーをキャッチ
      const errors: string[] = []
      page.on('pageerror', (error) => {
        errors.push(error.message)
      })

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 重大なJavaScriptエラーが発生していないことを確認
      const criticalErrors = errors.filter(
        (error) => error.includes('TypeError') || error.includes('ReferenceError')
      )
      expect(criticalErrors.length).toBe(0)
    })

    test('ネットワークエラー時の動作', async ({ page }) => {
      // ネットワークを無効化
      await page.context().setOffline(true)

      // ページ読み込みを試行
      const response = await page.goto('/', { waitUntil: 'networkidle' }).catch(() => null)

      // オフライン時の適切な処理を確認
      expect(response).toBeNull()

      // ネットワークを再有効化
      await page.context().setOffline(false)
    })
  })
})
