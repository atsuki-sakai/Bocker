# 決済失敗時の処理フロー

最終更新日: 2025年1月

## 1. 概要

このドキュメントでは、Stripe決済が失敗した場合の処理フローと、システムの動作について説明します。決済失敗は様々な理由で発生する可能性があり、適切なエラーハンドリングとユーザー体験の維持が重要です。

## 2. 決済失敗のパターン

### 2.1 Checkout Session作成前の失敗

#### パターン1: バリデーションエラー
**発生タイミング**: `/api/stripe/checkout` APIコール時
**原因**:
- 必須パラメータの不足
- 無効なデータ形式
- 金額が0以下

**システムの動作**:
```typescript
// 現在の実装
if (!validation.success) {
  return createValidationErrorResponse(validation.error);
}
```

**ユーザーへの影響**:
- 決済画面に遷移せず、エラーメッセージが表示される
- 予約はstatus='pending'のまま維持される

#### パターン2: Stripe Connect設定エラー
**発生タイミング**: Checkout Session作成時
**原因**:
- サロンのStripe Connectアカウントが未設定
- アカウントが無効化されている

**システムの動作**:
- 400エラーを返す
- 予約データは変更されない

### 2.2 Checkout Session中の失敗

#### パターン3: カード認証失敗
**発生場所**: Stripeの決済画面
**原因**:
- カード番号の誤り
- 有効期限切れ
- 残高不足
- カード会社による拒否
- 3Dセキュア認証失敗

**Stripeの動作**:
1. エラーメッセージを表示
2. 再入力を促す
3. 複数回失敗するとセッションがタイムアウト

**システムの動作**:
- Webhookは発火しない
- 予約はstatus='pending'のまま
- ポイントは使用済み状態のまま（要改善）

#### パターン4: ユーザーによるキャンセル
**発生場所**: Stripeの決済画面
**操作**: ユーザーが「戻る」または「キャンセル」をクリック

**システムの動作**:
```typescript
// cancel_urlに設定されているURL
const cancelUrl = `${BASE_URL}/reservation/${orgId}/calendar?canceled=true&reservation_id=${reservationId}`;
```

**リダイレクト後の処理**:
- `canceled=true`パラメータでキャンセルを検知
- 予約ページに戻る
- 予約データは保持される（再試行可能）

### 2.3 決済処理後の失敗

#### パターン5: Webhook処理失敗
**発生タイミング**: checkout.session.completed受信時
**原因**:
- ネットワークエラー
- タイムアウト
- システムエラー

**現在の実装の問題点**:
- 決済は完了しているが、予約が確定されない
- 顧客には課金されるが、予約はpending状態

## 3. 実装済みの改善内容

### 3.1 Stripe Webhookによる決済失敗検知 ✅

新たに以下のWebhookイベントを監視することで、決済失敗を即座に検知し処理できるようになりました：

#### 1. payment_intent.payment_failed
- **発生タイミング**: 決済試行が失敗した時
- **処理内容**:
  - 予約ステータスを'cancelled'に更新
  - payment_statusを'failed'に更新
  - 在庫の仮押さえを即座に解放
  - cancelled_by='system'、cancel_reason='決済失敗'を設定

#### 2. checkout.session.expired  
- **発生タイミング**: Checkoutセッションが期限切れになった時（通常30分後）
- **処理内容**:
  - 予約ステータスを'cancelled'に更新
  - payment_statusを'cancelled'に更新
  - 在庫の仮押さえを即座に解放
  - cancelled_by='system'、cancel_reason='決済タイムアウト'を設定

**メタデータによるフィルタリング**:
- reservationId、tenantId、orgIdがメタデータに含まれているイベントのみ処理
- サロン予約以外のStripe決済は自動的にスキップ

### 3.2 解決された問題点

