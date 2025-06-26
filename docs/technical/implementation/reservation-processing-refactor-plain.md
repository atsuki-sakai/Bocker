# 予約処理リファクタリング実装ガイド（文章版）

---

## 1. ゴール

1. 予約を作成・更新・キャンセルするロジックを一つの Convex の Mutation に集約し、フロントエンド、Webhook、Cron など呼び出し元が違っても同じ経路を通るようにする。
2. クーポン、ポイント、在庫、カルテといった副次的更新を、Convex トランザクションの直後に Action でまとめて処理し、途中で失敗した場合は予約自体を取り消す仕組みを確立する。
3. Convex と Supabase の２種類のデータベースをまたがって扱う際の整合性、エラーハンドリング、べき等性（重複実行しても結果が壊れないこと）を標準化する。

---

## 2. 現状整理

- 予約作成は「顧客カレンダーページ」「管理画面の予約フォーム」「Stripe の Webhook」それぞれに別実装がある。
- キャンセル処理は API Route とダッシュボード詳細画面に分かれる。
- ポイント計算やカルテ更新などの副次処理は、各 UI が Supabase を直接呼びに行くため重複が多い。

---

## 3. 新しい全体像

1. **予約管理 Mutation** という名前の共通関数を Convex に作る。モード（作成・確定・キャンセル・ステータス変更）とペイロードを受け取り、必ずこの関数経由で状態が変わる。
2. 同じ Mutation の中で、スタッフ重複チェックや在庫の増減など「リアルタイム整合性が必要な処理」をトランザクションとしてまとめる。
3. Mutation が成功した直後に Action を呼び出し、Supabase への履歴書き込みやポイント処理など外部副次処理を行う。失敗したら Mutation 自体をロールバックし、エラーを Sentry に通知する。
4. Webhook、キャンセル API、Cron などバックグラウンド側も、すべてこの Mutation を再利用する。Stripe からのイベント ID を idempotency キーとして渡し、同じイベントが二度来ても二重に処理されない。

---

## 4. UI 側の変更点

予約系の UI は主に四つあります。それぞれで **どのように新 Mutation を呼び出すか** を番号付きで整理します。

1. **顧客カレンダーページ**  
   - これまでは `createReservationMutation` を直接呼んでいた。  
   - これからは `manageReservationMutation` を **mode = "create"** で呼び出すだけに変更する。  
   - 戻り値が現金の場合は「予約 ID」、カードの場合は「予約 ID と Checkout URL」なので、後段の処理はそれに合わせて分岐する。  

2. **管理画面の予約追加フォーム**  
   - 実装は顧客ページと同様だが、スタッフが代行入力する点が異なるだけ。  
   - 送信時は `manageReservationMutation` を mode="create" で呼び出す。  
   - 追加入力した顧客情報も Payload に含めて Convex 側で処理する。  

3. **キャンセル UI（顧客マイページなど）**  
   - キャンセルボタンを押したら `manageReservationMutation` を **mode = "cancel"** で呼び出す。  
   - ペイロードには reservationId, cancelledBy("customer"), cancelReason を渡す。  
   - 処理が成功すると在庫が戻り、ポイントが返還される。  

4. **ステータス変更 UI（スタッフダッシュボード詳細）**  
   - スタッフが予約の状態をプルダウンで変更したら、 `manageReservationMutation` を **mode = "status"** で呼び出す。  
   - ペイロードは reservationId と新しい status。

---

## 4-1. ステータス変更 UI で行われる内部処理

状態ごとに Convex と Supabase で走る処理を文章で列挙します。

*Pending* （保留）  
→ 予約枠の計算に含めないだけで、副次処理は一切行わない。予約内容を後から編集する想定。

*Paid* または *Completed*（決済済み／施術完了）  
1. Convex の reservation の `payment_status` を "paid" または `status` を "completed" に更新。  
2. Supabase の carte の `ltv_price` に今回の支払総額を加算。  
3. Supabase の `point_task_queue` に 30 日後付与ポイントの予約行を挿入。  
4. Supabase の customer の `total_reservation_count` を 1 増やす。  
5. 顧客が初回来店で `customer_type` が "first_time" だった場合は "repeat" に変更。  
6. Supabase の customer の `last_reservation_date_unix` を現在時刻で更新。

