'use client'

/**
 * LINEログイン診断ツール
 * スマートフォン環境での問題を特定・解決するためのユーティリティ
 */

interface DiagnosticResult {
  category: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: any
  suggestion?: string
}

interface LiffDiagnostics {
  isReady: boolean
  isLoggedIn: boolean
  isInClient: boolean
  environment: any
  error?: string
}

export class LineLoginDiagnostics {
  private results: DiagnosticResult[] = []

  /**
   * 包括的な診断を実行
   */
  async runDiagnostics(liff: any, tenantId?: string, orgId?: string): Promise<DiagnosticResult[]> {
    this.results = []
    
    console.log('[LineLoginDiagnostics] Starting comprehensive diagnostics...')
    
    // 1. LIFF環境診断
    await this.diagnoseLiff(liff)
    
    // 2. ネットワーク環境診断
    await this.diagnoseNetwork()
    
    // 3. ブラウザ環境診断
    await this.diagnoseBrowser()
    
    // 4. API設定診断（組織情報がある場合）
    if (tenantId && orgId) {
      await this.diagnoseApiConfig(tenantId, orgId)
    }
    
    // 5. ローカルストレージ・クッキー診断
    await this.diagnoseStorage()
    
    console.log('[LineLoginDiagnostics] Diagnostics completed:', this.results)
    return this.results
  }

  /**
   * LIFF環境の診断
   */
  private async diagnoseLiff(liff: any): Promise<void> {
    try {
      if (!liff) {
        this.addResult({
          category: 'LIFF',
          status: 'error',
          message: 'LIFF SDKが初期化されていません',
          suggestion: 'ページを再読み込みしてください'
        })
        return
      }

      // LIFF基本状態
      const isReady = liff.isReady()
      const isLoggedIn = liff.isLoggedIn()
      const isInClient = liff.isInClient()

      this.addResult({
        category: 'LIFF',
        status: isReady ? 'success' : 'error',
        message: isReady ? 'LIFF SDKは正常に初期化されています' : 'LIFF SDKの初期化が不完全です',
        details: { isReady, isLoggedIn, isInClient },
        suggestion: !isReady ? 'アプリを再起動するかページを再読み込みしてください' : undefined
      })

      // LIFF環境情報
      if (isReady) {
        const environment = {
          os: liff.getOS(),
          language: liff.getLanguage(),
          version: liff.getVersion(),
          lineVersion: liff.getLineVersion(),
          context: liff.getContext(),
          clientId: liff.getClientId()
        }

        this.addResult({
          category: 'LIFF Environment',
          status: 'success',
          message: `LIFF環境: ${environment.os} / LINE ${environment.lineVersion}`,
          details: environment
        })
      }

      // ログイン状態診断
      if (isLoggedIn) {
        try {
          const profile = await liff.getProfile()
          const idToken = liff.getIDToken()
          const decodedToken = liff.getDecodedIDToken()

          this.addResult({
            category: 'LINE Login',
            status: 'success',
            message: 'LINEログイン済み',
            details: {
              userId: profile.userId,
              displayName: profile.displayName,
              hasIdToken: !!idToken,
              tokenExpiry: decodedToken?.exp ? new Date(decodedToken.exp * 1000) : null
            }
          })
        } catch (error) {
          this.addResult({
            category: 'LINE Login',
            status: 'warning',
            message: 'ログイン情報の取得に失敗',
            details: error,
            suggestion: '一度ログアウトしてから再ログインしてください'
          })
        }
      }

    } catch (error) {
      this.addResult({
        category: 'LIFF',
        status: 'error',
        message: 'LIFF診断中にエラーが発生',
        details: error
      })
    }
  }

  /**
   * ネットワーク環境の診断
   */
  private async diagnoseNetwork(): Promise<void> {
    try {
      // 接続状態
      const online = navigator.onLine
      this.addResult({
        category: 'Network',
        status: online ? 'success' : 'error',
        message: online ? 'ネットワーク接続正常' : 'ネットワーク接続なし',
        suggestion: !online ? 'Wi-Fiまたはモバイルデータ接続を確認してください' : undefined
      })

      // API接続テスト
      if (online) {
        const startTime = Date.now()
        try {
          const response = await fetch('/api/auth/session', {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          })
          
          const responseTime = Date.now() - startTime
          
          this.addResult({
            category: 'API Connectivity',
            status: response.ok ? 'success' : 'warning',
            message: `API接続: ${responseTime}ms (${response.status})`,
            details: { responseTime, status: response.status },
            suggestion: responseTime > 3000 ? '接続が遅いため、処理に時間がかかる場合があります' : undefined
          })
        } catch (error) {
          this.addResult({
            category: 'API Connectivity',
            status: 'error',
            message: 'APIサーバーに接続できません',
            details: error,
            suggestion: 'しばらく待ってから再試行してください'
          })
        }
      }
    } catch (error) {
      this.addResult({
        category: 'Network',
        status: 'error',
        message: 'ネットワーク診断中にエラーが発生',
        details: error
      })
    }
  }

