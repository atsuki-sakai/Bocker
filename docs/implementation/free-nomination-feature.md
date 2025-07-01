# 指名フリー機能実装ドキュメント

## 概要

本ドキュメントは、Bocker予約システムに実装した「指名フリー」機能の技術詳細と実装意図を記述します。

## 背景と要件

### ビジネス要件
- 顧客が特定のスタッフを指名せずに予約できる「指名フリー」オプションの提供
- 指名フリーの場合、指名料（extra_charge）は0円
- バックエンドで優先度（priority）の高いスタッフを自動割り当て
- 顧客には割り当てられたスタッフ情報を非表示
- 管理画面では「フリー指名」であることを明示し、スタッフの変更が可能

### 技術要件
- 既存の予約フローを大きく変更せずに実装
- パフォーマンスを考慮した実装
- 型安全性の確保

## アーキテクチャ設計

### 実装方式：専用フロー作成方式（Dedicated Flow Approach）

#### 選定理由
1. **柔軟性**: 複数スタッフの空き時間を統合して表示可能
2. **UX向上**: より多くの予約可能時間を顧客に提示
3. **拡張性**: 将来的な機能追加（スキルマッチングなど）に対応しやすい

#### 設計パターン
```
顧客フロー:
1. StaffView: 「指名フリー」を選択
2. DateView: 全スタッフの統合された空き時間を表示
3. TimeView: 時間選択
4. ConfirmView: 確認（スタッフ名は「指名フリー」と表示）
5. 予約作成: is_free_nomination=trueで予約作成
6. バックエンド: 優先度順にスタッフを自動割り当て

管理フロー:
1. 予約詳細画面: フリー指名と割り当てられたスタッフを表示
2. スタッフ変更: フリー指名の場合のみ変更可能
```

## データベース設計

### スキーマ変更（convex/schema.ts）

```typescript
const reservation = defineTable({
  // 既存フィールド
  staff_id: v.optional(v.id('staff')),        // required → optional
  staff_name: v.optional(v.string()),          // required → optional
  
  // 新規フィールド
  is_free_nomination: v.optional(v.boolean()), // フリー指名フラグ
  assigned_staff_id: v.optional(v.id('staff')), // 割り当てられたスタッフID
  assigned_staff_name: v.optional(v.string()),  // 割り当てられたスタッフ名
  assignment_timestamp: v.optional(v.number()), // 割り当て日時
  last_staff_change: v.optional(v.object({     // スタッフ変更履歴
    changed_by: v.string(),
    changed_at: v.number(),
    previous_staff_id: v.optional(v.id('staff')),
    previous_staff_name: v.optional(v.string()),
  })),
})
```

### 設計意図
- `staff_id`と`staff_name`をoptionalに変更し、フリー指名時はnullを許容
- `is_free_nomination`で明示的にフリー指名を識別
- `assigned_staff_*`フィールドで実際の割り当て情報を管理
- `last_staff_change`で変更履歴を追跡（監査用途）

## 型定義

### バックエンド型（convex/types.ts）

```typescript
// スタッフ選択タイプ
export const staffSelectionType = v.union(
  v.literal('specific'),  // 特定スタッフ指名
  v.literal('free')      // フリー指名
)

// 統合タイムスロット型
export const integratedTimeSlotType = v.object({
  start: v.string(),
  end: v.string(),
  availableStaffs: v.array(v.object({
    id: v.id('staff'),
    name: v.string(),
    priority: v.number(),
    extra_charge: v.number(),
  })),
})
```

### フロントエンド型（lib/types.ts）

```typescript
// スタッフ選択の統一型
export type StaffSelection = StaffDisplay | 'free' | null;

// 統合空き時間情報
export type IntegratedAvailabilityInfo = {
  available: boolean;
  timeSlots: Array<{
    start: string;
    end: string;
    availableStaffs: Array<{
      id: string;
      name: string;
      priority: number;
      extra_charge: number;
    }>;
  }>;
  totalAvailableStaffs: number;
};
```

## 主要機能実装

### 1. 統合空き時間計算（convex/reservation/query.ts）

```typescript
export const calculateIntegratedAvailableTimes = query({
  args: {
    tenant_id: v.id('tenants'),
    org_id: v.id('organizations'),
    menu_id: v.id('menu'),
    option_ids: v.array(v.id('option')),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. 全アクティブスタッフを取得
    const activeStaffs = await ctx.db
      .query('staff')
      .withIndex('by_tenant_and_org')
      .filter(q => q.and(
        q.eq(q.field('tenant_id'), args.tenant_id),
        q.eq(q.field('org_id'), args.org_id),
        q.eq(q.field('is_active'), true)
      ))
      .collect();

    // 2. 各スタッフの空き時間を並列計算
    const staffAvailabilities = await Promise.all(
      activeStaffs.map(staff => 
        calculateAvailableTimesForStaff(ctx, { ...args, staff_id: staff._id })
      )
    );

    // 3. 時間スロットを統合
    const integratedSlots = mergeTimeSlots(staffAvailabilities);
    
    return {
      available: integratedSlots.length > 0,
      timeSlots: integratedSlots,
      totalAvailableStaffs: activeStaffs.length,
    };
  },
});
```

