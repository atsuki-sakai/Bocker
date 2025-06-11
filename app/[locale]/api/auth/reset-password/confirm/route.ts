import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService';
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository';
import { hashPassword } from '@/lib/auth/password';
import PasswordChangedEmail from '@/components/emails/PasswordChangedEmail';

export const runtime = 'nodejs';

// リクエストボディのスキーマ
const confirmResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// JWTペイロードの型
interface ResetTokenPayload {
  customerUid: string;
  email: string;
  tenantId: string;
  orgId: string;
  type: string;
  tokenId: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'bocker-auth-session-secret-key';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/auth/reset-password/confirm] Processing password reset confirmation...');

    // リクエストボディを解析・バリデーション
    const body: unknown = await request.json();
    const validatedData = confirmResetPasswordSchema.parse(body);

    console.log('[API /api/auth/reset-password/confirm] Validated reset confirmation request');

    // JWTトークンを検証・デコード
    let tokenPayload: ResetTokenPayload;
    try {
      tokenPayload = jwt.verify(validatedData.token, JWT_SECRET) as ResetTokenPayload;
      
      // トークンタイプを確認
      if (tokenPayload.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
    } catch (jwtError) {
      console.error('[API /api/auth/reset-password/confirm] Invalid or expired token:', jwtError);
      return NextResponse.json(
        { error: 'トークンが無効か有効期限が切れています。再度パスワードリセットを申請してください。' },
        { status: 401 }
      );
    }

    // Supabase admin サービスとリポジトリを初期化
    const supabaseAdmin = getSupabaseAdminService();
    const customerRepo = new CustomerRepository(supabaseAdmin);

    // 顧客を検索して存在確認
    const customer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
      tokenPayload.tenantId,
      tokenPayload.orgId,
      tokenPayload.email
    );

    if (!customer || customer.uid !== tokenPayload.customerUid) {
      console.error('[API /api/auth/reset-password/confirm] Customer not found or UID mismatch');
      return NextResponse.json(
        { error: '無効なリクエストです' },
        { status: 400 }
      );
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await hashPassword(validatedData.newPassword);

    // パスワードを更新
    await customerRepo.updatePassword(customer.uid, hashedPassword);

    // パスワード変更通知メールを送信
    try {
      const changedAt = new Date().toLocaleString('ja-JP');
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@bcker.jp',
        to: customer.email || tokenPayload.email,
        subject: 'パスワード変更完了のお知らせ',
        react: PasswordChangedEmail({
          customerEmail: customer.email || tokenPayload.email,
          orgName: '美容サロン', // TODO: 組織名を動的に取得
          changedAt,
        }),
      });

      console.log(`[API /api/auth/reset-password/confirm] Password change notification sent to: ${customer.email}`);
    } catch (emailError) {
      console.error('[API /api/auth/reset-password/confirm] Failed to send notification email:', emailError);
      // メール送信失敗はパスワード変更成功を妨げない
    }

    console.log(`[API /api/auth/reset-password/confirm] Password successfully reset for customer: ${customer.uid}`);

    return NextResponse.json(
      { message: 'パスワードが正常に変更されました。新しいパスワードでログインしてください。' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API /api/auth/reset-password/confirm] Error during password reset confirmation:', error);

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