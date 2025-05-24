export const enum ERROR_STATUS_CODE {
  // クライアントエラー (4xx)
  BAD_REQUEST = '400',             // 不正なリクエスト
  UNAUTHORIZED = '401',            // 認証が必要・認証エラー
  FORBIDDEN = '403',               // アクセス禁止・認可エラー・権限拒否
  NOT_FOUND = '404',               // リソースが見つからない
  METHOD_NOT_ALLOWED = '405',      // 許可されていないメソッド
  NOT_ACCEPTABLE = '406',          // 許容できない
  TIMEOUT = '408',                 // タイムアウト
  CONFLICT = '409',                // コンフリクト・重複レコード
  GONE = '410',                    // 既に存在しない
  UNSUPPORTED_MEDIA_TYPE = '415',  // サポートされていないメディアタイプ
  UNPROCESSABLE_ENTITY = '422',    // 処理できないエンティティ・バリデーションエラー・無効な引数
  TOO_MANY_REQUESTS = '429',       // リクエストが多すぎる・レート制限超過

  // サーバーエラー (5xx)
  INTERNAL_SERVER_ERROR = '500',   // サーバー内部エラー・データベースエラー
  BAD_GATEWAY = '502',             // 不正なゲートウェイ・ネットワーク/外部サービス/Stripe APIエラー
  SERVICE_UNAVAILABLE = '503',     // サービス利用不可
  GATEWAY_TIMEOUT = '504',         // ゲートウェイタイムアウト
}

export type ErrorStatusCode = (typeof ERROR_STATUS_CODE)[keyof typeof ERROR_STATUS_CODE];

export const enum ERROR_SEVERITY {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}