import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { CustomerRepository } from '@/services/supabase/repositories/customer';
import { verifyPassword } from '@/lib/auth/password';
import { emailSchema } from '@/lib/validations/api/common';
import { LOGIN_SESSION_KEY } from '@/services/line/constants';
import { SessionPayload } from '@/lib/types';
import { getEnv } from '@/lib/env-config';
import { ActiveCustomerType } from '@/convex/types';
import type { RowType } from '@/services/supabase/SupabaseService';
import { Id } from '@/convex/_generated/dataModel';

export const runtime = 'nodejs';

// POSTリクエスト用のスキーマ
const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(100),
  tenantId: z.string().min(1),
  orgId: z.string().min(1),
});

const APP_JWT_SECRET = getEnv('APP_JWT_SECRET');
const JWT_EXPIRES_IN = '30d';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/auth/session] Processing login request...');

    // リクエストボディを解析・バリデーション
    const body: unknown = await request.json();
    const validatedData = loginRequestSchema.parse(body);

    console.log(`[API /api/auth/session] Validated login request for email: ${validatedData.email}`);

    // リポジトリを初期化
    const customerRepo = new CustomerRepository();

    // 顧客を検索
    const customer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
      validatedData.tenantId,
      validatedData.orgId,
      validatedData.email
    );

    if (!customer) {
      console.warn(`[API /api/auth/session] Customer not found: ${validatedData.email}`);
      return NextResponse.json(
        { error: 'ユーザーが存在しません' },
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
        { error: 'パスワードが正しくありません' },
        { status: 401 }
      );
    }

    // JWTペイロードを作成
    const payload: SessionPayload = {
      customerUid: customer.uid,
      email: customer.email || '',
      tenantId: validatedData.tenantId as Id<"tenant">,
      orgId: validatedData.orgId as Id<"organization">,
      target_type: customer.customer_type as SessionPayload['target_type'],
    };

    // JWTトークンを生成
    const token = jwt.sign(payload, APP_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // HTTPOnlyクッキーを設定
    const cookieStore = await cookies();
    cookieStore.set(LOGIN_SESSION_KEY, token, {
      httpOnly: true,
      secure: getEnv('NODE_ENV') === 'production',
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

export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/auth/session] Processing session retrieval request...');

    const cookieStore = await cookies();
    const token = cookieStore.get(LOGIN_SESSION_KEY)?.value;

    if (!token) {
      console.log('[API /api/auth/session] No session token found');
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 401 }
      );
    }

    // URLからtenantIdとorgIdを取得
    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get('tenantId');
    const requestedOrgId = searchParams.get('orgId');

    if (!requestedTenantId || !requestedOrgId) {
      return NextResponse.json({ error: 'Missing store information' }, { status: 400 });
    }

    let currentSession: SessionPayload;
    try {
      currentSession = jwt.verify(token, APP_JWT_SECRET) as SessionPayload;
    } catch (err) {
      console.warn('[API /api/auth/session] Invalid session token:', err);
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 同じ店舗の場合は現在のセッションを返す
    if (currentSession.tenantId === requestedTenantId && currentSession.orgId === requestedOrgId) {
      return NextResponse.json({ session: currentSession }, { status: 200 });
    }

    console.log('[API /api/auth/session] Store transition detected, creating new session...');

    // 異なる店舗の場合、新しいセッションを作成
    const customerRepo = new CustomerRepository();
    let customer: RowType<'customer'> | null = null;

    if (currentSession.lineUserId) {
      // LINE認証ユーザーの場合
      customer = await customerRepo.findByTenantAndOrgAndCustomerLineId(
        requestedTenantId,
        requestedOrgId,
        currentSession.lineUserId
      );

      if (!customer) {
        console.log('[API /api/auth/session] Creating new LINE customer for different store');
        const result = await customerRepo.createCustomerWithDetailsAndPoints(
          {
            uid: uuidv4(),
            tenant_id: requestedTenantId,
            org_id: requestedOrgId,
            line_id: currentSession.lineUserId,
            line_user_name: currentSession.name,
            email: currentSession.email,
            customer_type: 'first_time'
          },
          {
            email: currentSession.email || '',
            gender: null,
            birthday: null,
            age: 0,
            notes: 'LI'
          },
          0
        );
        customer = result.customer;
      }
    } else if (currentSession.email) {
      // メール認証ユーザーの場合
      customer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
        requestedTenantId,
        requestedOrgId,
        currentSession.email
      );

      if (!customer) {
        console.log('[API /api/auth/session] Creating new email customer for different store');
        const result = await customerRepo.createCustomerWithDetailsAndPoints(
          {
            uid: uuidv4(),
            tenant_id: requestedTenantId,
            org_id: requestedOrgId,
            email: currentSession.email,
            customer_type: 'first_time'
          },
          {
            email: currentSession.email,
            gender: null,
            birthday: null,
            age: 0,
            notes: ''
          },
          0
        );
        customer = result.customer;
      }
    }

    if (!customer) {
      console.error('[API /api/auth/session] Failed to create or find customer for new store');
      return NextResponse.json({ error: 'Customer creation failed' }, { status: 500 });
    }

    // 新しいセッションペイロードを作成
    const newSessionPayload: SessionPayload = {
      customerUid: customer.uid,
      tenantId: requestedTenantId as Id<"tenant">,
      orgId: requestedOrgId as Id<"organization">,
      email: customer.email || undefined,
      lineUserId: customer.line_id || undefined,
      name: customer.line_user_name || undefined,
      target_type: customer.customer_type as ActiveCustomerType
    };

    // 新しいJWTトークンを生成
    const newToken = jwt.sign(newSessionPayload, APP_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 新しいセッションクッキーを設定
    cookieStore.set(LOGIN_SESSION_KEY, newToken, {
      httpOnly: true,
      secure: getEnv('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30日
    });

    console.log('[API /api/auth/session] Successfully created new session for different store');
    return NextResponse.json({ session: newSessionPayload }, { status: 200 });

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