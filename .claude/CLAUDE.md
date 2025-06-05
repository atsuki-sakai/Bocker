# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Bcker（ブッカー）は美容サロン向けの予約・顧客管理SaaSプラットフォームです。マルチテナント設計で、サロンオーナー・スタッフが効率的に予約管理や顧客管理を行えるよう設計されています。


## アーキテクチャ

### 技術スタック
- **フロントエンド**: Next.js 15.3.3 (App Router)、React 19、Tailwind CSS、shadcn/ui
- **バックエンド**: 
  - Convex 1.23.0: リアルタイムデータベース（アクティブなデータ）
  - Supabase: PostgreSQL（履歴データ保存・分析用）
- **認証**: Clerk（マルチ組織対応）
- **決済**: Stripe, Stripe Connect（マーケットプレイス型）
- **メッセージング**: LINE（LIFF対応）
- **ストレージ**: Google Cloud Storage
- **モニタリング**: Sentry（Vercel統合）

### アーキテクチャ上の重要な設計思想

1. **ハイブリッドデータベース設計**
   - Convex: 未来の予約や現在のオペレーションデータ
   - Supabase: 完了済みデータ、分析用データ、顧客マスターデータ
   - 毎日午前2時にバッチ処理でConvexからSupabaseへデータ移行（本番環境では現在コメントアウト中）

2. **マルチテナンシー**
   - 全てのConvexテーブルに`tenant_id`と`org_id`を含む
   - Clerkの組織機能を活用したアクセス制御

3. **サービスレイヤーアーキテクチャ**
   - Repositoryパターンによるデータアクセス層の抽象化
   - 外部サービス連携はServiceクラスで実装
   - Webhookは並列処理とべき等性を考慮した設計

## 開発コマンド

### 基本コマンド
```bash
# 開発環境起動（Next.js + Convex同時起動）
pnpm dev

# 開発前準備（Convexダッシュボードを開く）
pnpm predev

# ビルド
pnpm build

# リント
pnpm lint

# テスト（注：テストファイルは未実装）
pnpm test
pnpm test:watch
pnpm test:coverage

# Supabaseマイグレーション
pnpm migrate:supabase
```

### Convex関連コマンド
```bash
# 開発モード
npx convex dev

# 本番デプロイ
npx convex deploy

# 関数実行
npx convex run <function-name>
```

## 主要ディレクトリ構造と責務

### フロントエンド (Next.js App Router)
```
app/
├── (auth)/                    # 認証関連ページ群
│   ├── sign-in/              # サインインページ・フォーム
│   ├── sign-up/              # サインアップページ・フォーム
│   └── invite-accept/        # スタッフ招待受諾ページ
├── (dashboard)/              # 管理画面（認証後）
│   └── dashboard/
│       ├── page.tsx          # ダッシュボードホーム
│       ├── reservation/      # 予約管理（一覧・詳細・新規）
│       ├── customer/         # 顧客管理（一覧・詳細・編集・新規）
│       ├── menu/             # メニュー管理（一覧・詳細・編集・新規）
│       ├── staff/            # スタッフ管理（一覧・詳細・編集・招待）
│       ├── option/           # オプション管理
│       ├── coupon/           # クーポン管理
│       ├── point/            # ポイント管理
│       ├── setting/          # 組織設定（営業時間・決済・API設定）
│       ├── subscription/     # サブスクリプション管理
│       └── staff-schedule/   # スタッフスケジュール管理
├── (home)/                   # 公開ページ
│   ├── page.tsx              # ランディングページ
│   └── maintenance/          # メンテナンスページ
└── api/                      # APIエンドポイント
    ├── clerk/                # Clerk認証関連API
    ├── stripe/               # Stripe決済・Connect API
    ├── storage/              # ファイルアップロード署名付きURL
    ├── webhook/              # 各種Webhook受信
    └── generate/             # AI生成API（メニュー説明など）
```

