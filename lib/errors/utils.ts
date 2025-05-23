import type { ErrorPayload } from './types';

/**
 * ErrorPayload であることを確認する型ガード
 */
export function isErrorPayload(data: unknown): data is ErrorPayload {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  return (
    typeof d.statusCode === 'string' &&
    typeof d.message === 'string' &&
    typeof d.severity === 'string' &&
    typeof d.callFunc === 'string' &&
    typeof d.title === 'string' &&
    typeof d.details === 'object'
  );
} 