-- パーティションテーブルのデータ保持期間を2年に維持

-- cleanup_old_partitions関数を2年保持に更新
CREATE OR REPLACE FUNCTION cleanup_old_partitions(months_to_keep int DEFAULT 24)
RETURNS void AS $$
DECLARE
  cutoff_date date := date_trunc('month', CURRENT_DATE - (months_to_keep || ' months')::interval);
  part_name text;
  table_patterns text[] := ARRAY['daily_sales_summary_%', 'staff_sales_summary_%', 'menu_sales_summary_%'];
  pattern text;
BEGIN
  FOREACH pattern IN ARRAY table_patterns
  LOOP
    FOR part_name IN 
      SELECT tablename FROM pg_tables 
      WHERE tablename LIKE pattern
        AND to_date(right(tablename, 6), 'YYYYMM') < cutoff_date
    LOOP
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS %I', part_name);
        RAISE NOTICE '古いパーティション削除: % (保持期間: %ヶ月)', part_name, months_to_keep;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'パーティション削除失敗: %, エラー: %', part_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$ LANGUAGE plpgsql;

-- コメント更新
COMMENT ON FUNCTION cleanup_old_partitions IS '指定期間経過パーティション削除関数（デフォルト24ヶ月）';