# ConvexからSupabaseへのデータ移行ガイド

このドキュメントでは、Convexで管理している過去の予約(reservation,reservation_detail)データをSupabaseへ移行する手順を説明します。

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

Supabase GUIまたはSQLエディタから以下Convexスキーマのテーブルを作成：
※以下は古い可能性があるのでSupabase MCPで実際に確認する　or supabaseのファイルを確認する。

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

これにより、Convexの各テーブルから予約が完了(status: completed)のデータがSupabaseに移行され、
Convex側でSupabaseへデータ移行が完了した際に削除してConvexのスピードを最大限に保つ。

### 2. 定期的な移行処理の設定

定期的なデータ移行を実行するには、サーバー側の処理（例：Convex Cron Jobs）で以下のコードを実行します：

## アプリケーションの修正

### 1. データ取得ロジックの修正

データを取得する際は、まずリアルタイムデータをConvexから取得しSupabaseへ保存します。保存が完了したのを確認してConvexから削除します。

### 2. 統計・分析機能の追加

Supabaseの強力なPostgreSQLを活用して、複雑な分析クエリを実行できます：

```typescript
// 例：月別の予約集計
async function getMonthlyReservationStats(salonId: string) {
  const { data, error } = await supabase
    .from('reservation')
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