### バックエンド (Convex)
```
convex/
├── _generated/               # 自動生成ファイル（編集不可）
├── schema.ts                 # 全テーブルスキーマ定義
├── auth.config.ts           # Clerk認証設定
├── constants.ts             # 共通定数
├── types.ts                 # 共通型定義
├── crons.ts                 # バッチ処理（データ移行）
├── migrations.ts            # データマイグレーション
├── utils/                   # ヘルパー関数
│   ├── auth.ts              # 認証ユーティリティ
│   ├── helpers.ts           # 共通ヘルパー
│   └── validations.ts       # バリデーション関数
└── [feature]/               # 機能別ディレクトリ
    ├── query.ts             # データ取得関数
    ├── mutation.ts          # データ更新関数
    └── action.ts            # 外部API連携・複雑処理

機能別ディレクトリ構成:
├── organization/            # 組織・設定管理
│   ├── config/              # 基本設定
│   ├── api_config/          # API設定
│   ├── reservation_config/   # 予約設定
│   ├── week_schedule/       # 営業時間
│   └── exception_schedule/  # 特別営業日
├── staff/                   # スタッフ管理
│   ├── auth/                # スタッフ認証
│   ├── config/              # スタッフ設定
│   ├── week_schedule/       # 勤務スケジュール
│   └── exception_schedule/  # 特別勤務日
├── reservation/             # 予約管理
├── menu/                    # メニュー管理
│   └── menu_exclusion_staff/ # スタッフ除外設定
├── option/                  # オプション管理
├── coupon/                  # クーポン管理
│   ├── config/              # クーポン設定
│   └── exclusion_menu/      # 除外メニュー
├── point/                   # ポイント管理
│   ├── exclusion_menu/      # 除外メニュー
│   └── queue/               # ポイント処理キュー
├── tenant/                  # テナント管理
│   ├── plan/                # プラン管理
│   ├── subscription/        # サブスクリプション
│   └── referral/            # 紹介システム
├── storage/                 # ファイル管理
└── webhook_events/          # Webhook処理結果
```

### サービス層 (外部API連携)
```
services/
├── gcp/                     # Google Cloud Platform
│   └── cloud_storage/       # GCS画像アップロード・管理
│       ├── GoogleStorageService.ts  # メインサービス
│       ├── constants.ts     # GCS設定定数
│       ├── helpers.ts       # ヘルパー関数
│       └── types.ts         # 型定義
├── line/                    # LINE Messaging API
│   ├── LineService.ts       # メインサービス
│   ├── repositories/        # LINE関連データアクセス
│   ├── message_template/    # Flex Messageテンプレート
│   ├── constants.ts         # LINE API設定
│   └── types.ts             # LINE関連型定義
├── stripe/                  # Stripe決済・マーケットプレイス
│   ├── StripeService.ts     # メインサービス
│   ├── repositories/        # Stripe関連データアクセス
│   │   ├── StripeConnectRepository.ts    # Connect機能
│   │   └── StripeSubscriptionRepository.ts # サブスクリプション
│   ├── constants.ts         # Stripe設定
│   └── types.ts             # Stripe関連型定義
├── supabase/                # PostgreSQL（履歴データ・分析）
│   ├── SupabaseService.ts   # メインサービス
│   ├── repositories/        # データアクセス層
│   │   ├── BaseRepository.ts          # 基底リポジトリ
│   │   ├── ReservationRepository.ts   # 予約履歴
│   │   ├── customer/        # 顧客マスター・ポイント
│   │   ├── carte/           # カルテ
│   │   ├── coupon/          # クーポン利用履歴
│   │   ├── point/           # ポイント取引履歴
│   │   └── tracking/        # アクセス解析
│   └── utils/               # Supabase関連ユーティリティ
└── webhook/                 # Webhook処理基盤
    ├── BaseProcessor.ts     # 基底プロセッサ
    ├── parallel.ts          # 並列処理ユーティリティ
    ├── metrics.ts           # 処理メトリクス
    ├── clerk/               # Clerk Webhook処理
    └── stripe/              # Stripe Webhook処理
```

### 共通ライブラリ
```
lib/
├── auth/                    # 認証関連
│   └── getOrganizationAuth.ts # 組織認証取得
├── errors/                  # エラーハンドリング
│   ├── BaseError.ts         # 基底エラークラス
│   ├── custom_errors.ts     # カスタムエラー定義
│   ├── constants.ts         # エラーコード定数
│   ├── helpers.ts           # エラーヘルパー
│   ├── types.ts             # エラー関連型
│   └── utils.ts             # エラーユーティリティ
├── zod/                     # バリデーション
│   └── helpers.ts           # Zodスキーマヘルパー
├── email_templates/         # メールテンプレート
├── constants.ts             # アプリ全体定数
├── helpers.ts               # 共通ヘルパー関数
├── schedules.ts             # スケジュール関連ロジック
├── utils.ts                 # 汎用ユーティリティ
└── types.ts                 # 共通型定義
```

