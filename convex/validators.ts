import { Doc } from './_generated/dataModel';
import { ConvexError } from 'convex/values';
import { CONVEX_ERROR_CODES } from './constants';
import {
  MAX_TEXT_LENGTH,
  LIMIT_USE_COUPON_COUNT,
  MAX_COUPON_UID_LENGTH,
  MAX_PHONE_LENGTH,
  LIMIT_TAG_COUNT,
  MAX_TAG_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_ORDER_LIMIT,
  MAX_STAFF_AUTH_CODE_LENGTH,
  MAX_POINTS,
  MAX_POINT_RATE,
  MAX_FIXED_POINT,
  MAX_TOTAL_PRICE,
  MAX_USE_POINTS,
  MAX_POSTAL_CODE_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_AVAILABLE_CANCEL_DAYS,
  MAX_PIN_CODE_LENGTH,
  MAX_HASH_PIN_CODE_LENGTH,
  MAX_HOURLY_RATE,
  MAX_EXTRA_CHARGE,
  MAX_PRIORITY,
} from '../lib/constants';

//================================================
// ADMIN
//================================================
export const validateAdmin = (args: Partial<Doc<'admin'>>) => {
  if (args.clerkId && args.clerkId.length !== MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `clerkIdは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `emailは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.password && args.password.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `passwordは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
};
//================================================
// CARTE
//================================================
export const validateCarte = (args: Partial<Doc<'carte'>>) => {
  if (!args.salonId || args.salonId == '') {
    throw new ConvexError({
      message: 'サロンIDが必須です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (!args.customerId || args.customerId == '') {
    throw new ConvexError({
      message: '顧客IDが必須です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.skinType && args.skinType.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `肌質は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.hairType && args.hairType.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `髪質は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.allergyHistory && args.allergyHistory.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `アレルギー歴は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.medicalHistory && args.medicalHistory.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `持病は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.hairType && args.hairType.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `髪質は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.allergyHistory && args.allergyHistory.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `アレルギー歴は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.medicalHistory && args.medicalHistory.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `持病は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
};

export const validateCarteDetail = (args: Partial<Doc<'carte_detail'>>) => {
  if (!args.carteId || args.carteId === '') {
    throw new ConvexError({
      message: 'カルテIDが必須です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (!args.reservationId || args.reservationId === '') {
    throw new ConvexError({
      message: '予約IDが必須です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.notes && args.notes.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メモは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.beforeHairimgPath && args.beforeHairimgPath.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `施術前の髪型画像ファイルIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.afterHairimgPath && args.afterHairimgPath.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `施術後の髪型画像ファイルIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
};

//================================================
// COUPON
//================================================
export function validateCouponConfig(args: Partial<Doc<'coupon_config'>>) {
  if (args.maxUseCount && args.maxUseCount < 0) {
    throw new ConvexError({
      message: '最大利用回数は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.numberOfUse && args.numberOfUse < 0) {
    throw new ConvexError({
      message: '現在の利用回数は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.maxUseCount && args.maxUseCount > LIMIT_USE_COUPON_COUNT) {
    throw new ConvexError({
      message: `最大利用回数は${LIMIT_USE_COUPON_COUNT}回以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateCoupon(args: Partial<Doc<'coupon'>>) {
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.name && args.name.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `クーポン名は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (
    args.couponUid &&
    (args.couponUid.length < 1 || args.couponUid.length > MAX_COUPON_UID_LENGTH)
  ) {
    throw new ConvexError({
      message: `クーポン識別IDは${MAX_COUPON_UID_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateCouponExclusionMenu(args: Partial<Doc<'coupon_exclusion_menu'>>) {
  if (args.menuId && args.menuId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メニューIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
  if (args.couponId && args.couponId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `クーポンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
}

//================================================
// CUSTOMER
//================================================
export function validateCustomer(args: Partial<Doc<'customer'>>) {
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.lineId && args.lineId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LINE IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.lineUserName && args.lineUserName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LINEユーザー名は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.phone && args.phone.length > MAX_PHONE_LENGTH) {
    throw new ConvexError({
      message: `電話番号は${MAX_PHONE_LENGTH}桁以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.firstName && args.firstName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.lastName && args.lastName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.fullName && args.fullName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.email && args.email?.includes('@')) {
    throw new ConvexError({
      message: 'メールアドレスが不正です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.tags && args.tags.length > LIMIT_TAG_COUNT) {
    throw new ConvexError({
      message: `タグは${LIMIT_TAG_COUNT}個以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.tags && args.tags.length > LIMIT_TAG_COUNT) {
    if (args.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      throw new ConvexError({
        message: `タグは${MAX_TAG_LENGTH}文字以内で入力してください`,
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
  }
}

export function validateCustomerDetail(args: Partial<Doc<'customer_detail'>>) {
  if (args.customerId && args.customerId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `顧客IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.age && (args.age < 0 || args.age > 120)) {
    throw new ConvexError({
      message: '年齢は0以上120以下で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.gender && args.gender !== 'all' && args.gender !== 'male' && args.gender !== 'female') {
    throw new ConvexError({
      message: '性別はall、male、femaleのいずれかで入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateCustomerPoints(args: Partial<Doc<'customer_points'>>) {
  if (args.totalPoints && args.totalPoints < 0) {
    throw new ConvexError({
      message: 'ポイントは0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

//================================================
// MENU
//================================================
export function validateMenu(args: Partial<Doc<'menu'>>) {
  if (args.name && args.name.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メニュー名は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.price && args.price < 0) {
    throw new ConvexError({
      message: '価格は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.timeToMin && args.timeToMin.length === 0) {
    throw new ConvexError({
      message: '施術時間を入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.description && args.description.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `説明は${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.tags && args.tags.length > LIMIT_TAG_COUNT) {
    throw new ConvexError({
      message: `タグは${LIMIT_TAG_COUNT}個以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.tags && args.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    throw new ConvexError({
      message: `タグは${MAX_TAG_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}
// OPTION
export const validateOption = (args: Partial<Doc<'salon_option'>>) => {
  if (args.unitPrice !== undefined && args.unitPrice < 0) {
    throw new ConvexError({
      message: '価格は0以上である必要があります',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.timeToMin !== undefined && args.timeToMin <= 0) {
    throw new ConvexError({
      message: '時間は0より大きい必要があります',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (
    args.salePrice !== undefined &&
    args.unitPrice !== undefined &&
    args.salePrice > args.unitPrice
  ) {
    throw new ConvexError({
      message: 'セール価格は通常価格以下である必要があります',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.orderLimit !== undefined && (args.orderLimit < 0 || args.orderLimit > MAX_ORDER_LIMIT)) {
    throw new ConvexError({
      message: `注文制限は0以上${MAX_ORDER_LIMIT}以下である必要があります`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }

  if (args.tags !== undefined && args.tags.length > LIMIT_TAG_COUNT) {
    throw new ConvexError({
      message: `タグは${LIMIT_TAG_COUNT}個以下である必要があります`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.tags !== undefined && args.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    throw new ConvexError({
      message: `タグは${MAX_TAG_LENGTH}文字以下である必要があります`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.description !== undefined && args.description.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `説明は${MAX_NOTES_LENGTH}文字以下である必要があります`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
};

export function validateMenuExclusionStaff(args: Partial<Doc<'menu_exclusion_staff'>>) {
  if (args.menuId && args.menuId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メニューIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
  if (args.staffId && args.staffId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `スタッフIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
}

//================================================
// POINT
//================================================
export function validatePointAuth(args: Partial<Doc<'point_auth'>>) {
  if (args.authCode && args.authCode.length !== MAX_STAFF_AUTH_CODE_LENGTH) {
    throw new ConvexError({
      message: `認証コードは${MAX_STAFF_AUTH_CODE_LENGTH}文字で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.points && args.points <= 0) {
    throw new ConvexError({
      message: 'ポイントは0より大きい値を入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.points && args.points > MAX_POINTS) {
    throw new ConvexError({
      message: `ポイントは${MAX_POINTS}以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validatePointConfig(args: Partial<Doc<'point_config'>>) {
  // pointRateのバリデーション
  if (args.pointRate) {
    if (args.pointRate < 0 || args.pointRate > MAX_POINT_RATE) {
      throw new ConvexError({
        message: `ポイント付与率は0〜${MAX_POINT_RATE}の間で設定してください`,
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
  }

  // fixedPointのバリデーション
  if (args.fixedPoint) {
    if (args.fixedPoint <= 0) {
      throw new ConvexError({
        message: `固定ポイントは0より大きい値を設定してください`,
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
    if (args.fixedPoint > MAX_FIXED_POINT) {
      throw new ConvexError({
        message: `固定ポイントは${MAX_FIXED_POINT}以下で設定してください`,
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
  }

  // pointExpirationDaysのバリデーション
  if (args.pointExpirationDays !== undefined) {
    if (args.pointExpirationDays <= 0) {
      throw new ConvexError({
        message: `ポイント有効期限は0より大きい値を設定してください`,
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
  }

  // 相関バリデーション
  if (args.isFixedPoint === true && args.fixedPoint === undefined) {
    throw new ConvexError({
      message: '固定ポイント設定時は固定ポイント値を設定してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validatePointQueue(args: Partial<Doc<'point_task_queue'>>) {
  if (args.points && args.points < 0) {
    throw new ConvexError({
      message: 'ポイントは0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.points && args.points > MAX_POINTS) {
    throw new ConvexError({
      message: `ポイントは${MAX_POINTS}以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validatePointTransaction(args: Partial<Doc<'point_transaction'>>) {
  if (args.points && args.points === 0) {
    throw new ConvexError({
      message: 'ポイントは0以外の値を入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.points && args.points > MAX_POINTS) {
    throw new ConvexError({
      message: `ポイントは${MAX_POINTS}以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validatePointExclusionMenu(args: Partial<Doc<'point_exclusion_menu'>>) {
  if (args.menuId && args.menuId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メニューIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
  if (args.pointConfigId && args.pointConfigId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `ポイント基本設定IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    });
  }
}

//================================================
// RESERVATION
//================================================
export function validateReservation(args: Partial<Doc<'reservation'>>) {
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `備考は${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.usePoints && args.usePoints < 0) {
    throw new ConvexError({
      message: '使用ポイントは0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.unitPrice && args.unitPrice < 0) {
    throw new ConvexError({
      message: '単価は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.unitPrice && args.unitPrice > MAX_TOTAL_PRICE) {
    throw new ConvexError({
      message: `単価は${MAX_TOTAL_PRICE}円以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.totalPrice && args.totalPrice < 0) {
    throw new ConvexError({
      message: '合計金額は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.totalPrice && args.totalPrice > MAX_TOTAL_PRICE) {
    throw new ConvexError({
      message: `合計金額は${MAX_TOTAL_PRICE}円以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.usePoints && args.totalPrice && args.usePoints > args.totalPrice) {
    throw new ConvexError({
      message: '使用ポイントは合計金額以下で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.usePoints && args.usePoints > MAX_USE_POINTS) {
    throw new ConvexError({
      message: `使用ポイントは${MAX_USE_POINTS}ポイント以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `備考は${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

// SALON
export function validateSalonApiConfig(args: Partial<Doc<'salon_api_config'>>) {
  if (args.lineAccessToken && args.lineAccessToken.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LINEアクセストークンは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.lineChannelSecret && args.lineChannelSecret.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LINEチャンネルシークレットは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.liffId && args.liffId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LIFF IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.destinationId && args.destinationId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LINE公式アカウント識別子は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateSalonConfig(args: Partial<Doc<'salon_config'>>) {
  if (args.salonName && args.salonName.trim() === '') {
    throw new ConvexError({
      message: 'サロン名は空ではいけません',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.email && args.email.trim() !== '') {
    if (!args.email.includes('@')) {
      throw new ConvexError({
        message: 'メールアドレスが有効ではありません',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
    if (args.email.length > MAX_TEXT_LENGTH) {
      throw new ConvexError({
        message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
  }
  if (args.phone && args.phone.toString().length > MAX_PHONE_LENGTH) {
    throw new ConvexError({
      message: `電話番号は${MAX_PHONE_LENGTH}桁以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (
    args.postalCode &&
    (args.postalCode.toString().length > MAX_POSTAL_CODE_LENGTH ||
      args.postalCode.toString().length < MAX_POSTAL_CODE_LENGTH)
  ) {
    throw new ConvexError({
      message: `郵便番号は${MAX_POSTAL_CODE_LENGTH}桁で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.address && args.address.length > MAX_ADDRESS_LENGTH) {
    throw new ConvexError({
      message: `住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.reservationRules && args.reservationRules.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `予約ルールは${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.description && args.description.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `説明は${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateSalon(args: Partial<Doc<'salon'>>) {
  if (args.clerkId && args.clerkId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `Clerk IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.clerkId && args.clerkId === '') {
    throw new ConvexError({
      message: 'Clerk IDが空です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.email && !args.email.includes('@')) {
    throw new ConvexError({
      message: 'メールアドレスの形式が正しくありません',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.stripeCustomerId && args.stripeCustomerId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `Stripe顧客IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.stripeCustomerId && args.stripeCustomerId === '') {
    throw new ConvexError({
      message: 'Stripe顧客IDが空です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateSalonScheduleConfig(args: Partial<Doc<'salon_schedule_config'>>) {
  if (args.reservationLimitDays && args.reservationLimitDays < 0) {
    throw new ConvexError({
      message: '予約可能日数は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.availableCancelDays && args.availableCancelDays < 0) {
    throw new ConvexError({
      message: 'キャンセル可能日数は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.availableCancelDays && args.availableCancelDays > MAX_AVAILABLE_CANCEL_DAYS) {
    throw new ConvexError({
      message: `キャンセル可能日数は${MAX_AVAILABLE_CANCEL_DAYS}日以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

// SCHEDULE

export function validateSalonScheduleException(args: Partial<Doc<'salon_schedule_exception'>>) {
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new ConvexError({
      message: '日付は「YYYY-MM-DD」形式で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateSalonSchedule(args: Partial<Doc<'salon_week_schedule'>>) {
  if (args.startHour && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.startHour)) {
    throw new ConvexError({
      message: '開始時間は「HH:MM」形式で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.endHour && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.endHour)) {
    throw new ConvexError({
      message: '終了時間は「HH:MM」形式で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateStaffScheduleException(args: Partial<Doc<'staff_schedule'>>) {
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new ConvexError({
      message: '日付は「YYYY-MM-DD」形式で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateStaffWeekSchedule(args: Partial<Doc<'staff_week_schedule'>>) {
  if (args.startHour && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.startHour)) {
    throw new ConvexError({
      message: '開始時間は「HH:MM」形式で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.endHour && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.endHour)) {
    throw new ConvexError({
      message: '終了時間は「HH:MM」形式で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

// STAFF
export function validateStaffAuth(args: Partial<Doc<'staff_auth'>>) {
  if (args.pinCode && args.pinCode.length > MAX_PIN_CODE_LENGTH) {
    throw new ConvexError({
      message: `ピンコードは${MAX_PIN_CODE_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.hashPinCode && args.hashPinCode.length > MAX_HASH_PIN_CODE_LENGTH * 10) {
    throw new ConvexError({
      message: `ハッシュ化されたピンコードは${MAX_HASH_PIN_CODE_LENGTH * 10}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateStaffConfig(args: Partial<Doc<'staff_config'>>) {
  if (args.hourlyRate && args.hourlyRate < 0) {
    throw new ConvexError({
      message: '時間給は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.hourlyRate && args.hourlyRate > MAX_HOURLY_RATE) {
    throw new ConvexError({
      message: `時間給は${MAX_HOURLY_RATE}円以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.extraCharge && args.extraCharge < 0) {
    throw new ConvexError({
      message: '指名料金は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.extraCharge && args.extraCharge > MAX_EXTRA_CHARGE) {
    throw new ConvexError({
      message: `指名料金は${MAX_EXTRA_CHARGE}円以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.priority && args.priority < 0) {
    throw new ConvexError({
      message: '優先度は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.priority && args.priority > MAX_PRIORITY) {
    throw new ConvexError({
      message: `優先度は${MAX_PRIORITY}以下で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateStaff(args: Partial<Doc<'staff'>>) {
  if (args.name && args.name.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `スタッフ名は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.age && (args.age < 0 || args.age > 120)) {
    throw new ConvexError({
      message: '年齢は0以上120以下で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.description && args.description.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `説明は${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateTimeCard(args: Partial<Doc<'time_card'>>) {
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.staffId && args.staffId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `スタッフIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (
    args.startDateTime_unix &&
    args.endDateTime_unix &&
    args.startDateTime_unix > args.endDateTime_unix
  ) {
    throw new ConvexError({
      message: '開始時間は終了時間よりも前にしてください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.workedTime && args.workedTime < 0) {
    throw new ConvexError({
      message: '勤務時間は0以上で入力してください',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

//================================================
// SUBSCRIPTION
//================================================
export function validateSubscription(args: Partial<Doc<'subscription'>>) {
  if (args.subscriptionId && args.subscriptionId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `サブスクリプションIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.stripeCustomerId && args.stripeCustomerId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `Stripe顧客IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.stripeCustomerId && args.stripeCustomerId === '') {
    throw new ConvexError({
      message: 'Stripe顧客IDが指定されていません',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.status && args.status.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `ステータスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.priceId && args.priceId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `価格IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.planName && args.planName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `プラン名は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}

export function validateSubscriptionUpdate(args: {
  subscriptionId?: string;
  newPriceId?: string;
  customerId?: string;
}) {
  if (args.subscriptionId && args.subscriptionId === '') {
    throw new ConvexError({
      message: 'サブスクリプションIDは必須です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.subscriptionId && args.subscriptionId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `サブスクリプションIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.customerId && args.customerId === '') {
    throw new ConvexError({
      message: '顧客IDは必須です',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.customerId && args.customerId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `顧客IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
  if (args.newPriceId && args.newPriceId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `新しい価格IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      severity: 'low',
      status: 400,
    });
  }
}
