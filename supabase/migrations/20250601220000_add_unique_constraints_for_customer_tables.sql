-- customer_detailとcustomer_pointsテーブルにユニーク制約を追加
-- これにより、update_customer_with_details_and_points関数のON CONFLICTが正常に動作するようになります

-- customer_detailテーブルにユニーク制約を追加
-- 各顧客（customer_uid）について、テナント・組織の組み合わせでは1つの詳細レコードのみ存在できる
ALTER TABLE public.customer_detail 
ADD CONSTRAINT customer_detail_customer_tenant_org_unique 
UNIQUE (customer_uid, tenant_id, org_id);

-- customer_pointsテーブルにユニーク制約を追加  
-- 各顧客（customer_uid）について、テナント・組織の組み合わせでは1つのポイントレコードのみ存在できる
ALTER TABLE public.customer_points 
ADD CONSTRAINT customer_points_customer_tenant_org_unique 
UNIQUE (customer_uid, tenant_id, org_id); 