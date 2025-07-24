import { Page } from '@playwright/test'

/**
 * テスト用のヘルパー関数集
 */
export class TestHelpers {
  /**
   * ページの基本的な読み込み確認
   */
  static async waitForPageLoad(page: Page) {
    await page.waitForLoadState('networkidle')
    await page.waitForLoadState('domcontentloaded')
  }

  /**
   * LocalStorageをクリア
   */
  static async clearLocalStorage(page: Page) {
    await page.evaluate(() => {
      localStorage.clear()
    })
  }

  /**
   * スプラッシュスクリーンを無効化
   */
  static async disableSplashScreen(page: Page) {
    await page.evaluate(() => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      localStorage.setItem('bockerLastSplash', oneHourAgo.toString())
    })
  }

  /**
   * スプラッシュスクリーンを有効化
   */
  static async enableSplashScreen(page: Page) {
    await page.evaluate(() => {
      localStorage.removeItem('bockerLastSplash')
    })
  }

  /**
   * モバイルビューポートに設定
   */
  static async setMobileViewport(page: Page) {
    await page.setViewportSize({ width: 375, height: 667 })
  }

  /**
   * タブレットビューポートに設定
   */
  static async setTabletViewport(page: Page) {
    await page.setViewportSize({ width: 768, height: 1024 })
  }

  /**
   * デスクトップビューポートに設定
   */
  static async setDesktopViewport(page: Page) {
    await page.setViewportSize({ width: 1200, height: 800 })
  }

  /**
   * 構造化データを取得
   */
  static async getStructuredData(page: Page) {
    return await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]')
      return Array.from(scripts).map(script => {
        try {
          return JSON.parse(script.textContent || '')
        } catch {
          return null
        }
      }).filter(Boolean)
    })
  }

  /**
   * メタタグの値を取得
   */
  static async getMetaContent(page: Page, name: string) {
    return await page.getAttribute(`meta[name="${name}"]`, 'content')
  }

  /**
   * OGPタグの値を取得
   */
  static async getOGContent(page: Page, property: string) {
    return await page.getAttribute(`meta[property="${property}"]`, 'content')
  }

  /**
   * ページのパフォーマンス計測
   */
  static async measurePerformance(page: Page, url: string) {
    const startTime = Date.now()
    await page.goto(url)
    await this.waitForPageLoad(page)
    const endTime = Date.now()
    
    return {
      loadTime: endTime - startTime,
      performanceMetrics: await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadEventTime: navigation.loadEventEnd - navigation.loadEventStart,
          responseTime: navigation.responseEnd - navigation.responseStart,
        }
      })
    }
  }

  /**
   * ネットワークエラーをモック
   */
  static async mockNetworkError(page: Page, urlPattern: string) {
    await page.route(urlPattern, route => {
      route.abort('failed')
    })
  }

  /**
   * API レスポンスをモック
   */
  static async mockApiResponse(page: Page, urlPattern: string, response: any) {
    await page.route(urlPattern, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
  }

  /**
   * コンソールエラーを監視
   */
  static async monitorConsoleErrors(page: Page) {
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    page.on('pageerror', error => {
      errors.push(error.message)
    })

    return () => errors
  }
}