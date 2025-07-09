import { BaseRepository, BaseRepositoryOptions, ListOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';
import { generateUUID } from '@/services/supabase/utils/uuid';

/**
 * ポイント付与キュー (point_task_queue) テーブル操作リポジトリ
 * 
 * ポイント付与のスケジューリング、バッチ処理の管理を行います。
 * - 予約完了後の遅延ポイント付与
 * - ポイント付与の失敗時のリトライ機能
 * - ポイント付与タスクの状態管理
 */
export class PointTaskQueueRepository extends BaseRepository<'point_task_queue'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('point_task_queue', instance);
  }

  /**
   * 新しいポイント付与タスクを作成します。
   * @param taskData - タスクデータ (tenant_id, org_id, customer_uid, points, scheduled_for_unix)
   * @returns 作成されたタスク情報
   */
  async createPointTask(
    taskData: Pick<InsertType<'point_task_queue'>, 'tenant_id' | 'org_id' | 'customer_uid' | 'points' | 'scheduled_for_unix' | 'reservation_id'>
  ): Promise<RowType<'point_task_queue'>> {
    console.log(`[PointTaskQueueRepository] createPointTask: data=${JSON.stringify(taskData)}`);
    
    const newTaskData: InsertType<'point_task_queue'> = {
      id: generateUUID(),
      status: 'pending', // 初期ステータスは pending
      ...taskData,
    };

    try {
      return await this.create(newTaskData);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'PointTaskQueueRepository.createPointTask',
          message: error.message,
          error: error,
          severity: 'high',
          details: { taskData }
        });
      }
      throw error;
    }
  }

  /**
   * テナント・組織・顧客IDでポイントタスクを検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客ID
   * @param options - リスト取得オプション
   * @returns ポイントタスクの配列と合計件数
   */
  async findByTenantOrgCustomer(
    tenantId: string,
    orgId: string,
    customerUid: string,
    options?: ListOptions<'point_task_queue'>
  ): Promise<{ data: RowType<'point_task_queue'>[]; count: number | null }> {
    console.log(`[PointTaskQueueRepository] findByTenantOrgCustomer: tenantId=${tenantId}, orgId=${orgId}, customerUid=${customerUid}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      customer_uid: customerUid 
    } as Partial<RowType<'point_task_queue'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 実行予定時刻でフィルタリングしてタスクを取得します。
   * バッチ処理で使用されます。
   * @param beforeUnix - この時刻以前のタスクを取得 (Unix timestamp)
   * @param status - タスクステータスでフィルタ (デフォルト: 'pending')
   * @param options - リスト取得オプション
   * @returns 実行対象のタスク配列と合計件数
   */
  async findTasksToExecute(
    beforeUnix: number,
    status: string = 'pending',
    options?: ListOptions<'point_task_queue'>
  ): Promise<{ data: RowType<'point_task_queue'>[]; count: number | null }> {
    console.log(`[PointTaskQueueRepository] findTasksToExecute: beforeUnix=${beforeUnix}, status=${status}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      status: status 
    } as Partial<RowType<'point_task_queue'>>;
    
    const rangeFilter = {
      column: 'scheduled_for_unix' as keyof RowType<'point_task_queue'>,
      to: beforeUnix,
    };
    
    return this.list({ ...options, filters, rangeFilter });
  }

  /**
   * 予約IDでポイントタスクを検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID 
   * @param reservationId - 予約ID
   * @param options - 取得オプション
   * @returns ポイントタスク情報、または null
   */
  async findByReservation(
    tenantId: string,
    orgId: string,
    reservationId: string,
    options?: BaseRepositoryOptions<'point_task_queue'>
  ): Promise<RowType<'point_task_queue'> | null> {
    console.log(`[PointTaskQueueRepository] findByReservation: tenantId=${tenantId}, orgId=${orgId}, reservationId=${reservationId}`);
    
    return this.findOne({ 
      tenant_id: tenantId,
      org_id: orgId,
      reservation_id: reservationId 
    } as Partial<RowType<'point_task_queue'>>, options);
  }

  /**
   * タスクステータスを更新します。
   * @param taskId - タスクID
   * @param status - 新しいステータス ('pending' | 'processing' | 'completed' | 'failed')
   * @param options - 更新オプション
   * @returns 更新されたタスク情報
   */
  async updateTaskStatus(
    taskId: string,
    status: string,
    options?: BaseRepositoryOptions<'point_task_queue'>
  ): Promise<RowType<'point_task_queue'>> {
    console.log(`[PointTaskQueueRepository] updateTaskStatus: taskId=${taskId}, status=${status}`);
    
    const updateData: UpdateType<'point_task_queue'> = {
      status: status,
    };

    try {
      return await this.update(taskId, updateData, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'PointTaskQueueRepository.updateTaskStatus',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { taskId, status }
        });
      }
      throw error;
    }
  }

  /**
   * 失敗したタスクを再スケジュールします。
   * @param taskId - タスクID
   * @param newScheduledTime - 新しい実行予定時刻 (Unix timestamp)
   * @param options - 更新オプション
   * @returns 更新されたタスク情報
   */
  async rescheduleTask(
    taskId: string,
    newScheduledTime: number,
    options?: BaseRepositoryOptions<'point_task_queue'>
  ): Promise<RowType<'point_task_queue'>> {
    console.log(`[PointTaskQueueRepository] rescheduleTask: taskId=${taskId}, newScheduledTime=${newScheduledTime}`);
    
    const updateData: UpdateType<'point_task_queue'> = {
      scheduled_for_unix: newScheduledTime,
      status: 'pending', // ステータスを pending に戻す
    };

    try {
      return await this.update(taskId, updateData, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'PointTaskQueueRepository.rescheduleTask',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { taskId, newScheduledTime }
        });
      }
      throw error;
    }
  }

  /**
   * 複数のタスクのステータスを一括更新します。
   * @param taskIds - タスクIDの配列
   * @param status - 新しいステータス
   * @returns 更新されたタスクの配列
   */
  async bulkUpdateTaskStatus(
    taskIds: string[],
    status: string
  ): Promise<RowType<'point_task_queue'>[]> {
    console.log(`[PointTaskQueueRepository] bulkUpdateTaskStatus: ${taskIds.length} tasks, status=${status}`);
    
    const updateData = taskIds.map(taskId => ({
      id: taskId,
      status: status,
      updated_at: new Date().toISOString(),
    }));

    try {
      return await this.bulkUpsert(updateData as InsertType<'point_task_queue'>[], 'id');
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'PointTaskQueueRepository.bulkUpdateTaskStatus',
          message: error.message,
          error: error,
          severity: 'high',
          details: { taskIds, status }
        });
      }
      throw error;
    }
  }
}