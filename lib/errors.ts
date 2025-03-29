export const handleErrorToMessage = (error: unknown) => {
  // Convexエラーオブジェクトからメッセージとコードを取得
  let errorMessage = 'エラーが発生しました';

  if (error && typeof error === 'object') {
    // エラーオブジェクトのデータ構造をコンソール出力して確認
    console.log('Error structure:', JSON.stringify(error, null, 2));

    if ('data' in error && error.data && typeof error.data === 'object') {
      // データオブジェクトの内容を確認
      console.log('Error data:', JSON.stringify(error.data, null, 2));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorData = error.data as { message?: string; code?: string; originalError?: any };

      // originalErrorがある場合はそのメッセージを優先
      if (errorData.originalError && typeof errorData.originalError === 'object') {
        if (errorData.originalError.message) {
          errorMessage = errorData.originalError.message;
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } else if ('message' in error) {
      errorMessage = (error as { message: string }).message;
    }
  }

  return errorMessage;
};