#### 1. ポイントの事前使用 ✅
**解決策**: 決済成功後にポイントを使用するよう実装
```typescript
// 予約作成時: ポイント使用を予約のみ記録
const reservationData = {
  use_points: 0, // 決済成功後に使用
  intended_point_use: usePoints, // 使用予定ポイントを記録
  // ...
}

// Webhook受信時: 実際にポイントを減算
if (reservation.intended_point_use && reservation.intended_point_use > 0) {
  await pointTransactionRepo.create({
    points: -reservation.intended_point_use,
    transaction_type: 'used',
    // ...
  });
  await customerRepo.updateCustomerPoints(
    customerUid,
    -reservation.intended_point_use
  );
}
```

#### 2. pending予約の処理 ✅
**解決策**: 自動クリーンアップ機能を実装
- Convexのcronジョブで1時間ごとに期限切れpending予約を自動キャンセル
- pending_expiryフィールドで有効期限管理（デフォルト24時間）
- 管理画面用のgetPendingReservationsクエリで一覧表示可能

#### 3. 在庫の仮押さえ ✅
**解決策**: 仮押さえシステムを実装
- option_stock_holdテーブルで仮押さえ管理
- 決済成功時に在庫を確定（confirmStockHold）
- キャンセル時に在庫を解放（releaseStockHold）
- 30分ごとに期限切れの仮押さえを自動解放

### 3.2 実装済みの機能詳細

#### 1. 予約作成フロー（実装済み）
```typescript
// 1. 予約作成（仮状態）
const reservationData = {
  status: 'pending',
  payment_status: 'pending',
  intended_point_use: usePoints, // ポイント使用は記録のみ
  pending_duration_minutes: 30, // 30分の有効期限
};

// 2. 在庫の仮押さえ
await holdStockMutation({
  tenant_id,
  org_id,
  option_id,
  reservation_id,
  quantity,
  hold_duration_minutes: 30,
});

// 3. Checkout Session作成
const session = await createCheckoutSession({
  metadata: {
    reservationId,
    tenantId,
    orgId,
    // ...
  }
});
```

#### 2. Webhook処理（実装済み）
```typescript
// checkout.session.completed
export async function handleCheckoutSessionCompleted(evt) {
  // 1. 決済確認処理（予約確定・在庫確定を含む）
  await fetchMutation(api.reservation.payment.confirmPayment, {
    reservation_id: reservationId,
    stripe_payment_intent_id: paymentIntentId,
  });
  
  // 2. ポイント使用処理
  if (reservation.intended_point_use > 0) {
    await pointTransactionRepo.create({
      points: -reservation.intended_point_use,
      transaction_type: 'used',
    });
    await customerRepo.updateCustomerPoints(
      customerUid,
      -reservation.intended_point_use
    );
  }
  
  // 3. 通知送信（メール/LINE）
  // 4. ポイント付与予約（30日後）
}
```

#### 3. 自動クリーンアップ（実装済み）
```typescript
// Cronジョブ（1時間ごと）- convex/crons.tsに設定済み
crons.interval(
  'cleanup expired pending reservations',
  { minutes: 60 },
  internal.reservation.payment.cleanupExpiredPendingReservations
)

// クリーンアップ処理
export const cleanupExpiredPendingReservations = internalMutation({
  handler: async (ctx) => {
    const expiredReservations = await ctx.db
      .query('reservation')
      .withIndex('status_start_time_archive')
      .filter(/* 期限切れのpending予約 */)
      .take(100);
    
    for (const reservation of expiredReservations) {
      // 1. 予約をキャンセル
      await updateRecord(ctx, reservation._id, {
        status: 'cancelled',
        cancelled_by: 'system',
        cancel_reason: '決済タイムアウト',
      });
      
      // 2. 仮押さえ在庫を解放
      await ctx.runMutation(api.option.stock.releaseStockHold, {
        reservation_id: reservation._id,
      });
    }
  }
});
```

## 4. ユーザー体験の改善

### 4.1 決済失敗時のUI

#### 現在の画面遷移
```
予約内容入力 → Stripe決済画面 → 失敗 → Stripeエラー画面
```

#### 改善案
```
予約内容入力 → Stripe決済画面 → 失敗 → 予約ページに戻る（エラーメッセージ付き）
```

