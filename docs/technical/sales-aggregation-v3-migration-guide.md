# 売上集計V3移行ガイド

## 概要

オプション料金・スタッフ指名料・クーポン割引・ポイント割引をメニュー売上に按分配賦する新しい売上集計システム（v3）の実装と移行手順について説明します。

## 問題の背景

### 現在の問題
- **日別集計**: `total_price`（最終支払い金額）で記録
- **メニュー集計**: メニューの基本金額のみで記録
- **結果**: 約110万円の差額が発生（オプション・指名料・割引が未反映）

### 差額の構成要素
1. **オプション料金**: `ReservationOption[]` の合計
2. **スタッフ指名料**: `staff.extra_charge`
3. **クーポン割引**: `coupon_discount` (負の値)
4. **ポイント使用**: `use_points` (負の値)

## 新機能の詳細

### increment_sales_with_guard_v3の特徴

1. **差額配賦ロジック**
   ```sql
   allocation_ratio = p_amount / menu_subtotal
   allocated_amount = base_amount × allocation_ratio
   ```

2. **追加パラメータ**
   - `p_options`: オプション情報（JSONB）
   - `p_extra_charge`: スタッフ指名料
   - `p_coupon_discount`: クーポン割引額
   - `p_use_points`: ポイント使用額

3. **計算例**
   ```
   メニュー合計: 13,000円 (カット5,000 + カラー8,000)
   オプション: 1,000円
   指名料: 500円
   クーポン: -200円
   ポイント: -300円
   最終支払い: 15,000円
   
   配賦比率: 15,000 ÷ 13,000 = 1.1538
   カット配賦後: 5,000 × 1.1538 = 5,769円
   カラー配賦後: 8,000 × 1.1538 = 9,231円
   ```

## 移行手順

### 1. Supabase関数の作成

`supabase_v3_migration.sql` ファイルをSupabaseのSQL Editorで実行：

```bash
# ファイルの場所
/Users/atsukisakai/Desktop/bokcer-project/bocker/supabase_v3_migration.sql
```

### 2. Convex側の変更確認

`convex/reservation/action.ts:1041-1090` で以下が実装済み：
- `increment_sales_with_guard_v3` の呼び出し
- オプション・指名料・割引データの送信

### 3. テスト実行

#### デバッグ関数でのテスト
```sql
SELECT debug_increment_sales_v3(
  'test_reservation_debug',
  'your_tenant_id',
  'your_org_id', 
  '2025-01-15',
  15000,
  'staff123',
  'Test Staff',
  '[{"id": "menu1", "name": "カット", "price": "5000", "quantity": "1"}]'::jsonb,
  '[{"id": "option1", "name": "トリートメント", "price": "1000", "quantity": "1"}]'::jsonb,
  500, -- 指名料
  200, -- クーポン
  300  -- ポイント
);
```

#### 実際の集計テスト
```sql
SELECT increment_sales_with_guard_v3(
  'test_reservation_actual',
  'your_tenant_id',
  'your_org_id',
  '2025-01-15',
  15000,
  'staff123', 
  'Test Staff',
  '[{"id": "menu1", "name": "カット", "price": "5000", "quantity": "1"}]'::jsonb,
  '[{"id": "option1", "name": "トリートメント", "price": "1000", "quantity": "1"}]'::jsonb,
  500,
  200,
  300
);
```

## 既存データとの互換性

### 安全性確保
1. **v2関数は保持**: 既存処理への影響なし
2. **新しいログテーブル**: `sales_aggregation_log` での重複チェック
3. **段階的移行**: v3を有効化する前に十分テスト

### 移行オプション

#### オプション1: 即座にv3切り替え（推奨）
- 新規予約からv3を使用
- 既存データはそのまま保持

#### オプション2: 既存データ補正
```sql
-- 既存メニュー集計データを補正する場合のクエリ例
UPDATE menu_sales_summary mss
SET total_amount = mss.total_amount * (
  SELECT AVG(dss.total_amount) / AVG(mss2.total_amount)
  FROM daily_sales_summary dss
  JOIN menu_sales_summary mss2 ON ...
  WHERE ...
)
WHERE mss.summary_month >= '2024-01-01';
```

## 検証ポイント

### 1. 集計一致性の確認
```sql
-- 日別とメニュー集計の合計比較
WITH daily_total AS (
  SELECT SUM(total_amount) as daily_sum
  FROM daily_sales_summary 
  WHERE tenant_id = ? AND org_id = ? AND business_date BETWEEN ? AND ?
),
menu_total AS (
  SELECT SUM(total_amount) as menu_sum
  FROM menu_sales_summary
  WHERE tenant_id = ? AND org_id = ? AND summary_month BETWEEN ? AND ?
)
SELECT 
  daily_sum,
  menu_sum,
  daily_sum - menu_sum as difference,
  ROUND((menu_sum / daily_sum) * 100, 2) as match_percentage
FROM daily_total, menu_total;
```

### 2. 配賦比率の妥当性確認
- 配賦比率が極端でないか（0.5〜2.0の範囲内が目安）
- メニュー別配賦金額が妥当か

## 注意事項

1. **本番適用前の必須テスト**
   - デバッグ関数での計算検証
   - 少数の実際のデータでのテスト

2. **モニタリング**
   - 配賦比率の異常値検出
   - 集計処理のエラー監視

3. **ロールバック手順**
   - `increment_sales_with_guard_v2` への復帰が可能
   - 関数名を変更するだけで切り替え可能

## 期待される効果

1. **データ整合性向上**: 日別・メニュー集計の完全一致
2. **分析精度向上**: メニュー別収益がより正確に
3. **レポート品質向上**: 売上構成比が正確に

---

**最終更新**: 2025-01-16  
**作成者**: Claude Code  
**レビュー**: 要確認