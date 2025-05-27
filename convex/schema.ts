/* =============================================================
 * Convex スキーマ定義（美容サロン向けマルチテナント SaaS "Bocker"）
 * =============================================================
 * ■ 全体ポリシー
 * -----------------------------------------------------------------
 * 1. **データ整合性と時刻の基準**:
 *    - すべての時間は UNIX エポック（ミリ秒、UTC）で保存し、フロントエンドでユーザーのタイムゾーン（日本時間など）へ変換表示します。
 *    - 日付文字列は "YYYY-MM-DD"、時間文字列(Hour)は "HH:MM" 形式を基本とします（例: スケジュール設定）。
 * 2. **マルチテナントアーキテクチャ**:
 *    - 全ての業務データ用テーブルは `tenant_id` を必須とし、多くの場合は `org_id`（店舗ID）も組み合わせます。
 *    - クエリの際は、これらのIDを第一キーとする複合インデックスを積極的に利用し、テナント間のデータ分離とクエリ効率を保証します。
 * 3. **論理削除の徹底**:
 *    - `is_archive` (boolean) フラグを `CommonFields` に含め、原則として物理削除は行わず論理削除を採用します。
 *    - 通常のデータ取得クエリでは `is_archive: false` を条件に含めます。複合インデックスの末尾に配置することで、アクティブなデータへのアクセスを効率化します。
 * 4. **共通メタフィールド (`CommonFields`)**:
 *    - `created_at` (作成日時), `updated_at` (最終更新日時), `_creationTime` (Convex自動付与), `is_archive` (論理削除フラグ), `sort_key` (汎用ソートキー、updated_atと連動推奨) を定義し、監査、論理削除、並び替え操作を横断的にサポートします。
 * 5. **スケーラビリティ戦略**:
 *    - **アクティブデータ中心**: Convex上には主にアクティブなデータ（例: 未来の予約、メニュー、スタッフ情報など予約に関連するデータ）を保持します。
 *    - **過去データのアーカイブ**: 過去の予約データや顧客データは、毎晩、深夜にSupabaseへ移行します。
 *      - 具体的な移行基準例:
 *        - `reservation`: 施術完了し現在より過去の予約データ。
 *        - `customer` (Supabase側で管理): 最終来店日から2年経過したアクティブでない顧客データなど。
 *    - この運用により、Convexクラスタ内のドキュメント数を適正範囲（目標: 数百万レコードオーダー）に保ち、パフォーマンスとコスト効率を維持します。
 * 6. **命名規則**:
 * 　　supabaseとの互換性のため、以下のルールで命名します。
 *    - テーブル名: スネークケース（例: `reservation_detail`）。
 *    - フィールド名: スネークケース（例: `start_time_unix`）。
 *    - *_config: 特定エンティティの設定や定数を格納するテーブル（通常1:1または1:Nの関係）。
 *    - *_detail: 特定エンティティの補足情報や詳細情報を格納するテーブル（通常1:1の関係）。
 *    - *_exclusion_*: 多対多の中間テーブルや、除外リストを示すテーブル。
 * 7. **型定義との連携**:
 *    - 頻出する型や複雑な型は `convex/types.ts` に集約し、スキーマ定義で `import` して利用します (例: `dayOfWeekType`, `imageType`)。
 *
 * ■ エンティティ相関図（主な関連のみ、詳細は各テーブル定義参照）
 * -----------------------------------------------------------------
 *   tenant (テナント) ─▶ organization (店舗) ─▶ staff (スタッフ) ─▶ reservation (予約)
 *                 │                         └─▶ menu (施術メニュー)
 *                 │                         └─▶ option (物販オプション)
 *                 │                         └─▶ config (店舗設定各種)
 *                 │
 *                 └─▶ subscription (契約情報) [tenant:subscription 1:1想定]
 *                 └─▶ coupon (クーポン) [org_id も持つ]
 *                 └─▶ point_config (ポイント設定) [org_id も持つ]
 *
 *   (関連テーブル例)
 *   reservation ─|| reservation_detail (予約詳細) [1:1]
 *   staff       ─|| staff_config (スタッフ追加設定) [1:1]
 *   staff       ─▶ staff_week_schedule (スタッフ週次シフト) [1:N]
 *   staff       ─▶ staff_schedule (スタッフ個別スケジュール) [1:N]
 *   menu        ─▶ menu_exclusion_staff (メニュー担当不可スタッフ) [N:M]
 *   coupon      ─▶ coupon_exclusion_menu (クーポン対象外メニュー) [N:M]
 *   point_config─▶ point_exclusion_menu (ポイント対象外メニュー) [N:M]
 *
 *   ※ `tenant_id` はほぼ全てのテーブルに存在するため図では省略。
 *   ※ `org_id` は `organization` 以下の多くのテーブルに存在するため図では省略。
 *
 * ■ 主要な業務フローと関連テーブル（例）
 * -----------------------------------------------------------------
 * 1. **新規予約作成**:
 *    - `customer` (顧客特定/新規作成、Supabase連携) → `menu`, `option` (メニュー選択) → `staff` (スタッフ指名/自動選択) → `staff_schedule`, `week_schedule`, `schedule_exception` (空き状況確認) → `reservation` (予約枠確保) → `reservation_detail` (詳細情報保存) → 通知 (LINE/メール(Resend)等)
 * 2. **スタッフ勤怠管理**:
 *    - `staff_week_schedule` (基本シフト設定) → `staff_schedule` (休暇/特勤登録) → 予約受付時の空き判定に影響
 * 3. **売上集計 (日次/月次)**:
 *    - `reservation` と `reservation_detail` から完了済み予約を抽出し、`menu`, `option`, `coupon`, `point_config` の情報と合わせて集計。必要に応じてサマリーテーブルへ格納。
 *
 * ■ インデックス設計思想
 * -----------------------------------------------------------------
 * - **テナント分離**: ほぼ全てのクエリが `tenant_id` (及び `org_id`) でフィルタリングされるため、これらを複合インデックスの先頭に配置。
 * - **検索条件の考慮**: よく使われる検索条件やソートキーをインデックスに含める (例: `status`, `date`, `start_time_unix`)。
 * - **論理削除フラグ**: `is_archive` は複合インデックスの末尾に配置し、アクティブデータ (`is_archive: false`) の絞り込み効率を維持。
 * - **カーディナリティ**: 選択性の高いフィールドをインデックスの前方に配置することを意識。
 * - 各テーブルのインデックス定義コメントで、想定されるクエリユースケースを記述推奨。
 *
 * ■ スケーラビリティ（再掲・補足）
 * -----------------------------------------------------------------
 * - Convexでのリアルタイム性が求められるアクティブデータ（未来の予約、メニュー、スタッフ情報など）に注力。
 * - 履歴データやアクセス頻度の低いデータは、コストとパフォーマンスのバランスを考慮し、Supabaseへの定期的なオフロードを計画・実行。
 * - これによりConvexのデータベースサイズを管理し、長期的な運用コストとパフォーマンスを最適化。
 * - 想定レコード数目安:
 *   - `tenant`: 数百〜数千
 *   - `organization`: テナントあたり数件〜数十件
 *   - `staff`: 店舗あたり数名〜数十名
 *   - `menu`: 店舗あたり数十件
 *   - `reservation`: アクティブ店舗あたり月間数百件〜数千件（過去分はアーカイブ）
 *
 * ■ Supabase連携テーブル (データアーカイブ先 / 拡張機能)
 * -----------------------------------------------------------------
 *-- 1. 顧客マスタ情報
CREATE TABLE public.customer (
  tenant_id                    TEXT        NOT NULL,
  org_id                       TEXT        NOT NULL,
  line_id                      TEXT,
  line_user_name               TEXT,
  phone                        TEXT,
  email                        TEXT,
  password                     TEXT,
  first_name                   TEXT,
  last_name                    TEXT,
  searchable_text              TEXT,
  use_count                    INTEGER,
  last_reservation_date_unix   BIGINT,
  tags                         TEXT[],
  initial_tracking             JSONB,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive                   BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key                     TEXT
);

-- 2. 顧客補足情報（1:1）
CREATE TABLE public.customer_detail (
  tenant_id     TEXT        NOT NULL,
  org_id        TEXT        NOT NULL,
  customer_id   UUID        NOT NULL REFERENCES public.customer(id),
  email         TEXT,
  age           INTEGER,
  birthday      DATE,
  gender        TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive    BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key      TEXT
);

-- 3. 顧客ポイント残高
CREATE TABLE public.customer_points (
  tenant_id                  TEXT        NOT NULL,
  org_id                     TEXT        NOT NULL,
  customer_id                UUID        NOT NULL REFERENCES public.customer(id),
  total_points               INTEGER,
  last_transaction_date_unix BIGINT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive                 BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key                   TEXT
);

-- 4. ポイント付与キュー
CREATE TABLE public.point_task_queue (
  tenant_id           TEXT        NOT NULL,
  org_id              TEXT        NOT NULL,
  reservation_id      UUID        REFERENCES public.reservation(id),
  customer_id         UUID        NOT NULL REFERENCES public.customer(id),
  points              INTEGER,
  scheduled_for_unix  BIGINT,
  status              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive          BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key            TEXT
);

-- 5. ポイント履歴
CREATE TABLE public.point_transaction (
  tenant_id            TEXT        NOT NULL,
  org_id               TEXT        NOT NULL,
  reservation_id       UUID        REFERENCES public.reservation(id),
  customer_id          UUID        NOT NULL REFERENCES public.customer(id),
  points               INTEGER     NOT NULL,
  transaction_type     TEXT,
  transaction_date_unix BIGINT    NOT NULL,
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive           BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key             TEXT
);

-- 6. クーポン利用履歴
CREATE TABLE public.coupon_transaction (
  tenant_id            TEXT        NOT NULL,
  org_id               TEXT        NOT NULL,
  coupon_id            UUID        NOT NULL REFERENCES public.coupon(id),
  customer_id          UUID        NOT NULL REFERENCES public.customer(id),
  reservation_id       UUID        NOT NULL REFERENCES public.reservation(id),
  transaction_date_unix BIGINT    NOT NULL,
  discount_amount      INTEGER,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive           BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key             TEXT
);

-- 7. カルテ基本情報
CREATE TABLE public.carte (
  tenant_id      TEXT        NOT NULL,
  org_id         TEXT        NOT NULL,
  customer_id    UUID        NOT NULL REFERENCES public.customer(id),
  skin_type      TEXT,
  hair_type      TEXT,
  allergy_history TEXT,
  medical_history TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive     BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key       TEXT
);

-- 8. カルテ詳細（施術ごと）
CREATE TABLE public.carte_detail (
  tenant_id           TEXT        NOT NULL,
  org_id              TEXT        NOT NULL,
  carte_id            UUID        NOT NULL REFERENCES public.carte(id),
  reservation_id      UUID        NOT NULL REFERENCES public.reservation(id),
  staff_id            UUID        NOT NULL REFERENCES public.staff(id),
  before_hair_img_path TEXT,
  after_hair_img_path  TEXT,
  menu_details_json    JSONB,
  used_products_json   JSONB,
  notes                TEXT,
  customer_requests    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive           BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key             TEXT
);

-- 9. タイムカード（勤怠）
CREATE TABLE public.time_card (
  tenant_id              TEXT        NOT NULL,
  org_id                 TEXT        NOT NULL,
  staff_id               UUID        NOT NULL REFERENCES public.staff(id),
  start_date_time_unix   BIGINT     NOT NULL,
  end_date_time_unix     BIGINT,
  break_duration_minutes INTEGER,
  worked_time_minutes    INTEGER,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive             BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key               TEXT
);

-- 10. トラッキングイベントログ
CREATE TABLE public.tracking_event (
  tenant_id           TEXT        NOT NULL,
  org_id              TEXT        NOT NULL,
  session_id          TEXT        NOT NULL,
  event_timestamp_unix BIGINT    NOT NULL,
  event_type          TEXT        NOT NULL,
  event_source        TEXT        NOT NULL,
  page_url            TEXT,
  page_title          TEXT,
  target_element      TEXT,
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  utm_term            TEXT,
  utm_content         TEXT,
  custom_data_json    JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive          BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key            TEXT
);

-- 11. トラッキング集計サマリー
CREATE TABLE public.tracking_summaries (
  tenant_id         TEXT        NOT NULL,
  org_id            TEXT        NOT NULL,
  summary_date      DATE        NOT NULL,
  dimension_type    TEXT        NOT NULL,
  dimension_value   TEXT        NOT NULL,
  total_count       INTEGER     NOT NULL,
  unique_user_count INTEGER,
  conversion_count  INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archive        BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_key          TEXT
);
 * ============================================================== */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import {
  CommonFields,
  dayOfWeekType,
  billingPeriodType,
  reservationStatusType,
  ExceptionScheduleType,
  menuPaymentMethodType,
  paymentMethodType,
  roleType,
  targetType,
  genderType,
  reservationIntervalMinutesType,
  activeCustomerType,
  reservationMenuOrOptionType,
  imageType,
  reservationPaymentStatusType,
  couponDiscountType,
  subscriptionStatusType,
  stripeConnectStatusType,
  webhookEventProcessingResultType,
} from './types';

