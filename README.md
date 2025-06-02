# Bcker / ブッカー - 美容サロン向け予約・顧客管理SaaS

## 概要

Bcker（ブッカー）は美容院、ネイルサロン、エステサロンなどの予約管理と顧客管理のためのSaaSプラットフォームです。サロンオーナーとスタッフの業務効率化とお客様体験の向上を目指しています。

## 主要機能

### 予約管理
- カレンダー形式の直感的なインターフェース
- タイムライン表示によるスタッフスケジュール管理
- 予約の確認・キャンセル・変更の一元管理
- 複数スタッフの予約スケジュール調整
- カスタム営業時間と例外日設定

### 顧客管理
- 顧客情報のデータベース化
- 予約履歴、購入履歴の管理
- 顧客ごとの詳細プロフィール管理
- 顧客行動の分析機能
- カスタマイズ可能な顧客タグ機能

### スタッフ管理
- スタッフアカウント作成と権限設定
- スタッフごとの予約・シフト管理
- スタッフのパフォーマンス分析
- スタッフごとの特殊スキル設定

### ポイント・クーポン機能
- カスタマイズ可能なポイント付与システム
- クーポン管理と適用
- メニュー別ポイント設定

### 料金・決済管理
- メニュー管理と価格設定
- 予約と紐づけた売上管理
- Stripe決済連携
- 売上レポートとデータ分析

## 技術スタック

### フロントエンド
- Next.js 15.1.3
- React 19.0.0
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Framer Motion

### バックエンド
- Convex（リアルタイムデータベース）
- Supabase（履歴データ保存・分析）
- Clerk（認証システム）

### インテグレーション
- Stripe / Stripe Connect（決済処理）
- LINE（メッセージング）
- Google Cloud Storage（画像保存）
- Sentry（エラー監視）

## プロジェクト構造

```
app/                 # Next.js アプリケーション
├── (auth)/          # 認証関連
├── (dashboard)/     # 管理画面
└── (home)/          # ホーム画面

components/          # 共通コンポーネント
├── common/          # 共通UIコンポーネント
├── emails/          # メールテンプレート
├── providers/       # プロバイダー
└── ui/              # UI基本コンポーネント

convex/              # Convex関数（リアルタイムデータ）
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

supabase/            # Supabaseマイグレーション
```

## 開発環境のセットアップ

### 前提条件
- Node.js 20.x以上
- pnpm 8.x以上
- Convex アカウント
- Clerk アカウント
- Supabase プロジェクト
- Stripe アカウント

### インストール手順

1. リポジトリをクローン
```bash
git clone https://github.com/your-org/bcker-saas.git
cd bcker-saas
```

2. 依存関係をインストール
```bash
pnpm install
```

3. 環境変数を設定
`.env.local`ファイルを作成し、必要な環境変数を設定

4. 開発サーバーを起動
```bash
pnpm dev
```

## スクリプト

- `pnpm dev` - 開発サーバーを起動（フロントエンドとバックエンド）
- `pnpm build` - プロダクション用ビルド
- `pnpm lint` - リンター実行
- `pnpm test` - テスト実行
- `pnpm migrate:supabase` - SupabaseへのデータマイグレーションPマイグレーション実行

## データマイグレーション

ConvexからSupabaseへのデータマイグレーションに関する詳細は[MIGRATION.md](./MIGRATION.md)を参照してください。

## 詳細なドキュメント

詳細な製品情報とビジネスモデルについては[PRODUCT.md](./PRODUCT.md)を参照してください。