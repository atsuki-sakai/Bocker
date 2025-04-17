import { Doc } from '../../../../convex/_generated/dataModel';
import { ConvexCustomError } from './error';
import {
  MAX_TEXT_LENGTH,
  LIMIT_USE_COUPON_COUNT,
  MAX_COUPON_UID_LENGTH,
  MAX_PHONE_LENGTH,
  LIMIT_TAG_COUNT,
  MAX_TAG_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_ORDER_LIMIT,
  MAX_STAFF_AUTH_CODE_LENGTH,
  MAX_POINTS,
  MAX_POINT_RATE,
  MAX_FIXED_POINT,
  MAX_TOTAL_PRICE,
  MAX_ADDRESS_LENGTH,
  MAX_AVAILABLE_CANCEL_DAYS,
  MAX_PIN_CODE_LENGTH,
  MAX_HASH_PIN_CODE_LENGTH,
  MAX_EXTRA_CHARGE,
  MAX_PRIORITY,
  MAX_NUM,
} from '../../constants';

import {
  SubscriptionBillingPortalSessionInput,
  SubscriptionConfirmSubscriptionUpdateInput,
  SubscriptionUpdatePreviewInput,
  SubscriptionPaymentFailedInput,
} from '@/services/convex/types/subscription';

//================================================
// COMMON
//================================================
/**
 * 文字列が空でないことを確認
 *
 * @param value 検証する文字列
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateRequired(
  value: string | undefined | null,
  fieldName: string = 'フィールド'
): boolean {
  if (value === undefined || value === null || value.trim() === '') {
    const err = new ConvexCustomError('low', `${fieldName}は必須項目です`, 'VALIDATION', 400, {
      field: fieldName,
    });
    throw err;
  }
  if (value !== undefined && value !== null && value.length > MAX_TEXT_LENGTH) {
    const err = new ConvexCustomError(
      'low',
      `${fieldName}は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      'VALIDATION',
      400,
      {
        field: fieldName,
        value,
        maxLength: MAX_TEXT_LENGTH,
      }
    );
    throw err;
  }
  return true;
}

/**
 * 数値が必須であることを確認
 *
 * @param value 検証する数値
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateRequiredNumber(
  value: number | undefined | null,
  fieldName: string = 'フィールド'
): boolean {
  if (value === undefined || value === null) {
    const err = new ConvexCustomError('low', `${fieldName}は必須項目です`, 'VALIDATION', 400, {
      field: fieldName,
    });
    throw err;
  }
  return true;
}

/**
 * 文字列の長さが指定した最大長を超えないことを確認
 *
 * @param value 検証する文字列
 * @param maxLength 最大長
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateStringLength(
  value: string | undefined | null,
  maxLength: number,
  fieldName: string = '文字列'
): boolean {
  if (value !== undefined && value !== null && value.length > maxLength) {
    const err = new ConvexCustomError(
      'low',
      `${fieldName}は${maxLength}文字以内で入力してください`,
      'VALIDATION',
      400,
      {
        field: fieldName,
        value,
        maxLength,
      }
    );
    throw err;
  }
  return true;
}

/**
 * 数値が指定範囲内にあることを確認
 *
 * @param value 検証する数値
 * @param min 最小値
 * @param max 最大値
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateNumberRange(
  value: number | undefined | null,
  min: number = 0,
  max: number = MAX_NUM,
  fieldName: string = '数値'
): boolean {
  if (value !== undefined && value !== null) {
    if (value < min) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}は${min}以上で入力してください`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value,
          min,
        }
      );
      throw err;
    }
    if (value > max) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}は${max}以下で入力してください`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value,
          max,
        }
      );
      throw err;
    }
  }
  return true;
}

/**
 * メールアドレスの形式を検証
 *
 * @param email 検証するメールアドレス
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateEmail(
  email: string | undefined | null,
  fieldName: string = 'メールアドレス'
): boolean {
  if (email !== undefined && email !== null && email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}の形式が正しくありません`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value: email,
        }
      );
      throw err;
    }
    if (email.length > MAX_TEXT_LENGTH) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}は${MAX_TEXT_LENGTH}文字以内で入力してください`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value: email,
        }
      );
      throw err;
    }
  }

  return true;
}

/**
 * 電話番号の形式を検証
 *
 * @param phone 検証する電話番号
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validatePhone(
  phone: string | undefined | null,
  fieldName: string = '電話番号'
): boolean {
  if (phone !== undefined && phone !== null && phone.trim() !== '') {
    // 電話番号の長さチェック
    validateStringLength(phone, MAX_NUM, fieldName);

    // 数字、ハイフン、括弧のみ許可
    const phoneRegex = /^[\d\-\(\)\s]+$/;
    if (!phoneRegex.test(phone)) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}の形式が正しくありません`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value: phone,
        }
      );
      throw err;
    }
  }
  return true;
}

/**
 * 日付文字列の形式を検証 (YYYY-MM-DD)
 *
 * @param dateStr 検証する日付文字列
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateDateStrFormat(
  dateStr: string | undefined | null,
  fieldName: string = '日付'
): boolean {
  if (dateStr !== undefined && dateStr !== null && dateStr.trim() !== '') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}はYYYY-MM-DD形式で入力してください`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value: dateStr,
        }
      );
      throw err;
    }

    // 日付としての妥当性チェック
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}が有効な日付ではありません`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value: dateStr,
        }
      );
      throw err;
    }
  }
  return true;
}

/**
 * 時刻文字列の形式を検証 (HH:MM)
 *
 * @param timeStr 検証する時刻文字列
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateHourMinuteFormat(
  timeStr: string | undefined | null,
  fieldName: string = '時刻'
): boolean {
  if (timeStr !== undefined && timeStr !== null && timeStr.trim() !== '') {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeStr)) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}はHH:MM形式で入力してください`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value: timeStr,
        }
      );
      throw err;
    }
  }
  return true;
}

/**
 * 郵便番号の形式を検証
 *
 * @param postalCode 検証する郵便番号
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validatePostalCode(
  postalCode: string | undefined | null,
  fieldName: string = '郵便番号'
): boolean {
  if (postalCode !== undefined && postalCode !== null && postalCode.trim() !== '') {
    // 日本の郵便番号形式チェック（XXX-XXXX または XXXXXXX）
    const postalCodeRegex = /^\d{3}-?\d{4}$/;
    if (!postalCodeRegex.test(postalCode)) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}はXXX-XXXXまたはXXXXXXX形式で入力してください`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          value: postalCode,
        }
      );
      throw err;
    }
  }
  return true;
}

/**
 * タグ配列の検証
 *
 * @param tags 検証するタグ配列
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateTags(
  tags: string[] | undefined | null,
  fieldName: string = 'タグ'
): boolean {
  if (tags !== undefined && tags !== null && tags.length > 0) {
    // タグの数をチェック
    if (tags.length > LIMIT_TAG_COUNT) {
      const err = new ConvexCustomError(
        'low',
        `${fieldName}は${LIMIT_TAG_COUNT}個以内で入力してください`,
        'VALIDATION',
        400,
        {
          field: fieldName,
          count: tags.length,
          limit: LIMIT_TAG_COUNT,
        }
      );
      throw err;
    }

    // 各タグの長さをチェック
    for (const tag of tags) {
      if (tag.length > MAX_TAG_LENGTH) {
        const err = new ConvexCustomError(
          'low',
          `${fieldName}は1つあたり${MAX_TAG_LENGTH}文字以内で入力してください`,
          'VALIDATION',
          400,
          {
            field: fieldName,
            tag,
            maxLength: MAX_TAG_LENGTH,
          }
        );
        throw err;
      }
    }
  }
  return true;
}

// ADMIN
//================================================
export const validateAdmin = (args: Partial<Doc<'admin'>>) => {
  if (args.clerkId) {
    validateStringLength(args.clerkId, MAX_TEXT_LENGTH, 'clerkId');
  }
  if (args.email) {
    validateEmail(args.email, 'メールアドレス');
  }
  if (args.password) {
    validateStringLength(args.password, MAX_TEXT_LENGTH, 'パスワード');
  }
};

//================================================
// CARTE
//================================================
export const validateCarte = (args: Partial<Doc<'carte'>>) => {
  if (!args.salonId) {
    validateRequired(args.salonId, 'サロンID');
  }

  if (!args.customerId) {
    validateRequired(args.customerId, '顧客ID');
  }

  if (args.skinType) {
    validateStringLength(args.skinType, MAX_TEXT_LENGTH, '肌質');
  }

  if (args.hairType) {
    validateStringLength(args.hairType, MAX_TEXT_LENGTH, '髪質');
  }

  if (args.allergyHistory) {
    validateStringLength(args.allergyHistory, MAX_TEXT_LENGTH, 'アレルギー歴');
  }

  if (args.medicalHistory) {
    validateStringLength(args.medicalHistory, MAX_TEXT_LENGTH, '持病');
  }

  if (args.allergyHistory) {
    validateStringLength(args.allergyHistory, MAX_TEXT_LENGTH, 'アレルギー歴');
  }

  if (args.medicalHistory) {
    validateStringLength(args.medicalHistory, MAX_TEXT_LENGTH, '持病');
  }
};

export const validateCarteDetail = (args: Partial<Doc<'carte_detail'>>) => {
  if (!args.carteId) {
    validateRequired(args.carteId, 'カルテID');
  }

  if (!args.reservationId) {
    validateRequired(args.reservationId, '予約ID');
  }

  if (args.notes) {
    validateStringLength(args.notes, MAX_NOTES_LENGTH, 'メモ');
  }

  if (args.beforeHairimgPath) {
    validateStringLength(args.beforeHairimgPath, MAX_TEXT_LENGTH, '施術前の髪型画像ファイルID');
  }

  if (args.afterHairimgPath) {
    validateStringLength(args.afterHairimgPath, MAX_TEXT_LENGTH, '施術後の髪型画像ファイルID');
  }
};

//================================================
// COUPON
//================================================
export function validateCouponConfig(args: Partial<Doc<'coupon_config'>>) {
  if (args.maxUseCount) {
    validateNumberRange(args.maxUseCount, 0, LIMIT_USE_COUPON_COUNT, '最大利用回数');
  }
  if (args.numberOfUse) {
    validateNumberRange(args.numberOfUse, 0, LIMIT_USE_COUPON_COUNT, '現在の利用回数');
  }
}

export function validateCoupon(args: Partial<Doc<'coupon'>>) {
  if (args.salonId) {
    validateStringLength(args.salonId, MAX_TEXT_LENGTH, 'サロンID');
  }
  if (args.name) {
    validateStringLength(args.name, MAX_TEXT_LENGTH, 'クーポン名');
  }
  if (args.couponUid) {
    validateStringLength(args.couponUid, MAX_COUPON_UID_LENGTH, 'クーポン識別ID');
  }
}

export function validateCouponExclusionMenu(args: Partial<Doc<'coupon_exclusion_menu'>>) {
  if (args.couponId) {
    validateStringLength(args.couponId, MAX_TEXT_LENGTH, 'クーポンID');
  }
  if (args.menuId) {
    validateStringLength(args.menuId, MAX_TEXT_LENGTH, 'メニューID');
  }
}

export function validateCouponTransaction(args: Partial<Doc<'coupon_transaction'>>) {
  if (args.couponId) {
    validateStringLength(args.couponId, MAX_TEXT_LENGTH, 'クーポンID');
  }
  if (args.customerId) {
    validateStringLength(args.customerId, MAX_TEXT_LENGTH, '顧客ID');
  }
  if (args.reservationId) {
    validateStringLength(args.reservationId, MAX_TEXT_LENGTH, '予約ID');
  }
  if (args.transactionDate_unix) {
    validateNumberRange(args.transactionDate_unix, 0, MAX_NUM, '取引日');
  }
}

//================================================
// CUSTOMER
//================================================
export function validateCustomer(args: Partial<Doc<'customer'>>) {
  if (args.salonId) {
    validateStringLength(args.salonId, MAX_TEXT_LENGTH, 'サロンID');
  }
  if (args.lineId) {
    validateStringLength(args.lineId, MAX_TEXT_LENGTH, 'LINE ID');
  }
  if (args.lineUserName) {
    validateStringLength(args.lineUserName, MAX_TEXT_LENGTH, 'LINEユーザー名');
  }
  if (args.phone) {
    validateStringLength(args.phone, MAX_PHONE_LENGTH, '電話番号');
  }
  if (args.firstName) {
    validateStringLength(args.firstName, MAX_TEXT_LENGTH, '名前');
  }
  if (args.lastName) {
    validateStringLength(args.lastName, MAX_TEXT_LENGTH, '名前');
  }
  if (args.fullName) {
    validateStringLength(args.fullName, MAX_TEXT_LENGTH, '名前');
  }
  if (args.email) {
    validateEmail(args.email, 'メールアドレス');
  }
  if (args.tags) {
    validateTags(args.tags, 'タグ');
  }
  if (args.phone) {
    validatePhone(args.phone, '電話番号');
  }
  if (args.useCount) {
    validateNumberRange(args.useCount, 0, MAX_NUM, '利用回数');
  }
  if (args.lastReservationDate_unix) {
    validateNumberRange(args.lastReservationDate_unix, 0, MAX_NUM, '最終予約日');
  }
}

export function validateCustomerDetail(args: Partial<Doc<'customer_detail'>>) {
  if (args.customerId) {
    validateStringLength(args.customerId, MAX_TEXT_LENGTH, '顧客ID');
  }
  if (args.email) {
    validateStringLength(args.email, MAX_TEXT_LENGTH, 'メールアドレス');
  }
  if (args.age) {
    validateNumberRange(args.age, 0, 120, '年齢');
  }
  if (
    args.gender &&
    args.gender !== 'unselected' &&
    args.gender !== 'male' &&
    args.gender !== 'female'
  ) {
    const err = new ConvexCustomError('low', '性別の選択肢が不正です', 'VALIDATION', 400, {});
    throw err;
  }

  if (
    args.gender &&
    args.gender !== 'unselected' &&
    args.gender !== 'male' &&
    args.gender !== 'female'
  ) {
    const err = new ConvexCustomError(
      'low',
      '性別はunselected、male、femaleのいずれかで入力してください',
      'VALIDATION',
      400,
      {}
    );
    throw err;
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    const err = new ConvexCustomError(
      'low',
      `メモは${MAX_NOTES_LENGTH}文字以内で入力してください`,
      'VALIDATION',
      400,
      {}
    );
    throw err;
  }
}

export function validateCustomerPoints(args: Partial<Doc<'customer_points'>>) {
  if (args.totalPoints) {
    validateNumberRange(args.totalPoints, 0, MAX_NUM, 'ポイント');
  }
}

//================================================
// MENU
//================================================
export function validateMenu(args: Partial<Doc<'menu'>>) {
  if (args.name) {
    validateStringLength(args.name, MAX_TEXT_LENGTH, 'メニュー名');
  }
  if (args.unitPrice) {
    validateNumberRange(args.unitPrice, 0, MAX_NUM, '価格');
  }
  if (args.salePrice) {
    validateNumberRange(args.salePrice, 0, args.unitPrice, 'セール価格');
  }
  if (args.timeToMin) {
    validateNumberRange(args.timeToMin, 0, MAX_NUM, '施術時間');
  }

  if (args.description) {
    validateStringLength(args.description, MAX_NOTES_LENGTH, '説明');
  }

  if (args.tags) {
    validateTags(args.tags, 'タグ');
  }
}

// OPTION
export const validateOption = (args: Partial<Doc<'salon_option'>>) => {
  if (args.name) {
    validateStringLength(args.name, MAX_TEXT_LENGTH, 'オプション名');
  }
  if (args.unitPrice) {
    validateNumberRange(args.unitPrice, 0, MAX_NUM, '価格');
  }
  if (args.unitPrice && args.salePrice) {
    validateNumberRange(args.salePrice, 0, args.unitPrice, 'セール価格');
  }
  if (args.timeToMin) {
    validateNumberRange(args.timeToMin, 0, MAX_NUM, '施術時間');
  }

  if (args.orderLimit) {
    validateNumberRange(args.orderLimit, 0, MAX_ORDER_LIMIT, '注文制限');
  }

  if (args.tags) {
    validateTags(args.tags, 'タグ');
  }

  if (args.description) {
    validateStringLength(args.description, MAX_NOTES_LENGTH, '説明');
  }
};

export function validateMenuExclusionStaff(args: Partial<Doc<'menu_exclusion_staff'>>) {
  if (args.menuId) {
    validateStringLength(args.menuId, MAX_TEXT_LENGTH, 'メニューID');
  }
  if (args.staffId) {
    validateStringLength(args.staffId, MAX_TEXT_LENGTH, 'スタッフID');
  }
}

//================================================
// POINT
//================================================
export function validatePointAuth(args: Partial<Doc<'point_auth'>>) {
  if (args.authCode) {
    validateStringLength(args.authCode, MAX_STAFF_AUTH_CODE_LENGTH, '認証コード');
  }
  if (args.points) {
    validateNumberRange(args.points, 0, MAX_POINTS, 'ポイント');
  }
}

export function validatePointConfig(args: Partial<Doc<'point_config'>>) {
  // pointRateのバリデーション
  if (args.pointRate) {
    validateNumberRange(args.pointRate, 0, MAX_POINT_RATE, 'ポイント付与率');
  }

  // fixedPointのバリデーション
  if (args.fixedPoint) {
    validateNumberRange(args.fixedPoint, 0, MAX_FIXED_POINT, '固定ポイント');
  }

  // pointExpirationDaysのバリデーション
  if (args.pointExpirationDays) {
    validateNumberRange(args.pointExpirationDays, 0, MAX_NUM, 'ポイント有効期限');
  }

  // 相関バリデーション
  if (args.isFixedPoint === true && args.fixedPoint === undefined) {
    const err = new ConvexCustomError(
      'low',
      '固定ポイント設定時は固定ポイント値を設定してください',
      'VALIDATION',
      400,
      {}
    );
    throw err;
  }
}

export function validatePointQueue(args: Partial<Doc<'point_task_queue'>>) {
  if (args.points) {
    validateNumberRange(args.points, 0, MAX_POINTS, 'ポイント');
  }
}

export function validatePointTransaction(args: Partial<Doc<'point_transaction'>>) {
  if (args.points) {
    validateNumberRange(args.points, 0, MAX_POINTS, 'ポイント');
  }
}

export function validatePointExclusionMenu(args: Partial<Doc<'point_exclusion_menu'>>) {
  if (args.menuId) {
    validateStringLength(args.menuId, MAX_TEXT_LENGTH, 'メニューID');
  }
  if (args.pointConfigId) {
    validateStringLength(args.pointConfigId, MAX_TEXT_LENGTH, 'ポイント基本設定ID');
  }
  if (args.salonId) {
    validateStringLength(args.salonId, MAX_TEXT_LENGTH, 'サロンID');
  }
}

//================================================
// RESERVATION
//================================================
export function validateReservation(args: Partial<Doc<'reservation'>>) {
  if (args.salonId) {
    validateStringLength(args.salonId, MAX_TEXT_LENGTH, 'サロンID');
  }
  if (args.customerId) {
    validateStringLength(args.customerId, MAX_TEXT_LENGTH, '顧客ID');
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    validateStringLength(args.notes, MAX_NOTES_LENGTH, '備考');
  }
  if (args.usePoints) {
    validateNumberRange(args.usePoints, 0, MAX_NUM, '使用ポイント');
  }
  if (args.unitPrice) {
    validateNumberRange(args.unitPrice, 0, MAX_TOTAL_PRICE, '単価');
  }
  if (args.totalPrice) {
    validateNumberRange(args.totalPrice, 0, MAX_TOTAL_PRICE, '合計金額');
  }
  if (args.usePoints && args.totalPrice) {
    validateNumberRange(args.usePoints, 0, args.totalPrice, '使用ポイント');
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    validateStringLength(args.notes, MAX_NOTES_LENGTH, '備考');
  }
}

// SALON
export function validateSalonApiConfig(args: Partial<Doc<'salon_api_config'>>) {
  if (args.salonId) {
    validateStringLength(args.salonId, MAX_TEXT_LENGTH, 'サロンID');
  }
  if (args.lineAccessToken) {
    validateStringLength(args.lineAccessToken, MAX_TEXT_LENGTH, 'LINEアクセストークン');
  }
  if (args.lineChannelSecret) {
    validateStringLength(args.lineChannelSecret, MAX_TEXT_LENGTH, 'LINEチャンネルシークレット');
  }
  if (args.liffId) {
    validateStringLength(args.liffId, MAX_TEXT_LENGTH, 'LIFF ID');
  }
  if (args.destinationId) {
    validateStringLength(args.destinationId, MAX_TEXT_LENGTH, 'LINE公式アカウント識別子');
  }
}

export function validateSalonConfig(args: Partial<Doc<'salon_config'>>) {
  validateRequired(args.salonName, 'サロン名');
  if (args.salonName) {
    validateStringLength(args.salonName, MAX_TEXT_LENGTH, 'サロン名');
  }
  if (args.email) {
    validateEmail(args.email, 'メールアドレス');
  }
  if (args.phone) {
    validatePhone(args.phone, '電話番号');
  }
  if (args.postalCode) {
    validatePostalCode(args.postalCode, '郵便番号');
  }
  if (args.address) {
    validateStringLength(args.address, MAX_ADDRESS_LENGTH, '住所');
  }
  if (args.reservationRules) {
    validateStringLength(args.reservationRules, MAX_NOTES_LENGTH, '予約ルール');
  }
  if (args.description) {
    validateStringLength(args.description, MAX_NOTES_LENGTH, '店舗説明');
  }
}

export function validateSalon(args: Partial<Doc<'salon'>>) {
  if (args.clerkId) {
    validateStringLength(args.clerkId, MAX_TEXT_LENGTH, 'Clerk ID');
  }
  if (args.email) {
    validateEmail(args.email, 'メールアドレス');
  }
  if (args.stripeCustomerId) {
    validateStringLength(args.stripeCustomerId, MAX_TEXT_LENGTH, 'Stripe顧客ID');
  }
}

export function validateSalonScheduleConfig(args: Partial<Doc<'salon_schedule_config'>>) {
  if (args.reservationLimitDays) {
    validateNumberRange(args.reservationLimitDays, 0, MAX_NUM, '予約可能日数');
  }
  if (args.availableCancelDays) {
    validateNumberRange(
      args.availableCancelDays,
      0,
      MAX_AVAILABLE_CANCEL_DAYS,
      'キャンセル可能日数'
    );
  }
  if (args.availableSheet) {
    validateNumberRange(args.availableSheet, 0, 60, '予約可能席数');
  }
  if (args.reservationIntervalMinutes) {
    validateNumberRange(args.reservationIntervalMinutes, 0, 60, '予約間隔');
  }
}

// SCHEDULE

export function validateSalonScheduleException(args: Partial<Doc<'salon_schedule_exception'>>) {
  if (args.date) {
    validateDateStrFormat(args.date, '日付');
  }
  if (args.salonId) {
    validateStringLength(args.salonId, MAX_TEXT_LENGTH, 'サロンID');
  }
}

export function validateSalonSchedule(args: Partial<Doc<'salon_week_schedule'>>) {
  if (args.startHour) {
    validateHourMinuteFormat(args.startHour, '開始時間');
  }
  if (args.endHour) {
    validateHourMinuteFormat(args.endHour, '終了時間');
  }
}

export function validateStaffScheduleException(args: Partial<Doc<'staff_schedule'>>) {
  if (args.date) {
    validateDateStrFormat(args.date, '日付');
  }
  if (args.notes) {
    validateStringLength(args.notes, MAX_NOTES_LENGTH, 'メモ');
  }
}

export function validateStaffWeekSchedule(args: Partial<Doc<'staff_week_schedule'>>) {
  if (args.startHour) {
    validateHourMinuteFormat(args.startHour, '開始時間');
  }
  if (args.endHour) {
    validateHourMinuteFormat(args.endHour, '終了時間');
  }
}

// STAFF
export function validateStaffAuth(args: Partial<Doc<'staff_auth'>>) {
  if (args.pinCode) {
    validateStringLength(args.pinCode, MAX_TEXT_LENGTH, 'ピンコード');
  }
  if (args.role) {
    validateStringLength(args.role, MAX_TEXT_LENGTH, 'ロール');
  }
}

export function validateStaffConfig(args: Partial<Doc<'staff_config'>>) {
  if (args.extraCharge) {
    validateNumberRange(args.extraCharge, 0, MAX_EXTRA_CHARGE, '指名料金');
  }
  if (args.priority) {
    validateNumberRange(args.priority, 0, MAX_PRIORITY, '優先度');
  }
}

export function validateStaff(args: Partial<Doc<'staff'>>) {
  if (args.name) {
    validateStringLength(args.name, MAX_TEXT_LENGTH, 'スタッフ名');
  }
  if (args.age) {
    validateNumberRange(args.age, 0, 120, '年齢');
  }
  if (args.email) {
    validateEmail(args.email, 'メールアドレス');
  }
  if (args.description) {
    validateStringLength(args.description, MAX_NOTES_LENGTH, '説明');
  }
}

export function validateTimeCard(args: Partial<Doc<'time_card'>>) {
  if (args.salonId) {
    validateStringLength(args.salonId, MAX_TEXT_LENGTH, 'サロンID');
  }
  if (args.staffId) {
    validateStringLength(args.staffId, MAX_TEXT_LENGTH, 'スタッフID');
  }
  if (args.startDateTime_unix && args.endDateTime_unix) {
    if (args.startDateTime_unix > args.endDateTime_unix) {
      const err = new ConvexCustomError(
        'low',
        '開始時間は終了時間よりも前にしてください',
        'VALIDATION',
        400,
        {}
      );
      throw err;
    }
  }
  if (args.workedTime) {
    validateNumberRange(args.workedTime, 0, MAX_NUM, '勤務時間(分)');
  }
  if (args.notes) {
    validateStringLength(args.notes, MAX_NOTES_LENGTH, 'メモ');
  }
}

//================================================
// SUBSCRIPTION
//================================================
export function validateSubscription(args: Partial<Doc<'subscription'>>) {
  if (args.subscriptionId) {
    validateStringLength(args.subscriptionId, MAX_TEXT_LENGTH, 'サブスクリプションID');
  }
  if (args.stripeCustomerId) {
    validateStringLength(args.stripeCustomerId, MAX_TEXT_LENGTH, 'Stripe顧客ID');
  }
  if (args.status) {
    validateStringLength(args.status, MAX_TEXT_LENGTH, 'ステータス');
  }
  if (args.stripeCustomerId && args.stripeCustomerId === '') {
    const err = new ConvexCustomError(
      'low',
      'Stripe顧客IDが指定されていません',
      'VALIDATION',
      400,
      {}
    );
    throw err;
  }
  if (args.priceId) {
    validateStringLength(args.priceId, MAX_TEXT_LENGTH, '価格ID');
  }
  if (args.planName) {
    validateStringLength(args.planName, MAX_TEXT_LENGTH, 'プラン名');
  }
}

export function validateSubscriptionUpdatePreview(args: SubscriptionUpdatePreviewInput) {
  if (args.subscriptionId) {
    validateStringLength(args.subscriptionId, MAX_TEXT_LENGTH, 'サブスクリプションID');
  }
  if (args.customerId) {
    validateStringLength(args.customerId, MAX_TEXT_LENGTH, '顧客ID');
  }
  if (args.newPriceId) {
    validateStringLength(args.newPriceId, MAX_TEXT_LENGTH, '新しい価格ID');
  }
}

export function validateSubscriptionBillingPortalSession(
  args: SubscriptionBillingPortalSessionInput
) {
  if (args.stripeCustomerId) {
    validateStringLength(args.stripeCustomerId, MAX_TEXT_LENGTH, 'Stripe顧客ID');
  }
  if (args.returnUrl) {
    validateStringLength(args.returnUrl, MAX_TEXT_LENGTH, 'リターンURL');
  }
}

export function validateConfirmSubscriptionUpdate(
  args: SubscriptionConfirmSubscriptionUpdateInput
) {
  if (args.subscriptionId) {
    validateStringLength(args.subscriptionId, MAX_TEXT_LENGTH, 'サブスクリプションID');
  }
  if (args.newPriceId) {
    validateStringLength(args.newPriceId, MAX_TEXT_LENGTH, '新しい価格ID');
  }
  if (args.items) {
    if (args.items.length === 0) {
      const err = new ConvexCustomError(
        'low',
        'アイテムが指定されていません',
        'VALIDATION',
        400,
        {}
      );
      throw err;
    }
    for (const item of args.items) {
      validateStringLength(item.id, MAX_TEXT_LENGTH, 'アイテムID');
      validateStringLength(item.price, MAX_TEXT_LENGTH, '価格');
    }
  }
}

export function validatePaymentFailed(args: SubscriptionPaymentFailedInput) {
  if (args.subscriptionId) {
    validateStringLength(args.subscriptionId, MAX_TEXT_LENGTH, 'サブスクリプションID');
  }
  if (args.stripeCustomerId) {
    validateStringLength(args.stripeCustomerId, MAX_TEXT_LENGTH, 'Stripe顧客ID');
  }
  if (args.transactionId) {
    validateStringLength(args.transactionId, MAX_TEXT_LENGTH, 'トランザクションID');
  }
}
