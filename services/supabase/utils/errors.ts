/**
 * Supabase エラーの重大度
 */
export type SupabaseErrorSeverity = "high" | "medium" | "low" | "info" | "critical";

/**
 * Supabase カスタムエラーコード
 * (プロジェクトに合わせて適宜追加・修正してください)
 */
export type SupabaseErrorCode =
  | "UNKNOWN_ERROR" // 不明なエラー
  | "DATABASE_ERROR" // データベース操作エラー
  | "DATABASE_NO_DATA" // データベース操作エラー（データなし）
  | "NETWORK_ERROR" // ネットワーク関連エラー
  | "VALIDATION_ERROR" // 入力値バリデーションエラー
  | "NOT_FOUND" // リソースが見つからない
  | "AUTHENTICATION_ERROR" // 認証エラー
  | "AUTHORIZATION_ERROR" // 認可エラー
  | "RESOURCE_CONFLICT" // リソースの競合 (例: 既に存在するメールアドレス)
  | "RATE_LIMIT_EXCEEDED" // APIレート制限超過
  | "SERVICE_UNAVAILABLE" // 外部サービス利用不可
  | "RPC_ERROR"; // RPC呼び出しエラー

/**
 * Supabase カスタムエラークラス
 */
export class SupabaseError extends Error {
  public readonly status: number;
  public readonly code: SupabaseErrorCode;
  public readonly details?: Record<string, any>;
  public readonly severity?: SupabaseErrorSeverity;

  constructor(params: {
    message: string;
    status?: number;
    code?: SupabaseErrorCode;
    details?: Record<string, any>;
    severity?: SupabaseErrorSeverity;
  }) {
    super(params.message);
    this.name = "SupabaseError";
    this.status = params.status ?? 500;
    this.code = params.code ?? "UNKNOWN_ERROR";
    this.details = params.details;
    this.severity = params.severity;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SupabaseError);
    }
  }
}

/**
 * SupabaseError をスローするヘルパー関数
 *
 * @param errorInfo - エラー情報
 *   @param callFunc - エラーが発生した関数名
 *   @param message - エラーメッセージ
 *   @param title - (任意) エラータイトル (ロギング用)
 *   @param severity - (任意) エラーの重大度
 *   @param code - (任意) エラーコード
 *   @param status - (任意) HTTPステータスコード
 *   @param details - (任意) エラー詳細オブジェクト
 *   @param error - (任意) 元となったエラーオブジェクト
 */
export const throwSupabaseError = (errorInfo: {
  callFunc: string;
  message: string;
  title?: string;
  severity?: SupabaseErrorSeverity;
  code?: SupabaseErrorCode;
  status?: number;
  details?: Record<string, any>;
  error?: any; // 元のエラーをキャッチした場合
}): never => {
  const severity = errorInfo.severity ?? "medium";
  const status = errorInfo.status ?? 500;
  const code = errorInfo.code ?? "UNKNOWN_ERROR";

  // 重大度が low 未満でない場合、または指定がない場合はエラーログを出力
  if (severity !== "low" && severity !== "info") {
    console.error(
      `[${errorInfo.callFunc}] ${errorInfo.title ?? "Supabase Error"}: ${
        errorInfo.message
      }`,
      {
        code,
        status,
        details: errorInfo.details,
        originalError: errorInfo.error,
      }
    );
  } else if (severity === "info") {
    console.log(
        `[${errorInfo.callFunc}] Info: ${errorInfo.message}`,
        {
            details: errorInfo.details,
        }
    );
  }


  throw new SupabaseError({
    message: errorInfo.message,
    status,
    code,
    details: errorInfo.details,
    severity,
  });
};
