import type { ErrorPayload } from './types';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from './constants';

export abstract class BaseError<
  Name extends string,
  Payload extends ErrorPayload = ErrorPayload
> extends Error {
  public readonly name: Name;
  public readonly payload: Payload;
  public readonly timestamp: Date;

  protected constructor(
    name: Name,
    message: string,
    payload: Omit<Payload, 'severity' | 'statusCode'> & {
      statusCode?: Payload['statusCode'];
      severity?: Payload['severity'];
    },
  ) {
    super(message);
    this.name = name;
    const initializedPayload = {
      statusCode: payload.statusCode ?? ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
      severity: payload.severity ?? ERROR_SEVERITY.ERROR,
      ...payload,
    } as Payload;
    this.payload = initializedPayload;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, new.target.prototype);

    console.error(
      `[ERROR] ${this.name}: ${this.message} - Timestamp: ${this.timestamp.toISOString()} - Payload: ${JSON.stringify(this.payload)} `
    );
  }
}