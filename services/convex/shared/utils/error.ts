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
export const ErrorCode = {
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

export type ConvexErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type ConvexErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * エラーコンテキストの型定義
 */
export interface ErrorContext {
  [key: string]: unknown;
  timestamp?: number;
}

/**
 * エラーオプションのインターフェース
 */
export interface ErrorOptions {
  title: string;
  message: string;
  code: ConvexErrorCode;
  severity: ConvexErrorSeverity;
  status: number;
  context?: ErrorContext;
}

class BaseCustomError extends Error {
  public readonly title: string;
  public readonly code: ConvexErrorCode;
  public readonly severity: ConvexErrorSeverity;
  public readonly status: number;
  public readonly context: ErrorContext;
  public readonly timestamp: number;

  constructor(options: ErrorOptions) {
    super(options.message);
    this.title = options.title;
    this.code = options.code;
    this.severity = options.severity;
    this.status = options.status;
    this.context = {
      ...options.context,
      timestamp: Date.now(),
    };
    this.timestamp = Date.now();

    // Errorクラスのプロトタイプチェーンを正しく設定
    Object.setPrototypeOf(this, new.target.prototype);

    this.logError();
  }

  protected formatErrorMessage(): string {
    const timestamp = new Date(this.timestamp).toISOString();
    return `[${this.title}] ${this.severity.toUpperCase()} - ${this.message}
    Code: ${this.code}
    Status: ${this.status}
    Timestamp: ${timestamp}
    Context: ${JSON.stringify(this.context, null, 2)}`;
  }

  protected logError(): void {
    const errorMessage = this.formatErrorMessage();
    console.error(errorMessage);
  }

  public throwError(): never {
    const safeContext = JSON.parse(JSON.stringify(this.context));
    throw new ConvexError({
      title: this.title,
      message: this.message,
      code: this.code,
      severity: this.severity,
      status: this.status,
      context: safeContext,
    });
  }
}

// Stripeエラー
export class StripeError extends BaseCustomError {
  constructor(
    severity: ConvexErrorSeverity = 'high',
    message: string,
    code: ConvexErrorCode = ErrorCode.STRIPE_ERROR,
    status: number = 500,
    context: ErrorContext = { timestamp: Date.now() }
  ) {
    super({
      title: 'Stripe Error',
      severity,
      message,
      code,
      status,
      context,
    });
  }
}

// Convexエラー
export class ConvexCustomError extends BaseCustomError {
  constructor(
    severity: ConvexErrorSeverity = 'low',
    message: string,
    code: ConvexErrorCode,
    status: number = 500,
    context: ErrorContext = { timestamp: Date.now() }
  ) {
    super({
      title: 'Convex Error',
      severity,
      message,
      code,
      status,
      context,
    });
  }
}

// Storageエラー
export class StorageError extends BaseCustomError {
  constructor(
    severity: ConvexErrorSeverity = 'high',
    message: string,
    code: ConvexErrorCode = ErrorCode.INTERNAL_ERROR,
    status: number = 500,
    context: ErrorContext = { timestamp: Date.now() }
  ) {
    super({
      title: 'Storage Error',
      severity,
      message,
      code,
      status,
      context,
    });
  }
}

// エラーハンドリング関数
export function throwConvexApiError(error: unknown): never {
  if (error instanceof ConvexCustomError) {
    throw error;
  } else if (error instanceof Error) {
    throw new ConvexCustomError(
      'medium',
      error.message || 'システムエラーが発生しました',
      'UNEXPECTED_ERROR',
      500,
      { stack: error.stack }
    ).throwError();
  } else {
    throw new ConvexCustomError(
      'high',
      '予期しないエラーが発生しました',
      'UNKNOWN',
      500
    ).throwError();
  }
}
