import { BaseRepository, ListOptions } from '../BaseRepository';
import type { RowType, InsertType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';
import { generateUUID } from '@/services/supabase/utils/uuid';

/**
 * ポイント履歴 (point_transaction) テーブル操作リポジトリ
 * 
 * ポイントの付与・利用履歴の管理を行います。
 * - ポイント付与の記録
 * - ポイント利用の記録
 * - ポイント履歴の検索・集計
 */
export class PointTransactionRepository extends BaseRepository<'point_transaction'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('point_transaction', instance);
  }

  /**
   * 新しいポイント取引を記録します。
   * @param transactionData - 取引データ
   * @returns 作成された取引情報
   */
  async createTransaction(
    transactionData: Pick<InsertType<'point_transaction'>, 'tenant_id' | 'org_id' | 'customer_uid' | 'points' | 'transaction_type' | 'transaction_date_unix' | 'description' | 'reservation_id'>
  ): Promise<RowType<'point_transaction'>> {
    console.log(`[PointTransactionRepository] createTransaction: data=${JSON.stringify(transactionData)}`);
    
    const newTransactionData: InsertType<'point_transaction'> = {
      id: generateUUID(),
      ...transactionData,
    };

    try {
      return await this.create(newTransactionData);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'PointTransactionRepository.createTransaction',
          message: error.message,
          error: error,
          severity: 'high',
          details: { transactionData }
        });
      }
      throw error;
    }
  }

  /**
   * ポイント付与取引を記録します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客ID
   * @param points - 付与ポイント数 (正の値)
   * @param description - 取引説明
   * @param reservationId - 関連する予約ID (オプション)
   * @returns 作成された取引情報
   */
  async recordPointsEarned(
    tenantId: string,
    orgId: string,
    customerUid: string,
    points: number,
    description: string,
    reservationId?: string
  ): Promise<RowType<'point_transaction'>> {
    console.log(`[PointTransactionRepository] recordPointsEarned: customerUid=${customerUid}, points=${points}`);
    
    if (points <= 0) {
      throw new Error('Points earned must be a positive number');
    }

    return this.createTransaction({
      tenant_id: tenantId,
      org_id: orgId,
      customer_uid: customerUid,
      points: points,
      transaction_type: 'earned',
      transaction_date_unix: Math.floor(Date.now() / 1000),
      description: description,
      reservation_id: reservationId,
    });
  }

  /**
   * ポイント利用取引を記録します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客ID
   * @param points - 利用ポイント数 (正の値で指定、記録時は負の値になります)
   * @param description - 取引説明
   * @param reservationId - 関連する予約ID (オプション)
   * @returns 作成された取引情報
   */
  async recordPointsUsed(
    tenantId: string,
    orgId: string,
    customerUid: string,
    points: number,
    description: string,
    reservationId?: string
  ): Promise<RowType<'point_transaction'>> {
    console.log(`[PointTransactionRepository] recordPointsUsed: customerUid=${customerUid}, points=${points}`);
    
    if (points <= 0) {
      throw new Error('Points used must be a positive number');
    }

    return this.createTransaction({
      tenant_id: tenantId,
      org_id: orgId,
      customer_uid: customerUid,
      points: -points, // 利用は負の値で記録
      transaction_type: 'used',
      transaction_date_unix: Math.floor(Date.now() / 1000),
      description: description,
      reservation_id: reservationId,
    });
  }

  /**
   * 顧客のポイント取引履歴を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客ID
   * @param options - リスト取得オプション
   * @returns 取引履歴の配列と合計件数
   */
  async findByCustomer(
    tenantId: string,
    orgId: string,
    customerUid: string,
    options?: ListOptions<'point_transaction'>
  ): Promise<{ data: RowType<'point_transaction'>[]; count: number | null }> {
    console.log(`[PointTransactionRepository] findByCustomer: tenantId=${tenantId}, orgId=${orgId}, customerUid=${customerUid}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      customer_uid: customerUid 
    } as Partial<RowType<'point_transaction'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 予約に関連するポイント取引を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param reservationId - 予約ID
   * @param options - リスト取得オプション
   * @returns 取引履歴の配列と合計件数
   */
  async findByReservation(
    tenantId: string,
    orgId: string,
    reservationId: string,
    options?: ListOptions<'point_transaction'>
  ): Promise<{ data: RowType<'point_transaction'>[]; count: number | null }> {
    console.log(`[PointTransactionRepository] findByReservation: tenantId=${tenantId}, orgId=${orgId}, reservationId=${reservationId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      reservation_id: reservationId 
    } as Partial<RowType<'point_transaction'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 取引タイプでポイント取引を検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param transactionType - 取引タイプ ('earned' | 'used' | 'expired' | 'adjusted')
   * @param options - リスト取得オプション
   * @returns 取引履歴の配列と合計件数
   */
  async findByTransactionType(
    tenantId: string,
    orgId: string,
    transactionType: string,
    options?: ListOptions<'point_transaction'>
  ): Promise<{ data: RowType<'point_transaction'>[]; count: number | null }> {
    console.log(`[PointTransactionRepository] findByTransactionType: tenantId=${tenantId}, orgId=${orgId}, transactionType=${transactionType}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      transaction_type: transactionType 
    } as Partial<RowType<'point_transaction'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 期間を指定してポイント取引を検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param fromUnix - 開始時刻 (Unix timestamp)
   * @param toUnix - 終了時刻 (Unix timestamp)
   * @param options - リスト取得オプション
   * @returns 取引履歴の配列と合計件数
   */
  async findByDateRange(
    tenantId: string,
    orgId: string,
    fromUnix: number,
    toUnix: number,
    options?: ListOptions<'point_transaction'>
  ): Promise<{ data: RowType<'point_transaction'>[]; count: number | null }> {
    console.log(`[PointTransactionRepository] findByDateRange: tenantId=${tenantId}, orgId=${orgId}, from=${fromUnix}, to=${toUnix}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
    } as Partial<RowType<'point_transaction'>>;
    
    const rangeFilter = {
      column: 'transaction_date_unix' as keyof RowType<'point_transaction'>,
      from: fromUnix,
      to: toUnix,
    };
    
    return this.list({ ...options, filters, rangeFilter });
  }

  /**
   * 顧客のポイント残高を計算します。
   * 注意: この方法は取引履歴から計算するため、大量のデータがある場合は非効率です。
   * 本番環境では customer_points テーブルの total_points を使用することを推奨します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客ID
   * @returns 計算されたポイント残高
   */
  async calculatePointBalance(
    tenantId: string,
    orgId: string,
    customerUid: string
  ): Promise<number> {
    console.log(`[PointTransactionRepository] calculatePointBalance: customerUid=${customerUid}`);
    console.warn('This method calculates points from transaction history and may be inefficient for large datasets. Consider using customer_points.total_points in production.');
    
    const { data: transactions } = await this.findByCustomer(tenantId, orgId, customerUid, {
      select: 'points', // ポイント数のみ取得
    });
    
    const totalPoints = transactions.reduce((sum, transaction) => {
      return sum + (transaction.points || 0);
    }, 0);
    
    console.log(`[PointTransactionRepository] calculatePointBalance result: ${totalPoints} points`);
    return totalPoints;
  }

  /**
   * 顧客の取引統計を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客ID
   * @returns 取引統計情報
   */
  async getCustomerTransactionStats(
    tenantId: string,
    orgId: string,
    customerUid: string
  ): Promise<{
    totalEarned: number;
    totalUsed: number;
    transactionCount: number;
    lastTransactionDate: number | null;
  }> {
    console.log(`[PointTransactionRepository] getCustomerTransactionStats: customerUid=${customerUid}`);
    
    const { data: transactions } = await this.findByCustomer(tenantId, orgId, customerUid);
    
    let totalEarned = 0;
    let totalUsed = 0;
    let lastTransactionDate: number | null = null;
    
    transactions.forEach(transaction => {
      const points = transaction.points || 0;
      if (points > 0) {
        totalEarned += points;
      } else {
        totalUsed += Math.abs(points);
      }
      
      const transactionDate = transaction.transaction_date_unix;
      if (transactionDate && (!lastTransactionDate || transactionDate > lastTransactionDate)) {
        lastTransactionDate = transactionDate;
      }
    });
    
    return {
      totalEarned,
      totalUsed,
      transactionCount: transactions.length,
      lastTransactionDate,
    };
  }

  /**
   * 予約キャンセルに伴うポイント返還を記録します。
   * @param params - 返還パラメータ
   * @returns 成功/失敗の結果
   */
  async refundPointsForCancellation(params: {
    customerUid: string;
    reservationId: string;
    refundPoints: number;
    tenantId: string;
    orgId: string;
  }): Promise<void> {
    console.log(`[PointTransactionRepository] refundPointsForCancellation: params=${JSON.stringify(params)}`);
    
    const { customerUid, reservationId, refundPoints, tenantId, orgId } = params;
    
    if (refundPoints <= 0) {
      console.log(`[PointTransactionRepository] No points to refund: ${refundPoints}`);
      return;
    }

    try {
      // ポイント返還トランザクション作成
      await this.createTransaction({
        tenant_id: tenantId,
        org_id: orgId,
        customer_uid: customerUid,
        reservation_id: reservationId,
        points: refundPoints, // 返還は正の値
        transaction_type: 'refund',
        transaction_date_unix: Math.floor(Date.now() / 1000),
        description: `予約キャンセルによるポイント返還 (予約ID: ${reservationId})`,
      });

      // ポイント残高を原子的に更新
      const { error: updateError } = await this.supabaseServiceInstance
        .rpc('update_customer_points_atomic', {
          p_customer_uid: customerUid,
          p_points_delta: refundPoints,
        });
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`[PointTransactionRepository] Successfully refunded ${refundPoints} points to customer ${customerUid}`);
    } catch (error) {
      throwSupabaseError({
        callFunc: 'PointTransactionRepository.refundPointsForCancellation',
        message: 'Failed to refund points',
        error: error as Error,
        severity: 'high',
        details: params
      });
    }
  }

  /**
   * 予定されているポイント付与をキャンセルします。
   * @param reservationId - 予約ID
   * @returns 成功/失敗の結果
   */
  async cancelPendingPointAward(reservationId: string): Promise<void> {
    console.log(`[PointTransactionRepository] cancelPendingPointAward: reservationId=${reservationId}`);
    
    try {
      // Point task queue is a separate table, so we need to use direct supabase client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = (this.supabaseServiceInstance as any).client;
      const { error } = await supabase
        .from('point_task_queue')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('reservation_id', reservationId)
        .eq('status', 'pending');
      
      if (error) {
        throw error;
      }
      
      console.log(`[PointTransactionRepository] Successfully cancelled pending point award for reservation ${reservationId}`);
    } catch (error) {
      // ポイント付与タスクがない場合もエラーにしない
      console.warn(`[PointTransactionRepository] Failed to cancel pending point award: ${error}`);
    }
  }
}