### コンポーネント
```
components/
├── ui/                      # shadcn/ui基本コンポーネント
├── common/                  # 共通コンポーネント
│   ├── Sidebar.tsx          # サイドバーナビゲーション
│   ├── DashboardSection.tsx # ダッシュボードセクション
│   ├── OrganizationForm.tsx # 組織情報フォーム
│   ├── SingleImageDrop.tsx  # 単一画像アップロード
│   ├── MultiImageDrop.tsx   # 複数画像アップロード
│   ├── TagInput.tsx         # タグ入力
│   ├── CalendarMultiSelect.tsx # カレンダー複数選択
│   └── Loading.tsx          # ローディング表示
├── providers/               # React Context Provider
│   ├── ClerkProvider.tsx    # Clerk認証
│   ├── ConvexClientProvider.tsx # Convex接続
│   ├── ThemeProvider.tsx    # ダークモード
│   └── LiffProvider.tsx     # LINE LIFF
└── emails/                  # メールテンプレート
    └── ReservationConfirmationEmail.tsx
```

### フック・ユーティリティ
```
hooks/
├── useZodForm.ts            # Zod+React Hook Form統合
├── useTenantAndOrganization.ts # テナント・組織情報取得
├── useStablePaginatedQuery.tsx # 安定したページネーション
├── useTimelineData.ts       # タイムライン表示用データ
├── useErrorHandler.ts       # エラーハンドリング
└── use-toast.ts            # トースト通知

middleware.ts                # Clerk認証ミドルウェア
instrumentation.ts           # Sentry監視設定
```

### 責務分離の原則

1. **フロントエンド**: UIコンポーネント・ユーザー操作・状態管理
2. **Convex**: リアルタイムデータ・ビジネスロジック・認証
3. **Services**: 外部API連携・データ変換・エラーハンドリング
4. **Supabase**: 履歴データ・分析用データ・顧客マスター
5. **Components**: 再利用可能UI・フォーム・表示ロジック
6. **Lib**: 共通関数・型定義・定数・エラークラス

## 開発時の重要なパターン

### Convex関数の実装パターン
`.cursor/rules/convex_rules.mdc`に詳細なルールがあります。主なポイント：
- 新しい関数構文を使用（`export const functionName = query(...)` の形式）
- 厳格な型定義とバリデーション
- ファイルベースのAPI設計

### エラーハンドリング
```typescript
// lib/errors/custom_errors.ts のカスタムエラーを使用
throw new ValidationError('Invalid input', { field: 'email' });
```

### フォームバリデーション
- React Hook Form + Zod を使用
- `useZodForm` フックでフォーム初期化
- サーバーサイドとクライアントサイドで同じZodスキーマを使用

### 画像処理フロー
1. ブラウザ側で画像圧縮（browser-image-compression）
2. GCS署名付きURLを取得
3. 直接GCSにアップロード
4. Convexにメタデータ保存

### Webhook処理パターン
- BaseProcessorクラスを継承
- べき等性キーによる重複処理防止
- 並列処理による高速化

## 環境変数

主要な環境変数（.env.localに設定）：
- `NEXT_PUBLIC_CONVEX_URL`: Convexエンドポイント
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk公開キー
- `CLERK_SECRET_KEY`: Clerkシークレットキー
- `STRIPE_SECRET_KEY`: Stripeシークレットキー
- `STRIPE_WEBHOOK_SECRET`: Stripe Webhookシークレット
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseサービスロールキー

## 注意事項

1. **バッチ処理**: 本番環境でConvexのデータ肥大化を防ぐため、バッチ処理の有効化が必要
2. **テスト**: Jestは設定済みだが、テストファイルは未実装（技術的負債）
3. **型安全性**: TypeScript strictモード有効。型エラーは必ず解消すること
4. **マルチテナンシー**: 全てのクエリでtenant_idとorg_idの条件を忘れずに

## 最近の重要な変更

- 年齢(age)を生年月日(birthday)から自動算出するようリファクタリング
- プラン毎のメニュー、スタッフ、オプションの作成上限を追加
- ConvexからSupabaseへのデータマイグレーション機能追加
- Clerkスタッフ招待・メタデータ管理・削除機能の実装

## Convexガイドライン

### 関数ガイドライン

#### 新しい関数構文
- Convex関数には**常に**新しい関数構文を使用：
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
export const f = query({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
        // 関数の本体
    },
});
```

#### HTTPエンドポイント構文
- HTTPエンドポイントは`convex/http.ts`で定義し、`httpAction`デコレータが必要：
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
const http = httpRouter();
http.route({
    path: "/echo",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const body = await req.bytes();
        return new Response(body, { status: 200 });
    }),
});
```

#### バリデータ
- 配列バリデータの例：
```typescript
export default mutation({
    args: {
        simpleArray: v.array(v.union(v.string(), v.number())),
    },
    handler: async (ctx, args) => {
        //...
    },
});
```

