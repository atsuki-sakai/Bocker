# Bcker開発ガイド（Claude用）

このガイドはClaudeによる効率的なコード開発・保守を支援するための参考資料です。

## プロジェクト概要

Bcker（ブッカー）は美容サロン向けの予約・顧客管理SaaSプラットフォームです。ユーザー（サロンオーナー・スタッフ）が効率的に予約管理や顧客管理を行えるよう設計されています。

## アーキテクチャ

- **フロントエンド**: Next.js 15.1.3、React 19.0.0、Tailwind CSS、shadcn/ui
- **バックエンド**: 
  - Convex: リアルタイムデータベース（アクティブなデータ）
  - Supabase: 履歴データ保存・分析用
- **認証**: Clerk
- **決済**: Stripe, Stripe Connect
- **メッセージング**: LINE
- **ストレージ**: Google Cloud Storage
- **モニタリング**: Sentry

## 主要ディレクトリ構造

```
app/                 # Next.js アプリケーション
├── (auth)/          # 認証関連ページ
├── (dashboard)/     # 管理画面
└── (home)/          # 公開ページ

components/          # 共通コンポーネント
├── common/          # 共通UIコンポーネント
├── emails/          # メールテンプレート
├── providers/       # プロバイダー
└── ui/              # shadcn/ui コンポーネント

convex/              # Convexバックエンド関数
├── coupon/          # クーポン機能
├── menu/            # メニュー管理
├── organization/    # サロン組織管理
├── point/           # ポイント機能
├── reservation/     # 予約機能
├── staff/           # スタッフ管理
└── tenant/          # テナント管理

services/            # 外部サービス連携
├── gcp/             # Google Cloud Platform
├── line/            # LINE連携
├── stripe/          # Stripe連携
├── supabase/        # Supabase連携
└── webhook/         # Webhook処理
```

## データモデル

### 主要エンティティ

- **Tenant**: SaaSのテナント（サロン事業者）
- **Organization**: サロン組織
- **Staff**: サロンのスタッフ
- **Customer**: サロンの顧客
- **Menu**: 提供サービス
- **Option**: メニューのオプション
- **Reservation**: 予約
- **Coupon**: クーポン
- **Point**: ポイント

## 開発ワークフロー

### コーディング規約

- TypeScriptの厳格な型チェックを推奨
- コンポーネントはatomicデザインの考え方を参考に分割
- サーバーサイド処理はConvex関数として実装
- フォームはReact Hook FormとZodによるバリデーション
- データフェッチはConvexのuseQueryフックを使用

### テスト手順

```bash
# 単体テスト実行
pnpm test

# 開発サーバー起動
pnpm dev
```

## 主要機能開発ポイント

### 予約システム

- ReservationListコンポーネント: 予約一覧表示
- ReservationFormコンポーネント: 予約作成フォーム
- convex/reservation/: 予約関連バックエンド処理

### 顧客管理

- CustomerListコンポーネント: 顧客一覧表示
- CustomerAddForm/CustomerEditForm: 顧客情報編集
- convex/customer/: 顧客関連バックエンド処理

### ポイント・クーポン機能

- PointTabsコンポーネント: ポイント管理タブ
- CouponListコンポーネント: クーポン一覧
- convex/point/、convex/coupon/: バックエンド処理

## デプロイ・保守

### デプロイ手順

1. ビルド実行: `pnpm build`
2. Convexデプロイ: `npx convex deploy`

### 主要コマンド

- `pnpm dev`: 開発環境起動
- `pnpm lint`: リンター実行
- `pnpm test`: テスト実行
- `pnpm migrate:supabase`: Supabaseマイグレーション実行

## トラブルシューティング

### よくあるエラーと対処法

- Convex接続エラー: 環境変数の確認とConvexダッシュボードの確認
- 認証エラー: Clerk設定の確認
- 型エラー: TypeScript型定義の確認と修正

## 最新のリファクタリング・修正

最近行われた主な修正・リファクタリング:
- 年齢(age)を生年月日(birthday)から自動算出するようリファクタリング
- プラン毎のメニュー、スタッフ、オプションの作成上限を追加
- ConvexからSupabaseへのデータマイグレーション機能追加

## 今後の開発計画

- 多言語対応
- モバイルアプリ対応強化
- AIによる予約最適化機能
- 在庫管理機能の追加