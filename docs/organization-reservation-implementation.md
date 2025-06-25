# 組織レベル予約取得機能 - 実装詳細ドキュメント

## 概要

このドキュメントは、Bocker（ブッカー）における組織レベルでの予約取得機能の実装詳細を説明します。この機能により、組織全体の予約を一覧で確認し、日付範囲やステータスで絞り込みを行うことができます。

## アーキテクチャ概要

### ハイブリッドデータベース設計

Bockerは以下の2つのデータベースを使い分けています：

1. **Convex**: リアルタイムデータベース
   - アクティブな予約データ（confirmed, pending）
   - 最近の予約データ（cancelled含む）
   - リアルタイム更新が必要なデータ

2. **Supabase**: PostgreSQL
   - 履歴データ（completed, cancelled, refunded）
   - 分析用データ
   - 顧客マスターデータ

### データフロー

```
[ユーザーインターフェース]
         ↓
[useOrganizationReservations Hook]
         ↓
    ┌────┴────┐
    ↓         ↓
[Convex]  [Supabase]
    ↓         ↓
[リアルタイムデータ] [履歴データ]
    ↓         ↓
    └────┬────┘
         ↓
[統合・重複除去]
         ↓
[ソート・ページネーション]
         ↓
[ユーザーインターフェース]
```

## 実装ファイル構成

### 1. Convexクエリ
**ファイル**: `/convex/reservation/query.ts`

#### listOrganizationAllStatus クエリ
```typescript
export const listOrganizationAllStatus = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    status_filter: v.optional(reservationStatusType),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 実装詳細は後述
  },
})
```

**処理フロー**:
1. 引数バリデーション（tenant_id, org_id, 日付形式）
2. インデックス `by_tenant_org_date_status_archive` を使用してクエリ開始
3. `is_archive: false` でフィルタリング
4. ステータスフィルター適用（指定された場合）
5. 日付範囲フィルター適用（指定された場合）
6. ソート順適用（デフォルト: desc）
7. ページネーション適用

**使用インデックス**:
- `by_tenant_org_date_status_archive`: ['tenant_id', 'org_id', 'date', 'status', 'is_archive']

### 2. Supabaseリポジトリ
**ファイル**: `/services/supabase/repositories/reservation/ReservationRepository.ts`

#### findByOrganizationWithDetails メソッド
```typescript
async findByOrganizationWithDetails(
  tenantId: string,
  orgId: string,
  options?: {
    page?: number;
    pageSize?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
)
```

**処理フロー**:
1. フィルター条件の構築
   - `tenant_id`, `org_id`, `is_archive: false` は必須
   - ステータスフィルター（オプション）
2. 日付範囲フィルターの構築
   - `start_time_unix` カラムに対してUnixタイムスタンプで範囲指定
3. 予約データの取得
   - `listRecords` メソッドを使用
   - `start_time_unix` で降順ソート
4. 予約詳細データの取得
   - 各予約の `_convex_id` を使用して詳細を取得
   - Promise.all で並列取得
5. 結果の整形と返却

#### getOrganizationReservationStats メソッド
統計情報（総数、完了数、キャンセル数、予定数、売上合計）を取得

### 3. 統合フック
**ファイル**: `/hooks/useOrganizationReservations.ts`

#### データソース選択ロジック

```typescript
// ステータスごとのデータソース選択
if (status === 'confirmed' || status === 'pending') {
  // アクティブな予約はConvexのみ
  allReservations = [...convexReservations];
} else if (status === 'completed' || status === 'cancelled' || status === 'refunded') {
  // 履歴データは両方から取得（最近のキャンセル等はConvexにも存在する可能性）
  allReservations = [...convexReservations, ...supabaseReservations];
} else {
  // 全て取得（allまたは未指定）
  allReservations = [...convexReservations, ...supabaseReservations];
}
```

#### 重複除去ロジック

```typescript
const uniqueReservations = allReservations.reduce((acc, reservation) => {
  const isDuplicate = acc.some(existing => {
    if (existing.source === 'convex' && reservation.source === 'supabase') {
      return existing.id === reservation.supabaseData?.reservation._convex_id;
    }
    if (existing.source === 'supabase' && reservation.source === 'convex') {
      return existing.supabaseData?.reservation._convex_id === reservation.id;
    }
    return false;
  });
  
  if (!isDuplicate) {
    acc.push(reservation);
  }
  
  return acc;
}, [] as IntegratedReservation[]);
```

