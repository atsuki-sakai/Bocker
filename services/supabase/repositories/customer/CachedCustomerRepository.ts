import { CustomerRepository } from './CustomerRepository';
import { BaseRepositoryOptions } from '../BaseRepository';
import { RowType } from '@/services/supabase/SupabaseService';
import { MemoryCache, createCacheKey } from '@/services/supabase/utils/cache';
import { withPerformanceMeasure } from '@/services/supabase/utils/performance';
import { supabaseClientService } from '@/services/supabase/SupabaseService';

/**
 * キャッシュ機能を持つCustomerRepository
 * 頻繁にアクセスされる顧客データをメモリにキャッシュして高速化します
 */
export class CachedCustomerRepository extends CustomerRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: MemoryCache<any>;
  
  constructor(
    protected supabaseServiceInstance: typeof supabaseClientService = supabaseClientService,
    cacheOptions?: {
      ttl?: number;
      maxSize?: number;
      enableLogging?: boolean;
    }
  ) {
    super(supabaseServiceInstance);
    
    // キャッシュインスタンスを作成
    this.cache = new MemoryCache({
      ttl: cacheOptions?.ttl ?? 5 * 60 * 1000,    // デフォルト5分
      maxSize: cacheOptions?.maxSize ?? 500,      // デフォルト500エントリ
      enableLogging: cacheOptions?.enableLogging ?? false
    });
  }

  /**
   * UIDで顧客を検索（キャッシュ対応）
   */
  async findByUid(
    uid: string,
    options?: BaseRepositoryOptions<'customer'>
  ): Promise<RowType<'customer'> | null> {
    const cacheKey = createCacheKey('customer:uid', { uid, options });
    
    // キャッシュから取得を試みる
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // キャッシュミスの場合、親クラスのメソッドを呼び出し
    const result = await super.findByUid(uid, options);
    
    // 結果をキャッシュ（nullでもキャッシュして、存在しないことを記憶）
    if (result !== null) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }

  /**
   * メールアドレスで顧客を検索（キャッシュ対応）
   */
  async findByEmail(
    email: string,
    options?: BaseRepositoryOptions<'customer'>
  ): Promise<RowType<'customer'> | null> {
    const cacheKey = createCacheKey('customer:email', { email, options });
    
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const result = await super.findByEmail(email, options);
    
    if (result !== null) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }

  /**
   * テナント・組織・メールで顧客を検索（キャッシュ対応）
   */
  async findByTenantAndOrgAndCustomerEmail(
    tenantId: string,
    orgId: string,
    customerEmail: string,
    options?: BaseRepositoryOptions<'customer'>
  ): Promise<RowType<'customer'> | null> {
    const cacheKey = createCacheKey('customer:tenant:org:email', {
      tenantId,
      orgId,
      customerEmail,
      options
    });
    
    return await this.cache.wrap(
      cacheKey,
      () => super.findByTenantAndOrgAndCustomerEmail(tenantId, orgId, customerEmail, options)
    );
  }

  /**
   * 完全な顧客データを取得（キャッシュ対応）
   */
  async getCompleteCustomerData(
    customerUid: string,
    tenantId: string,
    orgId: string
  ): Promise<{
    customer: RowType<'customer'> | null;
    customerDetail: RowType<'customer_detail'> | null;
    customerPoints: RowType<'customer_points'> | null;
  }> {
    const cacheKey = createCacheKey('customer:complete', {
      customerUid,
      tenantId,
      orgId
    });
    
    // パフォーマンス計測付きでキャッシュラップ
    return await withPerformanceMeasure(
      'CachedCustomerRepository.getCompleteCustomerData',
      async () => {
        const cached = this.cache.get(cacheKey);
        if (cached !== null) {
          return cached;
        }
        
        const result = await super.getCompleteCustomerData(customerUid, tenantId, orgId);
        
        // 顧客が存在する場合のみキャッシュ
        if (result.customer !== null) {
          this.cache.set(cacheKey, result);
        }
        
        return result;
      },
      { customerUid, tenantId, orgId }
    );
  }

  /**
   * 顧客情報を更新（キャッシュをクリア）
   */
  async update(
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData: any,
    options?: BaseRepositoryOptions<'customer'>
  ): Promise<RowType<'customer'>> {
    // 更新前に関連するキャッシュをクリア
    this.invalidateCustomerCache(id);
    
    return await super.update(id, updateData, options);
  }

  /**
   * 顧客情報を更新（RPC版、キャッシュをクリア）
   */
  async updateCustomer(
    customerUid: string,
    tenantId: string,
    orgId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData: any
  ): Promise<RowType<'customer'>> {
    // 更新前に関連するキャッシュをクリア
    this.invalidateCustomerCache(customerUid);
    
    return await super.updateCustomer(customerUid, tenantId, orgId, updateData);
  }

  /**
   * 顧客に関連するキャッシュを無効化
   */
  private invalidateCustomerCache(customerUid: string): void {
    // UIDに関連するキャッシュを削除
    this.cache.deletePattern(new RegExp(`customer:.*${customerUid}.*`));
  }

  /**
   * キャッシュ統計情報を取得
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }
}