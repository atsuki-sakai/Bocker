import { SignJWT, jwtVerify } from 'jose';
// TextEncoder はグローバルオブジェクトとして利用可能

// 本番環境では適切な環境変数から読み込む設定が必要
const JWT_SECRET = process.env.JWT_STAFF_SECRET!;
// secret keyをUint8Arrayに変換
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

// スタッフトークンのペイロード型
export interface StaffTokenPayload {
  staffId: string;
  salonId: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

/**
 * スタッフ認証用JWTトークンを生成 (Edge互換)
 */
export async function generateStaffToken(
  staffData: Omit<StaffTokenPayload, 'iat' | 'exp'>
): Promise<string> {
  const jwt = await new SignJWT({ ...staffData })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h') // 8時間有効なトークン
    .sign(SECRET_KEY);

  return jwt;
}

/**
 * スタッフトークンを検証してペイロードを取得 (Edge互換)
 * 無効な場合はnullを返す
 */
export async function verifyStaffToken(token: string): Promise<StaffTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as StaffTokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * ロールベースの権限チェック
 * 指定したロールのアクセス権があるかどうかを判定
 */
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    admin: 4,
    owner: 3,
    manager: 2,
    staff: 1,
  };

  const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userRoleLevel >= requiredRoleLevel;
}
