import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { getSupabaseAdminService, InsertType } from '@/services/supabase/SupabaseService';
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository';
import { hashPassword } from '@/lib/auth/password';
import { emailSchema, genderSchema } from '@/lib/validations/api/common';
import { CustomerRegistrationEmail } from '@/components/emails/CustomerRegistrationEmail';
import { MAX_NOTES_LENGTH } from '@/convex/constants';
import { BASE_URL } from '@/lib/constants';

export const runtime = 'nodejs';

// リクエストボディのスキーマ
const registerRequestSchema = z.object({
  orgName: z.string().min(1).max(200),
  email: emailSchema,
  password: z.string().min(8).max(100),
  tenantId: z.string().min(1),
  orgId: z.string().min(1),
  detailData: z.object({
    email: emailSchema,
    gender: genderSchema.or(z.null()).optional(),
    birthday: z.string().nullable().optional(),
    age: z.number().int().min(0).max(150).nullable().optional(),
    notes: z.string().max(MAX_NOTES_LENGTH).optional().default(''),
  }),
  initialPoints: z.number().int().min(0).optional().default(0),
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/auth/register] Processing customer registration request...');

    // リクエストボディを解析・バリデーション
    const body: unknown = await request.json();
    const validatedData = registerRequestSchema.parse(body);

    console.log(`[API /api/auth/register] Validated data for email: ${validatedData.email}`);

    // Supabase admin サービスとリポジトリを初期化
    const supabaseAdmin = getSupabaseAdminService();
    const customerRepo = new CustomerRepository(supabaseAdmin);

    // 重複確認（同じテナント・組織内で同じメールが存在するかチェック）
    const existingCustomer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
      validatedData.tenantId,
      validatedData.orgId,
      validatedData.email
    );

    if (existingCustomer) {
      console.warn(`[API /api/auth/register] Customer already exists: ${validatedData.email}`);
      return NextResponse.json(
        { error: '既に登録済みのメールアドレスです' },
        { status: 409 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(validatedData.password);

    // 顧客データを準備
    const customerCoreData: InsertType<'customer'> = {
      uid: uuidv4(),
      email: validatedData.email,
      first_name: '',
      last_name: '',
      phone: '',
      tenant_id: validatedData.tenantId,
      org_id: validatedData.orgId,
      line_id: null,
      line_user_name: null,
      password_hash: hashedPassword,
    };

    const detailData = {
      email: validatedData.detailData.email,
      gender: validatedData.detailData.gender || null,
      birthday: validatedData.detailData.birthday || null,
      age: validatedData.detailData.age || null,
      notes: validatedData.detailData.notes || '',
    };

    // 顧客・詳細・ポイント情報を一括作成
    const result = await customerRepo.createCustomerWithDetailsAndPoints(
      customerCoreData,
      detailData,
      validatedData.initialPoints
    );

    if (!result.customer) {
      console.error('[API /api/auth/register] Failed to create customer');
      return NextResponse.json(
        { error: '顧客の作成に失敗しました' },
        { status: 500 }
      );
    }

    console.log(`[API /api/auth/register] Successfully created customer: ${result.customer.uid}`);

    // 登録完了メールを送信
    try {
     
      const loginUrl = `${BASE_URL}/reservation/${validatedData.orgId}`;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || '<noreply@bocker.jp>',
        to: validatedData.email,
        subject: '【Bocker】会員登録完了のお知らせ',
        react: CustomerRegistrationEmail({
          customerEmail: validatedData.email,
          orgName: validatedData.orgName,
          loginUrl,
        }),
      });

      console.log(`[API /api/auth/register] Registration email sent to: ${validatedData.email}`);
    } catch (emailError) {
      console.error('[API /api/auth/register] Failed to send registration email:', emailError);
      // メール送信失敗は登録成功を妨げない
    }

    return NextResponse.json(
      { customerUid: result.customer.uid },
      { status: 201 }
    );

  } catch (error) {
    console.error('[API /api/auth/register] Error during registration:', error);

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