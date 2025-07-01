# 指名フリー予約機能 技術的意思決定記録

## 1. アーキテクチャ選択：Dedicated Flow Approach

### 検討した選択肢

#### Option A: Pre-assignment Approach（事前割り当て方式）
- **概要**：StaffView選択時点で内部的にスタッフを割り当て
- **メリット**：
  - 実装がシンプル
  - 既存フローへの変更が最小限
- **デメリット**：
  - 柔軟性に欠ける
  - 最適なスタッフ割り当てが困難
  - 日時変更時の再割り当てが複雑

#### Option B: Dedicated Flow Approach（専用フロー作成方式）【採用】
- **概要**：予約確定時点で動的にスタッフを割り当て
- **メリット**：
  - 最適なスタッフ割り当てが可能
  - 顧客体験の向上（全スタッフの空き状況を考慮）
  - 管理側での柔軟な変更が可能
- **デメリット**：
  - 実装の複雑性が高い
  - 統合空き時間計算のコスト

### 決定理由
顧客体験と運用の柔軟性を重視し、Dedicated Flow Approachを採用。複雑性は増すが、長期的なメリットが大きいと判断。

## 2. データモデル設計の決定事項

### staff_id/staff_name のオプショナル化
```typescript
// Before
staff_id: v.id('staff'),      // 必須
staff_name: v.string(),        // 必須

// After
staff_id: v.optional(v.id('staff')),      // オプショナル
staff_name: v.optional(v.string()),        // オプショナル
```

**理由**：
- 指名フリー予約では初期状態でスタッフが未定
- 既存の必須制約では実装不可能
- 後方互換性を保ちつつ拡張

### 割り当て情報の別フィールド化
```typescript
assigned_staff_id: v.optional(v.id('staff')),
assigned_staff_name: v.optional(v.string()),
assignment_timestamp: v.optional(v.number()),
```

**理由**：
- 元の予約情報と割り当て情報を明確に分離
- 監査証跡の保持
- 変更履歴の追跡が容易

## 3. 状態管理：ハイブリッドアプローチ

### StaffSelection型の設計
```typescript
type StaffSelection = StaffDisplay | 'free' | null;
```

**理由**：
- 既存のStaffDisplay型との互換性維持
- 'free'リテラルによる明示的な状態表現
- TypeScriptの型安全性を最大限活用

## 4. パフォーマンス最適化の決定事項

### Promise.allによる並列化
```typescript
// Before - 逐次実行
const menu1 = await ctx.db.get(menuId1);
const menu2 = await ctx.db.get(menuId2);

// After - 並列実行
const [menu1, menu2] = await Promise.all([
  ctx.db.get(menuId1),
  ctx.db.get(menuId2)
]);
```

**理由**：
- ネットワークレイテンシの削減
- 全体的なレスポンスタイムの改善

### Map構造による検索最適化
```typescript
// Before - O(n²)
availableStaff.forEach(staff => {
  const config = configs.find(c => c.staff_id === staff._id);
});

// After - O(n)
const configMap = new Map(configs.map(c => [c.staff_id, c]));
availableStaff.forEach(staff => {
  const config = configMap.get(staff._id);
});
```

**理由**：
- 大規模データでのパフォーマンス向上
- 計算量の大幅な削減

## 5. レースコンディション対策

### ConvexのOCC活用
```typescript
export const create = mutation({
  handler: async (ctx, args) => {
    // 同一トランザクション内で実行
    const duplicates = await checkDoubleBooking();
    if (duplicates.length > 0) throw new Error();
    
    // 即座に作成（外部呼び出しを挟まない）
    const id = await ctx.db.insert('reservation', data);
  }
});
```

**理由**：
- Convexの組み込みOCC機能を最大限活用
- 追加のロック機構が不要
- 自動再試行による高可用性

## 6. UI/UX設計の決定事項

### 指名フリーボタンのデザイン
- **アイコン**：Users（複数人）アイコンを採用
- **配置**：スタッフカードと同列に配置
- **強調表示**：「指名料: 無料」を明記

**理由**：
- 顧客にとっての金銭的メリットを明確化
- 選択肢としての同等性を視覚的に表現

### 管理画面での表示
- **バッジ表示**：「🎯 指名フリー予約」
- **スタッフ名**：「○○ (自動割り当て)」

**理由**：
- 一目で指名フリー予約と識別可能
- 自動割り当てであることを明示

## 7. エラーハンドリング戦略

### 利用可能スタッフなしの場合
```typescript
throw new ConvexError({
  message: '指定された時間帯に利用可能なスタッフがいません',
  code: 'NO_AVAILABLE_STAFF',
  statusCode: 400
});
```

**理由**：
- 顧客に明確なフィードバック
- リトライ可能なエラーとして扱う

## 8. セキュリティ考慮事項

### 顧客への情報開示制限
- 割り当てスタッフ情報は顧客側UIでは非表示
- APIレスポンスでも含めない

**理由**：
- プライバシー保護
- ビジネスロジックの保護

### スタッフ変更権限
- 指名フリー予約のみ変更可能
- 管理者権限が必要

**理由**：
- 通常予約の整合性維持
- 権限の適切な分離

## 9. 将来の拡張性考慮

### スマートアサイン準備
```typescript
// 現在：優先度のみ
staffs.sort((a, b) => b.priority - a.priority);

// 将来：複数要因の考慮
staffs.sort((a, b) => {
  const scoreA = calculateScore(a, customer, menu);
  const scoreB = calculateScore(b, customer, menu);
  return scoreB - scoreA;
});
```

**理由**：
- 段階的な機能拡張が可能
- 既存ロジックへの影響を最小化

## 10. 技術的負債と今後の課題

### 認識している課題
1. **テストカバレッジ**：統合テストが未実装
2. **エラーメッセージ**：国際化対応が未完
3. **パフォーマンス監視**：メトリクス収集の仕組みが必要

### 改善計画
1. Jest/Vitestによる単体・統合テスト追加
2. i18n対応によるエラーメッセージの多言語化
3. DatadogやSentryによるパフォーマンス監視

## まとめ

これらの技術的意思決定により、拡張性と保守性を保ちながら、顧客体験を最優先にした指名フリー予約機能を実現しました。Convexの特性を活かし、複雑な要件を効率的に実装できたと考えています。