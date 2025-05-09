import { v, Infer } from 'convex/values';

// 共通の型定義
export const CommonFields = {
  isArchive: v.optional(v.boolean()), // 論理削除フラグ
  deletedAt: v.optional(v.number()), // 論理削除日時 (UNIXタイム)
};

// 曜日の型定義
export const DAY_OF_WEEK_VALUES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export const dayOfWeekType = v.union(...DAY_OF_WEEK_VALUES.map((day) => v.literal(day)));
export type DayOfWeek = Infer<typeof dayOfWeekType>;

// 性別の型定義
export const GENDER_VALUES = ['unselected', 'male', 'female'] as const;
export const genderType = v.union(...GENDER_VALUES.map((gender) => v.literal(gender)));
export type Gender = Infer<typeof genderType>;
export const convertGender = (gender: Gender): string => {
  switch (gender) {
    case 'unselected':
      return ''
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
// サロンスケジュール例外タイプの定義
export const SALON_SCHEDULE_EXCEPTION_VALUES = ['holiday', 'other'] as const
export const salonScheduleExceptionType = v.union(
  ...SALON_SCHEDULE_EXCEPTION_VALUES.map((type) => v.literal(type))
)
export type SalonScheduleException = Infer<typeof salonScheduleExceptionType>
// スタッフスケジュール例外タイプの定義
export const STAFF_SCHEDULE_EXCEPTION_VALUES = ['holiday', 'reservation', 'other'] as const
export const staffScheduleType = v.union(
  ...STAFF_SCHEDULE_EXCEPTION_VALUES.map((type) => v.literal(type))
)
export type StaffSchedule = Infer<typeof staffScheduleType>

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
export const ROLE_VALUES = ['owner', 'manager', 'staff'] as const;
export const roleType = v.union(...ROLE_VALUES.map((role) => v.literal(role)));
export type Role = Infer<typeof roleType>;

// ポイントトランザクションタイプの型定義
export const POINT_TRANSACTION_TYPE_VALUES = ['earned', 'used', 'adjusted', 'expired'] as const;
export const pointTransactionType = v.union(
  ...POINT_TRANSACTION_TYPE_VALUES.map((type) => v.literal(type))
);
export type PointTransactionType = Infer<typeof pointTransactionType>;

// クーポン割引タイプの型定義
export const COUPON_DISCOUNT_TYPE_VALUES = ['fixed', 'percentage'] as const;
export const couponDiscountType = v.union(
  ...COUPON_DISCOUNT_TYPE_VALUES.map((type) => v.literal(type))
);
export type CouponDiscountType = Infer<typeof couponDiscountType>;

// ファイルのパスの型定義
export const IMG_DIRECTORY_VALUES = [
  'salon',
  'staff',
  'menu',
  'carte',
  'customer',
  'other',
] as const;
export const imgDirectoryType = v.union(
  ...IMG_DIRECTORY_VALUES.map((directory) => v.literal(directory))
);
export type ImgDirectoryType = Infer<typeof imgDirectoryType>;

// メニューカテゴリの型定義
export const MENU_CATEGORY_VALUES = [
  'カット',
  'カラー',
  'パーマ',
  'ストレートパーマ',
  'トリートメント',
  'エクステ',
  'ヘアセット',
  'ヘッドスパ',
  'フェイスケア',
  'ネイル',
  'ヘアサロン',
  'メイク',
  'その他',
] as const;
export const menuCategoryType = v.union(
  ...MENU_CATEGORY_VALUES.map((category) => v.literal(category))
);
export type MenuCategory = Infer<typeof menuCategoryType>;
