# Bocker Convex バックエンド設計ガイド

美容サロン向けSaaS「Bocker」のConvexバックエンド実装における設計思想、スケーラビリティ戦略、および実装ガイドライン。

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [Convex固有ハードリミットと回避策](#convex固有ハードリミットと回避策)
3. [スキーマ切り分け戦略](#スキーマ切り分け戦略)
4. [インデックス最適化3箇条](#インデックス最適化3箇条)
5. [購読管理とパフォーマンス最適化](#購読管理とパフォーマンス最適化)
6. [実装パターンとベストプラクティス](#実装パターンとベストプラクティス)

## アーキテクチャ概要

### ハイブリッドデータベース設計

Bockerはハイブリッドデータベース構成を採用しています：

```
Convex (リアルタイム層)           Supabase (永続化層)
├── 未来30日の予約データ    →    ├── 過去の予約履歴
├── アクティブな業務マスター ←→   ├── 顧客マスターデータ  
├── リアルタイム編集データ         ├── 分析・レポート用データ
└── Webhook処理待ちデータ         └── 大容量ファイルメタデータ
```

### 想定スケール

- **Phase 1**: 〜3,000店舗（現在）
- **Phase 2**: 3,000〜10,000店舗
- **Phase 3**: 10,000〜30,000店舗

## Convex固有ハードリミットと回避策

### 結論：「32k Docs/Tx」と「1秒クエリ上限」はプラン変更不可

以下の制限はProfessionalプランでも変更できません：

| 制限項目 | プラン依存 | 回避策 | 解説 |
|---------|-----------|--------|------|
| **同時Query/Mutation** | 16→256（Professional拡大） | 購読絞り込み・gcTime短縮 | 十分余裕あり |
| **Docs scanned ≤ 32k/Tx** | **不変** | インデックス＋paginate()で1日分以下取得 | **重要制限** |
| **Query実行 ≤ 1s** | **不変** | date＋status複合インデックスでヒット数≪32k | **重要制限** |
| **gcTime既定5min** | 変更可 | ConvexProviderで1minに短縮 | メモリ効率化 |

### 対策の核心

**「32k docs/1s」制限**を回避するには：
- 必ず`(tenant_id, org_id, date)`複合インデックスを使用
- 1日の予約数は最大数千件＝安全マージン確保
- `paginate()`で結果セットを制限

## スキーマ切り分け戦略

### Convexに残すテーブル（30日以内＋リアルタイム編集系）

| テーブル | 主目的 | 想定レコード量（10k店舗） |
|---------|--------|------------------------|
| `reservation`/`reservation_detail` | 未来30日＋当日編集 | 7.5M ≒ 11GB |
| `staff`, `menu`, `week_schedule` | 頻繁な編集が必要な業務マスター | 数10k〜100k |
| `webhook_events` | 直近30日の処理ログ | 10k〜数100k |

### Supabaseへ移すテーブル（履歴・分析系）

| テーブル分類 | テーブル例 | 移行理由 |
|-------------|------------|----------|
| **顧客系** | `customer`, `customer_detail`, `customer_points` | 会計後すぐ移行、SQL集計が高速 |
| **履歴系** | `point_transaction`, `coupon_transaction` | 外部BIツール利用想定 |
| **カルテ系** | `carte`, `carte_detail` | 画像パスと一緒に保持 |
| **トラッキング系** | `tracking_event`, `tracking_summaries` | 大量データ、月次パーティション必須 |

### 移行フロー

```typescript
// 6時間毎のバッチ移行
crons.interval('6h', internal.migration.moveCompletedData);

// 移行プロセス
// 1. Convex → Supabase INSERT
// 2. Convex側でarchive: true設定
// 3. 7日後にpatch({})で軽量化
```

## インデックス最適化3箇条

### 1. 必ず (tenant_id, org_id, date) を順序通り複合

```typescript
// 正しいクエリパターン
const reservations = await ctx.db
  .query("reservation")
  .withIndex("by_tenant_org_date_status_archive", q =>
    q.eq("tenant_id", tenantId)
     .eq("org_id", orgId)
     .eq("date", targetDate)
  )
  .paginate({limit: 100});
```

### 2. is_archive は末尾に配置

アクティブデータへの高速ヒットを実現：

```typescript
// schema.ts インデックス定義例
"by_tenant_org_date_status_archive": [
  "tenant_id", "org_id", "date", "status", "is_archive"
],
```

### 3. 長い配列は別テーブルへ分離

1MiB制限を回避：

```typescript
// ❌ 避けるべきパターン
{
  reservation_id: "...",
  image_ids: ["id1", "id2", ..., "id1000"]  // 1MiB超過リスク
}

// ✅ 推奨パターン
// reservation_images テーブルに分離
{
  reservation_id: "...",
  image_id: "...",
  sort_order: number
}
```

## 購読管理とパフォーマンス最適化

### 画面別リアルタイム度設定

| 画面種別 | データ取得方法 | リアルタイム度 | 実装例 |
|---------|---------------|---------------|--------|
| **編集タイムライン** | Convex useQuery | ★★★ | 購読を維持 |
| **過去予約一覧** | Supabase + SWR | ★☆☆ | `refreshInterval={300000}` |
| **売上レポート** | Supabase | ★☆☆ | Materialized View |

#### サブスクリプション最適化戦略

```typescript
// ✅ 推奨：条件付き購読でリソース効率化
const ReservationDashboard = () => {
  const isVisible = usePageVisibility();
  const [activeTab, setActiveTab] = useState('today');
  
  // 今日の予約のみリアルタイム購読
  const todayReservations = useQuery(
    api.reservations.getByDate,
    { tenantId, orgId, date: format(new Date(), 'yyyy-MM-dd') },
    { 
      enabled: isVisible && activeTab === 'today' // 条件付き有効化
    }
  );
  
  // 過去データはポーリング or 手動リフレッシュ
  const { data: pastReservations, mutate } = useSWR(
    activeTab === 'past' ? ['past-reservations', tenantId, orgId] : null,
    () => fetchFromSupabase('/api/reservations/past'),
    { refreshInterval: activeTab === 'past' ? 300000 : 0 }
  );
};

// ✅ 大量データの段階的読み込み
const useInfiniteReservations = (tenantId: string, orgId: string, date: string) => {
  const [cursor, setCursor] = useState<string | null>(null);
  
  return useQuery(
    api.reservations.getPaginated,
    { tenantId, orgId, date, cursor },
    {
      gcTime: 60000,
      staleTime: 30000, // 30秒は「fresh」扱い
      refetchOnWindowFocus: false, // フォーカス時の自動再取得を無効
    }
  );
};
```

### gcTime最適化設定

**要点**: gcTimeを5分→1分に短縮すると、バックグラウンドタブのサブスクリプションが60秒後に自動終了し、同時実行枠（Professionalプラン256枠）の空きが常に回復し、大規模同時接続でも枠圧迫を回避できます。

#### gcTimeとは
- Convex×TanStack Queryのサブスクリプションは、useQuery初回レンダリング時に開始
- コンポーネントアンマウント後もgcTime期間はキャッシュとサブスクリプションが残存
- デフォルト5分（300,000ms）、推奨範囲は2秒〜60秒

#### 実装方法

```typescript
// ① ConvexProvider設定
<ConvexProvider 
  client={convex}
  clientProps={{
    gcTime: 60000  // 1分に短縮（デフォルト5分）
  }}
>
  <App />
</ConvexProvider>

// ② バックグラウンドタブでは購読停止
import { usePageVisibility } from 'react-page-visibility';

const isVisible = usePageVisibility();
const { data } = useQuery(
  api.reservations.today,
  { tenantId, orgId, date },
  { enabled: isVisible } // 背景→falseで自動unsubscribe
);
```

#### 効果の計算

```
【従来（gcTime=5分）】
10k店舗 × 3端末 × 2購読 = 60k購読が常時残存
差分プッシュ時の同時再実行バースト → 300〜400枠使用（256枠超過リスク）

【最適化後（gcTime=1分）】
バックグラウンドタブ購読が60秒でGC → 実質10k〜20k購読
同時再実行バースト → 100〜200枠（256枠内で安全）
```

#### 注意事項

- **SSR Hydrationエラー回避**: 2秒以上に設定（60秒未満の場合）
- **Function Call増加**: タブ切り替えで再購読発生するが、無償枠内に収まる
- **トレードオフ**: 少ない再接続コスト vs 大幅な枠空き効果

## 実装パターンとベストプラクティス

### 予約取得のベストプラクティス

```typescript
// ✅ 推奨：日単位でページネーション
export const getReservationsByDate = query({
  args: {
    tenant_id: v.string(),
    org_id: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reservation")
      .withIndex("by_tenant_org_date_archive", q =>
        q.eq("tenant_id", args.tenant_id)
         .eq("org_id", args.org_id)
         .eq("date", args.date)
         .eq("is_archive", false)
      )
      .order("asc")
      .paginate(args.paginationOpts);
  },
});
```

### マルチテナント対応の関数設計

```typescript
// 認証・テナント検証ヘルパー
async function validateTenantAccess(ctx: QueryCtx, tenantId: string, orgId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("認証が必要です");
  
  // テナント・組織アクセス権限チェック
  const hasAccess = await checkTenantOrgAccess(ctx, identity.subject, tenantId, orgId);
  if (!hasAccess) throw new Error("アクセス権限がありません");
  
  return identity;
}

// 使用例
export const createReservation = mutation({
  args: {
    tenant_id: v.string(),
    org_id: v.string(),
    // ... その他のargs
  },
  handler: async (ctx, args) => {
    await validateTenantAccess(ctx, args.tenant_id, args.org_id);
    
    // 予約作成ロジック
    const reservationId = await ctx.db.insert("reservation", {
      ...args,
      created_at: Date.now(),
      updated_at: Date.now(),
      is_archive: false,
    });
    
    return reservationId;
  },
});
```

### エラーハンドリングパターン

```typescript
import { ConvexError } from "convex/values";

// カスタムエラークラスの使用
export const updateReservation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    try {
      const reservation = await ctx.db.get(args.reservation_id);
      if (!reservation) {
        throw new ConvexError("予約が見つかりません");
      }
      
      if (reservation.is_archive) {
        throw new ConvexError("アーカイブされた予約は編集できません");
      }
      
      // 更新処理
      await ctx.db.patch(args.reservation_id, {
        ...args.updates,
        updated_at: Date.now(),
      });
      
    } catch (error) {
      console.error("予約更新エラー:", error);
      throw error;
    }
  },
});
```

## 監視とデバッグ

### パフォーマンス監視項目

#### 必須監視指標

| 指標 | 閾値 | 監視目的 | 対策 |
|------|------|----------|------|
| **Document Scan数** | < 32k/Tx | ハードリミット回避 | インデックス最適化・ページネーション |
| **Query実行時間** | < 1s | ハードリミット回避 | 複合インデックス・クエリ範囲縮小 |
| **同時実行数** | < 200/256枠 | 枠圧迫回避 | gcTime短縮・条件付き購読 |
| **Active Subscriptions** | < 20k | リソース効率化 | バックグラウンド購読停止 |

#### Convexダッシュボード監視

```typescript
// 開発環境でのパフォーマンス計測用ヘルパー
const logPerformanceMetrics = async () => {
  console.log('=== Convex Performance Metrics ===');
  console.log('Active Subscriptions:', /* Convexダッシュボードで確認 */);
  console.log('Function Calls (24h):', /* 無償枠: 1M calls/月 */);
  console.log('Concurrent Executions Peak:', /* 256枠上限 */);
  console.log('Database Operations:', /* 読み取り・書き込み回数 */);
};
```

#### 実装監視コード

```typescript
// クエリ実行時間の自動監視
const withPerformanceLogging = <T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> => {
  const start = performance.now();
  
  return queryFn()
    .then(result => {
      const duration = performance.now() - start;
      
      if (duration > 800) {
        console.warn(`[SLOW QUERY] ${queryName}: ${duration.toFixed(2)}ms`);
      }
      
      // 開発環境でのメトリクス送信
      if (process.env.NODE_ENV === 'development') {
        sendMetrics('convex.query.duration', duration, { query: queryName });
      }
      
      return result;
    })
    .catch(error => {
      console.error(`[QUERY ERROR] ${queryName}:`, error);
      throw error;
    });
};
```

#### トレードオフと最適化バランス

**gcTime短縮による影響**:

```
【メリット】
✅ 同時実行枠の空き確保（300→200枠使用に削減）
✅ バックグラウンドメモリ使用量削減
✅ 大規模環境での安定性向上

【デメリット】
⚠️ タブ切り替え時の再接続回数増加（+10-20%）
⚠️ 初回データ取得のレイテンシがわずかに増加
⚠️ Function Calls微増（ただし無償枠内）

【推奨設定】
- gcTime: 60000ms（1分） ← バランス重視
- staleTime: 30000ms（30秒） ← 適度なキャッシュ
- refetchOnWindowFocus: false ← 不要な再取得を抑制
```

### デバッグ用ヘルパー

```typescript
// 開発環境でのパフォーマンス計測
async function debugQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const result = await queryFn();
  const duration = Date.now() - start;
  
  console.log(`[DEBUG] ${queryName}: ${duration}ms`);
  
  if (duration > 800) {
    console.warn(`[WARNING] Slow query detected: ${queryName}`);
  }
  
  return result;
}
```

## 参考リンク

- [Convex Scaling Guide](https://docs.convex.dev/production/scaling)
- [Convex Query Performance](https://docs.convex.dev/database/reading-data)
- [Production State Limits](https://docs.convex.dev/production/state/limits)
- [Convex with TanStack Query: gcTime説明](https://docs.convex.dev/client/tanstack-query#differences-from-using-fetch-with-tanstack-query)
- [Discord: ConvexQueryCacheProvider Behavior](https://discord.com/channels/1019350475847499849/1301891937556762634)
- [TanStack Query gcTime Documentation](https://tanstack.com/query/latest/docs/reference/QueryClient)
- [Bocker FEAT.md - 詳細スケーリング分析](../FEAT.md)

---

このガイドラインに従うことで、10k店舗規模でもConvexのハードリミットを回避し、安定した運用が可能になります。