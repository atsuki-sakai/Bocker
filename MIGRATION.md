# ConvexからSupabaseへのデータ移行ガイド

このドキュメントでは、Convexで管理している過去のデータをSupabaseへ移行する手順を説明します。

## 概要

- 過去のデータ（一定期間より前のデータ）をConvexからSupabaseに移行
- リアルタイム性が必要なデータはConvexで引き続き管理
- 履歴データや分析用データはSupabaseで管理

## 移行準備

### 1. Supabaseプロジェクトのセットアップ

Supabaseのプロジェクトを作成し、必要な設定を行います：

1. [Supabase](https://supabase.com/)にサインアップ/ログイン
2. 新しいプロジェクトを作成
3. 以下の環境変数を取得し、`.env.local`に追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. 依存関係のインストール

```bash
pnpm add @supabase/supabase-js
pnpm add -D supabase dotenv
```

### 3. データベーススキーマの作成

Supabase GUIまたはSQLエディタから以下のテーブルを作成：

```sql
-- 例：ポイント履歴テーブル
CREATE TABLE point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  reservation_id UUID,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 例：予約履歴テーブル
CREATE TABLE reservations_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  menu_id UUID,
  status TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 例：決済履歴テーブル
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  reservation_id UUID,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## データ移行の実行

### 1. 一括移行の実行

```bash
# 移行スクリプトを実行
pnpm migrate:supabase
```

これにより、Convexの各テーブルから一定期間（デフォルト：3ヶ月以上前）のデータがSupabaseに移行され、
Convex側ではアーカイブフラグが設定されます。

### 2. 定期的な移行処理の設定

定期的なデータ移行を実行するには、サーバー側の処理（例：Vercel Cron Jobs）で以下のコードを実行します：

```typescript
import { setupMigrationJob } from '@/lib/migration/convex-to-supabase';

// ポイント履歴の定期移行（24時間ごと）
setupMigrationJob({
  tableName: 'point_task_queue',
  targetTable: 'point_history',
  cutoffDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 3ヶ月前
}, 24);

// 予約履歴の定期移行
setupMigrationJob({
  tableName: 'reservation',
  targetTable: 'reservations_history',
  cutoffDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
}, 24);

// 決済履歴の定期移行
setupMigrationJob({
  tableName: 'payment',
  targetTable: 'payment_history',
  cutoffDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
}, 24);
```

## アプリケーションの修正

### 1. データ取得ロジックの修正

データを取得する際は、まずリアルタイムデータをConvexから取得し、必要に応じて履歴データをSupabaseから取得します。

```typescript
// 例：ポイント履歴を取得するカスタムフック
export function usePointHistory(customerId: string) {
  // Convexからのリアルタイムデータ
  const realtimePoints = useQuery(api.point.task_queue.getByCustomer, { customerId });
  
  // Supabaseからの履歴データ（React Query等を使用）
  const { data: historicalPoints } = useQuery(['pointHistory', customerId], async () => {
    const { data, error } = await supabase
      .from('point_history')
      .select('*')
      .eq('customer_id', customerId);
      
    if (error) throw error;
    return data;
  });
  
  // 両方のデータを結合して返す
  return {
    realtimePoints,
    historicalPoints,
    allPoints: [...(realtimePoints || []), ...(historicalPoints || [])]
  };
}
```

### 2. 統計・分析機能の追加

Supabaseの強力なPostgreSQLを活用して、複雑な分析クエリを実行できます：

```typescript
// 例：月別のポイント集計
async function getMonthlyPointStats(salonId: string) {
  const { data, error } = await supabase
    .from('point_history')
    .select('*')
    .eq('salon_id', salonId)
    .then(({ data }) => {
      // PostgreSQLの日付関数を使った集計
      const { data: stats } = await supabase.rpc('get_monthly_point_stats', {
        salon_id_param: salonId
      });
      return stats;
    });
    
  if (error) throw error;
  return data;
}
```

## トラブルシューティング

1. 移行エラーが発生した場合は、`scripts/migrate-to-supabase.ts`のログを確認
2. バッチサイズを小さくして再試行（大量データの場合）
3. 特定のIDのみを指定して部分的に移行 