/**
 * =========================
 * テナント
 * =========================
 * SaaS の契約主体。1テナント = 1美容室チェーン（複数店舗可）。
 */
const tenant = defineTable({
  user_id: v.string(),                     // Clerk ユーザーID（オーナー）
  user_email: v.string(),                  // Clerk のメール
  stripe_customer_id: v.optional(v.string()),
  subscription_id: v.optional(v.string()), // 現契約サブスクリプション
  subscription_status: v.optional(subscriptionStatusType),  // incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, or paused
  plan_name: v.optional(v.string()),       // "lite" | "pro"
  price_id: v.optional(v.string()),        // Stripe Price ID
  billing_period: v.optional(billingPeriodType), // 課金期間
  ...CommonFields,
})
.index('by_user_archive',              ['user_id', 'is_archive']) // Clerk ユーザーID から取得
.index('by_user_email_archive',        ['user_email', 'is_archive']) // Clerk オーナーのメール から取得
.index('by_stripe_customer_archive',   ['stripe_customer_id', 'is_archive']); // Stripe Customer ID から取得

/**
 * =========================
 * サブスクリプション関連
 * =========================
 * テナントに1レコード。Stripe の課金情報を保持します。
 * 組織を増やす際に、プラン x 組織分でサブスクリプションを作成します。
 * : Pro x 3つの組織 = 10,000 x 3 = 30,000円
 */
