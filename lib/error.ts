import { ConvexError } from 'convex/values';

const ErrorCode = {
  // 認証・認可関連
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FORBIDDEN: 'FORBIDDEN',

  // バリデーション関連
  VALIDATION: 'VALIDATION',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',

  // リソース関連
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  CONFLICT: 'CONFLICT',

  // システム関連
  SERVER: 'SERVER',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK: 'NETWORK',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',

  // 外部サービス関連
  STRIPE_ERROR: 'STRIPE_ERROR',

  // その他
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export const handleErrorToMsg = (error: unknown): string => {
  // デフォルトのエラーメッセージ
  const errorInfo = {
    message: 'エラーが発生しました',
    code: null,
    status: null,
    details: null,
  };

  // ConvexErrorかどうかを確認
  if (error instanceof ConvexError) {
    // ConvexErrorの場合、dataプロパティから情報を取得
    const errorData = error.data;

    // データの型に応じて処理
    if (typeof errorData === 'string') {
      // 文字列の場合はそのまま使用
      errorInfo.message = errorData;
    } else if (errorData && typeof errorData === 'object') {
      // オブジェクトの場合はmessageプロパティを探す
      if ('message' in errorData && typeof errorData.message === 'string') {
        errorInfo.message = errorData.message;
      }
      if ('code' in errorData && typeof errorData.code === 'string') {
        errorInfo.code = errorData.code;
      }
      if ('status' in errorData && typeof errorData.status === 'number') {
        errorInfo.status = errorData.status;
      }
      if ('details' in errorData && typeof errorData.details === 'object') {
        errorInfo.details = errorData.details;
      }
    }
  } else if (error instanceof Error) {
    // 通常のErrorオブジェクトの場合
    errorInfo.message = error.message;
  }

  return errorInfo.message;
};

export const throwConvexError = (errorInfo: {
  callFunc: string; // エラーが発生した関数名
  message: string; // エラーメッセージ
  title: string; // エラータイトル
  severity: ErrorSeverity | null; // エラーの重大度
  code: ErrorCode | null; // エラーコード
  status: number | null; // エラーステータスコード
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any> | null; // エラー詳細
}) => {
  if (errorInfo.severity && errorInfo.severity !== 'low') {
    console.error(
      `${errorInfo.callFunc} - ${errorInfo.message}, ${errorInfo.code} ${errorInfo.status} - ${errorInfo.details}`
    );
  }
  throw new ConvexError({
    message: errorInfo.message ?? '不明なエラーが発生しました',
    status: errorInfo.status ?? 500,
    code: errorInfo.code ?? 'INTERNAL_ERROR',
    details: errorInfo.details ?? {},
  });
};
