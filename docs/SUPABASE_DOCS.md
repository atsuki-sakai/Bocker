# Supabaseテーブル関係図

## ER図（Entity Relationship Diagram）

```mermaid
erDiagram
    customer ||--o{ customer_detail : "has"
    customer ||--o{ customer_points : "has"
    customer ||--o{ point_transaction : "has"
    customer ||--o{ point_task_queue : "has"
    customer ||--o{ coupon_transaction : "has"
    customer ||--o{ carte : "has"
    customer ||..o{ reservation : "関連(FK制約なし)"
    
    carte ||--o{ carte_detail : "has"
    reservation ||--o{ carte_detail : "referenced_by"
    reservation ||--o{ reservation_detail : "has(Convex ID)"
    
    tracking_event }o--o{ tracking_summaries : "集計"

    customer {
        uuid uid PK
        text line_id
        text first_name
        text last_name
        text phone
        text email
        text tenant_id
        text org_id
    }
    
    customer_detail {
        uuid uid PK
        uuid customer_uid FK
        text email
        date birthday
        text gender
        text notes
    }
    
    customer_points {
        uuid uid PK
        uuid customer_uid FK
        int total_points
        bigint last_transaction_date_unix
    }
    
    point_transaction {
        uuid id PK
        uuid customer_id FK
        text reservation_id
        int points
        text transaction_type
        bigint transaction_date_unix
    }
    
    point_task_queue {
        uuid id PK
        uuid customer_id FK
        text reservation_id
        int points
        text status
        bigint scheduled_for_unix
    }
    
    coupon_transaction {
        uuid id PK
        uuid customer_id FK
        uuid coupon_id "❌参照先なし"
        text reservation_id
        int discount_amount
    }
    
    carte {
        uuid id PK
        uuid customer_id FK
        text skin_type
        text hair_type
        text allergy_history
        text medical_history
    }
    
    carte_detail {
        uuid id PK
        uuid carte_id FK
        uuid reservation_id FK
        uuid staff_id "❌参照先なし"
        text before_hair_img_path
        text after_hair_img_path
        jsonb menu_details_json
        jsonb used_products_json
    }
    
    reservation {
        uuid uid PK
        text _convex_id UK
        text master_id
        text customer_id "⚠️Convex形式"
        text staff_id "❌参照先なし"
        text customer_name
        text staff_name
        text status
        bigint start_time_unix
        bigint end_time_unix
    }
    
    reservation_detail {
        uuid uid PK
        text _convex_id UK
        text _convex_reservation_id FK
        text reservation_id "Convex形式"
        text coupon_id "❌参照先なし"
        int total_price
        text payment_method
        jsonb menus
        jsonb options
    }
    
    tracking_event {
        uuid id PK
        text session_id
        text event_type
        text event_source
        text page_url
        bigint event_timestamp_unix
    }
    
    tracking_summaries {
        uuid id PK
        date summary_date
        text dimension_type
        text dimension_value
        int total_count
    }
```

## リレーション一覧表

### ✅ 正常に設定されている外部キー制約

| 子テーブル | 子カラム | 親テーブル | 親カラム | 削除時の動作 |
|------------|----------|------------|----------|--------------|
| customer_detail | customer_uid | customer | uid | CASCADE |
| customer_points | customer_uid | customer | uid | CASCADE |
| point_transaction | customer_id | customer | uid | CASCADE |
| point_task_queue | customer_id | customer | uid | CASCADE |
| coupon_transaction | customer_id | customer | uid | CASCADE |
| carte | customer_id | customer | uid | CASCADE |
| carte_detail | carte_id | carte | id | CASCADE |
| carte_detail | reservation_id | reservation | uid | SET NULL |
| reservation_detail | _convex_reservation_id | reservation | _convex_id | CASCADE |

### ⚠️ 外部キー制約が設定できない関係

| テーブル | カラム | 理由 | 対応方法 |
|----------|--------|------|----------|
| reservation | customer_id | text型（Convex ID）とUUID型の不一致 | マッピングテーブルまたはアプリ層で管理 |
| coupon_transaction | coupon_id | couponテーブルが存在しない | Convexで管理 or テーブル追加 |
| carte_detail | staff_id | staffテーブルが存在しない | Convexで管理 or テーブル追加 |
| reservation | staff_id | staffテーブルが存在しない | Convexで管理 or テーブル追加 |
| reservation_detail | coupon_id | couponテーブルが存在しない | Convexで管理 or テーブル追加 |

## データフローの特徴

### 1. **顧客中心の設計**
- `customer`テーブルが中心となり、ほぼ全てのテーブルと関連
- ポイント、クーポン、カルテ、予約が顧客に紐付く

### 2. **Convexとの併用**
- `_convex_id`カラムでConvexのデータと連携
- reservation関連は特にConvex依存が強い

### 3. **独立したトラッキングシステム**
- `tracking_event`と`tracking_summaries`は他のテーブルと独立
- アクセス解析用の別システム

### 4. **セキュリティ上の注意点**
- **全テーブルでRLSが無効** 🚨
- 早急にRLSポリシーの設定が必要

## 推奨事項

1. **短期的対応**
   - RLSポリシーを全テーブルに設定
   - 重要なカラムにインデックスを追加

2. **中期的対応**
   - staffテーブルとcouponテーブルの追加検討
   - またはConvexとの同期ビューを作成

3. **長期的対応**
   - Convex依存を減らし、Supabaseで完結するデータモデルへ移行
   - customer_idの統一（UUID化）