const subscription = defineTable({
  tenant_id: v.id('tenant'),          // 契約元のテナントID
  stripe_subscription_id: v.optional(v.string()),  // Stripe Subscription ID
  stripe_customer_id: v.optional(v.string()),// Stripe Customer ID（Clerkユーザ単位ではなくテナント単位）
  status: v.optional(subscriptionStatusType),
  price_id: v.optional(v.string()),         // Stripe Price ID
  plan_name: v.optional(v.string()),        // "Lite" | "Pro" | "Enterprise"
  billing_period: v.optional(billingPeriodType), // "monthly" | "yearly"
  current_period_end: v.optional(v.number()),    // 現在の課金期間終了UNIX
  cancel_at: v.optional(v.number()),    // キャンセル日UNIX
  ...CommonFields,
})
.index('by_tenant_archive',            ['tenant_id', 'is_archive']) // テナントから 1レコード取得
.index('by_stripe_subscription_archive',      ['stripe_subscription_id', 'is_archive']) // Stripe Webhook 用
.index('by_stripe_customer_archive',   ['stripe_customer_id', 'is_archive']); // Stripe Customer ID で取得

/**
 * =========================
 * テナント紹介コード
 * =========================
 * 友達紹介キャンペーン用。テナント単位で発行。
 * テナントにつき1レコード。
 */