#### データ型変換

**Convex → 統合型**:
```typescript
{
  id: res._id,
  source: 'convex',
  tenantId: res.tenant_id,
  orgId: res.org_id,
  customerId: res.customer_id || '',
  staffId: res.staff_id,
  customerName: res.customer_name,
  staffName: res.staff_name,
  status: res.status,
  paymentStatus: res.payment_status,
  date: res.date,
  startTimeUnix: res.start_time_unix,
  endTimeUnix: res.end_time_unix,
  createdAt: new Date(res._creationTime),
  convexData: res,
}
```

**Supabase → 統合型**:
```typescript
{
  id: item.reservation.uid,
  source: 'supabase',
  tenantId: item.reservation.tenant_id,
  orgId: item.reservation.org_id,
  customerId: item.reservation.customer_id || '',
  staffId: item.reservation.staff_id,
  customerName: item.reservation.customer_name,
  staffName: item.reservation.staff_name,
  status: item.reservation.status,
  paymentStatus: item.reservation.payment_status,
  date: item.reservation.date,
  startTimeUnix: Number(item.reservation.start_time_unix),
  endTimeUnix: Number(item.reservation.end_time_unix),
  createdAt: new Date(item.reservation.created_at),
  detail: item.detail ? {
    menus: parseReservationMenus(item.detail.menus),
    options: parseReservationOptions(item.detail.options),
    totalPrice: item.detail.total_price,
    // ... その他の詳細情報
  } : undefined,
  supabaseData: item,
}
```

### 4. UIコンポーネント
**ファイル**: `/app/[locale]/(dashboard)/dashboard/reservation/collection/page.tsx`

#### フィルター機能

1. **日付範囲フィルター**
   - React Day Pickerを使用したカレンダーUI
   - 範囲選択モード（from/to）
   - 日付フォーマット: `yyyy-MM-dd`

2. **ステータスフィルター**
   - SelectコンポーネントによるドロップダウンUI
   - 選択可能な値:
     - `all`: すべて
     - `confirmed`: 予約受付
     - `pending`: 保留中
     - `completed`: 完了
     - `cancelled`: キャンセル
     - `refunded`: 返金済み

#### 統計情報表示

`stats` オブジェクトから以下の情報を表示：
- 総予約数
- 完了数
- キャンセル数
- 予定数
- 売上合計

#### ページネーション

無限スクロール方式：
- 初期表示: 20件
- 「もっと見る」ボタンクリックで追加読み込み
- `hasMore` フラグで追加データの有無を判定

## パフォーマンス最適化

### 1. インデックス最適化
- テナントID、組織IDを先頭に配置した複合インデックス
- 日付とステータスを含むインデックスで効率的なフィルタリング

### 2. 並列データ取得
- ConvexとSupabaseからの同時取得
- Supabase側での予約詳細の並列取得（Promise.all）

### 3. キャッシュ戦略
- Convexのリアルタイムキャッシュ
- React Query相当のキャッシュ機構

### 4. ページネーション
- 必要なデータのみを段階的に取得
- 無限スクロールによるUX向上

## エラーハンドリング

1. **Convexエラー**
   - 自動的にUIに伝播
   - エラー境界でキャッチ

2. **Supabaseエラー**
   - try-catchでキャッチ
   - トースト通知でユーザーに通知
   - console.errorでログ出力

## セキュリティ考慮事項

1. **マルチテナント分離**
   - すべてのクエリでtenant_idとorg_idを必須
   - インデックスレベルでの分離

2. **認証チェック**
   - Convexクエリで`checkAuth`を実行
   - Clerkによる認証状態の検証

3. **論理削除**
   - `is_archive: false` の条件を全クエリに適用
   - 削除済みデータへのアクセス防止

## 今後の拡張ポイント

1. **リアルタイム更新**
   - Convexのリアルタイム機能を活用した自動更新

2. **詳細情報の最適化**
   - 現在コメントアウトされている詳細取得機能の実装

3. **エクスポート機能**
   - CSV/PDFエクスポート

4. **高度なフィルター**
   - スタッフ別、メニュー別フィルター
   - 金額範囲フィルター

5. **分析機能**
   - グラフ表示
   - トレンド分析