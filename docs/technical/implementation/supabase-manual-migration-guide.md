# Supabase手動マイグレーション実行ガイド

リアルタイム売上集計システムのSupabaseテーブルとRPC関数を手動で作成する手順です。

## 📋 実行順序

1. **集計テーブル作成** (`20250712000000_create_sales_summary_tables.sql`)
2. **RPC関数作成** (`20250712000002_create_sales_summary_rpcs.sql`)

## 🔧 手順

### Step 1: Supabase Dashboardにアクセス

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. Bockerプロジェクトを選択
3. 左メニューから **「SQL Editor」** をクリック

### Step 2: 集計テーブル作成

以下のSQLをSQL Editorで実行：

```sql
-- 売上集計テーブル作成マイグレーション
-- リアルタイム売上集計システム用

-- 1. 日別売上集計テーブル
CREATE TABLE daily_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  business_date date NOT NULL,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, business_date)
);

-- 2. スタッフ別売上集計テーブル
CREATE TABLE staff_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  staff_id  text NOT NULL,
  staff_name text,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  last_booking_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, staff_id)
);

-- 3. メニュー別売上集計テーブル
CREATE TABLE menu_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  menu_id   text NOT NULL,
  menu_name text,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, menu_id)
);

-- 4. 集計処理ログテーブル（重複防止用）
CREATE TABLE sales_aggregation_log (
  reservation_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  org_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  total_amount numeric(12,2),
  status text NOT NULL DEFAULT 'completed'
);

-- 基本インデックス
CREATE INDEX idx_daily_sales_date ON daily_sales_summary (business_date);
CREATE INDEX idx_daily_sales_tenant_org ON daily_sales_summary (tenant_id, org_id);

CREATE INDEX idx_staff_sales_amount ON staff_sales_summary (total_amount DESC);
CREATE INDEX idx_staff_sales_tenant_org ON staff_sales_summary (tenant_id, org_id);

CREATE INDEX idx_menu_sales_count ON menu_sales_summary (booking_count DESC);
CREATE INDEX idx_menu_sales_tenant_org ON menu_sales_summary (tenant_id, org_id);

CREATE INDEX idx_aggregation_log_processed_at ON sales_aggregation_log (processed_at);
CREATE INDEX idx_aggregation_log_tenant_org ON sales_aggregation_log (tenant_id, org_id);

-- コメント追加
COMMENT ON TABLE daily_sales_summary IS 'リアルタイム日別売上集計テーブル';
COMMENT ON TABLE staff_sales_summary IS 'リアルタイムスタッフ別売上集計テーブル';
COMMENT ON TABLE menu_sales_summary IS 'リアルタイムメニュー別売上集計テーブル';
COMMENT ON TABLE sales_aggregation_log IS '売上集計処理ログ（重複防止用）';
```

**実行方法:**
1. 上記SQLをコピー
2. SQL EditorのQuery欄に貼り付け
3. **「Run」**ボタンをクリック
4. 成功メッセージを確認

### Step 3: RPC関数作成

続いて以下のSQLをSQL Editorで実行：