const tenant_referral = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  subscriber_tenant_id: v.optional(v.id('tenant')), // 紹介を受けたテナントID (紹介を受けていない場合は無い)
  referral_code: v.string(),   // 例: "ABCD1234" 自身の持つ紹介コード
  referral_point: v.number(),  // 所持している紹介ポイントの数 / 月に一度割引が適用できる
  total_referral_count: v.optional(v.number()), // 総紹介数
  last_bonus_invoice_id: v.optional(v.string()), // 初回ボーナス処理用 Invoice ID (冪等性用)
  last_discount_applied_month: v.optional(v.string()), // 最後に割引を適用した月（YYYY-MM形式、二重割引防止用）
  ...CommonFields,
})
.index('by_last_bonus_invoice_archive', ['last_bonus_invoice_id', 'is_archive']) // last_bonus_invoice_id から 1レコード取得
.index('by_referral_code_archive', ['referral_code', 'is_archive']) // referral_code から 1レコード取得
.index('by_tenant_archive', ['tenant_id', 'is_archive']); // tenant から 1レコード取得


/**
 * =========================
 * Organization（店舗・支社など）
 * =========================
 * テナントの持つ一つの店舗に対応。
 * テナントの持つ店舗の分だけレコードを作成する。
 */
const organization = defineTable({
  tenant_id: v.id('tenant'),
  is_active: v.boolean(), // 有効/無効
  org_name: v.string(),              // 店舗名
  org_email: v.optional(v.string()),     // 店舗のメール
  stripe_account_id: v.optional(v.string()), // Stripe Connect Account ID
  stripe_connect_status: v.optional(stripeConnectStatusType), // Stripe Connect ステータス
  stripe_connect_created_at: v.optional(v.number()), // Stripe Connect 作成日時
  ...CommonFields,
})
.index('by_stripe_account_archive', ['stripe_account_id', 'is_archive']) // user_idとstripe_account_idで取得
.index('by_tenant_active_archive', ['tenant_id', 'is_active', 'is_archive']); // tenant_idと有効/無効で取得

