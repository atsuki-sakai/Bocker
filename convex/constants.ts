import { SubscriptionPlanName } from "@/convex/types";


// プラン毎の制限値
export type PlanLimits = {
    maxStaffCount: number;
    maxMenuCount: number;
    maxOptionCount: number;
    maxCouponCount: number;
    monthlyReservationLimit: number;
};


export const SUBSCRIPTION_PLAN_LIMITS: Record<SubscriptionPlanName, PlanLimits> = {
    'LITE': {
        maxStaffCount: 3,
        maxMenuCount: 10,
        maxOptionCount: 5,
        maxCouponCount: 10,
        monthlyReservationLimit: 200,
    },
    'PRO': {
        maxStaffCount: 10,
        maxMenuCount: 20,
        maxOptionCount: 10,
        maxCouponCount: 100,
        monthlyReservationLimit: 500,
    },
    'UNKNOWN': {
        maxStaffCount: 0,
        maxMenuCount: 0,
        maxOptionCount: 0,
        maxCouponCount: 0,
        monthlyReservationLimit: 0,
    },
};

// ポイントの最大利用数
export const MAX_USE_POINTS = 2000;
// 合計金額の最大値
export const MAX_TOTAL_PRICE = 100000;
// 備考の最大文字数
export const MAX_NOTES_LENGTH = 2000;
// スタッフ認証コードの文字数
export const MAX_STAFF_AUTH_CODE_LENGTH = 6;
// ポイントの有効期限の最大値
export const MAX_POINT_EXPIRATION_DAYS = 1095;
// ポイント付与率の最大値
export const MAX_POINT_RATE = 100;
// 固定ポイントの最大値
export const MAX_FIXED_POINT = 10000;
// ポイントの最大値
export const MAX_POINTS = 100000;
// クーポンの最大利用回数
export const LIMIT_USE_COUPON_COUNT = 10000;
// 数値の最大値
export const MAX_NUM = 9999999999999999;
// テキストの最大文字数
export const MAX_TEXT_LENGTH = 256;
// クーポン識別IDの文字数
export const MAX_COUPON_UID_LENGTH = 12;
// タグの最大文字数
export const MAX_TAG_LENGTH = 20;
// タグの最大数
export const LIMIT_TAG_COUNT = 5;
// 電話番号の最大文字数
export const MAX_PHONE_LENGTH = 11;
// 注文制限の最大値
export const MAX_ORDER_LIMIT = 50;
// オプションの最大在庫数
export const MAX_OPTION_STOCK = 10000;
// カテゴリの最大文字数
export const MAX_CATEGORY_LENGTH = 20;
// 郵便番号の最大文字数
export const MAX_POSTAL_CODE_LENGTH = 7;
// 住所の最大文字数
export const MAX_ADDRESS_LENGTH = 200;
// ピンコードの最大文字数
export const MAX_PIN_CODE_LENGTH = 6;
// ハッシュ化されたピンコードの最大文字数
export const MAX_HASH_PIN_CODE_LENGTH = 256;
// 指名料金の最大値
export const MAX_EXTRA_CHARGE = 9999;
// 優先度の最大値
export const MAX_PRIORITY = 999;
// アーカイブの最大秒数
export const ARCHIVE_DURATION_SECONDS = 365 * 24 * 60 * 60; // 1年
// 削除の最大秒数
export const DELETE_DURATION_SECONDS = 365 * 24 * 60 * 60 * 3; // 3年