### 4.2 再試行フロー

#### 実装案
```typescript
// 予約詳細ページに「決済を再試行」ボタンを追加
if (reservation.status === 'pending' && reservation.payment_method === 'credit_card') {
  return (
    <Button onClick={retryPayment}>
      決済を再試行する
    </Button>
  );
}
```

### 4.3 通知の改善

#### 決済失敗通知メール
```
件名: 【重要】予約の決済が完了していません

{customerName} 様

先ほどお申し込みいただいた予約の決済が完了していません。

予約内容：
- 日時: {date} {time}
- メニュー: {menus}
- 金額: ¥{totalPrice}

以下のリンクから24時間以内に決済を完了してください：
{retryPaymentUrl}

24時間を過ぎると予約は自動的にキャンセルされます。
```

## 5. 管理画面での対応

### 5.1 pending予約の管理

#### 一覧表示
```typescript
// 管理画面に追加すべき機能
- pending予約の一覧
- 作成からの経過時間
- 顧客情報
- 手動確定/キャンセルボタン
```

#### 手動処理フロー
1. スタッフが顧客に連絡
2. 別の決済方法（現金）に変更
3. 予約を手動で確定

### 5.2 決済失敗の分析

#### ダッシュボードに追加
- 決済成功率
- 失敗理由の内訳
- 時間帯別の失敗率

## 6. テストシナリオ

### 6.1 Stripeテストカード

| カード番号 | シナリオ | 結果 |
|-----------|---------|------|
| 4000 0000 0000 0002 | 常に拒否 | カード拒否エラー |
| 4000 0000 0000 9995 | 残高不足 | 残高不足エラー |
| 4000 0025 0000 3155 | 3Dセキュア必須 | 認証画面表示 |
| 4000 0000 0000 0341 | 期限切れ | 有効期限エラー |

### 6.2 エラーハンドリングテスト

1. **ネットワークエラーシミュレーション**
   - Webhook受信を遅延させる
   - タイムアウトを発生させる

2. **同時実行テスト**
   - 複数の決済を同時に失敗させる
   - システムの安定性を確認

## 7. 実装ステータス

### Phase 1（完了）✅
1. ✅ pending予約の自動クリーンアップ
   - Convex cronジョブで1時間ごとに実行
   - 期限切れpending予約を自動でキャンセル
2. ✅ ポイント使用タイミングの修正
   - intended_point_useフィールドで使用予定を記録
   - checkout.session.completedで実際に使用
3. ✅ 管理画面でのpending予約表示
   - getPendingReservationsクエリで一覧取得可能
   - 期限切れフラグと残り時間を表示

### Phase 2（完了）✅
1. ✅ 在庫の仮押さえ機能
   - option_stock_holdテーブルで管理
   - 30分のタイムアウト設定
2. ✅ 決済再試行機能
   - retryPaymentミューテーションで有効期限延長
   - フロントエンドで再試行ボタン実装可能
3. ✅ Stripe Webhookによる決済失敗検知
   - payment_intent.payment_failed イベントハンドラー実装
   - checkout.session.expired イベントハンドラー実装
   - 即座に予約キャンセルと在庫解放を実行
4. ⚠️ 失敗通知メール（部分的に実装）
   - Webhook処理でエラー通知の基盤あり
   - 専用のメールテンプレートは未実装

### Phase 3（未実装）
1. ❌ 詳細な分析ダッシュボード
2. ❌ カスタマイズ可能なタイムアウト設定
3. ❌ 決済方法の自動切り替え提案

## 8. まとめ

決済失敗時の主要な問題は解決されました：
- ✅ ポイントは決済成功後にのみ使用される
- ✅ pending予約は自動的にクリーンアップされる
- ✅ 在庫は仮押さえ方式で管理される

実装された改善により、「仮予約→決済→確定」の3段階フローが確立され、各段階でのロールバック処理が適切に機能します。

---

作成者: Claude
作成日: 2025年1月