/**
 * =========================
 * 店舗基本設定
 * =========================
 * 店舗の分だけレコードを作成される。
 */
const config = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  phone: v.optional(v.string()), // 電話番号
  postal_code: v.optional(v.string()), // 郵便番号
  address: v.optional(v.string()), // 住所
  reservation_rules: v.optional(v.string()), // 予約ルール
  images: v.array(imageType), // 画像
  description: v.optional(v.string()), // 店舗説明
  ...CommonFields,
})
.index('by_tenant_org_archive', ['tenant_id', 'org_id', 'is_archive'])


/**
 * =========================
 * Option（物販・追加オプション）
 * =========================
 * menu と区別し、在庫や注文制限を持つ汎用商品テーブル。
 */
const option = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  name: v.string(), // 商品名
  unit_price: v.number(), // 単価
  sale_price: v.optional(v.number()), // セール価格
  order_limit: v.number(),        // 同一予約内での最大個数
  in_stock: v.optional(v.number()), // 在庫数
  duration_min: v.optional(v.number()),       // 併用施術時間
  tags: v.array(v.string()), // タグ
  description: v.optional(v.string()), // 商品説明
  images: v.array(imageType), // 画像
  is_active: v.boolean(), // 有効/無効
  ...CommonFields,
})
.index('by_tenant_org_active_archive', ['tenant_id', 'org_id', 'is_active', 'is_archive']); // org_id で取得

/**
 * =========================
 * API 設定（LINE/Firebase 等）
 * =========================
 * 店舗単位での外部サービス認証情報。
 * 店舗の分だけレコードを作成される。
 */
const api_config = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  line_access_token: v.optional(v.string()), // LINE Access Token
  line_channel_secret: v.optional(v.string()), // LINE Channel Secret
  liff_id: v.optional(v.string()), // LIFF ID
  line_channel_id: v.optional(v.string()), // LINE Channel ID
  destination_id: v.optional(v.string()), // 送信先ID
  ...CommonFields,
})
.index('by_tenant_org_archive', ['tenant_id', 'org_id', 'is_archive']);

/**
 * =========================
 * 店舗の予約設定
 * =========================
 * 店舗の分だけレコードを作成される。
 */
const reservation_config = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  available_sheet: v.number(),         // 同時受付可能席数
  reservation_limit_days: v.number(),  // 何日先まで予約可
  available_cancel_days: v.number(),   // 何日前までキャンセル可
  today_first_later_minutes: v.number(), // 当日の最短予約時の開始時間を何分後にするか
  reservation_interval_minutes: reservationIntervalMinutesType, // 予約間隔
  ...CommonFields,
})
.index('by_tenant_org_archive', ['tenant_id', 'org_id', 'is_archive']); // org_id で取得

/**
 * =========================
 * 店舗営業スケジュール（曜日ベース）
 * =========================
 * 店舗の分だけレコードを作成される。一つの店舗につき7レコード作成される。
 */
const week_schedule = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  is_open: v.boolean(), // 営業/休業
  day_of_week: dayOfWeekType, // 曜日
  start_hour: v.optional(v.string()), // 開始時間
  end_hour: v.optional(v.string()), // 終了時間
  ...CommonFields,
})
.index('by_tenant_org_archive', ['tenant_id', 'org_id', 'is_archive']) // 組織IDとテナントIdで全てで取得
.index('by_tenant_org_week_archive', ['tenant_id', 'org_id', 'day_of_week', 'is_archive']); // org_idと曜日と営業しているか？で取得 一件取得

