import { BaseRepository, ListOptions } from '../BaseRepository';
import type { RowType, InsertType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';

/**
 * トラッキング集計サマリー (tracking_summaries) テーブル操作リポジトリ
 * 
 * 事前集計されたトラッキングデータの管理を行います。
 * - 日次・月次のアクセス統計
 * - ディメンション別（ページ、キャンペーン、デバイス等）の集計
 * - 高速なダッシュボード表示のための前処理済みデータ
 */
export class TrackingSummariesRepository extends BaseRepository<'tracking_summaries'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('tracking_summaries', instance);
  }

  /**
   * 新しい集計サマリーを作成します。
   * @param summaryData - 集計データ
   * @returns 作成された集計情報
   */
  async createSummary(
    summaryData: Pick<InsertType<'tracking_summaries'>, 'tenant_id' | 'org_id' | 'summary_date' | 'dimension_type' | 'dimension_value' | 'total_count' | 'unique_user_count' | 'conversion_count'>
  ): Promise<RowType<'tracking_summaries'>> {
    console.log(`[TrackingSummariesRepository] createSummary: data=${JSON.stringify(summaryData)}`);
    
    const newSummaryData: InsertType<'tracking_summaries'> = {
      id: crypto.randomUUID(),
      ...summaryData,
    };

    try {
      return await this.create(newSummaryData);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'TrackingSummariesRepository.createSummary',
          message: error.message,
          error: error,
          severity: 'high',
          details: { summaryData }
        });
      }
      throw error;
    }
  }

  /**
   * 日次ページビューサマリーを作成または更新します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param date - 集計日 (YYYY-MM-DD)
   * @param pageUrl - ページURL
   * @param totalCount - 総アクセス数
   * @param uniqueUserCount - ユニークユーザー数
   * @param conversionCount - コンバージョン数
   * @returns 作成または更新されたサマリー情報
   */
  async upsertPageViewSummary(
    tenantId: string,
    orgId: string,
    date: string,
    pageUrl: string,
    totalCount: number,
    uniqueUserCount: number,
    conversionCount: number = 0
  ): Promise<RowType<'tracking_summaries'>> {
    console.log(`[TrackingSummariesRepository] upsertPageViewSummary: date=${date}, pageUrl=${pageUrl}, totalCount=${totalCount}`);
    
    return this.createSummary({
      tenant_id: tenantId,
      org_id: orgId,
      summary_date: date,
      dimension_type: 'page_url',
      dimension_value: pageUrl,
      total_count: totalCount,
      unique_user_count: uniqueUserCount,
      conversion_count: conversionCount,
    });
  }

  /**
   * 日次UTMキャンペーンサマリーを作成または更新します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param date - 集計日 (YYYY-MM-DD)
   * @param campaign - キャンペーン名
   * @param totalCount - 総セッション数
   * @param uniqueUserCount - ユニークユーザー数
   * @param conversionCount - コンバージョン数
   * @returns 作成または更新されたサマリー情報
   */
  async upsertCampaignSummary(
    tenantId: string,
    orgId: string,
    date: string,
    campaign: string,
    totalCount: number,
    uniqueUserCount: number,
    conversionCount: number = 0
  ): Promise<RowType<'tracking_summaries'>> {
    console.log(`[TrackingSummariesRepository] upsertCampaignSummary: date=${date}, campaign=${campaign}, totalCount=${totalCount}`);
    
    return this.createSummary({
      tenant_id: tenantId,
      org_id: orgId,
      summary_date: date,
      dimension_type: 'utm_campaign',
      dimension_value: campaign,
      total_count: totalCount,
      unique_user_count: uniqueUserCount,
      conversion_count: conversionCount,
    });
  }

  /**
   * 期間とディメンションタイプでサマリーを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param dimensionType - ディメンションタイプ
   * @param fromDate - 開始日 (YYYY-MM-DD)
   * @param toDate - 終了日 (YYYY-MM-DD)
   * @param options - リスト取得オプション
   * @returns サマリーの配列と合計件数
   */
  async findByDimensionAndDateRange(
    tenantId: string,
    orgId: string,
    dimensionType: string,
    fromDate: string,
    toDate: string,
    options?: ListOptions<'tracking_summaries'>
  ): Promise<{ data: RowType<'tracking_summaries'>[]; count: number | null }> {
    console.log(`[TrackingSummariesRepository] findByDimensionAndDateRange: dimensionType=${dimensionType}, from=${fromDate}, to=${toDate}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      dimension_type: dimensionType 
    } as Partial<RowType<'tracking_summaries'>>;
    
    const rangeFilter = {
      column: 'summary_date' as keyof RowType<'tracking_summaries'>,
      from: fromDate,
      to: toDate,
    };
    
    return this.list({ ...options, filters, rangeFilter });
  }

  /**
   * 特定の日付のサマリーを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param date - 集計日 (YYYY-MM-DD)
   * @param options - リスト取得オプション
   * @returns サマリーの配列と合計件数
   */
  async findByDate(
    tenantId: string,
    orgId: string,
    date: string,
    options?: ListOptions<'tracking_summaries'>
  ): Promise<{ data: RowType<'tracking_summaries'>[]; count: number | null }> {
    console.log(`[TrackingSummariesRepository] findByDate: tenantId=${tenantId}, orgId=${orgId}, date=${date}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      summary_date: date 
    } as Partial<RowType<'tracking_summaries'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * ディメンション値でサマリーを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param dimensionType - ディメンションタイプ
   * @param dimensionValue - ディメンション値
   * @param options - リスト取得オプション
   * @returns サマリーの配列と合計件数
   */
  async findByDimensionValue(
    tenantId: string,
    orgId: string,
    dimensionType: string,
    dimensionValue: string,
    options?: ListOptions<'tracking_summaries'>
  ): Promise<{ data: RowType<'tracking_summaries'>[]; count: number | null }> {
    console.log(`[TrackingSummariesRepository] findByDimensionValue: dimensionType=${dimensionType}, dimensionValue=${dimensionValue}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      dimension_type: dimensionType,
      dimension_value: dimensionValue 
    } as Partial<RowType<'tracking_summaries'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 期間内のトップページを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param fromDate - 開始日 (YYYY-MM-DD)
   * @param toDate - 終了日 (YYYY-MM-DD)
   * @param limit - 取得件数制限
   * @returns トップページの統計情報
   */
  async getTopPages(
    tenantId: string,
    orgId: string,
    fromDate: string,
    toDate: string,
    limit: number = 10
  ): Promise<Array<{
    page_url: string;
    total_views: number;
    unique_users: number;
    conversions: number;
    conversion_rate: number;
  }>> {
    console.log(`[TrackingSummariesRepository] getTopPages: from=${fromDate}, to=${toDate}, limit=${limit}`);
    
    const { data: summaries } = await this.findByDimensionAndDateRange(
      tenantId, 
      orgId, 
      'page_url', 
      fromDate, 
      toDate,
      { pageSize: 1000 } // 大きめの値で全データを取得
    );
    
    // ページ別に集計
    const pageStats = new Map<string, { total_views: number; unique_users: number; conversions: number }>();
    
    summaries.forEach(summary => {
      const pageUrl = summary.dimension_value;
      
      if (!pageStats.has(pageUrl)) {
        pageStats.set(pageUrl, { total_views: 0, unique_users: 0, conversions: 0 });
      }
      
      const stats = pageStats.get(pageUrl)!;
      stats.total_views += summary.total_count;
      stats.unique_users += summary.unique_user_count || 0;
      stats.conversions += summary.conversion_count || 0;
    });
    
    // ソートして上位を取得
    return Array.from(pageStats.entries())
      .map(([page_url, stats]) => ({
        page_url,
        ...stats,
        conversion_rate: stats.total_views > 0 ? (stats.conversions / stats.total_views) * 100 : 0,
      }))
      .sort((a, b) => b.total_views - a.total_views)
      .slice(0, limit);
  }

  /**
   * 期間内のトップキャンペーンを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param fromDate - 開始日 (YYYY-MM-DD)
   * @param toDate - 終了日 (YYYY-MM-DD)
   * @param limit - 取得件数制限
   * @returns トップキャンペーンの統計情報
   */
  async getTopCampaigns(
    tenantId: string,
    orgId: string,
    fromDate: string,
    toDate: string,
    limit: number = 10
  ): Promise<Array<{
    campaign: string;
    total_sessions: number;
    unique_users: number;
    conversions: number;
    conversion_rate: number;
  }>> {
    console.log(`[TrackingSummariesRepository] getTopCampaigns: from=${fromDate}, to=${toDate}, limit=${limit}`);
    
    const { data: summaries } = await this.findByDimensionAndDateRange(
      tenantId, 
      orgId, 
      'utm_campaign', 
      fromDate, 
      toDate,
      { pageSize: 1000 }
    );
    
    // キャンペーン別に集計
    const campaignStats = new Map<string, { total_sessions: number; unique_users: number; conversions: number }>();
    
    summaries.forEach(summary => {
      const campaign = summary.dimension_value;
      
      if (!campaignStats.has(campaign)) {
        campaignStats.set(campaign, { total_sessions: 0, unique_users: 0, conversions: 0 });
      }
      
      const stats = campaignStats.get(campaign)!;
      stats.total_sessions += summary.total_count;
      stats.unique_users += summary.unique_user_count || 0;
      stats.conversions += summary.conversion_count || 0;
    });
    
    // ソートして上位を取得
    return Array.from(campaignStats.entries())
      .map(([campaign, stats]) => ({
        campaign,
        ...stats,
        conversion_rate: stats.total_sessions > 0 ? (stats.conversions / stats.total_sessions) * 100 : 0,
      }))
      .sort((a, b) => b.total_sessions - a.total_sessions)
      .slice(0, limit);
  }

  /**
   * 期間内の日別統計を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param fromDate - 開始日 (YYYY-MM-DD)
   * @param toDate - 終了日 (YYYY-MM-DD)
   * @returns 日別統計情報
   */
  async getDailyStats(
    tenantId: string,
    orgId: string,
    fromDate: string,
    toDate: string
  ): Promise<Array<{
    date: string;
    total_views: number;
    unique_users: number;
    conversions: number;
    conversion_rate: number;
  }>> {
    console.log(`[TrackingSummariesRepository] getDailyStats: from=${fromDate}, to=${toDate}`);
    
    const { data: summaries } = await this.findByDimensionAndDateRange(
      tenantId, 
      orgId, 
      'page_url', 
      fromDate, 
      toDate,
      { pageSize: 10000 }
    );
    
    // 日別に集計
    const dailyStats = new Map<string, { total_views: number; unique_users: number; conversions: number }>();
    
    summaries.forEach(summary => {
      const date = summary.summary_date;
      
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { total_views: 0, unique_users: 0, conversions: 0 });
      }
      
      const stats = dailyStats.get(date)!;
      stats.total_views += summary.total_count;
      stats.unique_users += summary.unique_user_count || 0;
      stats.conversions += summary.conversion_count || 0;
    });
    
    // 日付順でソート
    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        ...stats,
        conversion_rate: stats.total_views > 0 ? (stats.conversions / stats.total_views) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 複数のサマリーを一括作成または更新します。
   * @param summaries - サマリーデータの配列
   * @returns 作成または更新されたサマリーの配列
   */
  async bulkUpsertSummaries(
    summaries: Array<Pick<InsertType<'tracking_summaries'>, 'tenant_id' | 'org_id' | 'summary_date' | 'dimension_type' | 'dimension_value' | 'total_count' | 'unique_user_count' | 'conversion_count'>>
  ): Promise<RowType<'tracking_summaries'>[]> {
    console.log(`[TrackingSummariesRepository] bulkUpsertSummaries: ${summaries.length} summaries`);
    
    const summaryData = summaries.map(summary => ({
      id: crypto.randomUUID(),
      ...summary,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archive: false,
      sort_key: null,
    }));

    try {
      return await this.bulkUpsert(summaryData as InsertType<'tracking_summaries'>[], 'id');
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'TrackingSummariesRepository.bulkUpsertSummaries',
          message: error.message,
          error: error,
          severity: 'high',
          details: { summaryCount: summaries.length }
        });
      }
      throw error;
    }
  }
}