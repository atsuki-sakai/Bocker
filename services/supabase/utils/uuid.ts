/**
 * Convex環境でも動作するUUID生成ユーティリティ
 * crypto.randomUUID()がConvex環境で利用できないため、代替実装を提供
 */

/**
 * Convex環境でも動作するUUID生成関数
 * Math.randomを使用した簡易UUID生成（実用レベルの一意性を保証）
 * RFC 4122 version 4 準拠のUUIDフォーマット
 */
export function generateUUID(): string {
  // Convex環境ではMath.randomを使用した簡易UUID生成
  // 実用レベルの一意性を保証
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 環境に応じて最適なUUID生成方法を選択
 * ブラウザ/Node.js環境ではcrypto.randomUUID()を使用
 * Convex環境では独自実装を使用
 */
export function safeGenerateUUID(): string {
  // crypto.randomUUID が利用可能な環境では使用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Convex環境や古いブラウザでは独自実装を使用
  return generateUUID();
} 