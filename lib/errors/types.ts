import type { ERROR_SEVERITY, ERROR_STATUS_CODE } from './constants';
import type { Value } from 'convex/values';
// エラーのペイロード
export interface ErrorPayload {
  statusCode: ERROR_STATUS_CODE;
  severity: ERROR_SEVERITY;
  callFunc: string; // エラーが発生した関数名 (オプショナルに変更)
  message: string; // エラーメッセージ
  code: string | null; // エラーコード (string | null に変更済み)
  status: number | null; // エラーステータスコード
  details?: Record<string, unknown> | null; // エラー詳細
  [key: string]: unknown; // その他のプロパティを許容
}