/**
 * =========================
 * 休業日（祝日・臨時休業など）
 * =========================
 * 店舗の分だけレコードを作成される。店舗は最大で0〜30日分のレコードを作成できる。
 */
const exception_schedule = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  type: ExceptionScheduleType, // スケジュール例外タイプ
  date: v.string(), // 日付 YYYY-MM-DD
  ...CommonFields,
})
.index('by_tenant_org_archive', ['tenant_id', 'org_id', 'is_archive']) // org_id で取得
.index('by_tenant_org_date_type_archive', ['tenant_id', 'org_id', 'date', 'type', 'is_archive']); // org_idと日付と例外タイプで取得　一件取得

/**
 * スタッフ毎の曜日スケジュール（定期休暇・短縮営業など）
 * スタッフ一人につき曜日毎の出勤情報を持つレコード、スタッフ一人につき7レコード作成される。
 */
const staff_week_schedule = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  staff_id: v.id('staff'), // スタッフID
  is_open: v.boolean(), // 営業/休業
  day_of_week: dayOfWeekType, // 曜日
  start_hour: v.optional(v.string()), // 開始時間
  end_hour: v.optional(v.string()), // 終了時間
  ...CommonFields,
})
.index('by_tenant_org_staff_archive', ['tenant_id', 'org_id', 'staff_id', 'is_archive']) // staff_id で取得
.index('by_tenant_org_staff_week_open_archive', ['tenant_id', 'org_id', 'staff_id', 'day_of_week', 'is_open', 'is_archive']) // staff_idと曜日と営業しているか？で取得　一件取得


/**
 * スタッフ個別スケジュール（休暇・短縮営業など）
 * スタッフ一人につき最大で0〜30日分のレコードを作成できる。
 */
const staff_exception_schedule = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  staff_id: v.id('staff'), // スタッフID
  date: v.string(), // 日付 YYYY-MM-DD
  start_time_unix: v.optional(v.number()), // 開始時間
  end_time_unix: v.optional(v.number()), // 終了時間
  notes: v.optional(v.string()), // メモ
  type: ExceptionScheduleType, // スタッフスケジュールタイプ
  is_all_day: v.boolean(), // 全日休暇
  ...CommonFields,
})
.index('by_tenant_org_date_archive',['tenant_id', 'org_id', 'date', 'is_archive']) // 組織＋日付単位で一覧取得
.index('by_tenant_org_staff_date_archive',   ['tenant_id', 'org_id', 'staff_id', 'date','is_archive']) // スタッフ＋日付での一件取得
/**
 * =========================
 * STAFF (従業員)
 * =========================
 * 組織に所属するスタッフで無制限に作成可能。平均5名程度。
 */
const staff = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  name: v.string(), // スタッフ名
  age: v.optional(v.number()), // 年齢
  email: v.string(), // メールアドレス
  gender: genderType, // 性別
  instagram_link: v.optional(v.string()), // インスタグラムリンク
  description: v.optional(v.string()), // 自己紹介
  images: v.array(imageType), // 画像
  tags: v.array(v.string()), // タグ
  featured_hair_images: v.array(imageType), // フィーチャー画像
  is_active: v.boolean(), // 有効/無効
  ...CommonFields,
})  
.index('by_tenant_org_active_archive', ['tenant_id', 'org_id', 'is_active', 'is_archive'])

/**
 * =========================
 * スタッフ認証（PIN ログイン等）
 * =========================
 * スタッフ一人につき一つ作成する。
 */
const staff_auth = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  staff_id: v.id('staff'), // スタッフID
  pin_code: v.optional(v.string()), // PINコード
  role: roleType, // ロール
  ...CommonFields,
})
.index('by_tenant_org_staff_archive', ['tenant_id', 'org_id', 'staff_id', 'is_archive']);

/**
 * =========================
 * スタッフ追加設定
 * =========================
 * スタッフ一人につき一つ作成する。
 */
const staff_config = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  staff_id: v.id('staff'), // スタッフID
  extra_charge: v.optional(v.number()), // 追加料金
  priority: v.optional(v.number()), // 優先度
  ...CommonFields,
})
.index('by_tenant_org_staff_archive', ['tenant_id', 'org_id', 'staff_id', 'is_archive']);

/**
 * =========================
 * MENU (施術メニュー)
 * =========================
 * 組織の取り扱うメニュー。無制限に作成可能。平均は20点程度。
 */
