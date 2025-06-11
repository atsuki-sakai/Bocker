import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService';
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository';
import { emailSchema } from '@/lib/validations/api/common';

export const runtime = 'nodejs';

// リクエストボディのスキーマ
const checkCustomerSchema = z.object({
  email: emailSchema,
  tenantId: z.string().min(1),
  orgId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/auth/check-customer] Processing customer existence check...');

    // リクエストボディを解析・バリデーション
    const body: unknown = await request.json();
    const validatedData = checkCustomerSchema.parse(body);

    console.log(`[API /api/auth/check-customer] Checking customer: ${validatedData.email}`);

    // Supabase admin サービスとリポジトリを初期化
    const supabaseAdmin = getSupabaseAdminService();
    const customerRepo = new CustomerRepository(supabaseAdmin);

    // 顧客を検索
    const customer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
      validatedData.tenantId,
      validatedData.orgId,
      validatedData.email
    );

    if (customer) {
      console.log(`[API /api/auth/check-customer] Customer exists: ${customer.uid}`);
      return NextResponse.json(
        {
          exists: true,
          customer: {
            uid: customer.uid,
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
            hasPassword: !!customer.password_hash,
          },
        },
        { status: 200 }
      );
    } else {
      console.log(`[API /api/auth/check-customer] Customer not found: ${validatedData.email}`);
      return NextResponse.json(
        { exists: false },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('[API /api/auth/check-customer] Error during customer check:', error);

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