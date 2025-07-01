# 指名フリー予約機能 実装ドキュメント

## 概要

本ドキュメントは、Bocker（美容サロン向け予約管理システム）における「指名フリー予約」機能の実装詳細と設計意図を記録したものです。

### 機能概要

指名フリー予約とは、顧客が特定のスタッフを指名せずに予約を行い、システムが自動的に最適なスタッフを割り当てる機能です。日本の美容サロン業界では約36.5%の顧客がこの予約方式を利用しています。

## 実装背景と要件

### 業界標準の調査結果

1. **Hot Pepper Beauty**：指名なし予約で最大36.5%の利用率
2. **SelectType**：優先度による自動割り当て機能を実装
3. **EPARK**：顧客には「指名なし」と表示、内部でスタッフを管理

### 主要要件

1. **顧客側の要件**
   - StaffViewに「指名フリー」ボタンを追加
   - UI上は「指名フリー」と表示（実際の割り当てスタッフは非表示）
   - 指名料は0円（無料）

2. **管理側の要件**
   - 管理画面で実際の割り当てスタッフを表示
   - 「フリー指名」であることが明確に分かる表示
   - 指名フリー予約に限りスタッフ変更が可能

3. **システム要件**
   - 優先度（priority）の高いスタッフから自動割り当て
   - 複数スタッフの統合的な空き時間計算
   - レースコンディションの防止

## アーキテクチャ設計

### 設計方針：Dedicated Flow Approach（専用フロー作成方式）

#### 選定理由

1. **事前割り当て方式との比較**
   - 事前割り当て：シンプルだが柔軟性に欠ける
   - 専用フロー：複雑だが最適なスタッフ割り当てが可能

2. **メリット**
   - 顧客が日時を選択する際に全スタッフの空き状況を考慮
   - 予約確定時点で最適なスタッフを動的に選択
   - 管理画面での後からのスタッフ変更が容易

### データモデル設計

#### スキーマ変更（convex/schema.ts）

```typescript
const reservation = defineTable({
  // 既存フィールドを optional に変更
  staff_id: v.optional(v.id('staff')),        // 必須 → オプショナル
  staff_name: v.optional(v.string()),         // 必須 → オプショナル
  
  // 新規フィールド
  is_free_nomination: v.optional(v.boolean()), // 指名フリーフラグ
  assigned_staff_id: v.optional(v.id('staff')), // 割り当てスタッフID
  assigned_staff_name: v.optional(v.string()),  // 割り当てスタッフ名
  assignment_timestamp: v.optional(v.number()), // 割り当て時刻
  last_staff_change: v.optional(v.object({     // 最終スタッフ変更履歴
    changed_by: v.string(),
    changed_at: v.number(),
    previous_staff_id: v.optional(v.id('staff')),
    previous_staff_name: v.optional(v.string()),
  })),
})
```

### 型定義

#### フロントエンド型（lib/types.ts）

```typescript
// ハイブリッド状態管理のための型
export type StaffSelection = StaffDisplay | 'free' | null;

// 統合空き時間情報
export type IntegratedAvailabilityInfo = {
  available: boolean;
  timeSlots: Array<{
    start: string;
    end: string;
    availableStaffs: Array<{
      id: Id<'staff'>;
      name: string;
      priority: number;
      extra_charge: number;
    }>;
  }>;
  totalAvailableStaffs: number;
};
```

## 実装詳細

### 1. Convex関数の実装

#### calculateIntegratedAvailableTimes（convex/reservation/query.ts）

統合的な空き時間計算を行う関数。全ての利用可能なスタッフの空き時間を集約し、時間帯ごとに利用可能なスタッフリストを返す。

**最適化ポイント**：
- メニュー・オプション取得を並列化（Promise.all）
- Map構造によるO(n)検索の実現
- 不要なrunQuery呼び出しの削除

#### assignStaffForFreeNomination（convex/reservation/mutation.ts）

予約作成後に最適なスタッフを自動割り当てする内部ミューテーション。

**割り当てロジック**：
1. 指定時間帯で利用可能なスタッフを取得
2. 優先度（priority）でソート
3. 最も優先度の高いスタッフを割り当て
4. 割り当て情報を予約レコードに記録

#### changeStaffForFreeNomination（convex/reservation/mutation.ts）

管理画面からスタッフを変更するためのミューテーション。

**制約**：
- 指名フリー予約のみ変更可能
- 新しいスタッフの空き状況を確認
- 変更履歴を記録

### 2. UIコンポーネントの実装

#### StaffView（予約フロー：スタッフ選択）

```tsx
// 指名フリーボタンの追加
<button
  onClick={() => onSelectStaff('free')}
  className={cn(
    "p-6 rounded-lg border-2 transition-all duration-200",
    selectedStaff === 'free'
      ? "border-primary bg-primary/5"
      : "border-muted hover:border-primary/50"
  )}
>
  <div className="text-center">
    <Users className="h-12 w-12 mx-auto mb-3 text-primary" />
    <h3 className="font-semibold text-lg">指名フリー</h3>
    <p className="text-sm text-muted-foreground mt-2">
      スタッフはお任せください
    </p>
    <p className="text-sm font-medium text-primary mt-3">
      指名料: 無料
    </p>
  </div>
</button>
```

