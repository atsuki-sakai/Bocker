-- ポイントシステムインデックス最適化（第1部）

-- 1. point_task_queueテーブルの最適化インデックス追加
CREATE INDEX IF NOT EXISTS idx_point_task_queue_status_scheduled 
ON point_task_queue(status, scheduled_for_unix) 
WHERE is_archive = false;

CREATE INDEX IF NOT EXISTS idx_point_task_queue_tenant_org_status 
ON point_task_queue(tenant_id, org_id, status) 
WHERE is_archive = false;

CREATE INDEX IF NOT EXISTS idx_point_task_queue_customer_status 
ON point_task_queue(customer_id, status) 
WHERE is_archive = false;

-- 2. point_transactionテーブルの最適化インデックス追加
CREATE INDEX IF NOT EXISTS idx_point_transaction_customer_date 
ON point_transaction(customer_id, transaction_date_unix) 
WHERE is_archive = false;

CREATE INDEX IF NOT EXISTS idx_point_transaction_tenant_org_date 
ON point_transaction(tenant_id, org_id, transaction_date_unix) 
WHERE is_archive = false;

-- 3. customer_pointsテーブルの最適化インデックス追加
CREATE INDEX IF NOT EXISTS idx_customer_points_tenant_org_customer 
ON customer_points(tenant_id, org_id, customer_uid) 
WHERE is_archive = false;