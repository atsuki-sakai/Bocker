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
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
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
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    return isValid;
  } catch (error) {
    console.error('Password verification failed:', error);
    throw new Error('パスワードの照合に失敗しました');
  }
}