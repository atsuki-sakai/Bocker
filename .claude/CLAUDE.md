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

```
app/                 # Next.js App Router
├── (auth)/          # 認証関連ページ（サインイン、サインアップ、パスワードリセット）
├── (dashboard)/     # 管理画面（予約、顧客、メニュー、スタッフ、設定など）
└── api/             # APIルート（Webhook、Stripe、Clerk連携）

convex/              # Convexバックエンド関数
├── _generated/      # 自動生成ファイル（編集不可）
├── schema.ts        # データベーススキーマ定義
├── auth.config.ts   # Convex Auth設定
└── [feature]/       # 機能別ディレクトリ（query.ts, mutation.ts, action.ts）

services/            # 外部サービス連携層
├── gcp/             # Google Cloud Storage連携
├── line/            # LINE API連携（Flex Message対応）
├── stripe/          # Stripe連携（Connect、Subscription）
├── supabase/        # Supabaseリポジトリ層
└── webhook/         # Webhook処理（並列処理、べき等性対応）

lib/                 # 共通ライブラリ
├── errors/          # カスタムエラークラス（BaseError継承）
├── zod/             # Zodスキーマヘルパー
└── types/           # 共通型定義
```

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

### チャットアプリ実装例

完全な実装例は`.cursor/rules/convex_rules.mdc`を参照してください。主要な設計パターン：

1. **スキーマ設計**：users、channels、messagesテーブル
2. **パブリックAPI**：createUser、createChannel、sendMessage、listMessages
3. **内部関数**：generateResponse、loadContext、writeAgentResponse
4. **AI統合**：OpenAI GPT-4を使用した自動応答
5. **非同期処理**：`ctx.scheduler.runAfter`でAI応答をスケジュール

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