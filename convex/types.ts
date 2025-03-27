import { v } from 'convex/values';

// 共通の型定義
export const commonFields = {
  isArchive: v.optional(v.boolean()), // 論理削除フラグ
  deletedAt: v.optional(v.number()), // 論理削除日時 (UNIXタイム)
};

// 曜日の型定義
export const dayOfWeekType = v.union(
  v.literal('monday'),
  v.literal('tuesday'),
  v.literal('wednesday'),
  v.literal('thursday'),
  v.literal('friday'),
  v.literal('saturday'),
  v.literal('sunday')
);

// 性別の型定義
export const genderType = v.union(v.literal('未設定'), v.literal('男性'), v.literal('女性'));

// サブスクリプション関連の型定義
export const billingPeriodType = v.union(v.literal('monthly'), v.literal('yearly'));

// 予約ステータスの型定義
export const reservationStatusType = v.union(
  v.literal('confirmed'),
  v.literal('cancelled'),
  v.literal('pending'),
  v.literal('completed'),
  v.literal('refunded')
);

// サロンスケジュール例外タイプの定義
export const salonScheduleExceptionType = v.union(
  v.literal('holiday'),
  v.literal('work'),
  v.literal('other')
);

// スタッフスケジュール例外タイプの定義
export const staffScheduleType = v.union(
  v.literal('holiday'),
  v.literal('reservation'),
  v.literal('work'),
  v.literal('other')
);

// 支払い方法の型定義
export const paymentMethodType = v.union(
  v.literal('cash'),
  v.literal('credit_card'),
  v.literal('other')
);

export const menuPaymentMethodType = v.union(
  v.literal('cash'),
  v.literal('credit_card'),
  v.literal('all')
);

// スタッフロールの型定義
export const staffRoleType = v.union(v.literal('admin'), v.literal('manager'), v.literal('staff'));

// ポイントトランザクションタイプの型定義
export const pointTransactionType = v.union(
  v.literal('earned'),
  v.literal('used'),
  v.literal('adjusted'),
  v.literal('expired')
); // 獲得、使用、調整、期限切れ

// クーポン割引タイプの型定義
export const couponDiscountType = v.union(v.literal('fixed'), v.literal('percentage'));

// ファイルのパスの型定義
export const ImgDirectoryType = v.union(
  v.literal('salon'),
  v.literal('staff'),
  v.literal('menu'),
  v.literal('option'),
  v.literal('other')
);
