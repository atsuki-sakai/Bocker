-- =========================================================================
-- 移行計画実装の不整合修正マイグレーション
-- =========================================================================
-- 作成日: 2025年6月18日
-- 目的: 移行実装時に発見された不整合を修正
-- 1. master_idフィールドの削除（SUPABASE_DOCS.mdに合わせて_convex_idのみ使用）
-- 2. reservation_detail._convex_reservation_idの外部キー制約追加
-- =========================================================================

-- 1. reservation テーブルから不要な master_id フィールドを削除
-- （既に20250616000000_add_reservation_tables_for_convex_migration.sqlで修正済みのため、
--  存在する場合のみ削除）
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservation' 
        AND column_name = 'master_id'
    ) THEN
        ALTER TABLE "public"."reservation" DROP COLUMN "master_id";
        RAISE NOTICE 'Dropped master_id column from reservation table';
    END IF;
END $$;

-- 2. reservation_detail テーブルに外部キー制約を追加
-- （reservation._convex_id への参照制約）
DO $$
BEGIN
    -- 既存の制約があるかチェック
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'reservation_detail_convex_reservation_id_fkey'
        AND table_name = 'reservation_detail'
        AND table_schema = 'public'
    ) THEN
        -- 外部キー制約を追加
        ALTER TABLE "public"."reservation_detail" 
        ADD CONSTRAINT "reservation_detail_convex_reservation_id_fkey"
        FOREIGN KEY (_convex_reservation_id) 
        REFERENCES "public"."reservation"(_convex_id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for reservation_detail._convex_reservation_id';
    END IF;
END $$;

-- 3. reservation_detail テーブル用のインデックスを最適化
-- （外部キー制約に対応するインデックス）
CREATE INDEX IF NOT EXISTS idx_reservation_detail_convex_reservation_id 
  ON public.reservation_detail(_convex_reservation_id);

-- 4. 制約名の統一（既存のものがあれば）
DO $$
BEGIN
    -- 古い制約名があれば削除して新しい名前で追加
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name != 'reservation_detail_convex_reservation_id_fkey'
        AND table_name = 'reservation_detail'
        AND table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- 既存の外部キー制約を削除（名前が異なる場合）
        EXECUTE (
            SELECT 'ALTER TABLE public.reservation_detail DROP CONSTRAINT ' || constraint_name
            FROM information_schema.table_constraints 
            WHERE constraint_name != 'reservation_detail_convex_reservation_id_fkey'
            AND table_name = 'reservation_detail'
            AND table_schema = 'public'
            AND constraint_type = 'FOREIGN KEY'
            LIMIT 1
        );
        
        -- 統一された名前で再作成
        ALTER TABLE "public"."reservation_detail" 
        ADD CONSTRAINT "reservation_detail_convex_reservation_id_fkey"
        FOREIGN KEY (_convex_reservation_id) 
        REFERENCES "public"."reservation"(_convex_id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 5. コメント更新
COMMENT ON CONSTRAINT "reservation_detail_convex_reservation_id_fkey" 
ON "public"."reservation_detail" 
IS 'Convex IDによる予約詳細と予約の関連付け（Supabase内での整合性確保）';

-- 6. 変更内容の確認用ビュー（デバッグ用、本番では不要）
DO $$
BEGIN
    -- テーブル構造確認用の一時的なクエリ（ログ出力のみ）
    RAISE NOTICE 'Migration completed. Updated tables:';
    RAISE NOTICE '- reservation: removed master_id field (if existed)';
    RAISE NOTICE '- reservation_detail: added foreign key constraint to reservation._convex_id';
    RAISE NOTICE '- Added optimized index for foreign key constraint';
END $$;