const menu = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  name: v.string(), // メニュー名
  unit_price: v.number(), // 単価
  sale_price: v.optional(v.number()), // セール価格
  duration_min: v.number(), // 施術時間
  images: v.array(imageType), // 画像
  description: v.optional(v.string()), // 説明
  target_gender: v.optional(genderType), // 対象性別
  target_type: v.optional(targetType), // 対象タイプ
  categories: v.array(v.string()), // カテゴリ
  tags: v.array(v.string()), // タグ
  payment_method: menuPaymentMethodType, // 支払方法
  is_active: v.boolean(), // 有効/無効
  ...CommonFields,
})
.index('by_tenant_org_active_archive', ['tenant_id', 'org_id', 'is_active', 'is_archive'])

/**
 * =========================
 * メニューとスタッフの除外関係 (N:M) "このメニューは担当できないスタッフ" の管理
 * =========================
 * 一つのメニューにつき平均５点程作成される予定。
 */
const menu_exclusion_staff = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  menu_id: v.id('menu'), // メニューID
  staff_id: v.id('staff'), // スタッフID
  ...CommonFields,
})
.index(
  'by_tenant_org_menu_staff_archive',
  ['tenant_id', 'org_id', 'menu_id', 'staff_id', 'is_archive']
);

/**
 * =========================
 * COUPON
 * =========================
 * 平均10点程度。
 */
const coupon = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  coupon_uid: v.string(), // クーポンUID
  name: v.string(), // クーポン名
  discount_type: couponDiscountType, // 割引タイプ
  percentage_discount_value: v.optional(v.number()), // 割引率
  fixed_discount_value: v.optional(v.number()), // 割引額
  is_active: v.boolean(), // 有効/無効
  ...CommonFields,
})
.index('by_tenant_org_archive', ['tenant_id', 'org_id', 'is_archive'])
.index('by_tenant_org_coupon_uid_archive', ['tenant_id', 'org_id','coupon_uid', 'is_archive']);

/**
 * =========================
 * クーポンとメニューの除外関係 (N:M) 例: "割引対象外メニュー"
 * =========================
 * 一つのクーポンにつき平均5点程作成される予定。
 */
const coupon_exclusion_menu = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  coupon_id: v.id('coupon'), // クーポンID
  menu_id: v.id('menu'), // メニューID
  ...CommonFields
})
.index(
  'by_tenant_org_coupon_menu_archive',
  ['tenant_id', 'org_id', 'coupon_id', 'menu_id', 'is_archive']
);

/**
 * =========================
 * クーポン詳細設定
 * =========================
 * クーポンに対して一つ作成する。
 */
const coupon_config = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  coupon_id: v.id('coupon'), // クーポンID
  start_date_unix: v.optional(v.number()), // 開始日時
  end_date_unix: v.optional(v.number()), // 終了日時
  max_use_count: v.optional(v.number()), // 最大利用回数
  number_of_use: v.optional(v.number()), // 利用回数
  active_customer_type: v.optional(activeCustomerType), // 適用対象(初回/リピート/全て)
  ...CommonFields,
})
.index('by_tenant_org_coupon_archive', ['tenant_id', 'org_id', 'coupon_id', 'is_archive'])

/**
 * =========================
 * RESERVATION (予約)
 * =========================
 * 一つの組織に対して無制限に作成可能。平均は月/100件程度。
 */
const reservation = defineTable({
  master_id: v.string(),         // Convex & Supabase 共通識別子
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  customer_id: v.optional(v.string()), // Supabase 側の customer.id
  staff_id: v.id('staff'), // スタッフID
  customer_name: v.string(), // 顧客名
  staff_name: v.string(), // スタッフ名
  status: reservationStatusType, // 予約ステータス
  payment_status: reservationPaymentStatusType, // 支払ステータス
  stripe_checkout_session_id: v.optional(v.string()), // Stripe Checkout Session ID
  date: v.string(), // 予約日 YYYY-MM-DD
  start_time_unix: v.number(), // 予約開始時間
  end_time_unix: v.number(), // 予約終了時間
  ...CommonFields,
})
  // ① 単一レコード取得
  .index('by_tenant_org_master_archive', ['tenant_id', 'org_id', 'master_id','is_archive'])
  // ② ステータス＋日付＋開始時刻（ステータス絞り込み一覧）
  .index(
    'by_tenant_org_status_date_start_archive',
    ['tenant_id', 'org_id','status','date','is_archive']
  )
  // ③ 日付＋ステータス（全ステータス取得・空き枠・カレンダー用）
  .index(
    'by_tenant_org_date_status_archive',
    ['tenant_id', 'org_id','date','status','is_archive']
  )
  // ④ 顧客＋日付（顧客別履歴）
  .index(
    'by_tenant_org_customer_date_archive',
    ['tenant_id', 'org_id','customer_id','date','is_archive']
  )
   // ⑤ スタッフ＋日付（スタッフ別履歴）
   .index(
    'by_tenant_org_staff_date_status_archive',
    ['tenant_id', 'org_id','staff_id','date','status','is_archive']
  )
  // ⑥ ステータス＋開始時刻 バッチ処理用
  .index('status_start_time_archive', ['status','start_time_unix']);
