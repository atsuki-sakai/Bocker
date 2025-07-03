-- update_customer関数にcustomer_typeパラメータを追加
CREATE OR REPLACE FUNCTION update_customer(
  p_customer_uid TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_line_id TEXT DEFAULT NULL,
  p_line_user_name TEXT DEFAULT NULL,
  p_last_reservation_date_unix BIGINT DEFAULT NULL,
  p_total_reservation_count INTEGER DEFAULT NULL,
  p_customer_type TEXT DEFAULT NULL
) RETURNS SETOF customer AS $$
DECLARE
  v_customer_uuid UUID;
  v_searchable_text TEXT;
  v_current_customer RECORD;
BEGIN
  -- customer_uidをUUID型に変換
  BEGIN
    v_customer_uuid := p_customer_uid::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid customer_uid format: %', p_customer_uid;
  END;

  -- 現在の顧客情報を取得
  SELECT * INTO v_current_customer 
  FROM customer 
  WHERE uid = v_customer_uuid 
    AND tenant_id = p_tenant_id 
    AND org_id = p_org_id 
    AND is_archive = false;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_uid;
  END IF;

  -- Generate searchable text
  v_searchable_text := COALESCE(COALESCE(p_email, v_current_customer.email), '') || ' ' || 
                      COALESCE(COALESCE(p_first_name, v_current_customer.first_name), '') || ' ' || 
                      COALESCE(COALESCE(p_last_name, v_current_customer.last_name), '') || ' ' || 
                      COALESCE(COALESCE(p_phone, v_current_customer.phone), '') || ' ' || 
                      COALESCE(COALESCE(p_line_user_name, v_current_customer.line_user_name), '');

  -- Update customer record
  UPDATE customer SET
    email = COALESCE(p_email, email),
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    line_id = COALESCE(p_line_id, line_id),
    line_user_name = COALESCE(p_line_user_name, line_user_name),
    searchable_text = v_searchable_text,
    last_reservation_date_unix = COALESCE(p_last_reservation_date_unix, last_reservation_date_unix),
    total_reservation_count = COALESCE(p_total_reservation_count, total_reservation_count),
    customer_type = COALESCE(p_customer_type, customer_type),
    updated_at = now()
  WHERE uid = v_customer_uuid
    AND tenant_id = p_tenant_id
    AND org_id = p_org_id
    AND is_archive = false;

  -- Return the updated customer
  RETURN QUERY SELECT * FROM customer WHERE uid = v_customer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_customer_json関数を新規作成（JSON版）
CREATE OR REPLACE FUNCTION update_customer_json(params JSON)
RETURNS SETOF customer AS $$
DECLARE
  p_customer_uid TEXT;
  p_tenant_id TEXT;
  p_org_id TEXT;
  p_email TEXT DEFAULT NULL;
  p_first_name TEXT DEFAULT NULL;
  p_last_name TEXT DEFAULT NULL;
  p_phone TEXT DEFAULT NULL;
  p_line_id TEXT DEFAULT NULL;
  p_line_user_name TEXT DEFAULT NULL;
  p_last_reservation_date_unix BIGINT DEFAULT NULL;
  p_total_reservation_count INTEGER DEFAULT NULL;
  p_customer_type TEXT DEFAULT NULL;
BEGIN
  -- JSONからパラメータを抽出
  p_customer_uid := params->>'p_customer_uid';
  p_tenant_id := params->>'p_tenant_id';
  p_org_id := params->>'p_org_id';
  
  -- オプションパラメータの抽出
  IF params ? 'p_email' THEN
    p_email := params->>'p_email';
  END IF;
  
  IF params ? 'p_first_name' THEN
    p_first_name := params->>'p_first_name';
  END IF;
  
  IF params ? 'p_last_name' THEN
    p_last_name := params->>'p_last_name';
  END IF;
  
  IF params ? 'p_phone' THEN
    p_phone := params->>'p_phone';
  END IF;
  
  IF params ? 'p_line_id' THEN
    p_line_id := params->>'p_line_id';
  END IF;
  
  IF params ? 'p_line_user_name' THEN
    p_line_user_name := params->>'p_line_user_name';
  END IF;
  
  IF params ? 'p_last_reservation_date_unix' THEN
    p_last_reservation_date_unix := (params->>'p_last_reservation_date_unix')::BIGINT;
  END IF;
  
  IF params ? 'p_total_reservation_count' THEN
    p_total_reservation_count := (params->>'p_total_reservation_count')::INTEGER;
  END IF;
  
  IF params ? 'p_customer_type' THEN
    p_customer_type := params->>'p_customer_type';
  END IF;

  -- update_customer関数を呼び出す
  RETURN QUERY SELECT * FROM update_customer(
    p_customer_uid,
    p_tenant_id,
    p_org_id,
    p_email,
    p_first_name,
    p_last_name,
    p_phone,
    p_line_id,
    p_line_user_name,
    p_last_reservation_date_unix,
    p_total_reservation_count,
    p_customer_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;