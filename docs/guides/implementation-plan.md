# ConvexからSupabaseへのデータ移行実装計画

## 1. 概要

このドキュメントは、Bockerの大規模SaaS運用（3,000店舗想定）において、ConvexからSupabaseへの日次データ移行を安定的かつ効率的に実行するための実装計画を定義します。

### 1.1 背景と目的

- **背景**: 
  - Convexはリアルタイムデータベースとして優れているが、データ容量の増加によりパフォーマンスとコストの問題が発生
  - 履歴データの長期保存と分析にはPostgreSQLベースのSupabaseが適している
  
- **目的**:
  - アクティブデータ（未来の予約、現在の設定等）はConvexで管理
  - 完了済みデータ（過去の予約、履歴等）はSupabaseへ移行
  - システム全体のパフォーマンスとコスト効率を最適化

### 1.2 移行対象データの定義

#### アクティブデータ（Convexに残すデータ）
- 未来の予約（start_time_unix > 現在時刻）
- 進行中の予約（status = 'pending' または 'confirmed'）
- スタッフ、メニュー、オプション、設定等のマスターデータ（すべてConvexで管理）
- 最近のアクティビティ（30日以内）

#### 履歴データ（Supabaseへ移行するデータ） 
**予約関連のみ**：
- 完了済み予約（reservation: status = 'completed' かつ end_time_unix < 現在時刻 - 24時間）
- 予約詳細（reservation_detail: 対応する予約が完了済みのもの）
- キャンセル済み予約（status = 'cancelled' かつ 7日以上経過）
- 削除済み予約データ（is_archive = true）

## 2. アーキテクチャ設計

### 2.1 全体構成

```
┌─────────────────┐     毎日深夜2時     ┌──────────────────┐
│                 │  ───────────────►   │                  │
│     Convex      │    バッチ移行処理    │    Supabase     │
│ (アクティブDB)   │  ◄───────────────   │   (履歴DB)       │
│                 │    移行完了通知      │                  │
└─────────────────┘                    └──────────────────┘
         │                                      │
         │                                      │
         ▼                                      ▼
   リアルタイム処理                         分析・レポート処理
```

### 2.2 移行処理フロー

```
1. 事前チェック
   ├─ システム稼働状況確認
   ├─ 前回処理の完了確認
   └─ リソース使用率チェック

2. データ抽出（Convexから）
   ├─ 移行対象データの特定
   ├─ チャンク単位での取得（500件/バッチ）
   └─ データ整合性チェック

3. データ変換
   ├─ 型変換（Convex → Supabase）
   ├─ ID変換（_id → uid）
   └─ タイムスタンプ変換

4. データ投入（Supabaseへ）
   ├─ バルクインサート/アップサート
   ├─ トランザクション管理
   └─ エラーハンドリング

5. 後処理
   ├─ Convexからの削除（成功分のみ）
   ├─ 統計情報の更新
   └─ 処理結果の記録
```

### 2.3 パフォーマンス考慮事項

#### バッチサイズの最適化
- **基本バッチサイズ**: 500レコード/バッチ
- **動的調整**: システム負荷に応じて100-1000の範囲で調整
- **並列度**: 最大3並列（テーブル単位）

#### 負荷分散戦略
```typescript
// 優先度別の処理順序（予約関連のみ）
const migrationPriority = {
  high: ['reservation', 'reservation_detail']
};
```

#### リトライ戦略
- **初回失敗**: 5秒後にリトライ
- **2回目失敗**: 30秒後にリトライ
- **3回目失敗**: エラーログ記録、手動介入待ち

## 3. スキーマ設計

### 3.1 ID設計原則（2025年1月更新）

**統一されたID型の設計方針**:

| ID種別 | データ型 | 用途 | 外部キー制約 | 例 |
|--------|----------|------|-------------|-----|
| **Supabase内部ID** | UUID | Supabase内でのリレーション | あり | customer.uid, carte.id |
| **Convex参照ID** | TEXT | Convexシステムへの参照 | なし | staff_id, coupon_id, reservation_id |
| **外部システムID** | TEXT | 外部システムとの連携 | なし | stripe_checkout_session_id |

**設計原則**:
1. **Supabase内でのリレーション**: UUID型を使用し、外部キー制約を設定
2. **Convexへの参照**: TEXT型を使用し、外部キー制約は設定しない
3. **データ移行**: Convex IDは`_convex_`プレフィックスを付けて保存
4. **整合性**: `_convex_id`フィールドで元のConvexレコードとの対応を保持

