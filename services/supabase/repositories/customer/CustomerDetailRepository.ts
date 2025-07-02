import { BaseRepository, BaseRepositoryOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { generateUUID } from '@/services/supabase/utils/uuid';

/**
 * 顧客詳細 (CustomerDetail) テーブル操作リポジトリ
 */
export class CustomerDetailRepository extends BaseRepository<'customer_detail'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('customer_detail', instance);
  }

  async findByCustomerUid(customerUid: string, options?: BaseRepositoryOptions<'customer_detail'>): Promise<RowType<'customer_detail'> | null> {
    console.log(`[CustomerDetailRepository] findByCustomerUid: customerUid=${customerUid}, options=${JSON.stringify(options)}`);
    return this.findOne({ customer_uid: customerUid } as Partial<RowType<'customer_detail'>>, options);
  }

  async upsertByCustomerUid(detailData: InsertType<'customer_detail'>, options?: BaseRepositoryOptions<'customer_detail'>): Promise<RowType<'customer_detail'>> {
    console.log(`[CustomerDetailRepository] upsertByCustomerUid: data=${JSON.stringify(detailData)}`);
    if (!detailData.customer_uid) {
      throw new Error('[CustomerDetailRepository] customer_uid is required for upsertByCustomerUid.');
    }
    
    const existingDetail = await this.findByCustomerUid(detailData.customer_uid, {select: ['uid']});
    if (existingDetail && existingDetail.uid) {
        // 既存レコードがあれば更新 (共通フィールドは BaseRepository.update で自動設定)
        return this.update(existingDetail.uid, detailData as UpdateType<'customer_detail'>, options);
    } else {
        // なければ新規作成 (共通フィールドは BaseRepository.create で自動設定)
        const dataToCreate = { ...detailData };
        if (!dataToCreate.uid) {
             dataToCreate.uid = generateUUID(); // uid がなければクライアント側で生成
        }
        // created_at, updated_at, is_archive は BaseRepository.create で自動設定されるため、ここでは何もしない
        return this.create(dataToCreate as InsertType<'customer_detail'>, options);
    }
  }
} 