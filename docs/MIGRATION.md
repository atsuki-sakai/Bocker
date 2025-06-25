# ConvexからSupabaseへのデータ移行ガイド

このドキュメントでは、Convexで管理している過去の予約データをSupabaseへ移行するシステムについて説明します。

## 概要

- statusが"confirmed"の予約のみ（24時間以上経過）を自動移行
- 毎日午前2時（JST）に自動実行
- バッチ処理による効率的な移行（500件/バッチ）
- エラーハンドリングと移行ログの記録

## システム構成

### Convex側
- `convex/migration/query.ts`: 移行対象データの取得
- `convex/migration/mutation.ts`: 移行済みデータの削除
- `convex/migration/action.ts`: メイン移行処理
- `convex/crons.ts`: 自動実行スケジュール設定

### Supabase側
- `services/supabase/repositories/migration/`: 移行用リポジトリ
- `supabase/migrations/`: テーブル定義

## 移行対象データ

### 予約データ（reservation）
- ステータスが`completed`で終了時刻から24時間以上経過
- ステータスが`cancelled`で7日以上経過

### 予約詳細データ（reservation_detail）
- 対応する予約データと同時に移行

## 使用方法

### 環境変数の設定

`.env.local`に以下を設定：
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 手動実行（テスト用）

```bash
# Convex CLIから直接実行
npx convex run migration:action:runDailyMigration
```

### 自動実行の確認

```bash
# Cronジョブの設定を確認
cat convex/crons.ts
```

### 移行ログの確認

Convexダッシュボードで`webhook_events`テーブルを確認：
- `event_type`: `data_migration_reservation`
- `processing_result`: `success` または `error`
- `error_message`: エラー時のメッセージ

## 移行プロセス

1. **データ抽出**
   - 移行対象の予約を500件ずつ取得
   - カーソルベースのページング

2. **データ変換**
   - Convex形式からSupabase形式へ変換
   - タイムスタンプの変換（Unix → ISO8601）

3. **バルクアップサート**
   - `_convex_id`をキーに重複を防止
   - トランザクション単位での処理

4. **削除処理**
   - 成功した分のみConvexから削除
   - 失敗時は次回リトライ

## パフォーマンス最適化

- **バッチサイズ**: 500レコード/バッチ
- **待機時間**: 各バッチ間で100ms待機
- **並列処理**: なし（データ整合性優先）

## エラーハンドリング

- 部分的な失敗も許容（成功分のみ処理）
- エラーログを`webhook_events`に記録
- 次回実行時に未移行分を再処理

## 監視項目

- 処理時間（通常3時間以内）
- エラー率（0.1%未満が目標）
- 移行済みレコード数

## トラブルシューティング

### 移行が失敗する場合
1. 環境変数が正しく設定されているか確認
2. Supabaseのテーブルスキーマが正しいか確認
3. ネットワーク接続を確認

### データ不整合が発生した場合
1. `_convex_id`で重複チェック
2. Supabaseの該当レコードを削除して再実行

### パフォーマンスが遅い場合
1. バッチサイズを調整（100-1000の範囲）
2. 実行時間を変更（負荷の少ない時間帯）

## 今後の拡張予定

- [ ] リアルタイム同期機能
- [ ] 移行対象テーブルの追加
- [ ] 移行統計ダッシュボード
- [ ] 自動リトライ機能の強化