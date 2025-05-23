import { BaseRepository, BaseRepositoryOptions, ListOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '../../SupabaseService';
import { supabaseClientService  } from '../../SupabaseService';

/**
 * 顧客ポイント (CustomerPoints) テーブル操作リポジトリ
 */
export class CustomerPointsRepository extends BaseRepository<'customer_points'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('customer_points', instance);
  }

  /**
   * 顧客ID (customer_id) で顧客ポイント情報を検索します。
   * 通常、顧客ごとにポイントレコードは1つです。
   * @param customerId - 検索する顧客ID
   * @param options - 取得オプション
   * @returns 顧客ポイント情報、または null
   */
  async findBySalonAndCustomerUid(salonId: string, customerUid: string, options?: BaseRepositoryOptions<'customer_points'>): Promise<RowType<'customer_points'> | null> {
    console.log(`[CustomerPointsRepository] findBySalonAndCustomerUid: salonId=${salonId}, customerUid=${customerUid}, options=${JSON.stringify(options)}`);
    return this.findOne({ salon_id: salonId, customer_uid: customerUid } as Partial<RowType<'customer_points'>>, options);
  }

  /**
   * 顧客のポイントを初期化または作成します。
   * 既に存在する場合は取得し、存在しない場合は新しいポイントレコードを作成します。
   * @param customerId - 顧客ID
   * @param salonId - サロンID
   * @param initialPoints - 初期ポイント数 (デフォルト0)
   * @returns 顧客ポイント情報
   */
  async initializePointsForCustomer(
    customerId: string, 
    salonId: string, 
    initialPoints: number = 0
  ): Promise<RowType<'customer_points'>> {
    console.log(`[CustomerPointsRepository] initializePointsForCustomer: customerId=${customerId}, salonId=${salonId}, initialPoints=${initialPoints}`);
    let pointsRecord = await this.findBySalonAndCustomerUid(salonId, customerId);
    if (!pointsRecord) {
      const newPointsData: InsertType<'customer_points'> = {
        uid: crypto.randomUUID(),
        customer_uid: customerId,
        salon_id: salonId,
        total_points: initialPoints,
        last_transaction_date_unix: Math.floor(Date.now() / 1000),
        // _creation_time, updated_time, is_archive は BaseRepository.create で自動設定
      };
      pointsRecord = await this.create(newPointsData);
    }
    return pointsRecord;
  }

  /**
   * 特定の顧客のポイントを増減させます。
   * !! 重要 !!: この操作は現在のポイントを読み取り、更新するため、競合状態が発生しやすいです。
   * データベースレベルでのアトミックな更新 (例: `UPDATE customer_points SET total_points = total_points + ? WHERE ...`)
   * を行うためには、SupabaseのRPC (データベース関数) の利用が強く推奨されます。
   * このメソッドはデモンストレーション用であり、本番環境ではRPCを使用してください。
   *
   * @param customerUid - 顧客UID
   * @param pointsToAdd - 加算するポイント数 (減算する場合は負の値を指定)
   * @returns 更新後の顧客ポイント情報。レコードが存在しない場合はnull。
   * @throws Error レコードが見つからない場合や更新に失敗した場合 (RPC未使用時のリスクあり)
   */
  async addPoints(
    salonId: string,
    customerUid: string,
    pointsToAdd: number,
    options?: BaseRepositoryOptions<'customer_points'>
  ): Promise<RowType<'customer_points'> | null> {
    console.warn(`[CustomerPointsRepository] addPoints called for customerUid=${customerUid}, pointsToAdd=${pointsToAdd}. This method is NOT ATOMIC and prone to race conditions. Use an RPC for production.`);
    const currentPoints = await this.findBySalonAndCustomerUid(salonId, customerUid);
    if (!currentPoints || typeof currentPoints.total_points !== 'number') {
      console.error(`[CustomerPointsRepository] addPoints: Points record not found or total_points is invalid for customerUid=${customerUid}`);
      throw new Error('Points record not found or invalid.'); 
    }

    const newTotalPoints = (currentPoints.total_points || 0) + pointsToAdd;
    const updateData: Partial<UpdateType<'customer_points'>> = { // updated_timeは自動なのでPartialに
      total_points: newTotalPoints,
      last_transaction_date_unix: Math.floor(Date.now() / 1000),
      // updated_time は BaseRepository.update で自動設定
    };
    
    return this.update(currentPoints.uid, updateData as UpdateType<'customer_points'>, options);
  }
} 