# LINE ログイン トラブルシューティングガイド

## 概要

このガイドは、LINEログイン機能で発生する一般的な問題の診断と解決方法を提供します。

## 問題カテゴリ別診断

### 🔴 Critical: 401 Unauthorized エラー

#### **症状**
```
Failed to load resource: the server responded with a status of 401
認証セッションが見つかりません。完全ログアウト後、予約画面に戻ります。
```

#### **根本原因分析**

**1. セッションクッキー未作成**
```bash
# 確認方法
開発者ツール → Application → Cookies → bocker_login_session
```
- **期待値**: JWT形式の長い文字列
- **問題**: クッキーが存在しない or 空文字

**2. JWT署名検証失敗**
```typescript
// 確認ログ
[API /api/auth/session] Invalid session token: JsonWebTokenError
```
- **原因**: APP_JWT_SECRET不一致
- **解決**: 環境変数確認・再設定

**3. テナント/組織ID不一致**
```typescript
// 確認ログ
Session comparison: {
  tenantMatches: false, // ← この値を確認
  orgMatches: false     // ← この値を確認
}
```

#### **解決手順**

**ステップ 1: クッキー状態確認**
```javascript
// Browser Console
document.cookie.split(';').find(c => c.includes('bocker_login_session'))
```

**ステップ 2: タイミング調整**
```typescript
// OptimizedLineLoginButton.tsx で調整
await new Promise(resolve => setTimeout(resolve, 1000)) // 500ms → 1000ms
```

**ステップ 3: 手動セッション再作成**
```javascript
// Emergency Manual Fix
fetch('/api/auth/line-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tenantId: 'XXX', orgId: 'YYY' }),
  credentials: 'include'
})
```

### 🟡 Warning: React setState during render

#### **症状**
```
Cannot update a component (Router) while rendering a different component (CalendarPage)
```

#### **根本原因**
useEffect内でのrouter.push直接呼び出し

#### **解決済み（確認方法）**
```typescript
// CalendarPage で以下パターンが適用されているか確認
setTimeout(() => {
  router.push('/reservation')
}, 100)
```

### 🟠 Performance: LIFF Logout検出問題

#### **症状**
- LINEログアウト後もOptimizedLineLoginButtonが「ログイン済み」表示
- 無限リダイレクトループ

#### **確認方法**
```javascript
// Browser Console
window.liff && window.liff.isLoggedIn && window.liff.isLoggedIn()
```

#### **解決状態確認**
```typescript
// OptimizedLineLoginButton.tsx の以下ロジック確認
if (isLiffLoggedIn && isAuthenticated && ...) {
  // 自動セッション作成は LIFF状態一致時のみ
}
```

## 段階的診断プロセス

### Phase 1: 基本動作確認

**1. LINE API設定確認**
```sql
-- Convex Query
SELECT line_channel_id, line_channel_secret, liff_id 
FROM api_config 
WHERE tenant_id = ? AND org_id = ?
```

**2. 環境変数確認**
```bash
echo $APP_JWT_SECRET
echo $NEXT_PUBLIC_DEVELOP_URL
echo $NODE_ENV
```

**3. ネットワーク状態確認**
```bash
# LINE API到達確認
curl -I https://api.line.me/v2/profile
```

### Phase 2: 認証フロー追跡

**1. ログイン開始確認**
```typescript
// 期待ログ
[OptimizedLineLoginButton] Click initiated
[useLineAuth] Starting LINE OAuth 2.1 authentication...
```

**2. コールバック確認**
```typescript
// 期待ログ
[API /api/auth/line/callback] Processing LINE OAuth callback
[API /api/auth/line/callback] Successfully exchanged code for tokens
```

**3. セッション作成確認**
```typescript
// 期待ログ
[API /api/auth/line-session] LINE session created successfully
[OptimizedLineLoginButton] Session created successfully
```

### Phase 3: 高度なデバッグ

**1. JWT内容デコード**
```javascript
// Browser Console (JWT Debugger)
const token = document.cookie.match(/bocker_login_session=([^;]+)/)?.[1]
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  console.log('JWT Payload:', payload)
}
```

