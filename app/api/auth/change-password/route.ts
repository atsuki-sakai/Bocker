import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService';
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants';
import PasswordChangedEmail from '@/components/emails/PasswordChangedEmail';

export const runtime = 'nodejs';

// リクエストボディのスキーマ
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// セッションペイロードの型
interface SessionPayload {
  customerUid: string;
  email: string;
  tenantId: string;
  orgId: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'bocker-auth-session-secret-key';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/auth/change-password] Processing password change request...');

    // セッション確認
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(LINE_LOGIN_SESSION_KEY)?.value;

    if (!sessionToken) {
      console.log('[API /api/auth/change-password] No session token found');
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // JWTセッションを検証
    let sessionPayload: SessionPayload;
    try {
      sessionPayload = jwt.verify(sessionToken, JWT_SECRET) as SessionPayload;
    } catch (jwtError) {
      console.error('[API /api/auth/change-password] Invalid session token:', jwtError);
      return NextResponse.json(
        { error: '無効なセッションです' },
        { status: 401 }
      );
    }

    // リクエストボディを解析・バリデーション
    const body: unknown = await request.json();
    const validatedData = changePasswordSchema.parse(body);

    console.log(`[API /api/auth/change-password] Processing request for customer: ${sessionPayload.customerUid}`);

    // Supabase admin サービスとリポジトリを初期化
    const supabaseAdmin = getSupabaseAdminService();
    const customerRepo = new CustomerRepository(supabaseAdmin);

    // 顧客を検索
    const customer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
      sessionPayload.tenantId,
      sessionPayload.orgId,
      sessionPayload.email
    );

    if (!customer || customer.uid !== sessionPayload.customerUid) {
      console.error('[API /api/auth/change-password] Customer not found or UID mismatch');
      return NextResponse.json(
        { error: '顧客情報が見つかりません' },
        { status: 400 }
      );
    }

    // パスワードが設定されていない場合
    if (!customer.password_hash) {
      console.warn(`[API /api/auth/change-password] Customer has no password: ${customer.uid}`);
      return NextResponse.json(
        { error: 'パスワードが設定されていません。パスワードリセットをご利用ください。' },
        { status: 400 }
      );
    }

    // 現在のパスワードを照合
    const isCurrentPasswordValid = await verifyPassword(validatedData.currentPassword, customer.password_hash);

    if (!isCurrentPasswordValid) {
      console.warn(`[API /api/auth/change-password] Invalid current password for customer: ${customer.uid}`);
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 新しいパスワードと現在のパスワードが同じかチェック
    const isSamePassword = await verifyPassword(validatedData.newPassword, customer.password_hash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: '新しいパスワードは現在のパスワードと異なるものを設定してください' },
        { status: 400 }
      );
    }

    // 新しいパスワードをハッシュ化
    const hashedNewPassword = await hashPassword(validatedData.newPassword);

    // パスワードを更新
    await customerRepo.updatePassword(customer.uid, hashedNewPassword);

    // パスワード変更通知メールを送信
    try {
      const changedAt = new Date().toLocaleString('ja-JP');
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@bcker.jp',
        to: customer.email || sessionPayload.email,
        subject: 'パスワード変更完了のお知らせ',
        react: PasswordChangedEmail({
          customerEmail: customer.email || sessionPayload.email,
          orgName: '美容サロン', // TODO: 組織名を動的に取得
          changedAt,
        }),
      });

      console.log(`[API /api/auth/change-password] Password change notification sent to: ${customer.email}`);
    } catch (emailError) {
      console.error('[API /api/auth/change-password] Failed to send notification email:', emailError);
      // メール送信失敗はパスワード変更成功を妨げない
    }

    console.log(`[API /api/auth/change-password] Password successfully changed for customer: ${customer.uid}`);

    return NextResponse.json(
      { message: 'パスワードが正常に変更されました' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API /api/auth/change-password] Error during password change:', error);

    // Zodバリデーションエラー
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }

    // その他のエラー
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}