#### パフォーマンス最適化
- `Promise.all`による並列処理
- メニュー・オプション情報の事前フェッチ
- Map構造を使用したO(n)での時間スロット統合

### 2. 自動スタッフ割り当て（convex/reservation/mutation.ts）

```typescript
export const assignStaffForFreeNomination = internalMutation({
  args: { reservation_id: v.id('reservation') },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservation_id);
    if (!reservation || !reservation.is_free_nomination) {
      throw new Error('予約が見つからないか、フリー指名ではありません');
    }

    // 利用可能なスタッフを優先度順に取得
    const availableStaffs = await getAvailableStaffsForTimeSlot(ctx, {
      tenant_id: reservation.tenant_id,
      org_id: reservation.org_id,
      date: reservation.date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      menu_id: reservation.menu_id,
      option_ids: reservation.option_ids,
    });

    // 優先度が最も高いスタッフを選択
    const selectedStaff = availableStaffs
      .sort((a, b) => b.priority - a.priority)[0];

    if (!selectedStaff) {
      throw new Error('利用可能なスタッフが見つかりません');
    }

    // 予約を更新
    await ctx.db.patch(args.reservation_id, {
      staff_id: selectedStaff._id,
      staff_name: selectedStaff.name,
      assigned_staff_id: selectedStaff._id,
      assigned_staff_name: selectedStaff.name,
      assignment_timestamp: Date.now(),
    });

    return selectedStaff;
  },
});
```

### 3. UI実装

#### StaffView コンポーネント
```typescript
// 指名フリーボタンの追加
<button
  onClick={() => onStaffSelect('free')}
  className={cn(
    "w-full p-4 rounded-lg border-2 transition-all duration-200",
    selectedStaff === 'free' 
      ? "border-primary bg-primary/10 shadow-lg" 
      : "border-gray-200 hover:border-primary/50"
  )}
>
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-semibold text-lg">指名フリー</h3>
      <p className="text-sm text-gray-600">
        スタッフはお店にお任せ
      </p>
    </div>
    <div className="text-right">
      <span className="text-sm text-gray-500">指名料</span>
      <p className="font-semibold">¥0</p>
    </div>
  </div>
</button>
```

#### DateView の条件分岐
```typescript
useEffect(() => {
  if (selectedStaff === 'free') {
    // フリー指名：統合空き時間を取得
    fetchIntegratedAvailability();
  } else if (selectedStaff && selectedStaff !== 'free') {
    // 特定スタッフ：個別空き時間を取得
    fetchStaffAvailability();
  }
}, [selectedStaff, selectedMenu, selectedOptions]);
```

### 4. 管理画面でのスタッフ変更

```typescript
const handleStaffChange = async (newStaffId: string) => {
  if (!reservation.is_free_nomination) {
    toast.error('フリー指名の予約のみスタッフ変更が可能です');
    return;
  }

  try {
    await changeStaffForFreeNomination({
      reservation_id: reservation._id,
      new_staff_id: newStaffId,
      changed_by: 'admin',
    });
    
    toast.success('スタッフを変更しました');
  } catch (error) {
    toast.error('スタッフの変更に失敗しました');
  }
};
```

## セキュリティ考慮事項

1. **権限管理**
   - スタッフ変更は管理者のみ可能
   - フリー指名予約のみ変更可能

2. **データ整合性**
   - OCC（Optimistic Concurrency Control）による同時実行制御
   - 予約作成時の二重予約防止

3. **監査証跡**
   - スタッフ変更履歴の保持
   - タイムスタンプによる操作追跡

## パフォーマンス最適化

1. **並列処理**
   - 複数スタッフの空き時間計算を`Promise.all`で並列化
   - メニュー・オプション情報の一括取得

2. **計算量削減**
   - Map構造によるO(n²)→O(n)の最適化
   - 不要なデータベースクエリの削減

3. **キャッシュ活用**
   - Convexの自動キャッシュ機構を活用
   - 同一条件での再計算を回避

## 今後の拡張可能性

1. **スキルマッチング**
   - メニューに必要なスキルとスタッフスキルのマッチング

2. **顧客履歴考慮**
   - 過去の利用履歴を基にした最適なスタッフ割り当て

3. **負荷分散**
   - 予約の偏りを防ぐための自動調整機能

4. **通知機能**
   - スタッフ割り当て時の自動通知

## まとめ

本実装により、顧客は柔軟に予約でき、サロン側は効率的なスタッフ配置が可能になりました。専用フロー方式により、将来的な機能拡張にも対応できる基盤を構築しています。