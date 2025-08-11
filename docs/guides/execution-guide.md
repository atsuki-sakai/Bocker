# Convex to Supabase 移行実行ガイド

## 📋 概要
このドキュメントは、ConvexからSupabaseへの予約データ移行を実際に実行する際の手順を記載します。

## 🚀 実行手順

### 1. 開発環境での動作確認

#### 1.1 環境変数の確認
```bash
# .env.localファイルに以下が設定されていることを確認
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

#### 1.2 Convexダッシュボードから手動実行
1. [Convexダッシュボード](https://dashboard.convex.dev)にアクセス
2. プロジェクトを選択
3. Functions → internal → migration → action → migrateReservations を選択
4. "Run Function"をクリックして実行

#### 1.3 実行結果の確認
```sql
-- Supabaseで移行されたデータを確認
SELECT COUNT(*) FROM reservation WHERE _convex_id IS NOT NULL;
SELECT COUNT(*) FROM reservation_detail WHERE _convex_id IS NOT NULL;

-- 最新の移行データを確認
SELECT * FROM reservation 
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. ステージング環境での実行

#### 2.1 少量データでのテスト
```typescript
// Convexダッシュボードから実行時にlimitを指定
{
  "limit": 10  // 10件のみ処理
}
```

#### 2.2 監視項目
- 処理時間
- メモリ使用量
- エラーログ
- データ整合性

### 3. 本番環境での段階的実行

#### 3.1 第1段階: 手動実行（100件）
```bash
# Convexダッシュボードから実行
# 実行前に必ずバックアップを取得
```

#### 3.2 第2段階: 1日分のデータ
```bash
# 特定の日付範囲のデータのみ処理
# 実行結果を詳細に監視
```

#### 3.3 第3段階: Cronジョブ有効化
```typescript
// convex/crons.ts のコメントアウトを解除
crons.daily(
  "migrate-reservations",
  { hourUTC: 17, minuteUTC: 0 }, // 日本時間 02:00
  internal.migration.action.migrateReservations
);
```

## 📊 実行後の確認

### データ整合性チェック
```sql
-- Convex IDの重複チェック
SELECT _convex_id, COUNT(*) 
FROM reservation 
GROUP BY _convex_id 
HAVING COUNT(*) > 1;

-- 関連データの整合性確認
SELECT r.*, rd.*
FROM reservation r
LEFT JOIN reservation_detail rd ON r._convex_id = rd._convex_reservation_id
WHERE r._convex_id IS NOT NULL
LIMIT 10;
```

### パフォーマンス確認
```sql
-- インデックスの使用状況
EXPLAIN ANALYZE
SELECT * FROM reservation 
WHERE tenant_id = 'xxx' 
  AND org_id = 'yyy'
  AND date >= '2025-06-01';
```

## ⚠️ 注意事項

1. **バックアップ**: 実行前に必ずSupabaseのバックアップを取得
2. **監視**: 実行中はCPU/メモリ使用率を継続的に監視
3. **ロールバック**: 問題発生時の手順を事前に確認
4. **通知**: ステークホルダーへの事前通知を忘れずに

## 🔧 トラブルシューティング

### よくある問題

#### 1. タイムアウトエラー
```
Error: Function execution timed out
```
**対処法**: バッチサイズを小さくする（500→100）

#### 2. メモリ不足
```
Error: Out of memory
```
**対処法**: 処理を分割して実行

#### 3. 重複キーエラー
```
Error: duplicate key value violates unique constraint
```
**対処法**: 既存データを確認し、必要に応じて削除

## 📞 サポート

問題が発生した場合の連絡先：
- 開発チーム: #dev-channel
- 緊急時: oncall@example.com

---

最終更新: 2025-06-17