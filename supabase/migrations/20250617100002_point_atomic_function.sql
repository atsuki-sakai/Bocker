-- アトミックポイント更新RPC関数の作成
CREATE OR REPLACE FUNCTION update_customer_points_atomic(
  p_customer_uid TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_points_delta INTEGER,
  p_transaction_type TEXT,
  p_description TEXT,
  p_reservation_id TEXT DEFAULT NULL
) RETURNS TABLE(
  new_total_points INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_customer_points_id UUID;
  v_transaction_id UUID;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_customer_uuid UUID;
BEGIN
  -- 1. customer_uidをUUID型に変換
  BEGIN
    v_customer_uuid := p_customer_uid::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid customer_uid format: %', p_customer_uid;
  END;

  -- 2. 顧客ポイントレコードを排他ロック
  SELECT uid, total_points INTO v_customer_points_id, v_current_points
  FROM customer_points 
  WHERE customer_uid = v_customer_uuid 
    AND tenant_id = p_tenant_id 
    AND org_id = p_org_id
    AND is_archive = false
  FOR UPDATE;
  
  -- 3. レコードが存在しない場合は作成
  IF v_customer_points_id IS NULL THEN
    v_customer_points_id := gen_random_uuid();
    v_current_points := 0;
    
    INSERT INTO customer_points (
      uid, customer_uid, tenant_id, org_id, total_points, 
      last_transaction_date_unix, created_at, updated_at, is_archive
    ) VALUES (
      v_customer_points_id, v_customer_uuid, p_tenant_id, p_org_id, 0,
      extract(epoch from now())::bigint, now(), now(), false
    );
  END IF;
  
  -- 4. 新しい残高計算（負の値防止）
  v_new_points := GREATEST(0, COALESCE(v_current_points, 0) + p_points_delta);
  
  -- 5. 残高更新
  UPDATE customer_points 
  SET total_points = v_new_points,
      last_transaction_date_unix = extract(epoch from now())::bigint,
      updated_at = now()
  WHERE uid = v_customer_points_id;
  
  -- 6. 取引履歴記録
  INSERT INTO point_transaction (
    id, tenant_id, org_id, customer_id, reservation_id,
    points, transaction_type, transaction_date_unix, description,
    created_at, updated_at, is_archive
  ) VALUES (
    gen_random_uuid(), p_tenant_id, p_org_id, v_customer_uuid, p_reservation_id,
    p_points_delta, p_transaction_type, 
    extract(epoch from now())::bigint, p_description,
    now(), now(), false
  ) RETURNING id INTO v_transaction_id;
  
  RETURN QUERY SELECT v_new_points, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;