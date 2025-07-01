# 指名フリー機能 API リファレンス

## Convex Functions

### Query Functions

#### `calculateIntegratedAvailableTimes`

統合された空き時間を計算します。全アクティブスタッフの空き時間を集約し、予約可能な時間帯を返します。

**引数:**
```typescript
{
  tenant_id: Id<'tenants'>
  org_id: Id<'organizations'>
  menu_id: Id<'menu'>
  option_ids: Id<'option'>[]
  date: string // YYYY-MM-DD形式
}
```

**戻り値:**
```typescript
{
  available: boolean
  timeSlots: Array<{
    start: string
    end: string
    availableStaffs: Array<{
      id: Id<'staff'>
      name: string
      priority: number
      extra_charge: number
    }>
  }>
  totalAvailableStaffs: number
}
```

**使用例:**
```typescript
const availability = await ctx.runQuery(
  api.reservation.query.calculateIntegratedAvailableTimes,
  {
    tenant_id: tenantId,
    org_id: orgId,
    menu_id: selectedMenu._id,
    option_ids: selectedOptions.map(o => o._id),
    date: '2024-01-20'
  }
);
```

### Mutation Functions

#### `createReservation`

予約を作成します。フリー指名の場合は`is_free_nomination`フラグを設定します。

**引数（フリー指名関連）:**
```typescript
{
  // 既存フィールド...
  staff_id?: Id<'staff'>  // フリー指名の場合は省略
  staff_name?: string     // フリー指名の場合は省略
  is_free_nomination?: boolean  // フリー指名の場合true
  extra_charge: number    // フリー指名の場合は0
}
```

**処理フロー:**
1. 予約データの作成
2. `is_free_nomination=true`の場合、`assignStaffForFreeNomination`を自動実行
3. LINE通知の送信

#### `assignStaffForFreeNomination` (Internal)

フリー指名予約に対してスタッフを自動割り当てします。

**引数:**
```typescript
{
  reservation_id: Id<'reservation'>
}
```

**処理ロジック:**
1. 指定時間帯で利用可能なスタッフを取得
2. 優先度（priority）順にソート
3. 最も優先度の高いスタッフを割り当て
4. 予約レコードを更新

#### `changeStaffForFreeNomination`

管理者がフリー指名予約のスタッフを変更します。

**引数:**
```typescript
{
  reservation_id: Id<'reservation'>
  new_staff_id: Id<'staff'>
  changed_by: string  // 変更者（通常'admin'）
}
```

**戻り値:**
```typescript
{
  success: boolean
  message: string
  updatedReservation?: Reservation
}
```

**権限チェック:**
- フリー指名予約のみ変更可能
- 新しいスタッフの空き時間を確認

## Helper Functions

### `getAvailableStaffsForTimeSlot`

特定の時間帯で利用可能なスタッフを取得します。

**引数:**
```typescript
{
  tenant_id: Id<'tenants'>
  org_id: Id<'organizations'>
  date: string
  start_time: string
  end_time: string
  menu_id: Id<'menu'>
  option_ids: Id<'option'>[]
}
```

**戻り値:**
```typescript
Staff[] // 利用可能なスタッフの配列
```

### `mergeTimeSlots`

複数スタッフの時間スロットを統合します。

**アルゴリズム:**
1. 全スタッフの時間スロットを収集
2. 開始時間でグループ化（Map使用）
3. 各時間帯で利用可能なスタッフをリスト化
4. 連続する時間帯をマージ

## データベース更新

### 予約テーブルの変更

```typescript
// 作成時（フリー指名）
{
  staff_id: undefined,
  staff_name: undefined,
  is_free_nomination: true,
  extra_charge: 0,
  // その他のフィールド...
}

// スタッフ割り当て後
{
  staff_id: 'staff_xxxx',
  staff_name: '田中太郎',
  is_free_nomination: true,
  assigned_staff_id: 'staff_xxxx',
  assigned_staff_name: '田中太郎',
  assignment_timestamp: 1705732800000,
  extra_charge: 0,
  // その他のフィールド...
}

// スタッフ変更後
{
  // 上記フィールドに加えて
  last_staff_change: {
    changed_by: 'admin',
    changed_at: 1705736400000,
    previous_staff_id: 'staff_xxxx',
    previous_staff_name: '田中太郎'
  }
}
```

## エラーハンドリング

### 一般的なエラー

| エラーコード | 説明 | 対処法 |
|------------|------|--------|
| `NO_AVAILABLE_STAFF` | 利用可能なスタッフがいない | 別の時間帯を選択 |
| `INVALID_FREE_NOMINATION` | フリー指名でない予約の変更試行 | 通常予約は変更不可 |
| `STAFF_NOT_AVAILABLE` | 指定スタッフが予約不可 | 別のスタッフを選択 |
| `RESERVATION_NOT_FOUND` | 予約が見つからない | 予約IDを確認 |

### エラーレスポンス例

```typescript
{
  success: false,
  error: {
    code: 'NO_AVAILABLE_STAFF',
    message: '指定された時間帯に利用可能なスタッフがいません'
  }
}
```

## パフォーマンス考慮事項

1. **バッチ処理**
   - 複数スタッフの空き時間計算は`Promise.all`で並列化
   - データベースクエリは最小限に抑制

2. **インデックス活用**
   - `by_tenant_and_org`インデックスでスタッフ検索を高速化
   - `by_tenant_org_staff_date`インデックスで予約検索を最適化

3. **キャッシング**
   - Convexの自動キャッシュ機構を活用
   - 同一条件での再計算を回避

## 使用例：完全なフロー

```typescript
// 1. フリー指名を選択
setSelectedStaff('free');

// 2. 統合空き時間を取得
const availability = await calculateIntegratedAvailableTimes({
  tenant_id, org_id, menu_id, option_ids, date
});

// 3. 時間選択後、予約作成
const reservation = await createReservation({
  // 基本情報
  tenant_id, org_id, customer_name, customer_email,
  
  // フリー指名固有
  is_free_nomination: true,
  extra_charge: 0,  // 指名料なし
  
  // スタッフ情報は省略
  // staff_id: undefined,
  // staff_name: undefined,
});

// 4. バックエンドで自動的にスタッフ割り当て
// （createReservation内で実行）

// 5. 管理画面でスタッフ変更（必要に応じて）
await changeStaffForFreeNomination({
  reservation_id: reservation._id,
  new_staff_id: 'staff_yyyy',
  changed_by: 'admin'
});
```