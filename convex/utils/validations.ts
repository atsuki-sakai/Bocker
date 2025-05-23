import {
  MAX_TEXT_LENGTH,
  LIMIT_TAG_COUNT,
  MAX_TAG_LENGTH,
  MAX_NUM,
} from '../constants';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { Id } from '../_generated/dataModel';
import { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server';

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
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'validateRequired',
      message: 'フィールドは必須項目です',
      code: 'BAD_REQUEST',
      status: 400,
      details: {
        field: fieldName,
        value,
      },
    });
  }
  if (value !== undefined && value !== null && value.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'validateRequired',
      message: `${fieldName}は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: 'BAD_REQUEST',
      status: 400,
      details: { field: fieldName, value, maxLength: MAX_TEXT_LENGTH },
    });
  }
  return true;
}


/**
 * テナントの組織が存在することを確認
 *
 * @param tenant_id テナントID
 * @param org_id 組織ID
 * @throws バリデーションエラー
 */
export async function checkOrganization(ctx: QueryCtx | MutationCtx,tenant_id: Id<'tenant'>, org_id: string) {
  validateStringLength(org_id, '組織');
  const org = await ctx.db.query('organization').withIndex('by_tenant_org_archive', q => q.eq('tenant_id', tenant_id).eq('org_id', org_id).eq('is_archive', false)).first();
  if (!org) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.NOT_FOUND,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'checkOrganization',
      message: '組織が存在しません',
      code: 'NOT_FOUND',
      status: 404,
      details: {
        tenant_id,
        org_id,
      },
    });
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
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'validateRequiredNumber',
      message: `${fieldName}は必須項目です`,
      code: 'BAD_REQUEST',
      status: 400,
      details: { field: fieldName },
    });
  }
  if (value !== undefined && value !== null && value > MAX_NUM) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'validateRequiredNumber',
      message: `${fieldName}は${MAX_NUM}以下で入力してください`,
      code: 'BAD_REQUEST',
      status: 400,
      details: { field: fieldName, value, max: MAX_NUM },
    });
  }
  return true;
}



/**
 * 文字列の長さが指定した最大長を超えないことを確認
 *
 * @param value 検証する文字列
 * @param fieldName フィールド名（エラーメッセージ用）
 * @returns 値が有効な場合はtrue
 * @throws バリデーションエラー
 */
export function validateStringLength(
  value: string | undefined | null,
  fieldName: string = '文字列',
  maxLength: number = MAX_TEXT_LENGTH,
): boolean {
  if (value !== undefined && value !== null && value.length > maxLength) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'validateStringLength',
      message: `${fieldName}は${maxLength}文字以内で入力してください`,
      code: 'BAD_REQUEST',
      status: 400,
      details: { field: fieldName, value, maxLength },
    });
  }
  return true;
}

export function validateNumberLength(
  value: number | undefined | null,
  fieldName: string = '数値',
  maxLength: number = MAX_NUM,
): boolean {
  if (value !== undefined && value !== null && value > maxLength) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'validateNumberLength',
      message: `${fieldName}は${maxLength}文字以内で入力してください`,
    });
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
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validateNumberRange',
        message: `${fieldName}は${min}以上で入力してください`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value, min },
      });
    }
    if (value > max) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validateNumberRange',
        message: `${fieldName}は${max}以下で入力してください`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value, max },
      });
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
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validateEmail',
        message: `${fieldName}の形式が正しくありません`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value: email },
      });
    }
    if (email.length > MAX_TEXT_LENGTH) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validateEmail',
        message: `${fieldName}は${MAX_TEXT_LENGTH}文字以内で入力してください`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value: email },
      });
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
    validateStringLength(phone, fieldName, MAX_NUM);

    // 数字、ハイフン、括弧のみ許可
    const phoneRegex = /^[\d\-\(\)\s]+$/;
    if (!phoneRegex.test(phone)) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validatePhone',
        message: `${fieldName}の形式が正しくありません`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value: phone },
      });
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
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validateDateStrFormat',
        message: `${fieldName}はYYYY-MM-DD形式で入力してください`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value: dateStr },
      });
    }

    // 日付としての妥当性チェック
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validateDateStrFormat',
        message: `${fieldName}が有効な日付ではありません`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value: dateStr },
      });
    }
  }
  return true;
}

// 日付形式チェックとエラー投げ、日付オブジェクトを返す
export function validateDateStrToDate(date: string, funcName: string): Date {
  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: funcName,
      message: '日付形式が不正です',
      code: 'BAD_REQUEST',
      status: 400,
      details: { date },
    });
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: funcName,
      message: '日付形式が不正です',
      code: 'BAD_REQUEST',
      status: 400,
      details: { date },
    });
  }
  return d;
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
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validateHourMinuteFormat',
        message: `${fieldName}はHH:MM形式で入力してください`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value: timeStr },
      });
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
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validatePostalCode',
        message: `${fieldName}はXXX-XXXXまたはXXXXXXX形式で入力してください`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, value: postalCode },
      });
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
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'validateTags',
        message: `${fieldName}は${LIMIT_TAG_COUNT}個以内で入力してください`,
        code: 'BAD_REQUEST',
        status: 400,
        details: { field: fieldName, count: tags.length, limit: LIMIT_TAG_COUNT },
      });
    }

    if (tags.length > 0) {
      for (const tag of tags) {
        validateStringLength(tag, fieldName, MAX_TAG_LENGTH);
      }
    }
  }
  return true;
}
