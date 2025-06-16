import { BaseRepository } from '../BaseRepository';
import { Database } from '@/supabase.types';

export type Tables = Database['public']['Tables'];
export type ReservationInsert = Tables['reservation']['Insert'];
export type ReservationDetailInsert = Tables['reservation_detail']['Insert'];

export class MigrationRepository extends BaseRepository<any> {
  private client: any;

  constructor(supabaseClient: any) {
    super('carte' as any); // ダミーのテーブル名を渡す
    this.client = supabaseClient;
  }

  /**
   * 予約データをバルクアップサート
   */
  async bulkUpsertReservations(
    reservations: ReservationInsert[],
    options: {
      chunkSize?: number;
    } = {}
  ) {
    const chunkSize = options.chunkSize || 500;
    const chunks = this.chunkArray(reservations, chunkSize);
    const results = [];
    
    for (const chunk of chunks) {
      try {
        const { data, error } = await this.client
          .from('reservation')
          .upsert(chunk, { 
            onConflict: '_convex_id',
            returning: 'minimal' 
          });
          
        if (error) throw error;
        results.push({ success: true, count: chunk.length });
      } catch (error) {
        console.error('Failed to upsert reservation chunk:', error);
        results.push({ success: false, error });
      }
    }
    
    return results;
  }
  
  /**
   * 予約詳細データをバルクアップサート
   */
  async bulkUpsertReservationDetails(
    details: ReservationDetailInsert[],
    options: {
      chunkSize?: number;
    } = {}
  ) {
    const chunkSize = options.chunkSize || 500;
    const chunks = this.chunkArray(details, chunkSize);
    const results = [];
    
    for (const chunk of chunks) {
      try {
        const { data, error } = await this.client
          .from('reservation_detail')
          .upsert(chunk, { 
            onConflict: '_convex_id',
            returning: 'minimal' 
          });
          
        if (error) throw error;
        results.push({ success: true, count: chunk.length });
      } catch (error) {
        console.error('Failed to upsert reservation detail chunk:', error);
        results.push({ success: false, error });
      }
    }
    
    return results;
  }
  
  /**
   * 配列をチャンクに分割
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * 移行済みのConvex IDをチェック
   */
  async checkMigratedReservations(convexIds: string[]): Promise<Set<string>> {
    const migratedIds = new Set<string>();
    
    // 100件ずつ分割して問い合わせ
    const chunks = this.chunkArray(convexIds, 100);
    
    for (const chunk of chunks) {
      const { data, error } = await this.client
        .from('reservation')
        .select('_convex_id')
        .in('_convex_id', chunk);
        
      if (error) {
        console.error('Failed to check migrated reservations:', error);
        continue;
      }
      
      if (data) {
        data.forEach((row: any) => {
          if (row._convex_id) {
            migratedIds.add(row._convex_id);
          }
        });
      }
    }
    
    return migratedIds;
  }
}