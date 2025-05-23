export const enum ERROR_STATUS_CODE {
  // クライアントエラー (4xx)
  BAD_REQUEST = '400',             // 不正なリクエスト
  UNAUTHORIZED = '401',            // 認証が必要
  AUTHENTICATION = '401',          // 認証エラー
  FORBIDDEN = '403',               // アクセス禁止
  AUTHORIZATION = '403',           // 許可が拒否された
  PERMISSION_DENIED = '403',        // 権限が拒否された
  NOT_FOUND = '404',               // リソースが見つからない
  METHOD_NOT_ALLOWED = '405',      // 許可されていないメソッド
  NOT_ACCEPTABLE = '406',          // 許容できない
  TIMEOUT = '408',                 // タイムアウト
  CONFLICT = '409',                // コンフリクト
  DUPLICATE_RECORD = '409',        // 重複したレコード
  GONE = '410',                    // 既に存在しない
  UNSUPPORTED_MEDIA_TYPE = '415',  // サポートされていないメディアタイプ
  UNPROCESSABLE_ENTITY = '422',    // 処理できないエンティティ
  VALIDATION = '422',              // バリデーションエラー
  INVALID_ARGUMENT = '422',        // 無効な引数
  TOO_MANY_REQUESTS = '429',       // リクエストが多すぎる
  RATE_LIMIT_EXCEEDED = '429',     // レート制限超過

  // サーバーエラー (5xx)
  INTERNAL_SERVER_ERROR = '500',   // サーバー内部エラー
  SERVER = '500',                  // サーバーエラー
  INTERNAL_ERROR = '500',          // 内部エラー
  UNEXPECTED_ERROR = '500',         // 予期せぬエラー
  BAD_GATEWAY = '502',             // 不正なゲートウェイ
  SERVICE_UNAVAILABLE = '503',     // サービス利用不可
  GATEWAY_TIMEOUT = '504',         // ゲートウェイタイムアウト

  // データベース & ネットワークエラー
  DATABASE_ERROR = '500',          // データベースエラー
  NETWORK_ERROR = '502',           // ネットワークエラー

  // 外部サービス関連
  EXTERNAL_SERVICE_ERROR = '502',  // 外部サービスエラー
  STRIPE_ERROR = '502',            // Stripe APIエラー
};

export type ErrorStatusCode = (typeof ERROR_STATUS_CODE)[keyof typeof ERROR_STATUS_CODE];

export const enum ERROR_SEVERITY {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}