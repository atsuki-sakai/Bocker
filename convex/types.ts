import { v, Infer } from 'convex/values'

// 共通の型定義
export const CommonFields = {
  is_archive: v.optional(v.boolean()), // 論理削除フラグ
  updated_at: v.optional(v.number()), // 更新日時 (UNIXタイム)
  deleted_at: v.optional(v.number()), // 論理削除日時 (UNIXタイム)
}


// 曜日の型定義
export const DAY_OF_WEEK_VALUES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
export const dayOfWeekType = v.union(...DAY_OF_WEEK_VALUES.map((day) => v.literal(day)))
export type DayOfWeek = Infer<typeof dayOfWeekType>

export const imageType = v.object({
  original_url: v.optional(v.string()),
  thumbnail_url: v.optional(v.string()),
})
export type ImageType = Infer<typeof imageType>

export const SUBSCRIPTION_STATUS_VALUES = [
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
] as const
export const subscriptionStatusType = v.union(
  ...SUBSCRIPTION_STATUS_VALUES.map((status) => v.literal(status))
)
export type SubscriptionStatus = Infer<typeof subscriptionStatusType>

export const STRIPE_CONNECT_STATUS_VALUES = [
  'pending', // 未接続
  'incomplete', // 未完了
  'restricted', // 制限付き
  'active', // 有効
  'external_account_removed', // 外部口座削除
  'payouts_disabled', // 出金不可
  'bank_account_missing', // 銀行口座未設定
] as const
export const stripeConnectStatusType = v.union(...STRIPE_CONNECT_STATUS_VALUES.map((status) => v.literal(status)))
export type StripeConnectStatus = Infer<typeof stripeConnectStatusType>

export const reservationMenuOrOptionType = v.object({
  id: v.union(v.id('option'), v.literal('menu')),
  name: v.string(),
  price: v.number(),
  quantity: v.number(),
})
export type ReservationMenuOrOption = Infer<typeof reservationMenuOrOptionType>


export const reservationPaymentStatusType = v.union( // 支払い状況
  v.literal('pending'), // 未払い
  v.literal('paid'), // 支払い済み
  v.literal('failed'), // 支払い失敗
  v.literal('cancelled') // キャンセル済み
)
export type ReservationPaymentStatus = Infer<typeof reservationPaymentStatusType>

// 性別の型定義
export const GENDER_VALUES = ['unselected', 'male', 'female'] as const
export const genderType = v.union(...GENDER_VALUES.map((gender) => v.literal(gender)))
export type Gender = Infer<typeof genderType>
export const convertGender = (gender: Gender, inUnselected: boolean = false): string => {
  switch (gender) {
    case 'unselected':
      return inUnselected ? '未選択' : ''
    case 'male':
      return '男性'
    case 'female':
      return '女性'
    default:
      return '不明'
  }
}

// 対象タイプの型定義
export const TARGET_VALUES = ['all', 'first', 'repeat'] as const
export const targetType = v.union(...TARGET_VALUES.map((target) => v.literal(target)))
export type Target = Infer<typeof targetType>
export const convertTarget = (target: Target): string => {
  switch (target) {
    case 'all':
      return '全員'
    case 'first':
      return '初回'
    case 'repeat':
      return 'リピート'
    default:
      return '不明'
  }
}

// サブスクリプション関連の型定義
export const BILLING_PERIOD_VALUES = ['monthly', 'yearly'] as const
export const billingPeriodType = v.union(
  ...BILLING_PERIOD_VALUES.map((period) => v.literal(period))
)
export type BillingPeriod = Infer<typeof billingPeriodType>

// 利用回数の更新タイプの型定義
export const UPDATE_TYPE_VALUES = ['increment', 'decrement'] as const
export const updateType = v.union(...UPDATE_TYPE_VALUES.map((type) => v.literal(type)))
export type UpdateType = Infer<typeof updateType>

// 予約ステータスの型定義
export const RESERVATION_STATUS_VALUES = [
  'confirmed',
  'cancelled',
  'pending',
  'completed',
  'refunded',
] as const
export const reservationStatusType = v.union(
  ...RESERVATION_STATUS_VALUES.map((status) => v.literal(status))
)
export type ReservationStatus = Infer<typeof reservationStatusType>

export const convertReservationStatus = (status: ReservationStatus): string => {
  switch (status) {
    case 'confirmed':
      return '予約確定'
    case 'cancelled':
      return 'キャンセル'
    case 'pending':
      return '保留'
    case 'completed':
      return '完了'
    case 'refunded':
      return '返金'
    default:
      return '不明'
  }
}

// 予約間隔の型定義
export const RESERVATION_INTERVAL_MINUTES_VALUES = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120,
] as const
export const reservationIntervalMinutesType = v.union(
  ...RESERVATION_INTERVAL_MINUTES_VALUES.map((minutes) => v.literal(minutes))
)
export type ReservationIntervalMinutes = Infer<typeof reservationIntervalMinutesType>

// サロンスケジュールタイプの定義
export const EXCEPTION_SCHEDULE_TYPE_VALUES = ['holiday', 'other'] as const
export const ExceptionScheduleType = v.union(
  ...EXCEPTION_SCHEDULE_TYPE_VALUES.map((type) => v.literal(type))
)
export type ExceptionSchedule = Infer<typeof ExceptionScheduleType>

