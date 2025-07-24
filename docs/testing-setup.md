# テスト環境セットアップガイド

このプロジェクトではVitest（ユニットテスト）とPlaywright（E2Eテスト）を使用しています。

## 🧪 テストツール構成

### Vitest (ユニットテスト)
- **設定ファイル**: `vitest.config.mts`
- **セットアップファイル**: `vitest.setup.ts`
- **環境**: jsdom
- **カバレッジ**: v8 provider

### Playwright (E2Eテスト)
- **設定ファイル**: `playwright.config.ts`
- **テストディレクトリ**: `e2e/`
- **ブラウザ**: Chromium, Firefox, Webkit
- **レポート**: HTML, JUnit, JSON

## 📁 ディレクトリ構造

```
├── vitest.config.mts          # Vitest設定
├── vitest.setup.ts            # Vitestセットアップ
├── playwright.config.ts       # Playwright設定
├── e2e/                       # E2Eテスト
│   ├── fixtures/              # テスト用フィクスチャ
│   ├── utils/                 # テスト用ユーティリティ
│   └── *.spec.ts             # E2Eテストファイル
└── **/*.test.{ts,tsx}        # ユニットテストファイル
```

## 🚀 テスト実行コマンド

### ユニットテスト (Vitest)
```bash
# 通常実行
pnpm test

# ウォッチモード
pnpm test:watch

# カバレッジ付き実行
pnpm test:coverage

# 一回だけ実行
pnpm test:unit
```

### E2Eテスト (Playwright)
```bash
# 全ブラウザでE2E実行
pnpm test:e2e

# UI モードで実行
pnpm test:e2e:ui

# ヘッドありモードで実行
pnpm test:e2e:headed

# 特定のブラウザのみ
npx playwright test --project=chromium
```

### 全テスト実行
```bash
pnpm test:all
```

## 🔧 設定のポイント

### Vitest設定 (vitest.config.mts)
- **Environment**: jsdom（React コンポーネントテスト用）
- **Pool**: forks（マルチテナント環境でのテスト分離）
- **カバレッジ除外**: API routes, generated files, config files
- **エイリアス**: `@/` でプロジェクトルートを参照

### Playwright設定 (playwright.config.ts)
- **Base URL**: `http://localhost:3000`
- **Webserver**: `pnpm dev` で自動起動
- **失敗時**: スクリーンショット・動画保存
- **並列実行**: フルパラレル有効

## 🎭 モック設定

### vitest.setup.ts で自動モック
- **Next.js**: navigation, image, router
- **next-intl**: 国際化
- **Clerk**: 認証
- **Convex**: データベース
- **localStorage**: ブラウザストレージ

### テスト内での個別モック例
```typescript
// 特定のAPIレスポンスをモック
vi.mock('@/services/api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'test' }))
}))
```

## 📊 カバレッジ

### 対象ファイル
- `app/**/*`
- `components/**/*`
- `lib/**/*`
- `hooks/**/*`

### 除外ファイル
- `convex/_generated/**`
- `app/api/**`
- `**/*.config.*`
- テストファイル自体

## ⚡ パフォーマンス最適化

### Vitest
- Fork プールでテスト分離
- 最大4並列実行
- V8 カバレッジで高速化

### Playwright
- ネットワークアイドルまで待機
- 失敗時のみスクリーンショット
- CI では1ワーカーに制限

## 🐛 トラブルシューティング

### よくある問題

1. **JSXパースエラー**
   - vitest.setup.ts で React.createElement() を使用

2. **モックが効かない**
   - vi.mock() がインポート前に実行されることを確認

3. **E2Eテストがタイムアウト**
   - playwright.config.ts の timeout 設定を調整

4. **Next.js コンポーネントテストエラー**
   - useRouter, usePathname 等のモックを確認

### デバッグ方法

```bash
# Vitest デバッグモード
pnpm test --reporter=verbose

# Playwright デバッグモード
npx playwright test --debug

# Playwright トレースビューア
npx playwright show-trace test-results/trace.zip
```

## 📝 テスト作成ガイドライン

### ユニットテスト
1. **ファイル命名**: `ComponentName.test.tsx`
2. **describe/it構造**: 日本語での説明
3. **モック**: 外部依存は必ずモック
4. **アサーション**: 具体的で意味のある検証

### E2Eテスト
1. **ファイル命名**: `feature-name.spec.ts`
2. **ページオブジェクト**: 再利用可能なセレクタ
3. **待機**: `waitFor`, `expect().toBeVisible()` 活用
4. **クリーンアップ**: テスト後の状態リセット

## 🎯 Next Steps

1. **CI/CD統合**: GitHub Actions でのテスト自動化
2. **ビジュアルテスト**: Playwright での視覚回帰テスト
3. **パフォーマンステスト**: Lighthouse CI 統合
4. **スナップショットテスト**: 設定変更の検出