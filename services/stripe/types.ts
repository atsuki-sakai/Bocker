// 共通の戻り値の型定義
export type StripeResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