### 3.2 Supabaseテーブル作成（ID設計原則適用）

#### 3.2.1 予約関連テーブル

```sql
-- 予約テーブル（ID設計原則適用）
CREATE TABLE IF NOT EXISTS public.reservation (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Supabase内部ID（UUID）
  tenant_id TEXT NOT NULL, -- Convex参照ID（TEXT）
  org_id TEXT NOT NULL, -- Convex参照ID（TEXT）
  customer_id UUID REFERENCES public.customer(uid), -- Supabase内部参照（UUID + 外部キー制約）
  staff_id TEXT NOT NULL, -- Convex参照ID（TEXT・制約なし）
  customer_name TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  stripe_checkout_session_id TEXT, -- 外部システムID（TEXT）
  date TEXT NOT NULL,
  start_time_unix BIGINT NOT NULL,
  end_time_unix BIGINT NOT NULL,
  _creation_time BIGINT, -- Unix時間として保存
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archive BOOLEAN NOT NULL DEFAULT FALSE,
  sort_key TEXT,
  -- Convex ID保持用（一意制約で重複防止）
  _convex_id TEXT UNIQUE NOT NULL
);

-- 予約詳細テーブル（ID設計原則適用）
CREATE TABLE IF NOT EXISTS public.reservation_detail (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Supabase内部ID（UUID）
  tenant_id TEXT NOT NULL, -- Convex参照ID（TEXT）
  org_id TEXT NOT NULL, -- Convex参照ID（TEXT）
  reservation_id TEXT NOT NULL, -- Convex参照ID（TEXT・制約なし）
  coupon_id TEXT, -- Convex参照ID（TEXT・制約なし）
  total_price INTEGER,
  payment_method TEXT NOT NULL,
  menus JSONB,
  options JSONB,
  extra_charge INTEGER,
  use_points INTEGER,
  coupon_discount INTEGER,
  featured_hair_images JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archive BOOLEAN NOT NULL DEFAULT FALSE,
  sort_key TEXT,
  -- Convex ID保持用（一意制約で重複防止）
  _convex_id TEXT UNIQUE NOT NULL,
  _convex_reservation_id TEXT NOT NULL, -- 対応する予約のConvex ID
  -- Supabase内部での外部キー制約（_convex_reservation_id → reservation._convex_id）
  FOREIGN KEY (_convex_reservation_id) REFERENCES public.reservation(_convex_id) ON DELETE CASCADE
);
```

#### 3.2.2 組織・設定関連テーブル

```sql
-- テナントテーブル
CREATE TABLE IF NOT EXISTS public.tenant (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archive BOOLEAN NOT NULL DEFAULT FALSE,
  sort_key TEXT,
  _convex_id TEXT UNIQUE
);

-- 組織テーブル
CREATE TABLE IF NOT EXISTS public.organization (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(uid),
  is_active BOOLEAN NOT NULL,
  org_name TEXT NOT NULL,
  org_email TEXT,
  stripe_account_id TEXT,
  stripe_connect_status TEXT,
  stripe_connect_created_at BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archive BOOLEAN NOT NULL DEFAULT FALSE,
  sort_key TEXT,
  _convex_id TEXT UNIQUE
);
```

#### 3.2.3 スタッフ関連テーブル

```sql
-- スタッフテーブル
CREATE TABLE IF NOT EXISTS public.staff (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(uid),
  org_id UUID REFERENCES public.organization(uid),
  connect_clerk BOOLEAN NOT NULL,
  clerk_user_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  images JSONB,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archive BOOLEAN NOT NULL DEFAULT FALSE,
  sort_key TEXT,
  _convex_id TEXT UNIQUE
);

-- スタッフ設定テーブル
CREATE TABLE IF NOT EXISTS public.staff_config (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(uid),
  org_id UUID REFERENCES public.organization(uid),
  staff_id UUID REFERENCES public.staff(uid),
  age INTEGER,
  gender TEXT,
  instagram_link TEXT,
  tags TEXT[],
  role TEXT NOT NULL,
  featured_hair_images JSONB,
  extra_charge INTEGER,
  priority INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archive BOOLEAN NOT NULL DEFAULT FALSE,
  sort_key TEXT,
  _convex_id TEXT UNIQUE
);
```

### 3.3 インデックス設計

