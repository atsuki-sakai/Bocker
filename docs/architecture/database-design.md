# Bocker データベース設計

**最終更新**: 2025年6月23日  
**ドキュメントバージョン**: 1.0

## 概要

Bockerは**ハイブリッドデータベース設計**を採用し、リアルタイム性が必要なデータとアーカイブデータを適切に分離することで、パフォーマンスとコスト効率を両立させています。

## アーキテクチャ設計思想

### 1. ハイブリッドデータベース構成

```
┌─────────────────────┐    毎日移行    ┌─────────────────────┐
│      Convex         │  ────────────►  │     Supabase        │
│  (リアルタイムDB)    │                 │   (履歴・分析DB)     │
│                     │                 │                     │
│ ・未来の予約        │                 │ ・完了済み予約      │
│ ・アクティブデータ  │                 │ ・顧客マスター      │
│ ・マスターデータ    │                 │ ・分析用データ      │
│ ・リアルタイム機能  │                 │ ・長期保存データ    │
└─────────────────────┘                 └─────────────────────┘
```

### 2. 設計原則

#### **データの性質による分離**
- **Convex（リアルタイムDB）**: 頻繁に更新され、リアルタイム性が重要
- **Supabase（分析DB）**: 変更が少なく、分析・長期保存が目的

#### **マルチテナンシー**
- 全テーブルに`tenant_id`と`org_id`を含む
- Clerk組織機能と連携したアクセス制御
- データ分離とセキュリティの確保

#### **スキーマ一貫性**
- 両DB間で基本構造を統一
- 移行時のデータ変換を最小化
- ID参照の整合性を保持

## Convex データベース設計

### 主要テーブル構造

#### 組織・テナント管理
```typescript
// テナント（最上位）
tenant: {
  user_id: string,          // Clerkユーザーキー
  user_email: string,
  stripe_customer_id?: string,
  // 標準フィールド
}

// 組織（テナント配下）
organization: {
  tenant_id: Id<"tenant">,
  is_active: boolean,
  org_name: string,
  org_email?: string,
  stripe_account_id?: string,
  stripe_connect_status?: string,
  // 標準フィールド
}
```

#### スタッフ管理
```typescript
// スタッフ基本情報
staff: {
  tenant_id: Id<"tenant">,
  org_id: Id<"organization">,
  connect_clerk: boolean,    // Clerk連携有無
  clerk_user_id?: string,
  name: string,
  description?: string,
  images?: string[],
  is_active: boolean,
  // 標準フィールド
}

// スタッフ詳細設定
staff_config: {
  tenant_id: Id<"tenant">,
  org_id: Id<"organization">,
  staff_id: Id<"staff">,
  age?: number,
  gender?: string,
  instagram_link?: string,
  tags?: string[],
  role: string,              // owner, manager, staff
  featured_hair_images?: any[],
  extra_charge?: number,
  priority?: number,
  // 標準フィールド
}
```

#### 予約システム
```typescript
// 予約
reservation: {
  tenant_id: Id<"tenant">,
  org_id: Id<"organization">,
  customer_name: string,
  customer_email?: string,
  staff_id: Id<"staff">,
  staff_name: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
  payment_status: "pending" | "paid" | "failed",
  stripe_checkout_session_id?: string,
  date: string,              // YYYY-MM-DD形式
  start_time_unix: number,
  end_time_unix: number,
  // 標準フィールド
}

// 予約詳細
reservation_detail: {
  tenant_id: Id<"tenant">,
  org_id: Id<"organization">,
  reservation_id: Id<"reservation">,
  coupon_id?: Id<"coupon">,
  total_price: number,
  payment_method: string,
  menus: any[],              // 選択されたメニュー
  options: any[],            // 選択されたオプション
  extra_charge?: number,
  use_points?: number,
  coupon_discount?: number,
  featured_hair_images?: any[],
  notes?: string,
  // 標準フィールド
}
```

#### メニュー・オプション
```typescript
// メニュー
menu: {
  tenant_id: Id<"tenant">,
  org_id: Id<"organization">,
  name: string,
  category: string,
  price: number,
  duration_minutes: number,
  description?: string,
  images?: string[],
  is_active: boolean,
  // 標準フィールド
}

// オプション
option: {
  tenant_id: Id<"tenant">,
  org_id: Id<"organization">,
  menu_id: Id<"menu">,
  name: string,
  price: number,
  duration_minutes: number,
  description?: string,
  in_stock?: number,         // 在庫数（null=無制限）
  max_stock?: number,
  low_stock_threshold?: number,
  is_active: boolean,
  // 標準フィールド
}
```

