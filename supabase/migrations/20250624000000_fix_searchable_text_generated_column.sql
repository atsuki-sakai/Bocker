-- searchable_textカラムをGENERATED COLUMNから通常のカラムに変更し、トリガーで自動更新するように修正
-- GENERATED COLUMNは更新時に問題を引き起こすため、より柔軟なトリガー方式に変更

-- 1. 既存のGENERATED COLUMNを削除
DO $$
BEGIN
    -- まずGENERATED COLUMNを通常のカラムに変更
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customer' 
        AND column_name = 'searchable_text' 
        AND is_generated = 'ALWAYS'
    ) THEN
        -- GENERATED COLUMNを削除
        ALTER TABLE public.customer DROP COLUMN IF EXISTS searchable_text;
        RAISE NOTICE 'Dropped GENERATED COLUMN searchable_text';
    END IF;
END $$;

-- 2. 通常のテキストカラムとして再作成
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS searchable_text text;

-- 3. 既存データのsearchable_textを更新
UPDATE public.customer SET 
    searchable_text = lower(
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(line_user_name, '') || ' ' ||
        coalesce(phone, '') || ' ' ||
        coalesce(email, '')
    )
WHERE searchable_text IS NULL OR searchable_text = '';

-- 4. searchable_textを自動更新するトリガー関数を作成
CREATE OR REPLACE FUNCTION update_customer_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
    -- searchable_textを自動計算
    NEW.searchable_text := lower(
        coalesce(NEW.first_name, '') || ' ' ||
        coalesce(NEW.last_name, '') || ' ' ||
        coalesce(NEW.line_user_name, '') || ' ' ||
        coalesce(NEW.phone, '') || ' ' ||
        coalesce(NEW.email, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 既存のトリガーを削除（もしあれば）
DROP TRIGGER IF EXISTS trigger_update_customer_searchable_text ON public.customer;

-- 6. 新しいトリガーを作成（INSERT/UPDATE時に実行）
CREATE TRIGGER trigger_update_customer_searchable_text
    BEFORE INSERT OR UPDATE ON public.customer
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_searchable_text();

-- 7. 既存のGINインデックスを確認・再作成
DROP INDEX IF EXISTS public.idx_customer_searchable_text_gin;
CREATE INDEX IF NOT EXISTS idx_customer_searchable_text_gin 
    ON public.customer USING gin (searchable_text gin_trgm_ops);

-- 8. 検証：データベースの状態を確認
DO $$
DECLARE
    total_customers integer;
    customers_with_searchable_text integer;
    sample_searchable_text text;
BEGIN
    SELECT COUNT(*) INTO total_customers
    FROM public.customer
    WHERE is_archive = false;
    
    SELECT COUNT(*) INTO customers_with_searchable_text
    FROM public.customer
    WHERE searchable_text IS NOT NULL 
    AND searchable_text != ''
    AND is_archive = false;
    
    SELECT searchable_text INTO sample_searchable_text
    FROM public.customer
    WHERE searchable_text IS NOT NULL 
    AND searchable_text != ''
    AND is_archive = false
    LIMIT 1;
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE 'Total customers: %', total_customers;
    RAISE NOTICE 'Customers with searchable_text: %', customers_with_searchable_text;
    RAISE NOTICE 'Sample searchable_text: %', sample_searchable_text;
END $$;