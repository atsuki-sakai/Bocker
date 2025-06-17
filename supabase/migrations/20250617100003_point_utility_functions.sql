-- ポイントユーティリティ関数の作成

-- 1. ポイントタスク状態一括更新関数
CREATE OR REPLACE FUNCTION bulk_update_point_task_status(
  p_task_ids UUID[],
  p_status TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE point_task_queue 
  SET status = p_status,
      updated_at = now()
  WHERE id = ANY(p_task_ids)
    AND is_archive = false;
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ポイント有効期限処理関数
CREATE OR REPLACE FUNCTION expire_points(
  p_expiration_days INTEGER DEFAULT 365
) RETURNS TABLE(
  expired_count INTEGER,
  total_expired_points INTEGER
) AS $$
DECLARE
  v_cutoff_date BIGINT;
  v_expired_count INTEGER := 0;
  v_total_expired_points INTEGER := 0;
BEGIN
  -- 有効期限の計算（現在時刻からp_expiration_days日前）
  v_cutoff_date := extract(epoch from (now() - interval '1 day' * p_expiration_days))::bigint;
  
  -- 期限切れポイントの集計
  SELECT COUNT(*), COALESCE(SUM(points), 0)
  INTO v_expired_count, v_total_expired_points
  FROM point_transaction
  WHERE transaction_type = 'earned'
    AND transaction_date_unix < v_cutoff_date
    AND is_archive = false;
  
  -- 期限切れポイントをアーカイブ
  UPDATE point_transaction
  SET is_archive = true,
      updated_at = now()
  WHERE transaction_type = 'earned'
    AND transaction_date_unix < v_cutoff_date
    AND is_archive = false;
  
  RETURN QUERY SELECT v_expired_count, v_total_expired_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ポイント残高再計算関数（整合性チェック用）
CREATE OR REPLACE FUNCTION recalculate_customer_points_balance(
  p_customer_uid TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT
) RETURNS TABLE(
  old_balance INTEGER,
  new_balance INTEGER,
  difference INTEGER
) AS $$
DECLARE
  v_customer_uuid UUID;
  v_old_balance INTEGER;
  v_new_balance INTEGER;
  v_difference INTEGER;
BEGIN
  -- customer_uidをUUID型に変換
  v_customer_uuid := p_customer_uid::UUID;
  
  -- 現在の残高を取得
  SELECT total_points INTO v_old_balance
  FROM customer_points
  WHERE customer_uid = v_customer_uuid
    AND tenant_id = p_tenant_id
    AND org_id = p_org_id
    AND is_archive = false;
  
  -- 取引履歴から正しい残高を計算
  SELECT COALESCE(SUM(points), 0) INTO v_new_balance
  FROM point_transaction
  WHERE customer_id = v_customer_uuid
    AND tenant_id = p_tenant_id
    AND org_id = p_org_id
    AND is_archive = false;
  
  -- 差分を計算
  v_difference := v_new_balance - COALESCE(v_old_balance, 0);
  
  -- 残高を更新（差分がある場合のみ）
  IF v_difference != 0 THEN
    UPDATE customer_points
    SET total_points = v_new_balance,
        last_transaction_date_unix = extract(epoch from now())::bigint,
        updated_at = now()
    WHERE customer_uid = v_customer_uuid
      AND tenant_id = p_tenant_id
      AND org_id = p_org_id
      AND is_archive = false;
  END IF;
  
  RETURN QUERY SELECT COALESCE(v_old_balance, 0), v_new_balance, v_difference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;