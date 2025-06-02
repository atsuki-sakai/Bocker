'use client';

import { toast } from 'sonner';
import { useCallback } from 'react';
import { ERROR_SEVERITY } from '@/lib/errors/constants';
import { isErrorPayload } from '@/lib/errors/utils';
import type { ErrorPayload } from '@/lib/errors/types';
import { BaseError } from '@/lib/errors/BaseError';
import { ConvexError } from 'convex/values';

// エラーハンドリングの例
//   const { showErrorToast } = useErrorHandler({
//     defaultTitle: '商品取得エラー',
//   });


//   catch (error) {
//     // Convex からのスローされたエラーは、ここで error オブジェクトとしてキャッチされる
//     // フック側で error.data を見るか error 自体を見るか判断してくれる
//     showErrorToast(error);
//   } finally {
//     setIsLoading(false);
//   }

interface ErrorHandlerOptions {
  defaultTitle?: string;
  defaultMessage?: string;
}

/**
 * エラーを処理し、Toast を表示するためのカスタムフック
 * @param options - エラーハンドリングのオプション
 * @returns showErrorToast - エラーオブジェクトを受け取り Toast を表示する関数
 * // YourComponent.tsx (フック呼び出し側)
 *   } catch (error) { // どんなエラーもそのままキャッチ
 *     showErrorToast(error); // フックにエラーオブジェクトをそのまま渡す
 *   }
 */
export function useErrorHandler(options?: ErrorHandlerOptions) {
  const showErrorToast = useCallback((error: unknown) => {
    let processedPayload: ErrorPayload | null = null;
    let originalErrorMessage: string | null = null;

    console.log('フックに渡されたエラー:', error);

    if (error instanceof ConvexError) {
      /** ConvexError は .data にカスタムペイロードがそのまま入る */
      const convexData = (error.data ?? {}) as any;
      console.log('Convexエラーのデータ:', convexData);

      // ❶ isErrorPayload が true なら優先採用
      if (isErrorPayload(convexData)) {
        processedPayload = convexData;
        originalErrorMessage = convexData.message;
      } else if (
        typeof convexData === 'object' &&
        convexData !== null &&
        typeof convexData.message === 'string'
      ) {
        // ❷ payload 判定に落ちた場合でも message プロパティだけは拾う
        originalErrorMessage = convexData.message;
      } else {
        // ❸ 最後の手段として error.message を使用
        originalErrorMessage = error.message || 'Convexエラーですが内容を解析できませんでした。';
      }
    } else if (error instanceof BaseError) {
      console.log('BaseErrorインスタンスを直接処理:', error);
      if (isErrorPayload(error.payload)) {
        processedPayload = error.payload;
      }
      originalErrorMessage = error.message;
    } else if (isErrorPayload(error)) {
      console.log('エラーペイロードとして処理:', error);
      processedPayload = error;
      originalErrorMessage = error.message;
    } else if (error instanceof Error) {
      const match = error.message.match(/Uncaught\s+[A-Z_]+:\s*(.+)/);
      originalErrorMessage = match ? match[1] : error.message;
    } else if (typeof error === 'string') {
      console.log('文字列として処理:', error);
      originalErrorMessage = error;
    }

    let toastMessage: string = options?.defaultMessage || '不明なエラーが発生しました。';
    let toastTitle: string | undefined = options?.defaultTitle;
    let currentSeverity: ERROR_SEVERITY = ERROR_SEVERITY.ERROR;

    if (processedPayload) {
      console.log('表示するためのペイロード:', processedPayload);
      toastTitle = (typeof processedPayload.title === 'string') ? processedPayload.title : toastTitle;
      toastMessage = processedPayload.message;
      currentSeverity = processedPayload.severity;
    } else if (originalErrorMessage) {
      console.log('ペイロードがないので、オリジナルのエラーメッセージを使用します:', originalErrorMessage);
      toastMessage = originalErrorMessage;
    }

    const displayMessage = toastTitle ? `${toastTitle}: ${toastMessage}` : toastMessage;

    switch (currentSeverity) {
      case ERROR_SEVERITY.INFO:
        toast.info(displayMessage);
        break;
      case ERROR_SEVERITY.WARNING:
        toast.warning(displayMessage);
        break;
      case ERROR_SEVERITY.ERROR:
      case ERROR_SEVERITY.CRITICAL:
        toast.error(displayMessage);
        break;
      default:
        toast.error(displayMessage);
        break;
    }
  }, [options?.defaultTitle, options?.defaultMessage]);

  return { showErrorToast };
} 