```sql
-- 高頻度アクセスパターン用インデックス
CREATE INDEX idx_reservation_tenant_org_date ON public.reservation(tenant_id, org_id, date);
CREATE INDEX idx_reservation_status_date ON public.reservation(status, date) WHERE is_archive = FALSE;
CREATE INDEX idx_reservation_convex_id ON public.reservation(_convex_id);

-- 移行処理用インデックス
CREATE INDEX idx_migration_timestamp ON public.reservation(created_at) WHERE is_archive = FALSE;
```

## 4. 実装詳細

### 4.1 Convex側の実装

#### 4.1.1 データ取得クエリ

```typescript
// convex/migration/query.ts
export const getMigrationCandidates = query({
  args: {
    tableName: v.string(),
    cursor: v.optional(v.string()),
    limit: v.number(),
    cutoffTime: v.number()
  },
  returns: v.object({
    records: v.array(v.any()),
    nextCursor: v.optional(v.string()),
    hasMore: v.boolean()
  }),
  handler: async (ctx, { tableName, cursor, limit, cutoffTime }) => {
    // テーブル別の移行条件
    const migrationConditions = {
      reservation: (q: any) => q
        .withIndex('status_start_time_archive')
        .filter((q: any) => 
          q.and(
            q.eq(q.field('status'), 'completed'),
            q.lt(q.field('end_time_unix'), cutoffTime),
            q.eq(q.field('is_archive'), false)
          )
        ),
      reservation_detail: (q: any) => q
        .withIndex('by_reservation_archive')
        .filter((q: any) => q.eq(q.field('is_archive'), true)),
      // 他のテーブル条件...
    };

    const condition = migrationConditions[tableName as keyof typeof migrationConditions];
    if (!condition) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    const query = cursor 
      ? ctx.db.query(tableName).order('asc').after(cursor)
      : ctx.db.query(tableName).order('asc');

    const records = await condition(query).take(limit + 1);
    
    const hasMore = records.length > limit;
    const returnRecords = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore ? records[limit]._id : undefined;

    return {
      records: returnRecords,
      nextCursor,
      hasMore
    };
  }
});
```

#### 4.1.2 削除ミューテーション

```typescript
// convex/migration/mutation.ts
export const deleteMigratedRecords = internalMutation({
  args: {
    tableName: v.string(),
    ids: v.array(v.id('any'))
  },
  handler: async (ctx, { tableName, ids }) => {
    // トランザクション的に削除
    const results = await Promise.allSettled(
      ids.map(id => ctx.db.delete(id))
    );
    
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(`Failed to delete ${failed.length} records from ${tableName}`);
      // 失敗したIDを返す
      return {
        success: false,
        failedIds: ids.filter((_, i) => results[i].status === 'rejected')
      };
    }
    
    return { success: true, deletedCount: ids.length };
  }
});
```

### 4.2 移行アクション実装

```typescript
// convex/migration/action.ts
"use node"

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// テーブル移行優先順位（予約関連のみ）
const MIGRATION_TABLES = [
  // 予約関連テーブルのみ移行
  { name: 'reservation', batchSize: 500, priority: 1 },
  { name: 'reservation_detail', batchSize: 500, priority: 1 },
];

export const runDailyMigration = internalAction({
  args: {},
  handler: async (ctx) => {
    const startTime = Date.now();
    const cutoffTime = startTime - (24 * 60 * 60 * 1000); // 24時間前
    
    console.log('Starting daily migration process...');
    
    // システム負荷チェック
    const systemLoad = await checkSystemLoad();
    if (systemLoad.cpuUsage > 80 || systemLoad.memoryUsage > 85) {
      console.warn('System load too high, postponing migration');
      // 30分後に再試行
      await ctx.scheduler.runAfter(30 * 60 * 1000, internal.migration.action.runDailyMigration);
      return;
    }
    
    // 優先度順にテーブルを処理
    const sortedTables = MIGRATION_TABLES.sort((a, b) => a.priority - b.priority);
    
    for (const table of sortedTables) {
      try {
        await migrateTable(ctx, {
          tableName: table.name,
          batchSize: table.batchSize,
          cutoffTime
        });
      } catch (error) {
        console.error(`Failed to migrate table ${table.name}:`, error);
        // エラーを記録して次のテーブルへ
        await logMigrationError(ctx, table.name, error);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`Migration completed in ${duration}ms`);
    
    // 統計情報を記録
    await recordMigrationStats(ctx, {
      startTime,
      duration,
      tablesProcessed: sortedTables.length
    });
  }
});

async function migrateTable(
  ctx: any,
  { tableName, batchSize, cutoffTime }: { 
    tableName: string; 
    batchSize: number; 
    cutoffTime: number;
  }
) {
  let cursor: string | undefined;
  let totalMigrated = 0;
  
  while (true) {
    // Convexからデータ取得
    const { records, nextCursor, hasMore } = await ctx.runQuery(
      internal.migration.query.getMigrationCandidates,
      { tableName, cursor, limit: batchSize, cutoffTime }
    );
    
    if (records.length === 0) break;
    
    // Supabaseへ移行
    const migrationResult = await migrateToSupabase(tableName, records);
    
    if (migrationResult.success) {
      // 成功したレコードをConvexから削除
      const deleteResult = await ctx.runMutation(
        internal.migration.mutation.deleteMigratedRecords,
        {
          tableName,
          ids: migrationResult.migratedIds
        }
      );
      
      if (deleteResult.success) {
        totalMigrated += deleteResult.deletedCount;
      }
    }
    
    cursor = nextCursor;
    if (!hasMore) break;
    
    // 負荷軽減のため短時間待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Migrated ${totalMigrated} records from ${tableName}`);
}
```

### 4.3 Supabase側の実装

```typescript
// services/supabase/repositories/MigrationRepository.ts
import { BaseRepository } from './BaseRepository';
import { Database } from '@/supabase.types';

