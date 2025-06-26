# LINEログイン実装ドキュメント

## 概要

BockerプラットフォームにおけるLINE Front-end Framework (LIFF) を使用したLINEログイン機能の実装詳細。

## アーキテクチャ]

### LINE Documents
https://developers.line.biz/ja/docs/liff/overview/

### 技術スタック
- **LIFF SDK**: `@line/liff` v2.x
- **認証フロー**: OAuth 2.0 + OpenID Connect
- **セッション管理**: JWT トークン + サーバーサイドセッション
- **状態管理**: React hooks（useState, useEffect）
- **型安全性**: TypeScript 5.5

### 主要コンポーネント

```
components/auth/
├── OptimizedLineLoginButton.tsx    # LINEログインボタン
└── lineLoginDiagnostics.ts        # 診断ツール

hooks/
├── useLiff.ts                      # LIFF SDK初期化
└── useLineAuthHandler.ts           # ログイン処理

lib/auth/
├── lineAuthCleanup.ts              # 認証状態クリーンアップ
└── lineLoginDiagnostics.ts         # 包括的診断機能

app/[locale]/(customer)/customer/[org_id]/auth/login/
└── page.tsx                        # 顧客ログインページ

app/[locale]/(reservation)/reservation/auth/callback/
└── page.tsx                        # 認証コールバックページ
```

## 実装詳細

### 1. LIFF SDK初期化

```typescript
// hooks/useLiff.ts
import { Liff } from '@line/liff'

export function useLiff() {
  const [liff, setLiff] = useState<Liff | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    import('@line/liff').then(liffModule => {
      const liffApp = liffModule.default
      liffApp.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID })
        .then(() => {
          setLiff(liffApp)
          setIsLoading(false)
        })
    })
  }, [])
  
  return { liff, isLoading, isLoggedIn: liff?.isLoggedIn() }
}
```

### 2. 認証フロー

#### ステップ1: ログイン開始
```typescript
// useLineAuthHandler.ts - handleLineAuth関数
if (!liff.isLoggedIn()) {
  // 1. セキュアなstateを生成
  const stateResponse = await fetch('/api/auth/line-state', {
    method: 'POST',
    body: JSON.stringify({ tenantId, orgId, isCustomerLogin })
  })
  
  // 2. コールバックURL構築
  const callbackUrl = new URL(`/${locale}/reservation/auth/callback`, baseUrl)
  callbackUrl.searchParams.set('redirect_type', isCustomerLogin ? 'customer' : 'reservation')
  callbackUrl.searchParams.set('state', stateId)
  
  // 3. LINEログインにリダイレクト
  liff.login({ redirectUri: callbackUrl.toString() })
}
```

#### ステップ2: トークン検証
```typescript
// IDトークンを取得
const idToken = liff.getIDToken()

// トークン有効性チェック
const tokenValid = await isLineTokenValid(idToken)
if (!tokenValid) {
  liff.logout()
  throw new Error('認証情報の有効期限が切れています')
}

// サーバーサイドでトークン検証
const response = await fetch('/api/line/verify-token', {
  method: 'POST',
  body: JSON.stringify({ idToken, tenantId, orgId, isCustomerLogin })
})
```

#### ステップ3: コールバック処理
```typescript
// app/.../auth/callback/page.tsx
async function handleLineCallback() {
  const state = searchParams.get('state')
  const redirectType = searchParams.get('redirect_type')
  
  // State検証
  const authState = await validateState(state)
  
  // トークン検証
  await verifyToken(liff, authState)
  
  // 適切なページにリダイレクト
  if (redirectType === 'customer') {
    router.push(`/${locale}/customer/${orgId}/${customerUid}/profile`)
  } else {
    router.push(`/${locale}/reservation/${orgId}/calendar`)
  }
}
```

### 3. 型定義

```typescript
// 認証成功時のレスポンス型
interface LineAuthSuccessData {
  customerUid?: string
  success: boolean
  message?: string
}

// 認証状態
interface AuthState {
  tenantId: string
  orgId: string
  isCustomerLogin: boolean
}

// トークン検証レスポンス
interface TokenVerifyResponse {
  success: boolean
  customerUid?: string
  message?: string
  error?: string
}
```

### 4. エラーハンドリング

```typescript
// トークン期限切れの処理
if (response.status === 401) {
  if (liff?.isLoggedIn()) {
    liff.logout()
  }
  throw new Error('認証情報の有効期限が切れています。再度ログインしてください。')
}

// ネットワークエラーの処理
if (error instanceof TypeError && error.message.includes('fetch')) {
  throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。')
}
```

