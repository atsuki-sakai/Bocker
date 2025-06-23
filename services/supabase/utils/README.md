# Supabase パフォーマンス最適化ガイド

このドキュメントでは、Supabaseのパフォーマンス最適化機能の使い方を説明します。

## 目次

1. [接続プーリング](#接続プーリング)
2. [キャッシュ戦略](#キャッシュ戦略)
3. [パフォーマンス計測](#パフォーマンス計測)
4. [高速顧客検索RPC](#高速顧客検索rpc)

## 接続プーリング

### 設定

接続プーリングは`createSupabaseAdminClient`関数で自動的に設定されます：

```typescript
// 接続プーリングが有効化されたクライアントを取得
const adminService = getSupabaseAdminService();
```

設定内容：
- `persistSession: false` - サーバーサイドではセッション永続化不要
- `autoRefreshToken: false` - トークン自動更新を無効化
- `x-connection-pool: true` - 接続プーリングのヒント

## キャッシュ戦略

### CachedCustomerRepository の使用

```typescript
import { CachedCustomerRepository } from '@/services/supabase/repositories/customer';

// キャッシュ付きリポジトリのインスタンスを作成
const customerRepo = new CachedCustomerRepository(
  supabaseClientService,
  {
    ttl: 5 * 60 * 1000,      // 5分間キャッシュ
    maxSize: 500,            // 最大500エントリ
    enableLogging: true      // 開発環境でログ出力
  }
);

// 通常のリポジトリと同じように使用（自動的にキャッシュされる）
const customer = await customerRepo.findByEmail('user@example.com');
```

### 汎用キャッシュの使用

```typescript
import { MemoryCache, createCacheKey } from '@/services/supabase/utils/cache';

// キャッシュインスタンスを作成
const cache = new MemoryCache({
  ttl: 10 * 60 * 1000,  // 10分
  maxSize: 1000,        // 1000エントリ
  enableLogging: process.env.NODE_ENV === 'development'
});

// キャッシュを使用した非同期処理
const result = await cache.wrap(
  'expensive-operation:123',
  async () => {
    // 重い処理
    return await expensiveOperation();
  }
);

// キャッシュ統計を確認
console.log(cache.getStats());
// { size: 15, hitCount: 120, missCount: 30, hitRate: "80.00%", ... }
```

### キャッシュキーの生成

```typescript
import { createCacheKey } from '@/services/supabase/utils/cache';

// 一貫性のあるキャッシュキーを生成
const key = createCacheKey('customer:search', {
  tenantId: 'tenant123',
  orgId: 'org456',
  searchText: 'john',
  page: 1
});
// => "customer:search:orgId:"org456"|page:1|searchText:"john"|tenantId:"tenant123""
```

## パフォーマンス計測

### デコレータの使用

```typescript
import { measurePerformance } from '@/services/supabase/utils/performance';

class MyRepository {
  @measurePerformance
  async findUser(id: string) {
    // この メソッドの実行時間が自動的に計測される
    return await database.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}
```

### 手動計測

```typescript
import { withPerformanceMeasure, globalPerformanceMonitor } from '@/services/supabase/utils/performance';

// ラッパー関数を使用
const result = await withPerformanceMeasure(
  'custom-operation',
  async () => {
    return await someExpensiveOperation();
  },
  { userId: '123', action: 'fetch' }  // メタデータ
);

// 統計情報を取得
const stats = globalPerformanceMonitor.getStats();
console.log(stats);
// { count: 100, avgDuration: 45.2, minDuration: 10, maxDuration: 200, ... }

// 操作別の統計
const statsByOp = globalPerformanceMonitor.getStatsByOperation();
console.log(statsByOp);

// 最近の遅いクエリ
const slowQueries = globalPerformanceMonitor.getRecentSlowQueries(5);
```

## 高速顧客検索RPC

### 基本的な使用方法

```typescript
const customerRepo = new CustomerRepository();

// 最適化されたRPC関数を使用して検索
const result = await customerRepo.searchCustomersOptimized(
  'tenant123',
  'org456',
  '田中',      // 検索テキスト
  1,          // ページ番号
  50          // ページサイズ
);

console.log(result);
// {
//   customers: [...],
//   totalCount: 125,
//   hasMore: true
// }
```

### Supabaseでの関数作成

以下のSQL関数をSupabaseで実行してください：

```sql
CREATE OR REPLACE FUNCTION search_customers_optimized(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_search_text TEXT,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
) RETURNS TABLE(
  customers JSONB,
  total_count BIGINT,
  has_more BOOLEAN
) AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- 総件数を取得
  SELECT COUNT(*) INTO v_total
  FROM customer
  WHERE tenant_id = p_tenant_id
    AND org_id = p_org_id
    AND is_archive = false
    AND (
      email ILIKE '%' || p_search_text || '%' OR
      phone ILIKE '%' || p_search_text || '%' OR
      first_name ILIKE '%' || p_search_text || '%' OR
      last_name ILIKE '%' || p_search_text || '%' OR
      line_user_name ILIKE '%' || p_search_text || '%'
    );
  
  RETURN QUERY
  SELECT 
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'uid', uid,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'phone', phone,
        'line_user_name', line_user_name,
        'total_reservation_count', total_reservation_count,
        'last_reservation_date_unix', last_reservation_date_unix
      ) ORDER BY last_reservation_date_unix DESC NULLS LAST
    ), '[]'::jsonb) as customers,
    v_total as total_count,
    (v_total > v_offset + p_page_size) as has_more
  FROM customer
  WHERE tenant_id = p_tenant_id
    AND org_id = p_org_id
    AND is_archive = false
    AND (
      email ILIKE '%' || p_search_text || '%' OR
      phone ILIKE '%' || p_search_text || '%' OR
      first_name ILIKE '%' || p_search_text || '%' OR
      last_name ILIKE '%' || p_search_text || '%' OR
      line_user_name ILIKE '%' || p_search_text || '%'
    )
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;
```

## パフォーマンスのベストプラクティス

### 1. 選択的なカラム取得

```typescript
// ❌ 悪い例：全カラムを取得
const customer = await customerRepo.findByUid(uid);

// ✅ 良い例：必要なカラムのみ取得
const customer = await customerRepo.findByUid(uid, {
  select: ['uid', 'email', 'first_name', 'last_name']
});
```

### 2. バッチ処理の活用

```typescript
// ❌ 悪い例：ループで個別に取得
for (const uid of customerUids) {
  const customer = await customerRepo.findByUid(uid);
  // ...
}

// ✅ 良い例：一括で取得（将来的に実装予定）
const customers = await customerRepo.getCustomersBatch(
  customerUids,
  tenantId,
  orgId
);
```

### 3. キャッシュの適切な無効化

```typescript
// 更新操作後は関連キャッシュをクリア
await customerRepo.update(uid, updateData);
// CachedCustomerRepositoryでは自動的にキャッシュがクリアされる
```

### 4. パフォーマンス監視

```typescript
// 定期的にパフォーマンス統計を確認
setInterval(() => {
  const stats = globalPerformanceMonitor.getStatsByOperation();
  
  // 遅い操作を特定
  Object.entries(stats).forEach(([operation, stat]) => {
    if (stat.avgDuration > 100) {
      console.warn(`Slow operation detected: ${operation}`, stat);
    }
  });
}, 60000); // 1分ごと
```

## トラブルシューティング

### キャッシュヒット率が低い場合

1. TTLが短すぎないか確認
2. キャッシュサイズが小さすぎないか確認
3. キャッシュキーの生成が一貫しているか確認

### パフォーマンスが改善しない場合

1. インデックスが適切に設定されているか確認
2. N+1クエリ問題が発生していないか確認
3. ネットワークレイテンシを確認

### メモリ使用量が増加する場合

1. キャッシュのmaxSizeを調整
2. TTLを短くする
3. 定期的にキャッシュをクリア

```typescript
// 定期的なキャッシュクリア
setInterval(() => {
  if (cache.getStats().size > 800) {
    cache.clear();
  }
}, 30 * 60 * 1000); // 30分ごと
```