#### DateView（予約フロー：日時選択）

指名フリーモードの場合、統合空き時間計算APIを呼び出し：

```typescript
if (selectedStaff === 'free') {
  // 統合空き時間の取得
  const integratedAvailability = await fetchQuery(
    api.reservation.query.calculateIntegratedAvailableTimes,
    { /* パラメータ */ }
  );
} else {
  // 通常の個別スタッフ空き時間取得
}
```

#### ConfirmView（予約フロー：確認画面）

指名フリーの場合の特別処理：

```typescript
const calculateExtraCharge = () => {
  if (selectedStaff === 'free') return 0;  // 指名料無料
  return selectedStaff?.extra_charge || 0;
};
```

### 3. 管理画面の実装

#### 予約詳細画面

```tsx
// 指名フリー予約の表示
{reservationData.reservation.is_free_nomination && (
  <div className="mb-4 p-3 bg-muted rounded-md">
    <p className="text-sm font-medium text-muted-foreground">
      🎯 指名フリー予約
    </p>
  </div>
)}

// スタッフ変更ボタン（指名フリーのみ）
{reservationData.reservation.is_free_nomination && (
  <Button onClick={() => setIsStaffChangeModalOpen(true)}>
    スタッフを変更
  </Button>
)}
```

## パフォーマンス最適化

### 1. Convexクエリの最適化

#### Before（非効率な実装）
```typescript
// O(n²)の計算量
const configs = [];
for (const staff of availableStaff) {
  const config = await ctx.runQuery(/* ... */);
  configs.push(config);
}
```

#### After（最適化後）
```typescript
// O(n)の計算量
const configs = await ctx.db.query('staff_config')
  .filter(/* ... */)
  .collect();
const configMap = new Map(configs.map(c => [c.staff_id, c]));
```

### 2. 並列データフェッチング

```typescript
// 並列実行による高速化
const [menus, options] = await Promise.all([
  Promise.all(menuIds.map(id => ctx.db.get(id))),
  Promise.all(optionIds.map(id => ctx.db.get(id)))
]);
```

## セキュリティとデータ整合性

### 1. レースコンディション対策

Convexの**Optimistic Concurrency Control (OCC)**を活用：

```typescript
// 同一ミューテーション内でチェックと作成を実行
export const create = mutation({
  handler: async (ctx, args) => {
    // 1. 重複チェック
    const existingReservations = await checkDoubleBooking();
    
    // 2. 即座に予約作成（外部呼び出しを挟まない）
    const reservationId = await ctx.db.insert('reservation', data);
    
    // OCCにより、同時実行時は自動的に再試行される
  }
});
```

### 2. アクセス制御

- 顧客：割り当てスタッフ情報は非表示
- 管理者：全情報の閲覧・編集が可能
- スタッフ変更：指名フリー予約のみに制限

## LINE通知の対応

```typescript
// services/line/message_template/reservation_flex.ts
const staffName = reservation.staff_name || '指名フリー';
```

## 実装上の注意点

### 1. 既存予約との互換性

- `staff_id`と`staff_name`をオプショナルに変更したため、既存コードで`!`や`??`の追加が必要
- 型エラーを防ぐため、デフォルト値の設定を徹底

### 2. 指名料の扱い

- 指名フリーの場合は必ず`extra_charge = 0`
- 自動割り当てされたスタッフの指名料は加算しない

### 3. スタッフ変更の制約

- 完了・キャンセル・返金済みの予約は変更不可
- 新しいスタッフの空き状況を必ず確認

## テスト観点

1. **機能テスト**
   - 指名フリー予約の作成
   - 自動スタッフ割り当て
   - 管理画面でのスタッフ変更

2. **境界値テスト**
   - 全スタッフが埋まっている時間帯
   - 優先度が同じスタッフが複数いる場合

3. **パフォーマンステスト**
   - 多数のスタッフがいる場合の統合空き時間計算
   - 同時予約のレースコンディション

## 今後の拡張可能性

1. **スマートアサイン**
   - 顧客の過去の履歴を考慮した割り当て
   - スタッフの得意分野とメニューのマッチング

2. **負荷分散**
   - 特定スタッフへの予約集中を避ける割り当てロジック
   - 新人スタッフへの優先的な割り当て

3. **分析機能**
   - 指名フリー予約の割合分析
   - スタッフごとの指名フリー対応実績

## まとめ

本実装により、顧客にとっては柔軟な予約体験を、サロン側にとっては効率的なスタッフ活用を実現しました。Dedicated Flow Approachの採用により、複雑性は増しましたが、より最適なスタッフ割り当てが可能になりました。

Convexの特性（OCC、トランザクション性）を活かし、データ整合性を保ちながら高いパフォーマンスを実現しています。