## セキュリティ考慮事項

### 1. CSRF対策
- セキュアなstateパラメータの生成・検証
- サーバーサイドでのstate管理

### 2. トークン管理
- IDトークンの有効期限チェック
- 期限切れ時の自動ログアウト
- セッション情報の適切な削除

### 3. リダイレクト検証
- 許可されたリダイレクトURIのみ使用
- URLパラメータの検証

## 診断・デバッグ機能

### LINEログイン診断ツール
```typescript
// lineLoginDiagnostics.ts
export class LineLoginDiagnostics {
  async runDiagnostics(liff: Liff | null, tenantId?: string, orgId?: string) {
    // 1. LIFF環境診断
    await this.diagnoseLiff(liff)
    
    // 2. ネットワーク診断
    await this.diagnoseNetwork()
    
    // 3. ブラウザ環境診断
    await this.diagnoseBrowser()
    
    // 4. API設定診断
    if (tenantId && orgId) {
      await this.diagnoseApiConfig(tenantId, orgId)
    }
    
    // 5. ストレージ診断
    await this.diagnoseStorage()
    
    return this.results
  }
}
```

## パフォーマンス最適化

### 1. コンポーネント最適化
- `React.memo`でレンダリング最適化
- 不要な再レンダリングを防止

### 2. 状態管理
- `useRef`で重複処理防止
- AbortControllerでリクエストキャンセル

### 3. エラー境界
```typescript
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[LineLoginButton] Error:', error, errorInfo)
  }
}
```

## API エンドポイント

### 1. State管理
```
POST /api/auth/line-state    # State生成
GET  /api/auth/line-state    # State検証
POST /api/auth/line-state/cleanup  # State削除
```

### 2. トークン検証
```
POST /api/line/verify-token  # IDトークン検証・ユーザー認証
```

### 3. セッション管理
```
GET  /api/auth/session      # セッション取得
POST /api/auth/session      # セッション作成
POST /api/auth/logout       # ログアウト
```

## 環境変数

```bash
# LIFF設定
NEXT_PUBLIC_LIFF_ID=your-liff-id

# LINE API設定（組織ごとにDBで管理）
# - LINE_CHANNEL_ID
# - LINE_ACCESS_TOKEN
# - LIFF_ID
```

## テスト環境

### 開発環境
- LIFFのエンドポイントURLに設定してください。
### 開発環境
- URL: https://bocker-project.vercel.app
- LIFF Endpoint: `https://bocker-project.vercel.app/ja/reservation/`

### 本番環境
- URL: https://bocker.jp
- LIFF Endpoint: `https://bocker.jp/ja/reservation/`

## トラブルシューティング

### よくある問題

1. **LIFF初期化エラー**
   - LIFF_IDの確認
   - ドメイン設定の確認

2. **トークン期限切れ**
   - 自動ログアウト機能
   - 再ログインの促し

3. **ネットワークエラー**
   - リトライ機能（503, 504エラー）
   - ユーザーフレンドリーなエラーメッセージ

4. **スマートフォン固有の問題**
   - LINE内ブラウザの検出
   - ビューポート設定
   - タッチイベント最適化

### デバッグ手順

1. 診断ツールの実行
```typescript
const diagnostics = new LineLoginDiagnostics()
const results = await diagnostics.runDiagnostics(liff, tenantId, orgId)
console.log('診断結果:', results)
```

2. ブラウザ開発者ツール
   - Network タブでAPI呼び出し確認
   - Console タブでエラーログ確認
   - Application タブでLocal Storage/Cookie確認

3. LIFFデバッガー
   - LINE Developers Console の LIFF タブ
   - リアルタイムログ確認

## 今後の改善点

1. **自動リトライ機能の強化**
   - より細かいエラー分類
   - 指数バックオフ

2. **パフォーマンス監視**
   - 認証フロー完了時間の測定
   - エラー率の監視

3. **アクセシビリティ改善**
   - スクリーンリーダー対応
   - キーボードナビゲーション

4. **多言語対応**
   - エラーメッセージの国際化
   - 地域固有の設定

## 参考資料

- [LIFF v2 API Reference](https://developers.line.biz/ja/reference/liff/)
- [LINE Login documentation](https://developers.line.biz/ja/docs/line-login/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)