import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService';
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository';
import { verifyPassword } from '@/lib/auth/password';
import { emailSchema } from '@/lib/validations/api/common';
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants';

export const runtime = 'nodejs';

// POSTリクエスト用のスキーマ
const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(100),
  tenantId: z.string().min(1),
  orgId: z.string().min(1),
});

// JWTペイロードの型
interface SessionPayload {
  customerUid: string;
  email: string;
  tenantId: string;
  orgId: string;
}

// type LoginRequest = z.infer<typeof loginRequestSchema>;

const JWT_SECRET = process.env.JWT_SECRET || 'bocker-auth-session-secret-key';
const JWT_EXPIRES_IN = '30d';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/auth/session] Processing login request...');

    // リクエストボディを解析・バリデーション
    const body: unknown = await request.json();
    const validatedData = loginRequestSchema.parse(body);

    console.log(`[API /api/auth/session] Validated login request for email: ${validatedData.email}`);

    // Supabase admin サービスとリポジトリを初期化
    const supabaseAdmin = getSupabaseAdminService();
    const customerRepo = new CustomerRepository(supabaseAdmin);

    // 顧客を検索
    const customer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
      validatedData.tenantId,
      validatedData.orgId,
      validatedData.email
    );

    if (!customer) {
      console.warn(`[API /api/auth/session] Customer not found: ${validatedData.email}`);
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    if (!customer.password_hash) {
      console.warn(`[API /api/auth/session] Customer has no password hash: ${validatedData.email}`);
      return NextResponse.json(
        { error: 'パスワードが設定されていません' },
        { status: 401 }
      );
    }

    // パスワードを照合
    const isPasswordValid = await verifyPassword(validatedData.password, customer.password_hash);

    if (!isPasswordValid) {
      console.warn(`[API /api/auth/session] Invalid password for customer: ${validatedData.email}`);
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // JWTペイロードを作成
    const payload: SessionPayload = {
      customerUid: customer.uid,
      email: customer.email || '',
      tenantId: validatedData.tenantId,
      orgId: validatedData.orgId,
    };

    // JWTトークンを生成
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // HTTPOnlyクッキーを設定
    const cookieStore = await cookies();
    cookieStore.set(LINE_LOGIN_SESSION_KEY, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30日
    });

    console.log(`[API /api/auth/session] Successfully created session for customer: ${customer.uid}`);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[API /api/auth/session] Error during login:', error);

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

export async function GET() {
  try {
    console.log('[API /api/auth/session] Processing session retrieval request...');

    // クッキーからトークンを取得
    const cookieStore = await cookies();
    const token = cookieStore.get(LINE_LOGIN_SESSION_KEY)?.value;

    if (!token) {
      console.log('[API /api/auth/session] No session token found');
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log('[API /api/auth/session] Returning session token');
    
    // /api/line/sessionと同じ形式でレスポンスを返す
    return NextResponse.json(
      {
        session: token,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API /api/auth/session] Error during session retrieval:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}