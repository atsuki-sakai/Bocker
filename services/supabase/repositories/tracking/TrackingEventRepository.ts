import { BaseRepository, BaseRepositoryOptions, ListOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';

/**
 * トラッキングイベントログ (tracking_event) テーブル操作リポジトリ
 * 
 * ユーザーの行動ログの管理を行います。
 * - ページビュー・クリック・コンバージョンイベントの記録
 * - UTMパラメータの追跡
 * - カスタムイベントデータの記録
 * - セッション単位での行動分析
 */
export class TrackingEventRepository extends BaseRepository<'tracking_event'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('tracking_event', instance);
  }

  /**
   * 新しいトラッキングイベントを記録します。
   * @param eventData - イベントデータ
   * @returns 作成されたイベント情報
   */
  async createEvent(
    eventData: Pick<InsertType<'tracking_event'>, 'tenant_id' | 'org_id' | 'session_id' | 'event_timestamp_unix' | 'event_type' | 'event_source' | 'page_url' | 'page_title' | 'target_element' | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content' | 'custom_data_json'>
  ): Promise<RowType<'tracking_event'>> {
    console.log(`[TrackingEventRepository] createEvent: data=${JSON.stringify(eventData)}`);
    
    const newEventData: InsertType<'tracking_event'> = {
      id: crypto.randomUUID(),
      ...eventData,
    };

    try {
      return await this.create(newEventData);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'TrackingEventRepository.createEvent',
          message: error.message,
          error: error,
          severity: 'high',
          details: { eventData }
        });
      }
      throw error;
    }
  }

  /**
   * ページビューイベントを記録します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param sessionId - セッションID
   * @param pageUrl - ページURL
   * @param pageTitle - ページタイトル
   * @param utmParams - UTMパラメータ
   * @param customData - カスタムデータ
   * @returns 作成されたイベント情報
   */
  async recordPageView(
    tenantId: string,
    orgId: string,
    sessionId: string,
    pageUrl: string,
    pageTitle?: string,
    utmParams?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
    },
    customData?: any
  ): Promise<RowType<'tracking_event'>> {
    console.log(`[TrackingEventRepository] recordPageView: pageUrl=${pageUrl}, sessionId=${sessionId}`);
    
    return this.createEvent({
      tenant_id: tenantId,
      org_id: orgId,
      session_id: sessionId,
      event_timestamp_unix: Math.floor(Date.now() / 1000),
      event_type: 'page_view',
      event_source: 'web',
      page_url: pageUrl,
      page_title: pageTitle || null,
      target_element: null,
      utm_source: utmParams?.utm_source || null,
      utm_medium: utmParams?.utm_medium || null,
      utm_campaign: utmParams?.utm_campaign || null,
      utm_term: utmParams?.utm_term || null,
      utm_content: utmParams?.utm_content || null,
      custom_data_json: customData || null,
    });
  }

  /**
   * クリックイベントを記録します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param sessionId - セッションID
   * @param targetElement - クリック対象要素
   * @param pageUrl - ページURL
   * @param customData - カスタムデータ
   * @returns 作成されたイベント情報
   */
  async recordClick(
    tenantId: string,
    orgId: string,
    sessionId: string,
    targetElement: string,
    pageUrl: string,
    customData?: any
  ): Promise<RowType<'tracking_event'>> {
    console.log(`[TrackingEventRepository] recordClick: targetElement=${targetElement}, sessionId=${sessionId}`);
    
    return this.createEvent({
      tenant_id: tenantId,
      org_id: orgId,
      session_id: sessionId,
      event_timestamp_unix: Math.floor(Date.now() / 1000),
      event_type: 'click',
      event_source: 'web',
      page_url: pageUrl,
      page_title: null,
      target_element: targetElement,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      custom_data_json: customData || null,
    });
  }

  /**
   * コンバージョンイベントを記録します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param sessionId - セッションID
   * @param conversionType - コンバージョンタイプ (reservation, purchase, signup など)
   * @param pageUrl - ページURL
   * @param customData - カスタムデータ (価格、商品情報など)
   * @returns 作成されたイベント情報
   */
  async recordConversion(
    tenantId: string,
    orgId: string,
    sessionId: string,
    conversionType: string,
    pageUrl: string,
    customData?: any
  ): Promise<RowType<'tracking_event'>> {
    console.log(`[TrackingEventRepository] recordConversion: conversionType=${conversionType}, sessionId=${sessionId}`);
    
    return this.createEvent({
      tenant_id: tenantId,
      org_id: orgId,
      session_id: sessionId,
      event_timestamp_unix: Math.floor(Date.now() / 1000),
      event_type: 'conversion',
      event_source: 'web',
      page_url: pageUrl,
      page_title: null,
      target_element: conversionType,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      custom_data_json: customData || null,
    });
  }

  /**
   * セッション別のイベントを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param sessionId - セッションID
   * @param options - リスト取得オプション
   * @returns イベントの配列と合計件数
   */
  async findBySession(
    tenantId: string,
    orgId: string,
    sessionId: string,
    options?: ListOptions<'tracking_event'>
  ): Promise<{ data: RowType<'tracking_event'>[]; count: number | null }> {
    console.log(`[TrackingEventRepository] findBySession: tenantId=${tenantId}, orgId=${orgId}, sessionId=${sessionId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      session_id: sessionId 
    } as Partial<RowType<'tracking_event'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * イベントタイプ別にイベントを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param eventType - イベントタイプ
   * @param options - リスト取得オプション
   * @returns イベントの配列と合計件数
   */
  async findByEventType(
    tenantId: string,
    orgId: string,
    eventType: string,
    options?: ListOptions<'tracking_event'>
  ): Promise<{ data: RowType<'tracking_event'>[]; count: number | null }> {
    console.log(`[TrackingEventRepository] findByEventType: tenantId=${tenantId}, orgId=${orgId}, eventType=${eventType}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      event_type: eventType 
    } as Partial<RowType<'tracking_event'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 期間を指定してイベントを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param fromUnix - 開始時刻 (Unix timestamp)
   * @param toUnix - 終了時刻 (Unix timestamp)
   * @param options - リスト取得オプション
   * @returns イベントの配列と合計件数
   */
  async findByDateRange(
    tenantId: string,
    orgId: string,
    fromUnix: number,
    toUnix: number,
    options?: ListOptions<'tracking_event'>
  ): Promise<{ data: RowType<'tracking_event'>[]; count: number | null }> {
    console.log(`[TrackingEventRepository] findByDateRange: tenantId=${tenantId}, orgId=${orgId}, from=${fromUnix}, to=${toUnix}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
    } as Partial<RowType<'tracking_event'>>;
    
    const rangeFilter = {
      column: 'event_timestamp_unix' as keyof RowType<'tracking_event'>,
      from: fromUnix,
      to: toUnix,
    };
    
    return this.list({ ...options, filters, rangeFilter });
  }

  /**
   * UTMソースでイベントを取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param utmSource - UTMソース
   * @param options - リスト取得オプション
   * @returns イベントの配列と合計件数
   */
  async findByUtmSource(
    tenantId: string,
    orgId: string,
    utmSource: string,
    options?: ListOptions<'tracking_event'>
  ): Promise<{ data: RowType<'tracking_event'>[]; count: number | null }> {
    console.log(`[TrackingEventRepository] findByUtmSource: tenantId=${tenantId}, orgId=${orgId}, utmSource=${utmSource}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      utm_source: utmSource 
    } as Partial<RowType<'tracking_event'>>;
    
    return this.list({ ...options, filters });
  }
}