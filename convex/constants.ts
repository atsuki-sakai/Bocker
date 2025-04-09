// エラータイプの定義
export enum CONVEX_ERROR_CODES {
  VALIDATION = 'VALIDATION', // 入力内容に問題があります
  AUTHENTICATION = 'AUTHENTICATION', // 認証に失敗しました
  AUTHORIZATION = 'AUTHORIZATION', // 権限が不足しています
  SERVER = 'SERVER', // サーバー側でエラーが発生しました
  NETWORK = 'NETWORK', // ネットワークエラーが発生しました
  UNKNOWN = 'UNKNOWN', // 未知のエラーが発生しました
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 入力内容に問題があります
  NOT_FOUND = 'NOT_FOUND', // 指定されたリソースが見つかりません
  DUPLICATE_RECORD = 'DUPLICATE_RECORD', // 既に存在するデータです
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR', // 予期せぬエラーが発生しました
  DATABASE_ERROR = 'DATABASE_ERROR', // データベース処理中にエラーが発生しました
  PERMISSION_DENIED = 'PERMISSION_DENIED', // この操作を行う権限がありません
  INTERNAL_ERROR = 'INTERNAL_ERROR', // システム内部でエラーが発生しました
  INVALID_ARGUMENT = 'INVALID_ARGUMENT', // 無効な引数が指定されました
  CONFLICT = 'CONFLICT', // リソースが競合しています
  STRIPE_ERROR = 'STRIPE_ERROR', // Stripeエラーが発生しました
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED', // レート制限を超えました
  FORBIDDEN = 'FORBIDDEN', // アクセスが禁止されています
}
