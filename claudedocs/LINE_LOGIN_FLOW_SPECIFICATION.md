# LINE OAuth 2.1 ログインフロー仕様書

## 概要

Bockerプラットフォームは、LINE公式OAuth 2.1 PKCE（Proof Key for Code Exchange）認証を実装して、セキュアで使いやすい顧客認証システムを提供しています。

## アーキテクチャ図

```
[ユーザー] → [OptimizedLineLoginButton] → [LINE OAuth] → [Callback] → [Session] → [Calendar]
     ↓              ↓                      ↓            ↓          ↓          ↓
  1. クリック    2. auth/start         3. LINE認証   4. callback  5. session  6. アクセス
     ↓              ↓                      ↓            ↓          ↓          ↓
  UIコンポーネント  PKCE生成            LINE承認    JWT作成    Cookie設定  ページ表示
```

## 認証フロー詳細

### 1. **認証開始フェーズ**
**トリガー**: OptimizedLineLoginButtonのクリック
**場所**: `components/auth/OptimizedLineLoginButton.tsx:login()`

**プロセス**:
1. `useLineAuth.login()` 呼び出し
2. リダイレクトURI計算（NEXT_PUBLIC_DEVELOP_URL対応）
3. `/api/auth/line/start` POSTリクエスト
4. PKCE S256チャレンジ生成
5. LINEオーソライゼーションURLにリダイレクト

**キーコンポーネント**:
- テナントID・組織ID検証
- スコープ設定 (`profile openid`)
- ランダム状態パラメータ生成

### 2. **LINE認証フェーズ**
**場所**: LINE公式プラットフォーム
**プロセス**:
1. ユーザーがLINEアカウントでログイン
2. アプリケーション権限の承認
3. 認証コードの生成
4. コールバックURLへリダイレクト

### 3. **コールバック処理フェーズ**
**エンドポイント**: `/api/auth/line/callback`
**プロセス**:
1. 認証コード検証
2. PKCE verifier確認
3. LINEトークンエンドポイントへのリクエスト
4. アクセストークン・リフレッシュトークン取得
5. `token-manager.ts`による暗号化保存
6. 成功パラメータ付きでフロントエンドにリダイレクト

### 4. **セッション作成フェーズ**
**トリガー**: OptimizedLineLoginButtonの`onAuthSuccess`コールバック
**エンドポイント**: `/api/auth/line-session`

**プロセス**:
1. LINE Profile API呼び出し
2. 顧客情報取得または新規作成
3. JWT Session Payload作成
4. `bocker_login_session` HTTPOnlyクッキー設定
5. 30日間有効期限設定

**重要な同期処理**:
- クッキー設定後500ms待機
- 即座に検証リクエスト実行
- 失敗時の自動リトライ機能

### 5. **セッション確認フェーズ**
**エンドポイント**: `/api/auth/session` (GET)
**場所**: CalendarPageのuseEffect

**プロセス**:
1. `bocker_login_session`クッキー読み取り
2. JWT署名検証（APP_JWT_SECRET）
3. テナント・組織ID一致確認
4. セッションペイロード返却
5. 失敗時の完全ログアウト実行

## データフロー

### トークン管理 (`token-manager.ts`)
```
LINE Access Token → AES-256-GCM暗号化 → line_at_enc (Cookie)
LINE Refresh Token → AES-256-GCM暗号化 → line_rt_enc (Cookie)
Expiration Time → Plaintext → line_at_exp (Cookie)
Issued Time → Plaintext → line_at_iat (Cookie)
```

### セッション管理
```
Customer Data → JWT署名 → bocker_login_session (HTTPOnly Cookie)
JWT Payload: {
  customerUid, email, customerName, tenantId, orgId,
  lineUserId, lineUserName, target_type
}
```

## セキュリティ実装

### 1. **PKCE (OAuth 2.1)**
- S256チャレンジメソッド使用
- ランダム verifier 生成
- 中間者攻撃防止

### 2. **Token暗号化**
- AES-256-GCM暗号化
- HttpOnly cookie設定
- SameSite=Strict

### 3. **JWT署名**
- HS256署名アルゴリズム
- 30日間有効期限
- テナント隔離強制

### 4. **自動ログアウト検出**
```typescript
// LIFF logout状態の監視
if (!isLiffLoggedIn && isAuthenticated) {
  lineLogout() // サーバー側状態クリア
  performCompleteLogout() // クライアント側状態クリア
}
```

## エラーハンドリング

### 401 Unauthorized
**原因**: セッション未作成、期限切れ、JWT検証失敗
**対応**: 完全ログアウト → 予約画面リダイレクト

### 400 Bad Request
**原因**: 必要パラメータ不足、テナント/組織ID無効
**対応**: エラーメッセージ表示 → 再認証促進

### 500 Internal Server Error
**原因**: LINE API障害、DB接続エラー、暗号化失敗
**対応**: システムエラー表示 → サポート連絡案内

## パフォーマンス最適化

### 1. **タイミング制御**
- セッション作成後500ms待機
- ページ遷移前1000ms待機
- 自動リフレッシュ60秒前

### 2. **リソース管理**
- AbortController による fetch取消
- setInterval クリーンアップ
- メモリリーク防止

### 3. **並列処理**
```typescript
// 同時実行（React Suspense対応）
const [authCheck, sessionVerify] = await Promise.all([
  checkAuthStatus(),
  verifySessionCookie()
])
```

## モニタリング・デバッグ

### ログ出力パターン
```
[OptimizedLineLoginButton] 操作状況
[API /api/auth/line-session] セッション作成状況
[API /api/auth/session] セッション確認状況
[TokenManager] トークン管理状況
[useLineAuth] 認証フック状態
```

### デバッグ情報
- 開発環境でのdetailed状態出力
- Cookie設定・読み取り状況
- JWT decode内容
- LIFF状態変化

## 互換性・制約

### ブラウザ対応
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

### LINE環境対応
- LINE内ブラウザ (LIFF)
- 外部ブラウザ
- モバイルアプリ
- デスクトップブラウザ

### 制限事項
- アクセストークン: 30日間有効
- リフレッシュトークン: 90日間有効
- 並行セッション: テナントごとに1セッション
- CORS制限: Same-Origin Policy準拠

## Future Enhancements

### 予定機能
1. **Multi-Factor Authentication (MFA)**
2. **Biometric認証連携**
3. **OAuth 2.1 Device Flow**
4. **Session Analytics & Monitoring**
5. **Automated Security Scanning**

### スケーラビリティ
- Redis Session Store
- JWT Blacklist管理
- Load Balancer対応
- Multi-Region Token同期