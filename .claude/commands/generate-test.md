

以下のファイルのテストコードを実装してください。
# 


テストの実装のルールは以下を参照して実装を完了してください。完了時にはpnpm testでテストが成功しているか確認してください。
docs/vitest-playwrite-test.md
docs/test-rule.md

### 🎯 テストの目的

テスト対象の親コンポーネントが、実際の子コンポーネントたちと正しく連携し、全体として期待される動作（レンダリング、ユーザーインタラクション、状態管理）をすることを検証する。

🎯 プロジェクト固有の要求事項

📍 絶対禁止事項
- 意味のないモックデータでの検証は厳格に禁止
- 実際のビジネスロジックと関係のないダミーデータでのテストは作成しない
- 検証が形式的で実用性のないテストケースは除外する
- モックの戻り値は実際のAPIレスポンス形式に準拠すること

🧪 必須テスト品質基準

// 以下の条件をすべて満たすテストを作成
const qualityGate = {
unitTests: 'PASS',           // 全ユニットテスト成功
coverage: '>= 80%',          // カバレッジ80%以上  
linting: 'PASS',             // ESLint・Prettier通過
typeCheck: 'PASS',           // TypeScript型チェック通過
realWorldScenarios: 'MUST',  // 実際のユースケースベース
meaningfulAssertions: 'MUST' // 意味のある検証のみ
}

🏗️ 共通モック設定（vitest.setup.tsベース）

既存の共通モックを活用し、重複を避けること：

// ✅ 利用可能な共通モック
- Next.js navigation (useRouter, usePathname, etc.)
- next-intl (useTranslations, getTranslations)
- Clerk authentication
- Convex
- Framer Motion
- localStorage, IntersectionObserver, etc.

📝 必須テストケース構造

describe('API Route: /api/generate/menu-desc', () => {
// セットアップ
beforeEach(() => {
    vi.clearAllMocks()
    // 環境変数モック
    vi.stubEnv('GCP_AI_STUDIO_API_KEY', 'test-api-key')
})

// 基本機能テスト
describe('基本機能', () => {
    it('正常なリクエストで施術メニュー説明文を生成する', async () => {
    // 実際の美容サロンのメニューデータを使用
    // 検証は実際のレスポンス形式に基づく
    })
})

// バリデーションテスト  
describe('リクエストバリデーション', () => {
    it('必須項目が不足している場合400エラーを返す', async () => {
    // 実際のバリデーションエラーケース
    })
})

// エラーハンドリングテスト
describe('エラーハンドリング', () => {
    it('API キー未設定時に500エラーを返す', async () => {
    // 実際の環境設定エラーケース
    })

    it('Gemini AI APIエラー時に適切なエラーレスポンスを返す', async () => {
    // 実際のAPI障害シナリオ
    })
})

// セキュリティテスト
describe('セキュリティ', () => {
    it('AI出力セキュリティ検証でNGコンテンツを拒否する', async () => {
    // 実際のセキュリティポリシー違反ケース
    })
})

// レート制限テスト
describe('レート制限', () => {
    it('15分間に10回のリクエスト制限が機能する', async () => {
    // 実際のレート制限シナリオ
    })
})

// CORS対応テスト
describe('CORS対応', () => {
    it('OPTIONSメソッドで適切なCORSヘッダーを返す', async () => {
    // 実際のプリフライトリクエスト
    })
})
})

# convex-test ライブラリの詳細解説

`convex-test` ライブラリは、Convex バックエンドのモック実装を JavaScript で提供するテスト用ライブラリです。これにより、Convex 関数のロジックを高速に自動テストすることが可能になります。

### 3. Vitest の設定
`vitest.convex.config.mts` ファイルを作成して、Convex ランタイムに近いテスト環境を設定:

