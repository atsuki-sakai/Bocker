-- =========================================================================
-- customer_detail.customer_uid 外部キーを ON DELETE CASCADE に変更
-- =========================================================================
-- 作成日: 2025年7月1日
-- 目的 : customer テーブル削除時に自動で関連 customer_detail を削除できるようにする
-- 環境 : 開発環境（dev プロジェクト）先行適用
-- =========================================================================

-- Drop existing foreign key constraint
ALTER TABLE customer_detail
DROP CONSTRAINT IF EXISTS customer_detail_customer_uid_fkey;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE customer_detail
ADD CONSTRAINT customer_detail_customer_uid_fkey
FOREIGN KEY (customer_uid)
REFERENCES customer(uid)
ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_detail_customer_uid
ON customer_detail(customer_uid);

-- 4. 確認用メッセージ
DO $$
BEGIN
  RAISE NOTICE 'customer_detail_customer_uid_fkey constraint recreated with ON DELETE CASCADE';
END;
$$ LANGUAGE plpgsql; 