```sql
-- 売上集計更新RPC関数作成
-- Convex Actionから呼び出される集計更新用関数

-- 日別集計更新関数
CREATE OR REPLACE FUNCTION increment_daily_sales(
  p_tenant_id TEXT,
  p_org_id TEXT, 
  p_business_date TEXT,
  p_amount NUMERIC
) RETURNS VOID 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO daily_sales_summary (tenant_id, org_id, business_date, total_amount, booking_count)
  VALUES (p_tenant_id, p_org_id, p_business_date::date, p_amount, 1)
  ON CONFLICT (tenant_id, org_id, business_date)
  DO UPDATE SET
    total_amount = daily_sales_summary.total_amount + p_amount,
    booking_count = daily_sales_summary.booking_count + 1,
    updated_at = NOW();
END;
$$;

-- スタッフ別集計更新関数  
CREATE OR REPLACE FUNCTION increment_staff_sales(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_staff_id TEXT,
  p_staff_name TEXT,
  p_amount NUMERIC,
  p_date TEXT
) RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO staff_sales_summary (tenant_id, org_id, staff_id, staff_name, total_amount, booking_count, last_booking_date)
  VALUES (p_tenant_id, p_org_id, p_staff_id, p_staff_name, p_amount, 1, p_date::date)
  ON CONFLICT (tenant_id, org_id, staff_id)
  DO UPDATE SET
    total_amount = staff_sales_summary.total_amount + p_amount,
    booking_count = staff_sales_summary.booking_count + 1,
    last_booking_date = GREATEST(staff_sales_summary.last_booking_date, p_date::date),
    staff_name = COALESCE(p_staff_name, staff_sales_summary.staff_name),
    updated_at = NOW();
END;
$$;

-- メニュー別集計更新関数
CREATE OR REPLACE FUNCTION increment_menu_sales(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_menu_id TEXT,
  p_menu_name TEXT,
  p_amount NUMERIC,
  p_count INTEGER
) RETURNS VOID
SECURITY DEFINER
SET search_path = public  
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, menu_name, total_amount, booking_count)
  VALUES (p_tenant_id, p_org_id, p_menu_id, p_menu_name, p_amount, p_count)
  ON CONFLICT (tenant_id, org_id, menu_id)
  DO UPDATE SET
    total_amount = menu_sales_summary.total_amount + p_amount,
    booking_count = menu_sales_summary.booking_count + p_count,
    menu_name = COALESCE(p_menu_name, menu_sales_summary.menu_name),
    updated_at = NOW();
END;
$$;

-- 重複防止付き統合集計更新関数（オプション）
CREATE OR REPLACE FUNCTION increment_sales_with_guard(
  p_reservation_id TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT, 
  p_business_date TEXT,
  p_amount NUMERIC,
  p_staff_id TEXT,
  p_staff_name TEXT,
  p_menus JSONB DEFAULT NULL
) RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  result JSONB := '{"status": "success", "operations": []}';
  op_log JSONB[] := '{}';
BEGIN
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM sales_aggregation_log WHERE reservation_id = p_reservation_id) THEN
    RETURN '{"status": "duplicate", "message": "Already processed"}';
  END IF;
  
  -- ログ記録
  INSERT INTO sales_aggregation_log (reservation_id, tenant_id, org_id, total_amount)
  VALUES (p_reservation_id, p_tenant_id, p_org_id, p_amount);
  
  -- 日別集計更新
  PERFORM increment_daily_sales(p_tenant_id, p_org_id, p_business_date, p_amount);
  op_log := array_append(op_log, '{"table": "daily_sales_summary", "amount": ' || p_amount || '}');
  
  -- スタッフ別集計更新
  IF p_staff_id IS NOT NULL THEN
    PERFORM increment_staff_sales(p_tenant_id, p_org_id, p_staff_id, p_staff_name, p_amount, p_business_date);
    op_log := array_append(op_log, '{"table": "staff_sales_summary", "staff_id": "' || p_staff_id || '"}');
  END IF;
  
  -- メニュー別集計更新
  IF p_menus IS NOT NULL THEN
    WITH menu_items AS (
      SELECT 
        m.id,
        m.name,
        (m.price::numeric) * (m.quantity::int) as amount,
        m.quantity::int as count
      FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
    )
    INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, menu_name, total_amount, booking_count)
    SELECT p_tenant_id, p_org_id, id, name, amount, count FROM menu_items
    ON CONFLICT (tenant_id, org_id, menu_id)
    DO UPDATE SET
      total_amount = menu_sales_summary.total_amount + EXCLUDED.total_amount,
      booking_count = menu_sales_summary.booking_count + EXCLUDED.booking_count,
      updated_at = NOW();
      
    op_log := array_append(op_log, '{"table": "menu_sales_summary", "menu_count": ' || jsonb_array_length(p_menus) || '}');
  END IF;
  
  result := jsonb_set(result, '{operations}', to_jsonb(op_log));
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- エラー時はログ削除してロールバック
  DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- Service Role Keyに実行権限付与
GRANT EXECUTE ON FUNCTION increment_daily_sales TO service_role;
GRANT EXECUTE ON FUNCTION increment_staff_sales TO service_role;
GRANT EXECUTE ON FUNCTION increment_menu_sales TO service_role;
GRANT EXECUTE ON FUNCTION increment_sales_with_guard TO service_role;

-- 一般ユーザーには実行権限なし（Service Roleのみ）
REVOKE EXECUTE ON FUNCTION increment_daily_sales FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_staff_sales FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_menu_sales FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_sales_with_guard FROM PUBLIC;
```

**実行方法:**
1. 上記SQLをコピー
2. SQL EditorのQuery欄に貼り付け（前のクエリをクリア）
3. **「Run」**ボタンをクリック
4. 成功メッセージを確認

## ✅ 実行後の確認

### テーブル作成確認
```sql
-- テーブル一覧表示
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%sales%';
```

期待される結果：
- `daily_sales_summary`
- `staff_sales_summary` 
- `menu_sales_summary`
- `sales_aggregation_log`

### RPC関数作成確認
```sql
-- 関数一覧表示
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'increment%';
```

期待される結果：
- `increment_daily_sales`
- `increment_staff_sales`
- `increment_menu_sales`
- `increment_sales_with_guard`

## 🚨 エラー対処

### よくあるエラー

1. **権限エラー**: `permission denied for schema public`
   - 解決策: プロジェクトのOwner権限があることを確認

2. **テーブル重複エラー**: `relation already exists`
   - 解決策: `DROP TABLE IF EXISTS [table_name]` で削除してから再実行

3. **関数重複エラー**: `function already exists`
   - 解決策: `CREATE OR REPLACE FUNCTION` を使用（既に対応済み）

## 📝 実行完了後

1. **ドキュメント更新**: 実行日時と結果を記録
2. **動作テスト**: Convex予約完了処理のテスト実行
3. **監視設定**: 集計データの動作確認

---

**注意**: 本番環境での実行前に、必ず開発環境でテストを実施してください。