// 支払い方法の型定義
export const PAYMENT_METHOD_VALUES = ['cash', 'credit_card', 'all'] as const
export const paymentMethodType = v.union(
  ...PAYMENT_METHOD_VALUES.map((method) => v.literal(method))
)
export type PaymentMethod = Infer<typeof paymentMethodType>
export const convertPaymentMethod = (method: PaymentMethod): string => {
  switch (method) {
    case 'cash':
      return '店舗支払いのみ'
    case 'credit_card':
      return 'クレジットカードのみ'
    case 'all':
      return '店舗・クレジットカード'
    default:
      return '不明'
  }
}

export const ACTIVE_CUSTOMER_TYPE_VALUES = ['first_time', 'repeat', 'all'] as const
export const activeCustomerType = v.union(
  ...ACTIVE_CUSTOMER_TYPE_VALUES.map((type) => v.literal(type))
)
export type ActiveCustomerType = Infer<typeof activeCustomerType>

// メニュー支払い方法の型定義
export const MENU_PAYMENT_METHOD_VALUES = ['cash', 'credit_card', 'all'] as const
export const menuPaymentMethodType = v.union(
  ...MENU_PAYMENT_METHOD_VALUES.map((method) => v.literal(method))
)
export type MenuPaymentMethod = Infer<typeof menuPaymentMethodType>
export const convertMenuPaymentMethod = (method: MenuPaymentMethod): string => {
  switch (method) {
    case 'cash':
      return '店舗支払い'
    case 'credit_card':
      return 'クレジットカード'
    case 'all':
      return '両方対応'
    default:
      return '不明'
  }
}

// スタッフロールの型定義
export const ROLE_VALUES = ['admin', 'owner', 'manager', 'staff'] as const
export const roleType = v.union(...ROLE_VALUES.map((role) => v.literal(role)))
export type Role = Infer<typeof roleType>

// ポイントトランザクションタイプの型定義
export const POINT_TRANSACTION_TYPE_VALUES = ['earned', 'used', 'adjusted', 'expired'] as const
export const pointTransactionType = v.union(
  ...POINT_TRANSACTION_TYPE_VALUES.map((type) => v.literal(type))
)
export type PointTransactionType = Infer<typeof pointTransactionType>

// クーポン割引タイプの型定義
export const COUPON_DISCOUNT_TYPE_VALUES = ['fixed', 'percentage'] as const
export const couponDiscountType = v.union(
  ...COUPON_DISCOUNT_TYPE_VALUES.map((type) => v.literal(type))
)
export type CouponDiscountType = Infer<typeof couponDiscountType>

// ファイルのパスの型定義
export const IMG_DIRECTORY_VALUES = [
  'setting/original',
  'setting/thumbnail',
  'staff/original',
  'staff/thumbnail',
  'menu/original',
  'menu/thumbnail',
  'option/original',
  'option/thumbnail',
  'carte/original',
  'carte/thumbnail',
  'customer/original',
  'customer/thumbnail',
  'other',
] as const
export const imgDirectoryType = v.union(
  ...IMG_DIRECTORY_VALUES.map((directory) => v.literal(directory))
)
export type ImgDirectoryType = Infer<typeof imgDirectoryType>

// FIXME: カテゴリを各組織毎に作成できる様にする
// メニューカテゴリの型定義
export const MENU_CATEGORY_VALUES = [
  'カット',
  'カラー',
  'パーマ',
  'トリートメント',
  'エクステ',
  'ヘアセット',
  'ヘッドスパ',
  'フェイスケア',
  'その他',
] as const
export const menuCategoryType = v.union(
  ...MENU_CATEGORY_VALUES.map((category) => v.literal(category))
)
export type MenuCategory = Infer<typeof menuCategoryType>

export const IMAGE_QUALITY_VALUES = ['low', 'medium', 'high'] as const
export const imageQualityType = v.union(...IMAGE_QUALITY_VALUES.map((quality) => v.literal(quality)))
export type ImageQuality = Infer<typeof imageQualityType>

export const TRACKING_CODE_VALUES = [
  'web',
  'line',
  'googleMap',
  'facebook',
  'youtube',
  'tiktok',
  'instagram',
  'x',
  'direct',
  'unknown',
] as const
export const trackingCodeType = v.union(...TRACKING_CODE_VALUES.map((code) => v.literal(code)))
export type TrackingCode = Infer<typeof trackingCodeType>

export const TRACKING_EVENT_TYPE_VALUES = ['page_view', 'conversion'] as const
export const trackingEventType = v.union(
  ...TRACKING_EVENT_TYPE_VALUES.map((type) => v.literal(type))
)
export type TrackingEventType = Infer<typeof trackingEventType>

export const PAYMENT_STATUS_VALUES = ['pending', 'paid', 'failed', 'cancelled', 'refunded'] as const
export const paymentStatusType = v.union(
  ...PAYMENT_STATUS_VALUES.map((status) => v.literal(status))
)
export type PaymentStatus = Infer<typeof paymentStatusType>

export const WEBHOOK_EVENT_PROCESSING_RESULT_VALUES = ['processing', 'success', 'error', 'skipped'] as const
export const webhookEventProcessingResultType = v.union(
  ...WEBHOOK_EVENT_PROCESSING_RESULT_VALUES.map((result) => v.literal(result))
)
export type WebhookEventProcessingResult = Infer<typeof webhookEventProcessingResultType>