/**
 * =========================
 * 予約詳細 (決済・メニュー構成)
 * =========================
 * 一つの予約につき一つ作成する。
 */
const reservation_detail = defineTable({
  tenant_id: v.id('tenant'), // テナントID
  org_id: v.id('organization'), // 店舗ID
  reservation_id: v.id('reservation'), // 予約ID
  coupon_id: v.optional(v.id('coupon')), // クーポンID
  payment_method: paymentMethodType, // 支払方法
  menus: v.array(reservationMenuOrOptionType), // メニュー/オプション
  options: v.array(reservationMenuOrOptionType), // オプション
  extra_charge: v.optional(v.number()), // 追加料金
  use_points: v.optional(v.number()), // 使用ポイント数
  coupon_discount: v.optional(v.number()), // クーポン割引額
  featured_hair_images: v.array(imageType), // フィーチャー画像
  notes: v.optional(v.string()), // メモ
  ...CommonFields,
})
.index('by_reservation_archive', ['reservation_id', 'is_archive'])

/**
 * =========================
 * POINT PROGRAM
 * =========================
 * 一つの組織につき一つ作成する。
 */
const point_config = defineTable({
  tenant_id: v.id('tenant'),
  org_id: v.id('organization'),
  is_active: v.optional(v.boolean()),
  is_fixed_point: v.optional(v.boolean()),
  point_rate: v.optional(v.number()),
  fixed_point: v.optional(v.number()),
  point_expiration_days: v.optional(v.number()),
  ...CommonFields,
})
.index('by_tenant_org_archive', ['tenant_id', 'org_id', 'is_archive']);

/**
 * =========================
 * ポイント対象外メニュー
 * =========================
 * 平均で10点程度。
 */
const point_exclusion_menu = defineTable({
  point_config_id: v.id('point_config'),
  tenant_id: v.id('tenant'),
  org_id: v.id('organization'),
  menu_id: v.id('menu'),
  ...CommonFields,
})
.index(
  'by_tenant_org_point_config_menu_archive',
  ['tenant_id', 'org_id', 'point_config_id', 'menu_id', 'is_archive']
);

/**
 * =========================
 * Webhook イベント記録
 * =========================
 * 冪等性を確保するためにイベントIDを記録
 */
const webhook_events = defineTable({
  event_id: v.string(),        // 冪等性を確保するためのイベントID
  event_type: v.string(),             // イベントタイプ
  processed_at: v.number(),           // 処理完了時刻（Unix timestamp）
  processing_result: webhookEventProcessingResultType,
  error_message: v.optional(v.string()), // エラー発生時のメッセージ
  ...CommonFields,
})
.index('by_event_id', ['event_id'])  // 重複チェック用
.index('by_event_type_archive', ['event_type', 'is_archive']); // イベントタイプ別検索用

/**
 * =============================================================
 * スキーマエクスポート
 * ============================================================= */

export default defineSchema({
  // テーブル一覧
  subscription,
  tenant,
  tenant_referral,
  organization,
  option,
  api_config,
  config,
  reservation_config,
  week_schedule,
  exception_schedule,
  staff_week_schedule,
  staff_exception_schedule,
  staff,
  staff_auth,
  staff_config,
  menu,
  menu_exclusion_staff,
  coupon,
  coupon_exclusion_menu,
  coupon_config,
  reservation,
  reservation_detail,
  point_config,
  point_exclusion_menu,
  webhook_events,
});