### インデックス設計

#### 高頻度アクセスパターン
```typescript
// 予約関連
reservation:
  .index("by_tenant_org_date", ["tenant_id", "org_id", "date"])
  .index("by_staff_date", ["staff_id", "date"])
  .index("by_status_date", ["status", "date"])

// スタッフ管理
staff:
  .index("by_tenant_org_active", ["tenant_id", "org_id", "is_active"])

// メニュー・オプション
menu:
  .index("by_tenant_org_category", ["tenant_id", "org_id", "category"])
option:
  .index("by_menu_active", ["menu_id", "is_active"])
```

## Supabase データベース設計

### 主要テーブル構造

#### 顧客マスター
```sql
-- 顧客基本情報
CREATE TABLE customer (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顧客詳細情報
CREATE TABLE customer_detail (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customer(uid),
  name_kana TEXT,
  name_kanji TEXT,
  phone TEXT,
  gender TEXT,
  birthday DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顧客ポイント
CREATE TABLE customer_points (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customer(uid),
  current_balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 履歴データ（Convexから移行）
```sql
-- 予約履歴
CREATE TABLE reservation (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customer(uid),
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,              -- Convex参照ID
  customer_name TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time_unix BIGINT NOT NULL,
  end_time_unix BIGINT NOT NULL,
  _convex_id TEXT UNIQUE NOT NULL,     -- 元のConvex ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 予約詳細履歴
CREATE TABLE reservation_detail (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id TEXT NOT NULL,        -- Convex参照ID
  _convex_reservation_id TEXT NOT NULL REFERENCES reservation(_convex_id),
  total_price INTEGER,
  payment_method TEXT NOT NULL,
  menus JSONB,
  options JSONB,
  use_points INTEGER,
  coupon_discount INTEGER,
  notes TEXT,
  _convex_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ID設計原則

#### 統一されたID型設計

| ID種別 | データ型 | 用途 | 外部キー制約 | 例 |
|--------|----------|------|-------------|-----|
| **Supabase内部ID** | UUID | Supabase内リレーション | あり | customer.uid |
| **Convex参照ID** | TEXT | Convexシステム参照 | なし | staff_id |
| **外部システムID** | TEXT | 外部サービス連携 | なし | stripe_customer_id |

#### 設計原則
1. **内部リレーション**: UUID + 外部キー制約
2. **Convex参照**: TEXT型、制約なし
3. **移行時保持**: `_convex_id`で元データとの対応
4. **整合性確保**: 適切な参照関係の維持

## データ移行戦略

### 移行対象データ

#### Convex → Supabase（日次移行）
- **完了済み予約**: 24時間以上経過した予約
- **キャンセル済み予約**: 7日以上経過した予約
- **関連詳細データ**: 予約詳細、決済情報

#### Convexに残すデータ
- **未来の予約**: 進行中・確定済み予約
- **マスターデータ**: スタッフ、メニュー、オプション、設定
- **リアルタイムデータ**: 現在進行中の処理

### 移行フロー

```
1. 対象データ特定 → 2. バッチ取得(500件) → 3. 型変換 → 4. Supabase投入 → 5. Convex削除
     ↓                    ↓                    ↓           ↓              ↓
 条件フィルタ        ページング処理         ID変換       UPSERT         論理削除
```

## パフォーマンス最適化

### Convex最適化
- **Promise.all**: 並列クエリ実行
- **Map構造**: O(n²)→O(n)の計算量削減
- **直接DB**: ctx.runQueryオーバーヘッド削減
- **フィールド投影**: 必要データのみ取得

### Supabase最適化
- **パーティション**: 月次パーティション分割
- **インデックス**: 高頻度クエリ最適化
- **BRIN**: 時系列データ効率化
- **Connection Pool**: 接続効率化

## 運用考慮事項

### バックアップ戦略
- **Convex**: 自動バックアップ機能利用
- **Supabase**: Point-in-Time Recovery設定
- **クロスプラットフォーム**: 定期的な整合性チェック

### 監視項目
- **データ同期**: 移行処理の成功率
- **パフォーマンス**: クエリ実行時間
- **容量**: ストレージ使用量
- **整合性**: データ不整合検出

### スケーラビリティ
- **3,000店舗**: 現行構成で対応可能
- **10,000店舗**: Supabaseパーティション必須
- **30,000店舗**: シャーディング・分散化必要

---

**関連ドキュメント**:
- [マイグレーション実装計画](../technical/database/migration/implementation-plan.md)
- [スケーリング分析](./scaling-analysis.md)
- [コスト分析](../operations/cost-analysis.md)