```javascript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

### 4. テストファイルの作成
`convex` フォルダ内に `.test.ts` で終わるファイルを作成:

```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("sending messages", async () => {
  const t = convexTest(schema);
  await t.mutation(api.messages.send, { body: "Hi!", author: "Sarah" });
  await t.mutation(api.messages.send, { body: "Hey!", author: "Tom" });
  const messages = await t.query(api.messages.list);
  expect(messages).toMatchObject([
    { body: "Hi!", author: "Sarah" },
    { body: "Hey!", author: "Tom" }
  ]);
});
```

### 5. テストの実行
```bash
npm run test
```

## テストの主要機能

### convexTest 関数
各テストの開始時に呼び出す関数で、Convex 関数をテストするためのオブジェクトを返します:

```typescript
const t = convexTest(schema); // スキーマがある場合
// または
const t = convexTest(); // スキーマがない場合
```

### 関数の呼び出し
- **クエリ**: `t.query(api.名前, 引数)`
- **ミューテーション**: `t.mutation(api.名前, 引数)`
- **アクション**: `t.action(api.名前, 引数)`

```typescript
const x = await t.query(api.myFunctions.myQuery, { a: 1, b: 2 });
const z = await t.mutation(api.myFunctions.mutateSomething, { a: 1, b: 2 });
const u = await t.action(api.myFunctions.doSomething, { a: 1, b: 2 });
```

### データ操作 (t.run)
データベースやストレージを直接操作する場合:

```typescript
const firstTask = await t.run(async (ctx) => {
  await ctx.db.insert("tasks", { text: "Eat breakfast" });
  return await ctx.db.query("tasks").first();
});
expect(firstTask).toMatchObject({ text: "Eat breakfast" });
```

### HTTP アクションのテスト (t.fetch)
HTTP ルーターで登録されたアクションをテスト:

```typescript
const response = await t.fetch("/some/path", { method: "POST" });
```

### スケジュールされた関数のテスト
Vitest のフェイクタイマーと組み合わせてテスト:

```typescript
vi.useFakeTimers();
const t = convexTest(schema);
const scheduledFunctionId = await t.mutation(api.scheduler.mutationSchedulingAction, { delayMs: 10000 });
vi.advanceTimersByTime(6000); // 時間を進める
await t.finishInProgressScheduledFunctions(); // スケジュールされた関数の完了を待つ
vi.useRealTimers();
```

### 認証のテスト (t.withIdentity)
認証が必要な関数をテストする場合:

```typescript
const asSarah = t.withIdentity({ name: "Sarah" });
await asSarah.mutation(api.tasks.create, { text: "Add tests" });
const sarahsTasks = await asSarah.query(api.tasks.list);
```

### fetch のモック化
外部 API 呼び出しをモック化:

```typescript
vi.stubGlobal(
  "fetch",
  vi.fn(async () => ({ text: async () => "I am the overlord" }) as Response)
);
```

### エラーのアサーション
関数がエラーをスローすることを確認:

```typescript
expect(async () => {
  await t.mutation(api.messages.send, { body: "", author: "James" });
}).rejects.toThrowError("Empty message body is not allowed");
```

## その他の機能

### テストカバレッジの計測
```bash
npm run test:coverage
```

### テストのデバッグ
```bash
npm run test:debug
```

### 複数のテスト環境
React フロントエンドと Convex 関数を同時にテストする場合:

```javascript
export default defineConfig({
  test: {
    environmentMatchGlobs: [
      ["convex/**", "edge-runtime"],
      ["**", "jsdom"],
    ],
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

### カスタム convex フォルダ
`convex.json` で異なる場所に設定している場合:

```typescript
/// <reference types="vite/client" />
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");

// テストファイルで
import { modules } from "./test.setup";
const t = convexTest(schema, modules);
```

## 制限事項
`convex-test` はモック実装であるため、実際の Convex バックエンドと完全に同じ動作をするわけではありません:

- エラーメッセージの内容が異なる可能性
- サイズや時間の制限が適用されない
- ドキュメントIDのフォーマットが異なる
- ランタイムの組み込み関数が若干異なる
- テキスト検索やベクトル検索が簡易的な実装
- cron ジョブのサポートなし

🎨 実装ガイドライン

1. テストデータ: 実際の美容サロンメニュー（カット、カラー、パーマ等）を使用
2. モック戦略: 外部依存（Gemini AI）のみモック、内部ロジックは実際実行
3. エラーシナリオ: 本番環境で発生しうる実際のエラーケース
4. 型安全性: 厳密なTypeScript型チェック
5. テスト名: 日本語で分かりやすく、具体的な動作を記述

🚨 テスト実装上の注意点

- withAuth, withRateLimit ミドルウェアの適切なモック
- Google GenerativeAI のレスポンス形式に準拠したモック
- 環境変数 GCP_AI_STUDIO_API_KEY の取り扱い
- menuDescriptionRequestSchema バリデーション
- validateAIOutput セキュリティ検証
- Next.js App Router APIルートの適切なテスト手法

📊 期待するテスト品質

- カバレッジ: 80%以上
- 実行時間: 500ms以内
- 可読性: 日本語テスト名、明確な Given-When-Then 構造
- 保守性: モック重複なし、共通設定活用
- 実用性: 実際のバグ発見に寄与する検証内容

📕 Convexのテストドキュメント
- https://docs.convex.dev/testing/convex-test