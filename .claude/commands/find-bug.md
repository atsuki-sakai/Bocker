Next.js 15.3.3 (App Router) + TypeScript + Convex/Supabaseのハイブリッド構成で構築された美容サロンSaaS予約管理システムのコードを分析し、ベストプラクティスへの準拠状況とバグの検出を行ってください。まず調査・修正プランを提示し、合意を得てから実装に移ります。

【分析対象ページ/機能】
#

【調査手順】
1. 指定されたページ/機能の関連ファイルを特定
2. インポートを辿って依存関係を把握
3. Convex/Supabase関数の呼び出しチェーンを追跡
4. 各技術のベストプラクティスとの差異を検出
5. 潜在的なバグやセキュリティリスクを特定

【ベストプラクティス準拠チェック項目】

## 1. Next.js 15.3.3 App Router
- [ ] Server/Client Componentsの適切な使い分け
- [ ] 'use client'ディレクティブの最小化
- [ ] Metadata APIの正しい使用
- [ ] Loading/Error Boundaryの実装
- [ ] Parallel/Sequential Routesの活用
- [ ] Route Handlersでのストリーミング対応
- [ ] PPR（Partial Prerendering）の活用機会
- [ ] Server Actionsの適切な実装

## 2. Convexベストプラクティス
- [ ] Query/Mutation/Actionの使い分け
- [ ] インデックス設計（tenant_id, org_id優先）
- [ ] 論理削除（is_archive）の一貫した実装
- [ ] トランザクション境界の適切な設定
- [ ] ページネーション実装（Cursor-based推奨）
- [ ] リアルタイム更新の効率的な実装
- [ ] エラーハンドリング（ConvexError使用）
- [ ] 型安全性（Validatorの活用）

## 3. Supabaseベストプラクティス
- [ ] RLSポリシーの適切な設定
- [ ] Connection Poolingの活用
- [ ] Prepared Statementsの使用
- [ ] インデックス最適化（B-tree, GIN）
- [ ] Generated Columnsの活用
- [ ] Edge Functionsとの連携
- [ ] リトライロジックの実装
- [ ] バッチ処理の効率化

## 4. TypeScript/React
- [ ] 型定義の完全性（any/unknown回避）
- [ ] Zodスキーマの一貫した使用
- [ ] React 19の新機能活用
- [ ] メモ化戦略（useMemo/useCallback）
- [ ] Suspense境界の適切な配置
- [ ] エラー境界の実装
- [ ] カスタムフックの抽象化

## 5. セキュリティ/認証
- [ ] Clerk認証の適切な実装
- [ ] マルチテナント分離の確認
- [ ] APIルートの認証チェック
- [ ] 入力値検証（サニタイゼーション）
- [ ] CORS設定の適切性
- [ ] 環境変数の安全な管理

【バグ検出重点項目】

## 1. データ整合性
- [ ] レースコンディション（予約重複など）
- [ ] トランザクション失敗時のロールバック
- [ ] Convex↔Supabase間のデータ不整合
- [ ] 論理削除フラグの不整合
- [ ] タイムゾーン処理の問題

## 2. パフォーマンス問題
- [ ] N+1クエリ問題
- [ ] 不要なリレンダリング
- [ ] メモリリーク（EventListener等）
- [ ] 無限ループ/再帰
- [ ] 大量データ処理時のブロッキング

## 3. エラーハンドリング
- [ ] Unhandled Promise Rejection
- [ ] Null/Undefined参照エラー
- [ ] 型アサーションの誤用
- [ ] エラー境界の欠如
- [ ] タイムアウト処理の不備

## 4. UX/アクセシビリティ
- [ ] ローディング状態の欠如
- [ ] エラーメッセージの不適切な表示
- [ ] フォーム検証の不備
- [ ] キーボードナビゲーション問題
- [ ] レスポンシブ対応の不備

【分析結果フォーマット】

## 調査サマリー
- 調査対象ファイル一覧
- 検出された問題数（Critical/High/Medium/Low）
- ベストプラクティス準拠率

## 検出された問題

### 問題1: [問題タイトル]
- **カテゴリ**: バグ/ベストプラクティス違反
- **深刻度**: Critical/High/Medium/Low
- **影響範囲**: 
- **詳細説明**: 

```typescript
// 現在のコード（問題箇所）
[問題のあるコード]