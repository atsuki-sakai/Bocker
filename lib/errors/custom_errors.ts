import { BaseError } from './BaseError';
import { ERROR_SEVERITY } from './constants';
import type { ErrorPayload } from './types';

/** アプリケーションに対応したカスタムエラー */
export class ApplicationError<
  N extends string = "APPLICATION_ERROR",
> extends BaseError<N, ErrorPayload> {
  constructor(
    message: string,
    payloadInput: Omit<ErrorPayload, 'severity' | 'statusCode' | 'message'> & {
      statusCode: ErrorPayload['statusCode'];
      severity?: ErrorPayload['severity'];
      message?: ErrorPayload['message'];
      title?: ErrorPayload['title'];
      callFunc?: ErrorPayload['callFunc'];
      code?: ErrorPayload['code'];
      details?: ErrorPayload['details'];
      headers?: ErrorPayload['headers'];
    },
    nameOverride?: N
  ) {
    const errorName = nameOverride || ('APPLICATION_ERROR' as N);
    super(errorName, message, payloadInput);
  }
}

/** システムに対応したカスタムエラー */
export class SystemError<
  N extends string = "SYSTEM_ERROR",
> extends BaseError<N, ErrorPayload> {
  constructor(
    message: string,
    payloadInput: Omit<ErrorPayload, 'severity' | 'statusCode' | 'message'> & {
      statusCode: ErrorPayload['statusCode'];
      severity?: ErrorPayload['severity'];
      message?: ErrorPayload['message'];
      title?: ErrorPayload['title'];
      callFunc?: ErrorPayload['callFunc'];
      code?: ErrorPayload['code'];
      details?: ErrorPayload['details'];
      headers?: ErrorPayload['headers'];
    },
    nameOverride?: N
  ) {
    const errorName = nameOverride || ('SYSTEM_ERROR' as N);
    const finalPayloadInput = {
      severity: ERROR_SEVERITY.CRITICAL,
      ...payloadInput,
    };
    super(errorName, message, finalPayloadInput);
  }
}
