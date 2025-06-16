-- =========================================================================
-- 予約関連テーブルのマイグレーション（ConvexからSupabaseへの移行用）
-- =========================================================================
-- 作成日: 2025年6月16日
-- 目的: Convexで管理している予約履歴データをSupabaseへ移行するためのテーブル作成
-- =========================================================================

-- 1. 予約テーブル（Convexスキーマと完全一致）
CREATE TABLE IF NOT EXISTS public.reservation (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Convex互換フィールド
  master_id TEXT NOT NULL,                    -- Convex & Supabase 共通識別子
  tenant_id TEXT NOT NULL,                    -- テナントID（Convex ID形式）
  org_id TEXT NOT NULL,                       -- 組織ID（Convex ID形式）
  customer_id TEXT,                           -- 顧客ID（Supabase customer.uid参照）
  staff_id TEXT NOT NULL,                     -- スタッフID（Convex ID形式）
  customer_name TEXT NOT NULL,                -- 顧客名
  staff_name TEXT NOT NULL,                   -- スタッフ名
  status TEXT NOT NULL,                       -- 予約ステータス
  payment_status TEXT NOT NULL,               -- 支払ステータス
  stripe_checkout_session_id TEXT,            -- Stripe Checkout Session ID
  date TEXT NOT NULL,                         -- 予約日 (YYYY-MM-DD)
  start_time_unix BIGINT NOT NULL,            -- 予約開始時間（Unix timestamp）
  end_time_unix BIGINT NOT NULL,              -- 予約終了時間（Unix timestamp）
  
  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archive BOOLEAN NOT NULL DEFAULT FALSE,
  sort_key TEXT,
  
  -- Convex ID保持用（移行時の整合性確保）
  _convex_id TEXT UNIQUE NOT NULL,
  _creation_time BIGINT
);

-- 2. 予約詳細テーブル（Convexスキーマと完全一致）
CREATE TABLE IF NOT EXISTS public.reservation_detail (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Convex互換フィールド
  tenant_id TEXT NOT NULL,                    -- テナントID（Convex ID形式）
  org_id TEXT NOT NULL,                       -- 組織ID（Convex ID形式）
  reservation_id TEXT NOT NULL,               -- 予約ID（Convex ID形式）
  coupon_id TEXT,                             -- クーポンID（Convex ID形式）
  total_price INTEGER,                        -- 合計金額
  payment_method TEXT NOT NULL,               -- 支払方法
  menus JSONB,                                -- メニュー配列（reservationMenuType）
  options JSONB,                              -- オプション配列（reservationOptionType）
  extra_charge INTEGER,                       -- 追加料金
  use_points INTEGER,                         -- 使用ポイント数
  coupon_discount INTEGER,                    -- クーポン割引額
  featured_hair_images JSONB,                 -- フィーチャー画像配列（imageType）
  notes TEXT,                                 -- メモ
  
  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archive BOOLEAN NOT NULL DEFAULT FALSE,
  sort_key TEXT,
  
  -- Convex ID保持用（移行時の整合性確保）
  _convex_id TEXT UNIQUE NOT NULL,
  _convex_reservation_id TEXT NOT NULL,       -- 関連する予約のConvex ID
  _creation_time BIGINT
);

-- 3. インデックス作成

-- 予約テーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_reservation_tenant_org_master 
  ON public.reservation(tenant_id, org_id, master_id);

CREATE INDEX IF NOT EXISTS idx_reservation_tenant_org_date 
  ON public.reservation(tenant_id, org_id, date);

CREATE INDEX IF NOT EXISTS idx_reservation_tenant_org_customer 
  ON public.reservation(tenant_id, org_id, customer_id) 
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservation_tenant_org_staff_date 
  ON public.reservation(tenant_id, org_id, staff_id, date);

CREATE INDEX IF NOT EXISTS idx_reservation_status_date 
  ON public.reservation(status, date) 
  WHERE is_archive = FALSE;

CREATE INDEX IF NOT EXISTS idx_reservation_convex_id 
  ON public.reservation(_convex_id);

-- 予約詳細テーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_reservation_detail_reservation 
  ON public.reservation_detail(_convex_reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_detail_convex_id 
  ON public.reservation_detail(_convex_id);

CREATE INDEX IF NOT EXISTS idx_reservation_detail_tenant_org 
  ON public.reservation_detail(tenant_id, org_id);

-- 移行処理用インデックス
CREATE INDEX IF NOT EXISTS idx_migration_timestamp 
  ON public.reservation(created_at) 
  WHERE is_archive = FALSE;

CREATE INDEX IF NOT EXISTS idx_migration_status_time 
  ON public.reservation(status, end_time_unix) 
  WHERE is_archive = FALSE;

-- 4. トリガー設定（更新時刻自動更新）

-- 更新時刻自動更新関数（既存の場合はスキップ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 予約テーブルのトリガー
DROP TRIGGER IF EXISTS update_reservation_updated_at ON public.reservation;
CREATE TRIGGER update_reservation_updated_at
    BEFORE UPDATE ON public.reservation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 予約詳細テーブルのトリガー
DROP TRIGGER IF EXISTS update_reservation_detail_updated_at ON public.reservation_detail;
CREATE TRIGGER update_reservation_detail_updated_at
    BEFORE UPDATE ON public.reservation_detail
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. コメント追加

-- テーブルコメント
COMMENT ON TABLE public.reservation IS 'Convexから移行した予約履歴データ';
COMMENT ON TABLE public.reservation_detail IS 'Convexから移行した予約詳細データ';

-- カラムコメント（主要なもののみ）
COMMENT ON COLUMN public.reservation.master_id IS 'ConvexとSupabase共通の識別子';
COMMENT ON COLUMN public.reservation._convex_id IS 'Convexでの元のレコードID（整合性確保用）';
COMMENT ON COLUMN public.reservation.tenant_id IS 'テナントID（Convex形式）';
COMMENT ON COLUMN public.reservation.org_id IS '組織ID（Convex形式）';
COMMENT ON COLUMN public.reservation.staff_id IS 'スタッフID（Convex形式、マスターデータはConvexで管理）';

COMMENT ON COLUMN public.reservation_detail._convex_reservation_id IS '関連する予約のConvex ID';
COMMENT ON COLUMN public.reservation_detail.menus IS 'メニュー配列（JSONBフォーマット）';
COMMENT ON COLUMN public.reservation_detail.options IS 'オプション配列（JSONBフォーマット）';

-- 6. 権限設定（必要に応じて調整）
-- サービスロールには全権限、通常のユーザーには読み取り権限のみ
GRANT ALL ON public.reservation TO service_role;
GRANT SELECT ON public.reservation TO authenticated;
GRANT ALL ON public.reservation_detail TO service_role;
GRANT SELECT ON public.reservation_detail TO authenticated;