- 判別共用体型の例：
```typescript
export default defineSchema({
    results: defineTable(
        v.union(
            v.object({
                kind: v.literal("error"),
                errorMessage: v.string(),
            }),
            v.object({
                kind: v.literal("success"),
                value: v.number(),
            }),
        ),
    )
});
```

- null値を返す際は常に`v.null()`バリデータを使用

#### 関数登録
- 内部関数：`internalQuery`、`internalMutation`、`internalAction`を使用
- パブリック関数：`query`、`mutation`、`action`を使用
- **重要**: すべてのConvex関数に引数と戻り値のバリデータを含める

#### 関数呼び出し
- クエリ呼び出し：`ctx.runQuery`
- ミューテーション呼び出し：`ctx.runMutation`
- アクション呼び出し：`ctx.runAction`
- 同じファイル内の関数を呼び出す場合は戻り値に型注釈を指定

#### 関数参照
- パブリック関数：`api.example.f`（`convex/example.ts`の`f`関数）
- 内部関数：`internal.example.g`（`convex/example.ts`の`g`関数）
- ネストしたディレクトリ：`api.messages.access.h`

### データベースガイドライン

#### スキーマ定義
- 常に`convex/schema.ts`でスキーマを定義
- インデックス名にはすべてのフィールドを含める（例：`by_field1_and_field2`）
- インデックスフィールドは定義順序でクエリする必要あり

#### クエリガイドライン
- `filter`は使用せず、インデックスを定義して`withIndex`を使用
- `.delete()`はサポートされない。`.collect()`してから個別に削除
- 単一ドキュメント取得には`.unique()`を使用
- デフォルトは昇順の`_creationTime`順

#### ミューテーションガイドライン
- 完全置換：`ctx.db.replace`
- 部分更新：`ctx.db.patch`

### TypeScriptガイドライン
- テーブルIDの型：`Id<'users'>`を使用
- 判別共用体の文字列リテラルには`as const`を使用
- 配列定義：`const array: Array<T> = [...];`
- レコード定義：`const record: Record<KeyType, ValueType> = {...};`

### その他のガイドライン

#### アクション
- Node.js組み込みモジュール使用時は先頭に`"use node";`を追加
- アクション内で`ctx.db`は使用不可

#### スケジューリング
- cronジョブ：`crons.interval`または`crons.cron`のみ使用
- `crons.hourly`、`crons.daily`、`crons.weekly`は使用しない

#### ファイルストレージ
- `ctx.storage.getUrl()`で署名付きURL取得
- メタデータは`_storage`システムテーブルをクエリ
- すべてのアイテムを`Blob`オブジェクトとして処理

#### ページネーション
```typescript
export const listWithExtraArg = query({
    args: { paginationOpts: paginationOptsValidator, author: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("author"), args.author))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});
```

## データ量・ストレージ設計（3,000店舗規模）

### スケール想定

3,000店舗での運用を前提とした年間データ増分とストレージコスト試算：

- **年間データ増分**: 24-38 TB（画像97%、テキスト3%）
- **GCSコスト**: 年額約45万円（Lifecycle管理適用時）
- **1店舗/日データ**: 22.1-35.4 MB（主にカルテ画像）

### ストレージアーキテクチャ

```
gs://bcker-prod-images/
├── yyyy/mm/dd/<uuid>.webp  # 原画像
└── yyyy/mm/dd/<uuid>_thumb.webp  # サムネイル
```

**Lifecycle管理**:
- 30日後: Standard → Coldline（$0.023 → $0.006/GB）
- 365日後: Coldline → Archive（$0.006 → $0.0025/GB）

### 実装時の注意点

1. **画像アップロード処理**:
   ```typescript
   // services/gcp/cloud_storage/GoogleStorageService.ts
   // WebP変換は品質80%で実装済み
   // サムネイル生成はCloud Functions側で非同期処理
   ```

2. **パフォーマンス考慮**:
   - Cloud CDN有効化（30日キャッシュ）
   - 画像読み込みはサムネイル優先
   - Retrieval Fee軽減のため頻繁なアクセスは避ける

3. **監視・アラート**:
   - Cloud Billing Budget設定（前月比20%超過でSlack通知）
   - 月次でBigQueryへの使用量エクスポート

### データ生成パターン

| データ種別 | 生成頻度 | サイズ | 保存期間 |
|-----------|---------|--------|---------|
| カルテ画像 | 4枚/予約 | 175KB/枚 | 永続 |
| ヘア参考画像 | 1枚/予約 | 175KB | 永続 |
| スタッフ画像 | 1枚/スタッフ | 170KB | 永続 |
| メニュー画像 | 3枚/メニュー | 175KB/枚 | 永続 |
| ログデータ | 継続的 | 可変 | 30日（ロールアップ後削除） |