**2. Cookie詳細分析**
```javascript
// All Cookies Analysis
document.cookie.split(';').forEach(cookie => {
  const [name, value] = cookie.trim().split('=')
  console.log(`${name}: ${value?.length || 0} chars`)
})
```

**3. ネットワーク水準デバッグ**
```bash
# Charles Proxy / Wireshark
# 1. /api/auth/line/start request/response
# 2. LINE OAuth redirect
# 3. /api/auth/line/callback request/response
# 4. /api/auth/line-session request/response
# 5. /api/auth/session request/response
```

## 環境別対応方法

### 開発環境 (localhost:3001)

**一般的問題**: CORS、Cookie Domain

**解決方法**:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [{
      source: '/api/(.*)',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' }
      ]
    }]
  }
}
```

### ステージング環境 (cloudflare tunnel)

**一般的問題**: HTTPS Cookie、Tunnel URL不一致

**解決方法**:
```bash
# .env.local
NEXT_PUBLIC_DEVELOP_URL=https://skirt-recreational-implementing-eagle.trycloudflare.com
```

### 本番環境 (vercel.app)

**一般的問題**: Environment Variables、Region latency

**確認項目**:
1. Vercel環境変数設定
2. Convex Production URL
3. LINE Channel設定のCallback URL

## 緊急時対応手順

### 🚨 Complete System Reset

**状況**: 全体的な認証システム障害

**手順**:
```bash
# 1. 全ユーザーセッション無効化
# Convex Function
await db.delete(session_id)

# 2. LINE Token清理
# Redis FLUSHDB or Cookie清理

# 3. システム再起動
vercel deploy --force
```

### 🔧 Individual User Recovery

**状況**: 特定ユーザーのログイン不能

**手順**:
```typescript
// 1. Manual Session Creation
const sessionPayload = {
  customerUid: "user_id",
  tenantId: "tenant_id", 
  orgId: "org_id",
  // ...
}
const token = jwt.sign(sessionPayload, process.env.APP_JWT_SECRET)

// 2. Direct Cookie Setting
document.cookie = `bocker_login_session=${token}; path=/; max-age=2592000`
```

## 予防措置・モニタリング

### 1. **Automated Health Checks**
```typescript
// /api/health/line-auth
export async function GET() {
  const checks = await Promise.all([
    validateLineApiConnection(),
    validateJwtSecret(),
    validateDatabaseConnection()
  ])
  
  return Response.json({ 
    status: checks.every(c => c.ok) ? 'healthy' : 'degraded',
    checks 
  })
}
```

### 2. **Error Rate Monitoring**
```typescript
// Metrics Collection
const authMetrics = {
  total_attempts: 0,
  successful_logins: 0,
  failed_logins: 0,
  error_401_count: 0,
  average_session_creation_time: 0
}
```

### 3. **Automated Recovery**
```typescript
// Auto-retry mechanism in OptimizedLineLoginButton
if (retryCount < 3 && error.includes('401')) {
  setTimeout(() => handleRetryLogin(), 2000 * retryCount)
}
```

## パフォーマンス最適化のガイドライン

### 1. **レスポンス時間最適化**
- Session creation: < 500ms
- Session validation: < 200ms
- LIFF state check: < 100ms

### 2. **同時接続数対応**
- Connection pooling
- Rate limiting (100 req/min/user)
- Circuit breaker pattern

### 3. **キャッシュ戦略**
```typescript
// Session Cache (Redis)
const cacheKey = `session:${customerUid}:${tenantId}:${orgId}`
await redis.setex(cacheKey, 1800, sessionData) // 30分キャッシュ
```

## サポートエスカレーション

### Level 1: User Self-Service
1. ブラウザリフレッシュ
2. キャッシュクリア
3. 別ブラウザ試行

### Level 2: Technical Support
1. ログ収集・分析
2. 環境設定確認
3. 手動セッション再作成

### Level 3: Engineering Team
1. システム設計見直し
2. インフラ問題調査
3. 新機能開発

**連絡先**: support@bocker.jp (24時間対応)