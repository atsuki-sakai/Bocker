'use client'

import type { Liff } from '@line/liff'
import { Id } from '@/convex/_generated/dataModel'

/**
 * LINEログイン診断ツール
 * スマートフォン環境での問題を特定・解決するためのユーティリティ
 */

/**
 * 診断結果の型定義
 */
interface DiagnosticResult {
  /** 診断カテゴリ（例: LIFF, Network, Browser） */
  category: string
  /** 診断結果のステータス */
  status: 'success' | 'warning' | 'error'
  /** 診断結果のメッセージ */
  message: string
  /** 詳細情報（エラー情報など） */
  details?: Record<string, unknown>
  /** ユーザーへの提案・対処法 */
  suggestion?: string
}

/**
 * LINEログイン診断クラス
 * スマートフォン環境でのLINEログイン問題を診断する
 */
export class LineLoginDiagnostics {
  /** 診断結果を格納する配列 */
  private results: DiagnosticResult[] = []

  /**
   * 包括的な診断を実行
   * @param liff - LIFF SDKインスタンス（正式な@line/liffパッケージから）
   * @param tenantId - テナントID（オプション）
   * @param orgId - 組織ID（オプション）
   * @returns 診断結果の配列
   */
  async runDiagnostics(liff: Liff | null, tenantId?: Id<'tenant'>, orgId?: Id<'organization'>): Promise<DiagnosticResult[]> {
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
  private async diagnoseLiff(liff: Liff | null): Promise<void> {
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

      // LIFF基本状態チェック
      const isLoggedIn = liff.isLoggedIn()
      const isInClient = liff.isInClient()

      this.addResult({
        category: 'LIFF',
        status: 'success',
        message: 'LIFF SDKは正常に初期化されています',
        details: { isLoggedIn, isInClient }
      })

      // LIFF環境情報
      try {
        const environment = {
          os: liff.getOS(),
          language: liff.getLanguage(),
          version: liff.getVersion(),
          lineVersion: liff.getLineVersion(),
          context: liff.getContext()
        }

        this.addResult({
          category: 'LIFF Environment',
          status: 'success',
          message: `LIFF環境: ${environment.os} / LINE ${environment.lineVersion}`,
          details: environment
        })
      } catch (error) {
        this.addResult({
          category: 'LIFF Environment',
          status: 'warning',
          message: 'LIFF環境情報の取得に失敗',
          details: { error: this.errorToString(error) }
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
            details: { error: this.errorToString(error) },
            suggestion: '一度ログアウトしてから再ログインしてください'
          })
        }
      }

    } catch (error) {
      this.addResult({
        category: 'LIFF',
        status: 'error',
        message: 'LIFF診断中にエラーが発生',
        details: { error: this.errorToString(error) }
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
            details: { error: this.errorToString(error) },
            suggestion: 'しばらく待ってから再試行してください'
          })
        }
      }
    } catch (error) {
      this.addResult({
        category: 'Network',
        status: 'error',
        message: 'ネットワーク診断中にエラーが発生',
        details: { error: this.errorToString(error) }
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
        details: { error: this.errorToString(error) }
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
        details: { error: this.errorToString(error) }
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
        details: { error: this.errorToString(error) }
      })
    }
  }

  /**
   * エラーオブジェクトを文字列に変換（安全な方法）
   */
  private errorToString(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
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
 * LINEログイン診断を実行するヘルパー関数
 * @param liff - LIFF SDKインスタンス（@line/liffパッケージから）
 * @param tenantId - テナントID（組織診断用）
 * @param orgId - 組織ID（組織診断用）
 * @returns 診断結果、サマリー、推奨対処法
 */
export async function runLineLoginDiagnostics(
  liff?: Liff | null, 
  tenantId?: string, 
  orgId?: string
): Promise<{
  results: DiagnosticResult[]
  summary: string
  recommendations: string[]
}> {
  const diagnostics = new LineLoginDiagnostics()
  const results = await diagnostics.runDiagnostics(liff || null, tenantId as Id<'tenant'>, orgId as Id<'organization'>)
  const summary = diagnostics.generateSummary()
  const recommendations = diagnostics.getMobileRecommendations()

  return { results, summary, recommendations }
}