export class MigrationRepository extends BaseRepository {
  async bulkUpsert<T extends keyof Database['public']['Tables']>(
    tableName: T,
    records: any[],
    options: { 
      onConflict: string;
      chunkSize?: number;
    } = { onConflict: '_convex_id', chunkSize: 500 }
  ) {
    const chunks = this.chunkArray(records, options.chunkSize || 500);
    const results = [];
    
    for (const chunk of chunks) {
      try {
        const { data, error } = await this.client
          .from(tableName)
          .upsert(chunk, { 
            onConflict: options.onConflict,
            returning: 'minimal' 
          });
          
        if (error) throw error;
        results.push({ success: true, count: chunk.length });
      } catch (error) {
        console.error(`Failed to upsert chunk to ${tableName}:`, error);
        results.push({ success: false, error });
      }
    }
    
    return results;
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## 5. 監視とエラーハンドリング

### 5.1 監視項目

#### パフォーマンスメトリクス
- 移行処理時間（テーブル別）
- レコード処理速度（records/秒）
- エラー発生率
- リトライ回数

#### システムメトリクス
- CPU使用率
- メモリ使用率
- データベース接続数
- ネットワーク帯域使用率

### 5.2 アラート設定

```typescript
const alertThresholds = {
  processingTime: 3600000, // 1時間以上
  errorRate: 0.05, // 5%以上
  retryCount: 10, // 10回以上
  systemLoad: {
    cpu: 85, // 85%以上
    memory: 90 // 90%以上
  }
};
```

### 5.3 エラーリカバリー戦略

#### 部分的失敗の処理
1. 失敗レコードの記録
2. 次回実行時の再処理
3. 手動介入のための管理画面

#### 完全失敗の処理
1. 全体ロールバック
2. 管理者への通知
3. 自動リトライの停止

## 6. 実装スケジュール

### Phase 1: 基盤整備（1週間）
- [ ] Supabaseスキーマ作成（全テーブル）
- [ ] 型変換ユーティリティの実装
- [ ] 基本的な移行フレームワークの構築

### Phase 2: コア機能実装（2週間）
- [ ] Convex側のクエリ・ミューテーション実装
- [ ] 移行アクションの実装
- [ ] Supabaseリポジトリの実装
- [ ] エラーハンドリングの実装

### Phase 3: 最適化とテスト（1週間）
- [ ] パフォーマンステスト
- [ ] 負荷テスト
- [ ] リトライロジックの調整
- [ ] 監視システムの構築

### Phase 4: 段階的導入（2週間）
- [ ] 開発環境でのテスト実行
- [ ] ステージング環境での検証
- [ ] 本番環境への段階的適用
- [ ] モニタリングと調整

## 7. リスクと対策

### 7.1 技術的リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| データ不整合 | 高 | トランザクション管理、チェックサム検証 |
| パフォーマンス劣化 | 中 | 動的バッチサイズ調整、優先度制御 |
| ネットワーク障害 | 中 | リトライ機構、断続的接続対応 |
| ストレージ容量超過 | 低 | 事前容量計算、アラート設定 |

### 7.2 運用リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 深夜メンテナンス競合 | 中 | スケジュール調整、動的実行時間 |
| 手動介入の必要性 | 低 | 自動リカバリー、管理画面構築 |
| コスト超過 | 低 | 使用量モニタリング、予算アラート |

## 8. 成功指標

### 定量的指標
- **移行成功率**: 99.9%以上
- **処理時間**: 3時間以内（3,000店舗分）
- **エラー率**: 0.1%未満
- **システム負荷**: CPU 50%未満、メモリ 70%未満

### 定性的指標
- 運用チームの介入不要
- エンドユーザーへの影響なし
- コスト削減効果の実現

## 9. 今後の拡張性

### 9.1 リアルタイム同期
- Change Data Capture (CDC) の導入検討
- イベントドリブンアーキテクチャへの移行

### 9.2 マルチリージョン対応
- 地理的分散による負荷分散
- レイテンシ最適化

### 9.3 AI/ML統合
- 移行パターンの学習
- 自動最適化の実装

## 付録A: 詳細な型変換マッピング

```typescript
// Convex型 → Supabase型の変換マッピング
const typeMapping = {
  // ID変換
  'v.id()': (value: string) => ({ 
    uid: generateUUID(), 
    _convex_id: value 
  }),
  
  // 時刻変換
  'v.number()': (value: number, field: string) => {
    if (field.includes('unix')) {
      return new Date(value).toISOString();
    }
    return value;
  },
  
  // 配列変換
  'v.array()': (value: any[]) => {
    return JSON.stringify(value);
  },
  
  // オブジェクト変換
  'v.object()': (value: object) => {
    return value; // JSONBとして保存
  }
};
```

## 付録B: トラブルシューティングガイド

### よくある問題と解決方法

1. **移行が終わらない**
   - 原因: バッチサイズが大きすぎる
   - 解決: バッチサイズを動的に調整

2. **データ不整合が発生**
   - 原因: 同時実行による競合
   - 解決: 楽観的ロックの実装

3. **メモリ不足エラー**
   - 原因: 大量データの一括処理
   - 解決: ストリーミング処理への変更


    1. 移行計画書 (/docs/CONVEX_TO_SUPABASE_MIGRATION_PLAN.md)
    - 予約関連テーブルのみに限定した移行計画
    - スタッフ、メニュー、オプション等のマスターデータはConvexで管理継続
  2. Supabaseマイグレーション
  (/supabase/migrations/20250616000000_add_reservation_tables_for_convex_migration.sql)
    - reservationとreservation_detailテーブルの作成
    - Convexスキーマと完全一致
    - 適切なインデックス設定
  3. Convex移行クエリ (/convex/migration/query.ts)
    - 完了済み予約の取得（24時間以上経過）
    - キャンセル済み予約の取得（7日以上経過）
    - カーソルベースのページング実装
  4. Convex移行ミューテーション (/convex/migration/mutation.ts)
    - 移行完了後のレコード削除
    - 移行ログの記録
    - エラーハンドリング
  5. 移行アクション (/convex/migration/action.ts)
    - バッチサイズ500件での段階的処理
    - Supabaseへのバルクインサート
    - 負荷分散と待機処理
  6. Cronジョブ設定 (/convex/crons.ts)
    - 毎日午前2時（JST）に自動実行
    - サーバー負荷を考慮した深夜実行

  🚀 使い方

  1. Supabaseテーブル作成
  pnpm migrate:supabase
  2. Convexデプロイ
  npx convex deploy
  3. 手動実行（テスト用）
  npx convex run migration:action:runDailyMigration

  ⚡ パフォーマンス最適化

  - バッチ処理: 500件/バッチ
  - 負荷軽減: 各バッチ間で100ms待機
  - 深夜実行: システム負荷の少ない時間帯
  - カーソルベース: メモリ効率的なページング

  🛡️ 安定性確保

  - トランザクション管理
  - エラーログ記録
  - 部分的失敗への対応
  - Convex ID保持による整合性確保

  これで3,000店舗規模の大規模SaaSでも、安定してConvexの高速性を維持しながら、履歴データをSupabaseで管理できます！

---

*このドキュメントは定期的に更新され、実装の進捗に応じて改訂されます。*

最終更新日: 2025年6月16日