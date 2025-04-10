import { ConvexError } from 'convex/values';

export const handleError = (
  error: unknown
): {
  message: string;
  code: string | null;
  status: number | null;
  severity: string | null;
  context: object | null;
} => {
  // デフォルトのエラーメッセージ
  const errorInfo = {
    message: 'エラーが発生しました',
    code: null,
    status: null,
    severity: null,
    context: null,
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
      if ('severity' in errorData && typeof errorData.severity === 'string') {
        errorInfo.severity = errorData.severity;
      }
      if ('context' in errorData && typeof errorData.context === 'object') {
        errorInfo.context = errorData.context;
      }
    }
  } else if (error instanceof Error) {
    // 通常のErrorオブジェクトの場合
    errorInfo.message = error.message;
  }

  return errorInfo;
};
