## 概要
**next-intlを使用してダッシュボードのナビゲーション、サイドバー、ホーム画面を日本語・英語の多言語対応にする**

## 詳細な説明

### 現在の状況
- next-intl基盤実装は完了（Phase 1）
- 認証画面（サインイン・サインアップ）のみ多言語化済み
- ダッシュボード内のテキストはすべて日本語でハードコード
- `lib/constants.ts`にNAV_ITEMS配列として約50個のナビゲーション項目が静的定義
- 言語切り替えコンポーネントは作成済みだが、ダッシュボード画面では未使用

### 期待される結果
- ユーザーが言語セレクターで言語を切り替えた際、ダッシュボード全体が選択した言語で表示される
- URLパスに言語プレフィックスが含まれる（例: `/ja/dashboard`、`/en/dashboard`）
- すべてのナビゲーション項目、ボタン、ラベルが翻訳される
- 言語切り替え後もユーザーの現在位置（ページ）が維持される

## 実装手順

1. **翻訳ファイルの拡張**
   - `languages/ja.json`に`navigation`と`dashboard`セクションを追加
   - `languages/en.json`に対応する英語翻訳を追加

2. **ナビゲーション定数の動的化**
   - `lib/constants.ts`のNAV_ITEMSを関数化
   - 翻訳関数を引数として受け取る形に変更

3. **Sidebarコンポーネントの更新**
   - `useTranslations`フックを追加
   - リンクにロケールプレフィックスを追加
   - 言語切り替えコンポーネントを配置

4. **ダッシュボードページの更新**
   - ハードコードされたテキストを翻訳キーに置換

## 環境情報
- **OS**: macOS/Windows/Linux
- **ブラウザ/バージョン**: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
- **アプリケーションバージョン**: Next.js 15.3.3, next-intl 4.1.0
- **その他関連する環境設定**: React 19.0.0, TypeScript 5.x

## 追加情報
- **優先度**: High
- **影響範囲**: 
  - すべてのダッシュボード画面のナビゲーション
  - ダッシュボードホーム画面
  - 管理者・スタッフ全ユーザー
- **回避策**: なし（基本機能のため）
- **関連Issue**: Phase 1実装完了

## 提案される解決策

### 技術的アプローチ
1. **翻訳キー構造**:
   ```
   navigation.dashboard
   navigation.reservations.list
   navigation.reservations.new
   dashboard.home.title
   dashboard.home.stats.revenue
   ```

2. **動的ルーティング対応**:
   ```typescript
   const href = `/${locale}${originalPath}`
   ```

3. **共通フック作成**:
   ```typescript
   export function useLocalizedNavigation() {
     const t = useTranslations()
     const locale = useLocale()
     return { t, locale, getHref: (path: string) => `/${locale}${path}` }
   }
   ```

## チェックリスト

- [ ] 同様のissueが既に報告されていないか検索した
- [ ] タイトルが内容を適切に表現している
- [ ] 環境情報が完全
- [ ] 適切なラベルを付与した（`enhancement`, `i18n`, `phase-2`）