  /**
   * ブラウザ環境の診断
   */
  private async diagnoseBrowser(): Promise<void> {
    try {
      const userAgent = navigator.userAgent
      const isMobile = /Mobi|Android/i.test(userAgent)
      const isLineApp = userAgent.includes('Line/')
      const isIOS = /iPad|iPhone|iPod/.test(userAgent)
      const isAndroid = userAgent.includes('Android')

      this.addResult({
        category: 'Browser',
        status: 'success',
        message: `環境: ${isMobile ? 'モバイル' : 'デスクトップ'} ${isLineApp ? '(LINE内ブラウザ)' : ''}`,
        details: {
          userAgent,
          isMobile,
          isLineApp,
          isIOS,
          isAndroid,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      })

      // JavaScript有効性確認
      this.addResult({
        category: 'JavaScript',
        status: 'success',
        message: 'JavaScript実行環境正常'
      })

      // LocalStorage・Cookie対応確認
      const hasLocalStorage = typeof Storage !== 'undefined'
      const hasCookies = navigator.cookieEnabled

      this.addResult({
        category: 'Storage',
        status: hasLocalStorage && hasCookies ? 'success' : 'warning',
        message: `ストレージ: LocalStorage ${hasLocalStorage ? '✓' : '✗'}, Cookies ${hasCookies ? '✓' : '✗'}`,
        suggestion: (!hasLocalStorage || !hasCookies) ? 'ブラウザの設定でクッキーとローカルストレージを有効にしてください' : undefined
      })

    } catch (error) {
      this.addResult({
        category: 'Browser',
        status: 'error',
        message: 'ブラウザ診断中にエラーが発生',
        details: error
      })
    }
  }

  /**
   * API設定の診断
   */
  private async diagnoseApiConfig(tenantId: string, orgId: string): Promise<void> {
    try {
      const response = await fetch(`/api/organization/api-config?tenant_id=${tenantId}&org_id=${orgId}`, {
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const config = await response.json()
        const hasLiffId = !!config.liff_id
        const hasChannelId = !!config.line_channel_id
        const hasAccessToken = !!config.line_access_token

        this.addResult({
          category: 'API Configuration',
          status: hasLiffId && hasChannelId ? 'success' : 'warning',
          message: `LINE設定: LIFF ${hasLiffId ? '✓' : '✗'}, Channel ID ${hasChannelId ? '✓' : '✗'}, Access Token ${hasAccessToken ? '✓' : '✗'}`,
          details: { hasLiffId, hasChannelId, hasAccessToken },
          suggestion: (!hasLiffId || !hasChannelId) ? '管理画面でLINE API設定を確認してください' : undefined
        })
      } else {
        this.addResult({
          category: 'API Configuration',
          status: 'warning',
          message: 'API設定の取得に失敗',
          details: { status: response.status }
        })
      }
    } catch (error) {
      this.addResult({
        category: 'API Configuration',
        status: 'warning',
        message: 'API設定診断中にエラーが発生',
        details: error
      })
    }
  }

  /**
   * ストレージ診断
   */
  private async diagnoseStorage(): Promise<void> {
    try {
      // Cookie確認
      const cookies = document.cookie
      const hasLoginSession = cookies.includes('bocker_login_session')
      const hasLineState = cookies.includes('bocker_line_state')

      this.addResult({
        category: 'Session Storage',
        status: 'success',
        message: `セッション: Login ${hasLoginSession ? '✓' : '✗'}, State ${hasLineState ? '✓' : '✗'}`,
        details: {
          hasLoginSession,
          hasLineState,
          cookieCount: cookies.split(';').length
        }
      })

      // LocalStorage確認
      if (typeof Storage !== 'undefined') {
        const localStorageItems = Object.keys(localStorage).length
        this.addResult({
          category: 'Local Storage',
          status: 'success',
          message: `ローカルストレージアイテム数: ${localStorageItems}`,
          details: { itemCount: localStorageItems }
        })
      }

    } catch (error) {
      this.addResult({
        category: 'Storage',
        status: 'error',
        message: 'ストレージ診断中にエラーが発生',
        details: error
      })
    }
  }

  /**
   * 診断結果を追加
   */
  private addResult(result: DiagnosticResult): void {
    this.results.push(result)
  }

  /**
   * 診断結果のサマリーを生成
   */
  generateSummary(): string {
    const errors = this.results.filter(r => r.status === 'error').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const success = this.results.filter(r => r.status === 'success').length

    if (errors > 0) {
      return `🔴 ${errors}個の重大な問題が見つかりました`
    } else if (warnings > 0) {
      return `🟡 ${warnings}個の警告があります`
    } else {
      return `🟢 すべて正常です (${success}個の項目を確認)`
    }
  }

  /**
   * スマートフォン向けの推奨対処法を生成
   */
  getMobileRecommendations(): string[] {
    const recommendations: string[] = []
    
    const hasNetworkIssues = this.results.some(r => 
      r.category === 'Network' && r.status === 'error'
    )
    const hasLiffIssues = this.results.some(r => 
      r.category === 'LIFF' && r.status === 'error'
    )
    const hasApiIssues = this.results.some(r => 
      r.category === 'API Connectivity' && r.status === 'error'
    )

    if (hasNetworkIssues) {
      recommendations.push('📶 Wi-Fi接続を確認するか、モバイルデータに切り替えてください')
    }

    if (hasLiffIssues) {
      recommendations.push('🔄 LINEアプリを一度閉じて、再度開いてください')
      recommendations.push('📱 LINEアプリを最新版に更新してください')
    }

    if (hasApiIssues) {
      recommendations.push('⏰ しばらく時間をおいてから再試行してください')
    }

    // 一般的な推奨事項
    recommendations.push('🌐 ページを再読み込みしてください')
    recommendations.push('🗂️ ブラウザのキャッシュをクリアしてください')

    return recommendations
  }
}

/**
 * 診断実行のヘルパー関数
 */
export async function runLineLoginDiagnostics(
  liff?: any, 
  tenantId?: string, 
  orgId?: string
): Promise<{
  results: DiagnosticResult[]
  summary: string
  recommendations: string[]
}> {
  const diagnostics = new LineLoginDiagnostics()
  const results = await diagnostics.runDiagnostics(liff, tenantId, orgId)
  const summary = diagnostics.generateSummary()
  const recommendations = diagnostics.getMobileRecommendations()

  return { results, summary, recommendations }
}