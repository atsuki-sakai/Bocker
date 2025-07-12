import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/services/supabase/SupabaseService';
import { PointTransactionRepository } from '@/services/supabase/repositories/point/PointTransactionRepository';
import { CustomerPointsRepository } from '@/services/supabase/repositories/customer/CustomerPointsRepository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, orgId, customerUid, pointsToUse, description } = body;

    // バリデーション
    if (!tenantId || !orgId || !customerUid || !pointsToUse || pointsToUse <= 0) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています。' },
        { status: 400 }
      );
    }

    // Supabase管理者クライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const supabaseService = new SupabaseService(supabase);
    const customerPointsRepo = new CustomerPointsRepository(supabaseService);
    const pointTransactionRepo = new PointTransactionRepository(supabaseService);

    // 現在のポイント残高を確認
    const currentPoints = await customerPointsRepo.findByTenantAndOrgAndCustomerUid(
      tenantId,
      orgId,
      customerUid
    );

    const availablePoints = currentPoints?.total_points || 0;

    // ポイント不足チェック
    if (availablePoints < pointsToUse) {
      return NextResponse.json(
        { 
          error: 'ポイントが不足しています。',
          availablePoints,
          requestedPoints: pointsToUse
        },
        { status: 400 }
      );
    }

    // 原子的なポイント減算とトランザクション作成
    try {
      const { data, error } = await supabase.rpc('update_customer_points_atomic', {
        p_customer_uid: customerUid,
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_points_delta: -pointsToUse, // 減算なので負の値
        p_transaction_type: 'used',
        p_description: description || `ポイント利用 (${pointsToUse}ポイント)`,
        p_reservation_id: null,
      });

      if (error) {
        throw error;
      }

      const result = data?.[0];
      if (!result) {
        throw new Error('ポイント更新処理でエラーが発生しました。');
      }

      console.log(`[API] ポイント減算成功: ${customerUid}, 使用ポイント: ${pointsToUse}, 新残高: ${result.new_total_points}`);

      return NextResponse.json({
        success: true,
        usedPoints: pointsToUse,
        newTotalPoints: result.new_total_points,
        transactionId: result.transaction_id,
        message: `${pointsToUse}ポイントを使用しました。`,
      });

    } catch (rpcError) {
      console.error('[API] RPC実行エラー:', rpcError);
      return NextResponse.json(
        { error: 'ポイント減算処理でエラーが発生しました。' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] ポイント使用エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}