*Cancelled* または *Refunded*（キャンセル／返金）  
1. Convex の reservation を "cancelled" あるいは "refunded" に変更し在庫を復元。  
2. Reservation にひもづく Supabase の `carte_detail` レコードを削除。  
3. ポイントを利用していた場合は同額のポイントを `point_transaction` に返還行として記録し、`customer_points` を増やす。

これらの Supabase 更新はすべて `performSideEffects` Action の中で行われ、途中で失敗すると Convex 側の変更も巻き戻される。

---

## 5. Webhook 側の変更点

- Stripe の決済成功イベントでは、従来の `confirmPayment` 呼び出しをやめ、モード「confirm」で予約管理 Mutation を呼び出す。
- 決済失敗やセッション期限切れの場合は、同じ Mutation をモード「cancel」で呼び出し、在庫を戻して予約をキャンセルする。

---

## 6. Convex 内で行う処理の順序

### 作成モード
1. スタッフのダブルブッキングを調べ、重複があればエラーを返す。
2. オプション在庫を減らす。操作はアトミックに行い、在庫が足りなければ即座にエラー。
3. `reservation` と `reservation_detail` の２テーブルにレコードを挿入する。
4. 支払い方法が現金ならステータスは「confirmed」、カードなら「pending」にする。

### 確定モード（カード決済成功）
1. 予約ステータスを「confirmed」に更新し、支払いステータスを「paid」にする。
2. Stripe の PaymentIntent ID を保存する。

### キャンセルモード
1. 予約ステータスを「cancelled」に更新する。
2. `reservation_detail` からオプション一覧を取得し、減らした在庫を元に戻す。

### ステータス変更モード
1. 予約の `status` フィールドだけを任意ステータスに更新する。

---

## 7. Supabase への副次処理（Action 内）

- **作成直後** にカルテを作成または更新し、カルテ詳細を追加する。
- **決済確定時** に、予定していたポイントを差し引くトランザクションを記録し、顧客ポイント残高を減算する。クーポンを使った場合はクーポン取引も記録する。さらにカルテの LTV を加算し、３０日後にポイントを付与するタスクを登録する。
- **キャンセル時** に、もしポイントを使用していたならポイント返還のトランザクションを入れ、ポイント残高を戻す。未実行のポイント付与キューがあれば削除する。

Supabase への複数ステートメントは `transaction` で囲み、途中で失敗した場合は Action 全体が throw し、Mutation がロールバックされる。

---

## 8. エラーハンドリングとべき等性

- UI からの呼び出しには idempotency キーは不要だが、Webhook には Stripe の Event ID をそのまま渡し、同じ ID が既に `webhook_events` テーブルにあれば結果を再利用して処理をスキップする。
- 副次処理で Supabase 更新が失敗した場合、Sentry に例外を送信し reservation の `status` を "error" にして可視化する。
- 在庫操作は常に「残数が 0 未満にならない」という条件付きで行うので、競合があってもマイナス在庫は発生しない。

---

## 9. 変更が必要な主要ファイル

1. 顧客向けカレンダーページの予約送信箇所を新 Mutation 呼び出しに置き換える。パスは `app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx`。
2. 管理画面の予約フォームも同じく置き換える。パスは `app/[locale]/(dashboard)/dashboard/reservation/add/ReservationForm.tsx`。
3. Stripe Webhook の成功ハンドラを `manage` 呼び出しに変更する。パスは `services/webhook/stripe/handlers.checkout.ts`。
4. 顧客キャンセル API Route を `manage` の cancel モードを使うよう変更する。パスは `app/api/reservation/cancel/route.ts`。
5. スタッフがステータス変更を行う画面で `updateStatus` Mutation を `manage` モードに置き換える。パスは `app/[locale]/(dashboard)/dashboard/reservation/[reservation_id]/page.tsx`。
6. Convex に `reservation/manage` Mutation と `performSideEffects` Action を新設する。パスは `convex/reservation/mutation.ts` と `convex/reservation/action.ts`。
7. 既存の `create`, `updateStatus`, `cancelReservation`, `confirmPayment` など旧 Mutation は内部で呼び出すか非推奨とし、新 Mutation に移行する。
8. `convex/option/stock.ts` の在庫関数は外部から直接呼ばれないよう、 `manage` の中だけで使う。
9. Cron で期限切れ pending 予約を掃除している場所では、直接 cancel する代わりに `manage` モード cancel を呼び出すようにする。
