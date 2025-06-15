# LINE認証フロー仕様書

## 概要
BockerのLINE認証フローは、顧客が予約を行うために使用される認証システムです。LINEアカウントを使用したソーシャルログインと、従来のメール・パスワード認証の両方をサポートしています。

## 認証フローの全体像

### 1. 認証開始画面 (`/reservation/[org_id]`)
**ファイル**: `/app/[locale]/(reservation)/reservation/[id]/page.tsx`

#### 処理内容
1. **初期ロード時**
   - セッション確認 (`/api/auth/session` GET)
   - 既存セッションがあれば `/reservation/[org_id]/calendar` へリダイレクト
   - 組織情報の取得（`api.organization.query.findByOrgId`）
   - テナントIDの設定

2. **ログイン方法**
   - **メール・パスワードログイン**
     - 既存ユーザー: `/api/auth/session` POSTでセッション作成
     - 新規ユーザー: `/api/auth/register` POSTで登録後、セッション作成
   - **LINEログイン**
     - `handleLineLogin`関数で処理開始

### 2. LINE認証フロー

#### 2.1 セキュアなState生成
**エンドポイント**: `/api/auth/line-state` (POST)
**ファイル**: `/app/api/auth/line-state/route.ts`

```typescript
// リクエスト
{
  tenantId: Id<'tenant'>,
  orgId: Id<'organization'>
}

// レスポンス
{
  stateId: string // UUID
}
```

**処理内容**:
- UUIDベースのstateId生成
- HTTPOnlyクッキー（`bocker_line_state`）に以下の情報を保存:
  - tenantId
  - orgId
  - timestamp
  - stateId
- 有効期限: 10分間
- CSRF攻撃対策としてのstate管理

#### 2.2 LINE OAuth認証
**処理**:
1. stateIdを含むURLでLINE認証画面へリダイレクト
2. ユーザーがLINEで認証
3. コールバックURL: `/reservation?state={stateId}`

#### 2.3 コールバック処理
**ファイル**: `/app/[locale]/(reservation)/reservation/page.tsx`

**処理内容**:
1. **LIFF初期化待機**
   - `useLiff`フックでLIFF SDKの初期化を確認
   - エラー時は適切なエラーメッセージを表示

2. **State検証**
   - `/api/auth/line-state` (GET) でstate検証
   - クッキーから保存されたstateデータを取得
   - stateIdの一致確認
   - 有効期限チェック
   - 使用済みstateの削除（ワンタイム使用）

3. **LINEトークン取得**
   - `liff.getIDToken()`でIDトークン取得
   - 取得失敗時はログアウト処理

#### 2.4 顧客データ作成・更新とセッション生成
**エンドポイント**: `/api/line/verify-token` (POST)
**ファイル**: `/app/api/line/verify-token/route.ts`

```typescript
// リクエスト
{
  idToken: string,
  tenantId: Id<'tenant'>,
  orgId: Id<'organization'>
}
```

**処理内容**:
1. **LINE IDトークン検証**
   - LINE APIでトークンの正当性確認
   - チャンネルIDの一致確認

2. **顧客データ管理**（Supabase）
   - 既存顧客検索（email, tenantId, orgIdでユニーク）
   - 既存顧客の場合: LINE情報を更新
   - 新規顧客の場合: 新規作成
     - customer, customer_detail, customer_pointsテーブルに挿入

3. **JWTセッション作成**
   - HTTPOnlyクッキー（`bocker_login_session`）に保存
   - 有効期限: 30日間
   - ペイロード:
     ```typescript
     {
       lineUserId: string,
       customerUid: string,
       tenantId: Id<'tenant'>,
       orgId: Id<'organization'>,
       name?: string,
       email?: string
     }
     ```

### 3. 予約フロー（認証後）
**ファイル**: `/app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx`

#### セッション確認と顧客データ取得
1. **セッション取得**
   - `/api/auth/session` (GET) でJWTトークン取得
   - JWTデコードでセッション情報復元

2. **顧客データ取得**（Supabase）
   - `CustomerRepository.getCompleteCustomerData`で顧客情報取得
   - customer, customer_detail, customer_pointsの完全データ

3. **組織情報取得**（Convex）
   - 営業時間、設定、API設定などの取得

### 4. ログアウト処理
**エンドポイント**: `/api/auth/logout` (POST)
**ファイル**: `/app/api/auth/logout/route.ts`

**処理内容**:
- HTTPOnlyクッキーの削除
- LIFFログアウト（`liff.logout()`）
- 予約開始画面へリダイレクト

## セキュリティ対策

1. **CSRF対策**
   - State parameterによる検証
   - ワンタイム使用（使用後即削除）
   - 有効期限（10分）

2. **XSS対策**
   - HTTPOnlyクッキー使用
   - Secure属性（本番環境）
   - SameSite=lax設定

3. **セッション管理**
   - JWT署名検証
   - 30日の有効期限
   - サーバーサイドでの検証

## エラーハンドリング

1. **LIFF初期化エラー**
   - 3回リトライ（1.5秒間隔）
   - エラーメッセージ表示

2. **State検証エラー**
   - 明確なエラーメッセージ
   - 最初からやり直しを促す

3. **トークン検証エラー**
   - 詳細なエラーログ
   - ユーザーへの適切なフィードバック

## データベース構造

### Supabase（顧客マスターデータ）
- **customer**: 基本情報（email, phone, line_id等）
- **customer_detail**: 詳細情報（gender, birthday, notes等）
- **customer_points**: ポイント情報

### Convex（アクティブデータ）
- 予約情報
- 組織設定
- スタッフ情報

## 現在の問題点と改善提案

### 問題点
1. **リダイレクト先の誤り**
   - 現在: `(home)`ページへリダイレクトされる
   - 正しい動作: `/reservation/[org_id]/calendar`へリダイレクト

### 改善提案
1. **リダイレクトURL管理**
   - 環境変数での管理
   - 動的なURL生成の改善

2. **エラーリカバリー**
   - セッション復元機能
   - 部分的な状態保存

3. **パフォーマンス最適化**
   - LIFF初期化の非同期化
   - 顧客データのキャッシング