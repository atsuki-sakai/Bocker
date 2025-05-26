StripeとConvexを連携させたサブスクリプション管理のための処理フローの概要です。

⸻

🎯 目的
	•	Stripeのサブスクリプション状態（active、past_due、canceledなど）をConvexのデータベースと正確に同期させる。
	•	決済成功時にユーザーのアクセス権限を付与し、失敗時には即座に権限を停止する。

⸻

🔔 監視すべきWebhookイベント

イベント名	説明
checkout.session.completed	Checkout経由でサブスクリプションが作成された際に発火。subscription.idを取得して保存する。
invoice.payment_succeeded	請求書の支払いが成功した際に発火。サブスクリプションをactiveに更新し、アクセス権限を付与する。
invoice.payment_failed	請求書の支払いが失敗した際に発火。サブスクリプションをpast_dueに更新し、リトライ処理を行う。
customer.subscription.updated	サブスクリプションの状態や内容が変更された際に発火。statusの変化やcancel_at_period_endの設定を検知する。
customer.subscription.deleted	サブスクリプションが完全にキャンセルされた際に発火。canceled状態を検知し、アクセス権限を停止する。


⸻

🧩 Convexでのデータモデル
	•	subscriptions テーブル:
	•	subscriptionId（主キー）
	•	customerId
	•	status（active、past_due、canceledなど）
	•	currentPeriodEnd
	•	cancelAtPeriodEnd（boolean） ￼ ￼
	•	webhookEvents テーブル:
	•	eventId（主キー）
	•	receivedAt ￼

⸻

🔄 状態遷移フロー

[checkout.session.completed]
          ↓
[invoice.payment_succeeded] → status: active → アクセス権限付与
          ↓
[invoice.payment_failed] → status: past_due → リトライ処理
          ↓
[customer.subscription.updated] → status変更やcancel_at_period_end設定を検知
          ↓
[customer.subscription.deleted] → status: canceled → アクセス権限停止


⸻

🛡️ 安全な処理のためのポイント
	1.	署名検証: StripeからのWebhookリクエストに対して、署名を検証して正当性を確認する。
	2.	冪等性の確保: event.idをwebhookEventsテーブルに保存し、同じイベントの重複処理を防ぐ。
	3.	状態管理の一元化: サブスクリプションの状態管理をConvexのsubscriptionsテーブルで一元化し、アプリケーションのアクセス制御に利用する。
	4.	定期的な同期処理: 万が一Webhookイベントが失敗した場合に備え、定期的にStripe APIを使用してサブスクリプションの状態を確認し、Convexと同期させる。

このフローに従うことで、StripeとConvex間のサブスクリプション状態の同期を安全かつ正確に行います。