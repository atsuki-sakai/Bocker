/**
 * 機能フラグ管理ユーティリティ
 * 新機能の段階的なロールアウトを制御
 */

/**
 * 利用可能な機能フラグ
 */
export const FEATURE_FLAGS = {
  CDN_ENABLED: 'cdn_enabled',
  CDN_BETA_TEST: 'cdn_beta_test',
} as const;

export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

/**
 * 機能フラグの状態を取得
 * @param flag - チェックする機能フラグ
 * @returns 機能が有効な場合true
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // 環境変数ベースのシンプルな実装
  switch (flag) {
    case FEATURE_FLAGS.CDN_ENABLED:
      // CDNが設定されていれば有効
      return !!process.env.NEXT_PUBLIC_CDN_DOMAIN;
      
    case FEATURE_FLAGS.CDN_BETA_TEST:
      // ベータテスト環境変数で制御
      return process.env.NEXT_PUBLIC_CDN_BETA === 'true';
      
    default:
      return false;
  }
}

/**
 * 複数の機能フラグを一括チェック
 * @param flags - チェックする機能フラグの配列
 * @returns 各フラグの状態を含むオブジェクト
 */
export function checkFeatureFlags(flags: FeatureFlag[]): Record<FeatureFlag, boolean> {
  const result: Partial<Record<FeatureFlag, boolean>> = {};
  
  for (const flag of flags) {
    result[flag] = isFeatureEnabled(flag);
  }
  
  return result as Record<FeatureFlag, boolean>;
}

/**
 * 開発環境でのみ機能を有効化
 * @param flag - チェックする機能フラグ
 * @returns 開発環境かつ機能が有効な場合true
 */
export function isFeatureEnabledInDev(flag: FeatureFlag): boolean {
  return process.env.NODE_ENV === 'development' && isFeatureEnabled(flag);
}

/**
 * 本番環境でのみ機能を有効化
 * @param flag - チェックする機能フラグ
 * @returns 本番環境かつ機能が有効な場合true
 */
export function isFeatureEnabledInProd(flag: FeatureFlag): boolean {
  return process.env.NODE_ENV === 'production' && isFeatureEnabled(flag);
}

/**
 * 機能フラグに基づいて条件付きで値を返す
 * @param flag - チェックする機能フラグ
 * @param enabledValue - 有効時の値
 * @param disabledValue - 無効時の値
 * @returns 機能フラグの状態に応じた値
 */
export function featureValue<T>(
  flag: FeatureFlag,
  enabledValue: T,
  disabledValue: T
): T {
  return isFeatureEnabled(flag) ? enabledValue : disabledValue;
}

/**
 * React Hook: 機能フラグの状態を取得
 * クライアントサイドでの使用を想定
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  // クライアントサイドでは環境変数の値は固定
  // 動的な変更が必要な場合は、APIやContextを使用する実装に変更
  return isFeatureEnabled(flag);
}

/**
 * 機能フラグのデバッグ情報を出力
 */
export function debugFeatureFlags(): void {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('debugFeatureFlags は開発環境でのみ使用してください');
    return;
  }
  
  console.log('=== Feature Flags Debug Info ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('CDN Base URL:', process.env.NEXT_PUBLIC_CDN_DOMAIN || 'Not set');
  console.log('CDN Beta:', process.env.NEXT_PUBLIC_CDN_BETA || 'Not set');
  
  const allFlags = Object.values(FEATURE_FLAGS);
  const flagStates = checkFeatureFlags(allFlags);
  
  console.log('\nFeature Flag States:');
  for (const [flag, enabled] of Object.entries(flagStates)) {
    console.log(`- ${flag}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`);
  }
  console.log('==============================');
}