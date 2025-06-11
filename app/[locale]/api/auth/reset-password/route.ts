import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService';
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository';
import { emailSchema } from '@/lib/validations/api/common';
import PasswordResetEmail from '@/components/emails/PasswordResetEmail';

export const runtime = 'nodejs';

// リクエストボディのスキーマ
const resetPasswordRequestSchema = z.object({
  email: emailSchema,
  tenantId: z.string().uuid(),
  orgId: z.string().uuid(),
});

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'bocker-auth-session-secret-key';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/auth/reset-password] Processing password reset request...');

    // リクエストボディを解析・バリデーション
    const body: unknown = await request.json();
    const validatedData = resetPasswordRequestSchema.parse(body);

    console.log(`[API /api/auth/reset-password] Validated request for email: ${validatedData.email}`);

    // Supabase admin サービスとリポジトリを初期化
    const supabaseAdmin = getSupabaseAdminService();
    const customerRepo = new CustomerRepository(supabaseAdmin);

    // 顧客を検索
    const customer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
      validatedData.tenantId,
      validatedData.orgId,
      validatedData.email
    );

    // セキュリティ上、顧客が存在しない場合でも成功レスポンスを返す
    if (!customer) {
      console.warn(`[API /api/auth/reset-password] Customer not found: ${validatedData.email}`);
      return NextResponse.json(
        { message: 'パスワードリセットメールを送信しました。メールをご確認ください。' },
        { status: 200 }
      );
    }

    // リセットトークンを生成（JWTを使用、1時間有効）
    const resetToken = jwt.sign(
      {
        customerUid: customer.uid,
        email: customer.email,
        tenantId: validatedData.tenantId,
        orgId: validatedData.orgId,
        type: 'password_reset',
        tokenId: uuidv4(), // 一意性のため
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // リセットURLを生成
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;
    const resetUrl = `${baseUrl}/customer/reset-password/confirm?token=${resetToken}`;

    // 有効期限を計算
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toLocaleString('ja-JP');

    // Resendでメール送信
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@bcker.jp',
        to: customer.email || validatedData.email,
        subject: 'パスワードリセットのご案内',
        react: PasswordResetEmail({
          customerEmail: customer.email || validatedData.email,
          orgName: '美容サロン', // TODO: 組織名を動的に取得
          resetUrl,
          expiresAt,
        }),
      });

      console.log(`[API /api/auth/reset-password] Password reset email sent to: ${customer.email}`);
    } catch (emailError) {
      console.error('[API /api/auth/reset-password] Failed to send email:', emailError);
      return NextResponse.json(
        { error: 'メールの送信に失敗しました。しばらく時間をおいてお試しください。' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'パスワードリセットメールを送信しました。メールをご確認ください。' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API /api/auth/reset-password] Error during password reset request:', error);

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