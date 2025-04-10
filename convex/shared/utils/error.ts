/**
 * エラーハンドリングユーティリティ
 *
 * このモジュールはConvexアプリケーション全体で使用するエラー処理関連の関数を提供します。
 * エラーの発生、ログ記録、フォーマットなどの処理を一元化し、エラーハンドリングの一貫性を高めます。
 */

import { ConvexError } from 'convex/values';

/**
 * エラーコードの定義
 * アプリケーション全体で一貫したエラーコードを使用するための列挙型
 */
export type ConvexErrorCode =
  | 'VALIDATION' // 入力内容に問題があります
  | 'AUTHENTICATION' // 認証に失敗しました
  | 'AUTHORIZATION' // 権限が不足しています
  | 'SERVER' // サーバー側でエラーが発生しました
  | 'NETWORK' // ネットワークエラーが発生しました
  | 'UNKNOWN' // 未知のエラーが発生しました
  | 'VALIDATION_ERROR' // 入力内容に問題があります
  | 'NOT_FOUND' // 指定されたリソースが見つかりません
  | 'DUPLICATE_RECORD' // 既に存在するデータです
  | 'UNEXPECTED_ERROR' // 予期せぬエラーが発生しました
  | 'DATABASE_ERROR' // データベース処理中にエラーが発生しました
  | 'PERMISSION_DENIED' // この操作を行う権限がありません
  | 'INTERNAL_ERROR' // システム内部でエラーが発生しました
  | 'INVALID_ARGUMENT' // 無効な引数が指定されました
  | 'CONFLICT' // リソースが競合しています
  | 'STRIPE_ERROR' // Stripeエラーが発生しました
  | 'RATE_LIMIT_EXCEEDED' // レート制限を超えました
  | 'FORBIDDEN'; // アクセスが禁止されています

export type ConvexErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * エラーコンテキストの型定義
 * エラーに関連する追加情報を格納するオブジェクトの型
 */
export interface ErrorContext {
  // @ts-ignore
  [key: string]: any;
}

class BaseCustomError extends Error {
  constructor(
    public title: string,
    public message: string,
    public code: ConvexErrorCode,
    public severity: ConvexErrorSeverity,
    public status: number,
    public context: ErrorContext,
    public throwError: () => never
  ) {
    super(message);
    this.title = title;
    this.code = code;
    this.severity = severity;
    this.status = status;
    this.context = context;
    this.throwError = throwError;

    this.logError();
  }

  logError(): void {
    console.log(
      `${this.title}: ${this.severity} - ${this.message}, CODE: ${this.code}, STATUS: ${this.status}, CONTEXT:`,
      this.context
    );
  }
}

// Stripeエラー
export class StripeError extends BaseCustomError {
  constructor(
    severity: ConvexErrorSeverity = 'high',
    message: string,
    code: ConvexErrorCode,
    status: number = 500,
    context: ErrorContext = {}
  ) {
    const title = 'Stripe';
    const throwError = (): never => {
      throw new ConvexError({
        title,
        message,
        code,
        severity,
        status,
        context,
      });
    };
    super(title, message, code, severity, status, context, throwError);
  }
}

// Convexエラー
export class ConvexCustomError extends BaseCustomError {
  constructor(
    severity: ConvexErrorSeverity = 'low',
    message: string,
    code: ConvexErrorCode,
    status: number = 500,
    context: ErrorContext = {}
  ) {
    const title = 'Convex Error';
    const throwError = (): never => {
      throw new ConvexError({
        title,
        severity,
        message,
        code,
        status,
        context,
      });
    };

    super(title, message, code, severity, status, context, throwError);
  }
}

// Storageエラー
export class StorageError extends BaseCustomError {
  constructor(
    severity: ConvexErrorSeverity = 'high',
    message: string,
    code: ConvexErrorCode,
    status: number = 500,
    context: ErrorContext = {}
  ) {
    const title = 'Storage Error';
    const throwError = (): never => {
      throw new ConvexError({
        title,
        severity,
        message,
        code,
        status,
        context,
      });
    };
    super(title, message, code, severity, status, context, throwError);
  }
}
