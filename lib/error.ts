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


enum ClerkSignInErrorCode {
  session_exists = 'session_exists',
  identifier_already_signed_in = 'identifier_already_signed_in',
  account_transfer_invalid = 'account_transfer_invalid',
  client_state_invalid = 'client_state_invalid',
  strategy_for_user_invalid = 'strategy_for_user_invalid',
  identification_claimed = 'identification_claimed',
  resource_forbidden = 'resource_forbidden',
  resource_not_found = 'resource_not_found',
  no_second_factors = 'no_second_factors',
  sign_in_no_identification_for_user = 'sign_in_no_identification_for_user',
  sign_in_identification_or_user_deleted = 'sign_in_identification_or_user_deleted',
}

export function translateClerkError(errorCode: ClerkSignInErrorCode) {
  const errorTranslations = {
    session_exists: {
      shortMessage: '既にセッションが存在します',
      longMessage:
        '現在、シングルセッションモードでログイン中です。同時に複数のアカウントにはサインインできません。',
    },
    identifier_already_signed_in: {
      shortMessage: '既にサインインしています',
      longMessage: 'この識別子は既にサインインしています。',
    },
    account_transfer_invalid: {
      shortMessage: '無効なアカウント転送',
      longMessage: '転送可能なアカウントが存在しません。',
    },
    client_state_invalid: {
      shortMessage: '無効な操作',
      longMessage: 'このクライアントに対して操作を完了できませんでした。',
    },
    strategy_for_user_invalid: {
      shortMessage: '無効な認証戦略',
      longMessage: 'このアカウントには無効な認証戦略が指定されています。',
    },
    identification_claimed: {
      shortMessage: '識別子が他のユーザーに使用されています',
      longMessage:
        'このサインアップに使用された識別子の一部が、他のユーザーに接続されています。再度サインアップしてください。',
    },
    resource_forbidden: {
      shortMessage: '操作が許可されていません',
      longMessage: 'このリソースに対する操作は許可されていません。',
    },
    resource_not_found: {
      shortMessage: 'リソースが見つかりません',
      longMessage: '指定されたIDのリソースが見つかりませんでした。',
    },
    no_second_factors: {
      shortMessage: '二要素認証が設定されていません',
      longMessage: '指定された戦略に対する二要素認証が見つかりませんでした。',
    },
    sign_in_no_identification_for_user: {
      shortMessage: 'ユーザーに識別子がありません',
      longMessage: 'このトークンには、作成者であるユーザーに関連付けられた識別子がありません。',
    },
    sign_in_identification_or_user_deleted: {
      shortMessage: '識別子またはユーザーが削除されました',
      longMessage: 'ユーザーまたは選択された識別子が削除されました。最初からやり直してください。',
    },
  }

  return (
    errorTranslations[errorCode] || {
      shortMessage: '不明なエラー',
      longMessage: '予期しないエラーが発生しました。詳細についてはサポートにお問い合わせください。',
    }
  )
}
