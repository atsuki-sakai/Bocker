import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * プレーンテキストパスワードをハッシュ化します
 * @param plainPassword プレーンテキストパスワード
 * @returns ハッシュ化されたパスワード
 * @throws Error ハッシュ化に失敗した場合
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    // パスワードの正規化（前後の空白を除去、URLデコード対応）
    let normalizedPassword = plainPassword.trim();
    try {
      // URLエンコードされている場合のみデコード
      if (plainPassword.includes('%')) {
        normalizedPassword = decodeURIComponent(plainPassword.trim());
      }
    } catch (e) {
      // デコードに失敗した場合は元の値を使用
      console.warn('[hashPassword] Failed to decode password, using original:', e);
      normalizedPassword = plainPassword.trim();
    }
    
    console.log(`[hashPassword] Original password: "${plainPassword}"`);
    console.log(`[hashPassword] Normalized password: "${normalizedPassword}"`);
    console.log(`[hashPassword] Password length: ${normalizedPassword.length}`);
    console.log(`[hashPassword] Contains @: ${normalizedPassword.includes('@')}`);
    console.log(`[hashPassword] Salt rounds: ${SALT_ROUNDS}`);
    
    const hashedPassword = await bcrypt.hash(normalizedPassword, SALT_ROUNDS);
    console.log(`[hashPassword] Generated hash: "${hashedPassword}"`);
    console.log(`[hashPassword] Hash length: ${hashedPassword.length}`);
    
    return hashedPassword;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('パスワードのハッシュ化に失敗しました');
  }
}

/**
 * プレーンテキストパスワードとハッシュ化されたパスワードを照合します
 * @param plainPassword プレーンテキストパスワード
 * @param hashedPassword ハッシュ化されたパスワード
 * @returns パスワードが一致する場合true、しない場合false
 * @throws Error 照合処理に失敗した場合
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    // パスワードの正規化（ハッシュ化時と同じ処理）
    let normalizedPassword = plainPassword.trim();
    try {
      // URLエンコードされている場合のみデコード
      if (plainPassword.includes('%')) {
        normalizedPassword = decodeURIComponent(plainPassword.trim());
      }
    } catch (e) {
      // デコードに失敗した場合は元の値を使用
      console.warn('[verifyPassword] Failed to decode password, using original:', e);
      normalizedPassword = plainPassword.trim();
    }
    
    console.log(`[verifyPassword] Original password: "${plainPassword}"`);
    console.log(`[verifyPassword] Normalized password: "${normalizedPassword}"`);
    console.log(`[verifyPassword] Password length: ${normalizedPassword.length}`);
    console.log(`[verifyPassword] Contains @: ${normalizedPassword.includes('@')}`);
    console.log(`[verifyPassword] Hashed password: "${hashedPassword}"`);
    console.log(`[verifyPassword] Hash starts with $2: ${hashedPassword.startsWith('$2')}`);
    
    const isValid = await bcrypt.compare(normalizedPassword, hashedPassword);
    console.log(`[verifyPassword] bcrypt.compare result: ${isValid}`);
    return isValid;
  } catch (error) {
    console.error('Password verification failed:', error);
    throw new Error('パスワードの照合に失敗しました');
  }
}