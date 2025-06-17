-- customer_typeをcreate_customer_with_details_and_points関数に追加
CREATE OR REPLACE FUNCTION create_customer_with_details_and_points(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_line_id TEXT,
  p_line_user_name TEXT,
  p_password_hash TEXT,
  p_detail_email TEXT,
  p_detail_gender TEXT,
  p_detail_birthday DATE,
  p_detail_age INTEGER,
  p_detail_notes TEXT,
  p_initial_points INTEGER,
  p_customer_type TEXT DEFAULT 'first_time'
) RETURNS SETOF customer AS $$
DECLARE
  v_customer_uid UUID;
  v_customer_detail_uid UUID;
  v_customer_points_uid UUID;
  v_searchable_text TEXT;
BEGIN
  -- Generate searchable text
  v_searchable_text := COALESCE(p_email, '') || ' ' || 
                      COALESCE(p_first_name, '') || ' ' || 
                      COALESCE(p_last_name, '') || ' ' || 
                      COALESCE(p_phone, '') || ' ' || 
                      COALESCE(p_line_user_name, '');

  -- Insert customer record
  INSERT INTO customer (
    uid, tenant_id, org_id, email, first_name, last_name, phone,
    line_id, line_user_name, password_hash, searchable_text, customer_type,
    total_reservation_count, last_reservation_date_unix,
    created_at, updated_at, is_archive
  ) VALUES (
    gen_random_uuid(), p_tenant_id, p_org_id, p_email, p_first_name, p_last_name, p_phone,
    p_line_id, p_line_user_name, p_password_hash, v_searchable_text, COALESCE(p_customer_type, 'first_time'),
    0, NULL,
    now(), now(), false
  ) RETURNING uid INTO v_customer_uid;

  -- Insert customer_detail record
  INSERT INTO customer_detail (
    uid, customer_uid, tenant_id, org_id,
    email, gender, birthday, age, notes,
    created_at, updated_at, is_archive
  ) VALUES (
    gen_random_uuid(), v_customer_uid, p_tenant_id, p_org_id,
    p_detail_email, p_detail_gender, p_detail_birthday, p_detail_age, p_detail_notes,
    now(), now(), false
  ) RETURNING uid INTO v_customer_detail_uid;

  -- Insert customer_points record
  INSERT INTO customer_points (
    uid, customer_uid, tenant_id, org_id,
    total_points, last_transaction_date_unix,
    created_at, updated_at, is_archive
  ) VALUES (
    gen_random_uuid(), v_customer_uid, p_tenant_id, p_org_id,
    p_initial_points, extract(epoch from now())::bigint,
    now(), now(), false
  ) RETURNING uid INTO v_customer_points_uid;

  -- Return the created customer
  RETURN QUERY SELECT * FROM customer WHERE uid = v_customer_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_customer関数を追加（予約時の顧客情報更新用）
CREATE OR REPLACE FUNCTION update_customer(
  p_customer_uid TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_line_id TEXT,
  p_line_user_name TEXT,
  p_last_reservation_date_unix BIGINT DEFAULT NULL,
  p_total_reservation_count INTEGER DEFAULT NULL
) RETURNS SETOF customer AS $$
DECLARE
  v_customer_uuid UUID;
  v_searchable_text TEXT;
BEGIN
  -- customer_uidをUUID型に変換
  BEGIN
    v_customer_uuid := p_customer_uid::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid customer_uid format: %', p_customer_uid;
  END;

  -- Generate searchable text
  v_searchable_text := COALESCE(p_email, '') || ' ' || 
                      COALESCE(p_first_name, '') || ' ' || 
                      COALESCE(p_last_name, '') || ' ' || 
                      COALESCE(p_phone, '') || ' ' || 
                      COALESCE(p_line_user_name, '');

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
    updated_at = now()
  WHERE uid = v_customer_uuid
    AND tenant_id = p_tenant_id
    AND org_id = p_org_id
    AND is_archive = false;

  -- Return the updated customer
  RETURN QUERY SELECT * FROM customer WHERE uid = v_customer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;