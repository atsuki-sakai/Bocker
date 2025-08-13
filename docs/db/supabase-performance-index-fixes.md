# Supabaseパフォーマンス最適化: 重複インデックス解消・未使用インデックス整理・FKカバリングIndex追加

## 目的
- Supabaseアドバイザ（development/production）の指摘に基づき、DBパフォーマンス上の問題に対する具体的な修正案をまとめます。
- 優先度は「重複インデックスの解消」→「外部キーのカバリングIndex追加」→「未使用インデックスの段階的整理」の順で対応します。

## 背景（アドバイザ要約）
- 重複インデックス（WARN）
  - 開発: customer（customer_tenant_org_idx, idx_customer_tenant_org_archive）、customer_points（idx_customer_points_tenant_org, idx_customer_points_tenant_org_customer）、point_transaction（idx_point_transaction_date_idx, idx_point_transaction_tenant_org_date）、reservation（idx_reservation_customer_id, idx_reservation_customer_uid）
  - 本番: 上記に加え carte（idx_carte_customer, idx_carte_customer_uid）、coupon_transaction（idx_coupon_transaction_customer, idx_coupon_transaction_customer_uid）、reservation_detail（idx_reservation_detail_convex_reservation_id, idx_reservation_detail_reservation） 等
- 未使用インデックス（INFO）: customer / customer_points / reservation / reservation_detail / point_transaction / point_task_queue / coupon_transaction / carte / tracking_* / 集計パーティション系 など多数
- 外部キーにカバリングインデックスなし（INFO, 開発）: coupon_transaction.fk_coupon_transaction_customer_uid に covering index 不足

## 対応方針
1. 重複インデックスのDROP（安全に CONCURRENTLY + IF EXISTS）
2. 外部キーのカバリングインデックス追加（開発）
3. 未使用インデックスの整理は、直近の実運用ワークロードで本当に未使用か確認→段階的にDROP（まずは対象一覧と調査手順を用意）

## 注意事項
- DROP INDEX CONCURRENTLY はトランザクション外で実行する必要があります（マイグレーションの仕組みによりトランザクション内実行になる場合、スクリプト分離や手動実行を検討）
- 本提案のDROP対象はアドバイザの「重複」判定に基づくもので、同一カラム・同一順序を指す前提です。実行前に `pg_indexes`/`pg_get_indexdef` で定義が完全一致することを確認してください。

## SQL案（Development: 重複インデックスの解消）
```sql
-- customer: keep customer_tenant_org_idx, drop archive
DROP INDEX CONCURRENTLY IF EXISTS public.idx_customer_tenant_org_archive;

-- customer_points: keep idx_customer_points_tenant_org (or the more canonical one), drop the other
DROP INDEX CONCURRENTLY IF EXISTS public.idx_customer_points_tenant_org_customer;

-- point_transaction: choose one to keep; drop the duplicate
DROP INDEX CONCURRENTLY IF EXISTS public.idx_point_transaction_tenant_org_date;

-- reservation: choose one; drop the duplicate
DROP INDEX CONCURRENTLY IF EXISTS public.idx_reservation_customer_uid;
```

## SQL案（Production: 重複インデックスの解消）
```sql
-- carte: keep one
DROP INDEX CONCURRENTLY IF EXISTS public.idx_carte_customer_uid;

-- coupon_transaction: keep one
DROP INDEX CONCURRENTLY IF EXISTS public.idx_coupon_transaction_customer_uid;

-- customer: keep customer_tenant_org_idx
DROP INDEX CONCURRENTLY IF EXISTS public.idx_customer_tenant_org_archive;

-- customer_points: keep idx_customer_points_tenant_org
DROP INDEX CONCURRENTLY IF EXISTS public.idx_customer_points_tenant_org_customer;

-- point_transaction: keep one for customer, one for date
DROP INDEX CONCURRENTLY IF EXISTS public.idx_point_transaction_customer_uid;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_point_transaction_tenant_org_date;

-- reservation_detail: keep one
DROP INDEX CONCURRENTLY IF EXISTS public.idx_reservation_detail_reservation;
```

## 補足（実行前の確認用SQL例）
```sql
-- 1) インデックス定義の確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'customer_tenant_org_idx','idx_customer_tenant_org_archive',
    'idx_customer_points_tenant_org','idx_customer_points_tenant_org_customer',
    'idx_point_transaction_date_idx','idx_point_transaction_tenant_org_date',
    'idx_reservation_customer_id','idx_reservation_customer_uid',
    'idx_carte_customer','idx_carte_customer_uid',
    'idx_coupon_transaction_customer','idx_coupon_transaction_customer_uid',
    'idx_reservation_detail_convex_reservation_id','idx_reservation_detail_reservation'
  );

-- 2) 使用状況（pg_stat_user_indexes が有効な場合）
SELECT s.relname AS table_name, i.indexrelname AS index_name, idx_scan
FROM pg_stat_user_indexes i
JOIN pg_class s ON s.oid = i.relid
WHERE i.indexrelname IN (
    'customer_tenant_org_idx','idx_customer_tenant_org_archive',
    'idx_customer_points_tenant_org','idx_customer_points_tenant_org_customer',
    'idx_point_transaction_date_idx','idx_point_transaction_tenant_org_date',
    'idx_reservation_customer_id','idx_reservation_customer_uid',
    'idx_carte_customer','idx_carte_customer_uid',
    'idx_coupon_transaction_customer','idx_coupon_transaction_customer_uid',
    'idx_reservation_detail_convex_reservation_id','idx_reservation_detail_reservation'
);
```

## SQL案（Development: 外部キーカバリングインデックス追加）
```sql
-- coupon_transaction(customer_uid) のFKをカバー
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_transaction_customer_uid
  ON public.coupon_transaction (customer_uid);
```

## 未使用インデックスの整理（提案）
- 1〜2週間の実運用アクセスで `pg_stat_user_indexes.idx_scan` を観測し、0継続のものを候補化
- 想定クエリプランでの効果（`EXPLAIN (ANALYZE, BUFFERS)`）を要所で確認
- 候補を段階的にDROP（まずは明らかに不要な派生・冗長インデックスから）

## ロールアウト計画
1. Developmentで重複DROP + FK index追加→動作/パフォーマンス確認
2. Staging/Previewで再検証
3. Productionで時間帯を選定して `CONCURRENTLY` でDROP/CREATE（トランザクション外）

## ロールバック
- DROPしたインデックスは `CREATE INDEX CONCURRENTLY ...` ですぐ復旧可能
- 事前に `pg_get_indexdef` の控えをIssueコメントに残しておく

## タスク
- [ ] インデックス定義の完全一致確認（pg_get_indexdef）
- [ ] DevelopmentでDROP/CREATE適用
- [ ] 影響監視（スロークエリ/CPU/IO/ロック）
- [ ] Production適用
- [ ] 未使用インデックスの観測開始と候補リスト化
