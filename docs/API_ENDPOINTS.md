# Bocker API エンドポイント仕様書

本ドキュメントは、Bockerシステムで使用されているすべてのAPIエンドポイントの詳細仕様を記載しています。

## 目次

1. [認証関連 API](#認証関連-api)
2. [LINE連携 API](#line連携-api)
3. [Stripe決済 API](#stripe決済-api)
4. [ストレージ API](#ストレージ-api)
5. [Clerk管理 API](#clerk管理-api)
6. [メール送信 API](#メール送信-api)
7. [AI生成 API](#ai生成-api)
8. [Webhook API](#webhook-api)

---

## 認証関連 API

### POST /api/auth/session
**目的**: 顧客のメールアドレス/パスワードによるログイン認証

**使用場所**: 
- `/app/[locale]/(reservation)/reservation/[id]/page.tsx` (既存顧客ログイン時)

**リクエスト**:
```json
{
  "email": "customer@example.com",
  "password": "password123",
  "tenantId": "tenant_xxxxx",
  "orgId": "org_xxxxx"
}
```

**レスポンス**: 
- 成功時: `200 OK` + HTTPOnlyクッキー `bocker_login_session` 設定
- 失敗時: `401 Unauthorized`

**セキュリティ**: 
- bcryptjsによるパスワードハッシュ検証
- JWTトークンをHTTPOnlyクッキーに保存（30日間有効）

---

### GET /api/auth/session
**目的**: 現在のログインセッション情報の取得

**使用場所**:
- `/app/[locale]/(reservation)/reservation/[id]/page.tsx` (セッション確認)
- `/app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx` (セッション取得)

**レスポンス**:
```json
{
  "session": "eyJhbGciOiJIUzI1NiIs..." // JWTトークン
}
```

**セキュリティ**: HTTPOnlyクッキーからトークンを読み取り

---

### POST /api/auth/register
**目的**: 新規顧客アカウントの作成

**使用場所**:
- `/app/[locale]/(reservation)/reservation/[id]/page.tsx` (新規顧客登録時)

**リクエスト**:
```json
{
  "orgName": "サロン名",
  "email": "new@example.com",
  "password": "password123",
  "tenantId": "tenant_xxxxx",
  "orgId": "org_xxxxx",
  "detailData": {
    "email": "new@example.com",
    "gender": "unselected",
    "birthday": null,
    "age": null,
    "notes": ""
  },
  "initialPoints": 0
}
```

**処理内容**:
1. Supabaseに顧客データ作成（customer, customer_detail, customer_points）
2. パスワードのハッシュ化（bcryptjs）
3. 登録完了メール送信（Resend使用）

---

### POST /api/auth/reset-password
**目的**: パスワードリセットリンクの送信

**使用場所**:
- `/app/[locale]/(auth)/sign-in/reset-password/page.tsx`

**リクエスト**:
```json
{
  "email": "customer@example.com",
  "tenantId": "tenant_xxxxx",
  "orgId": "org_xxxxx"
}
```

**処理内容**:
1. 顧客の存在確認
2. リセット用JWTトークン生成（1時間有効）
3. リセットリンクをメール送信

---

### POST /api/auth/reset-password/confirm
**目的**: 新しいパスワードの設定

**リクエスト**:
```json
{
  "token": "reset_token_xxxxx",
  "newPassword": "newPassword123"
}
```

**処理内容**:
1. リセットトークンの検証
2. 新パスワードのハッシュ化・保存
3. パスワード変更完了メール送信

---

### POST /api/auth/logout
### GET /api/auth/logout
**目的**: ログアウト処理（セッションクッキーの削除）

**使用場所**:
- `/app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx`

**レスポンス**: クッキー削除（Max-Age=0）

---

### POST /api/auth/line-state
**目的**: LINEログイン用のセキュアなstateパラメータ生成

**使用場所**:
- `/app/[locale]/(reservation)/reservation/[id]/page.tsx` (LINEログイン開始時)

**リクエスト**:
```json
{
  "tenantId": "tenant_xxxxx",
  "orgId": "org_xxxxx"
}
```

**レスポンス**:
```json
{
  "stateId": "uuid_xxxxx"
}
```

**セキュリティ**:
- HTTPOnlyクッキーにstate情報保存
- 10分間の有効期限
- CSRF攻撃対策

---

### GET /api/auth/line-state
**目的**: LINEログイン後のstate検証と情報取得

**使用場所**:
- `/app/[locale]/(reservation)/reservation/page.tsx` (LINE認証後)

**パラメータ**: `?stateId=uuid_xxxxx`

**レスポンス**:
```json
{
  "tenantId": "tenant_xxxxx",
  "orgId": "org_xxxxx"
}
```

**セキュリティ**:
- state IDの一致確認
- 使用後は自動削除（再利用不可）

---

### POST /api/auth/change-password
**目的**: ログイン中の顧客のパスワード変更

**使用場所**:
- `/app/[locale]/(dashboard)/dashboard/setting/change-password/page.tsx`

**リクエスト**:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

---

### POST /api/auth/check-customer
**目的**: 顧客の存在確認（メールアドレスベース）

**使用場所**: 内部API利用

---

## LINE連携 API

### POST /api/line/verify-token
**目的**: LINE IDトークンの検証と顧客情報の作成/更新

**使用場所**:
- `/app/[locale]/(reservation)/reservation/page.tsx` (LINE認証後)

**リクエスト**:
```json
{
  "idToken": "line_id_token_xxxxx",
  "tenantId": "tenant_xxxxx",
  "orgId": "org_xxxxx"
}
```

**処理内容**:
1. LINE APIでIDトークン検証
2. Supabaseで顧客情報を作成/更新
3. JWTセッション作成
4. HTTPOnlyクッキー設定

**レスポンス**:
```json
{
  "success": true,
  "message": "LINE authentication successful",
  "customerUid": "customer_uid_xxxxx"
}
```

---

### POST /api/line/flex-message
**目的**: LINE Flex Messageの送信（予約確認通知）

**使用場所**:
- `/app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx` (予約完了時)

**リクエスト**:
```json
{
  "lineId": "line_user_id",
  "messages": [...], // Flex Messageオブジェクト
  "accessToken": "line_channel_access_token"
}
```

---

### POST /api/line/message
**目的**: 通常のLINEメッセージ送信

**使用場所**: 各種通知送信時

---

## Stripe決済 API

### POST /api/stripe/checkout
**目的**: Stripe Checkoutセッションの作成（通常決済）

**リクエスト**:
```json
{
  "priceId": "price_xxxxx",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

---

### POST /api/stripe/connect/checkout
**目的**: Stripe Connect Checkoutセッションの作成（マーケットプレイス決済）

**使用場所**:
- `/app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx` (クレジットカード決済時)

**リクエスト**:
```json
{
  "stripeConnectId": "acct_xxxxx",
  "reservationId": "reservation_id",
  "orgId": "org_xxxxx",
  "customerEmail": "customer@example.com",
  "lineItems": [
    {
      "price_data": {
        "currency": "jpy",
        "product_data": { "name": "カット" },
        "unit_amount": 5000
      },
      "quantity": 1
    }
  ]
}
```

**処理内容**:
1. Stripe Checkoutセッション作成
2. 決済成功/キャンセルURLの設定
3. メタデータに予約情報を含める

---

### POST /api/stripe/connect
**目的**: Stripe Connectアカウントの作成

**使用場所**:
- `/app/[locale]/(dashboard)/dashboard/setting/page.tsx`

---

### GET /api/stripe/connect/status
**目的**: Stripe Connectアカウントのステータス確認

**使用場所**:
- `/components/common/OrgStripeConnectStatus.tsx`

---

### POST /api/stripe/connect/login
**目的**: Stripe Connectダッシュボードへのログインリンク生成

**使用場所**:
- Stripe管理画面へのアクセス時

---

## ストレージ API

### POST /api/storage/signed-url
**目的**: Google Cloud Storage署名付きURLの生成

**使用場所**:
- 画像アップロード時（メニュー、スタッフ、店舗画像など）

**リクエスト**:
```json
{
  "fileName": "image.jpg",
  "fileType": "image/jpeg",
  "directory": "menu_images"
}
```

**レスポンス**:
```json
{
  "signedUrl": "https://storage.googleapis.com/...",
  "publicUrl": "https://storage.googleapis.com/...",
  "fileName": "2024/01/15/uuid_image.jpg"
}
```

---

### POST /api/storage
**目的**: ファイルメタデータのConvex保存

**リクエスト**:
```json
{
  "fileName": "image.jpg",
  "fileUrl": "https://storage.googleapis.com/...",
  "fileType": "image/jpeg",
  "fileSize": 1024000
}
```

---

## Clerk管理 API

### POST /api/clerk/staff/invite
**目的**: スタッフ招待メールの送信

**使用場所**:
- `/app/[locale]/(dashboard)/dashboard/staff/add/page.tsx`

**リクエスト**:
```json
{
  "email": "staff@example.com",
  "firstName": "太郎",
  "lastName": "山田",
  "organizationId": "org_xxxxx"
}
```

---

### GET /api/clerk/staff/invitations/[invitation_id]
**目的**: 招待状の詳細取得

---

### POST /api/clerk/staff/invitations/resend
**目的**: 招待メールの再送信

**使用場所**:
- `/app/[locale]/(dashboard)/dashboard/staff/_components/InviteManagement.tsx`

---

### POST /api/clerk/staff/update-role
**目的**: スタッフの権限（ロール）更新

**使用場所**:
- スタッフ管理画面でのロール変更時

---

### DELETE /api/clerk/staff/delete
**目的**: スタッフアカウントの削除

**使用場所**:
- スタッフ管理画面での削除操作時

---

## メール送信 API

### POST /api/resend
**目的**: Resendを使用したメール送信（汎用）

**使用場所**:
- 予約確認メール
- パスワードリセット
- 各種通知メール

**リクエスト**:
```json
{
  "to": "recipient@example.com",
  "subject": "件名",
  "templateProps": {
    // テンプレート固有のプロパティ
  }
}
```

---

## AI生成 API

### POST /api/generate/menu-desc
**目的**: OpenAI APIを使用したメニュー説明文の自動生成

**使用場所**:
- `/app/[locale]/(dashboard)/dashboard/menu/add/MenuAddForm.tsx`

**リクエスト**:
```json
{
  "menuName": "カット",
  "duration": 60,
  "price": 5000
}
```

**レスポンス**:
```json
{
  "description": "AIが生成したメニュー説明文..."
}
```

---

## Webhook API

### POST /api/webhook/clerk
**目的**: Clerk Webhookイベントの受信・処理

**イベントタイプ**:
- `user.created`: 新規ユーザー作成
- `user.updated`: ユーザー情報更新
- `organizationMembership.created`: 組織メンバー追加
- `organizationMembership.updated`: メンバー権限更新
- `organizationMembership.deleted`: メンバー削除
- `organization.created`: 組織作成
- `organization.updated`: 組織更新
- `organizationInvitation.accepted`: 招待承認

**処理内容**:
- Convexデータベースとの同期
- スタッフ情報の作成/更新/削除

---

### POST /api/webhook/stripe/connect
**目的**: Stripe Connect Webhookイベントの受信・処理

**イベントタイプ**:
- `checkout.session.completed`: 決済完了
- `checkout.session.expired`: 決済期限切れ

**処理内容**:
- 予約ステータスの更新
- 決済ステータスの更新
- 顧客への通知送信
- ポイント付与キューの作成

---

### POST /api/webhook/stripe/subscription
**目的**: Stripeサブスクリプション関連のWebhook処理

**イベントタイプ**:
- `customer.subscription.created`: サブスクリプション作成
- `customer.subscription.updated`: サブスクリプション更新
- `customer.subscription.deleted`: サブスクリプション解約
- `invoice.payment_succeeded`: 支払い成功
- `invoice.payment_failed`: 支払い失敗

**処理内容**:
- テナントのサブスクリプション状態更新
- プラン変更の反映

---

## セキュリティ考慮事項

### 認証・認可
- すべての認証トークンはHTTPOnlyクッキーで管理
- JWTトークンには有効期限を設定
- CSRF対策としてstate parameterを使用（LINE OAuth）

### データ検証
- Zodスキーマによる入力検証
- SQLインジェクション対策（パラメータ化クエリ）
- XSS対策（適切なエスケープ処理）

### 通信の安全性
- 本番環境ではHTTPS必須
- Secure属性付きクッキー
- SameSite属性によるCSRF対策

### エラーハンドリング
- 詳細なエラー情報は開発環境のみ
- 本番環境では汎用的なエラーメッセージ
- すべてのエラーをSentryで監視

### レート制限
- 認証APIには将来的にレート制限実装予定
- Webhookは署名検証により不正リクエストを防止

---

**最終更新日**: 2025年1月
**バージョン**: 1.0.0