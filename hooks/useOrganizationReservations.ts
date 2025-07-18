import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { ReservationRepository } from '@/services/supabase/repositories';
import type { RowType } from '@/services/supabase/SupabaseService';
import { toast } from 'sonner';
import type { ReservationMenu, ReservationOption } from '@/convex/types';

// Helper functions to parse JSONB data from Supabase
function parseReservationMenus(menus: unknown): ReservationMenu[] | undefined {
  if (!menus || !Array.isArray(menus)) return undefined;
  
  return menus.map((menu) => {
    if (typeof menu !== 'object' || menu === null) {
      throw new Error('Invalid menu format');
    }
    
    const menuObj = menu as Record<string, unknown>;
    
    // Validate required fields
    if (
      typeof menuObj.id !== 'string' ||
      typeof menuObj.name !== 'string' ||
      typeof menuObj.price !== 'number' ||
      typeof menuObj.quantity !== 'number'
    ) {
      throw new Error('Invalid menu structure');
    }
    
    return {
      id: menuObj.id as Id<'menu'>,
      name: menuObj.name,
      price: menuObj.price,
      quantity: menuObj.quantity,
    } satisfies ReservationMenu;
  });
}

function parseReservationOptions(options: unknown): ReservationOption[] | undefined {
  if (!options || !Array.isArray(options)) return undefined;
  
  return options.map((option) => {
    if (typeof option !== 'object' || option === null) {
      throw new Error('Invalid option format');
    }
    
    const optionObj = option as Record<string, unknown>;
    
    // Validate required fields
    if (
      typeof optionObj.id !== 'string' ||
      typeof optionObj.name !== 'string' ||
      typeof optionObj.price !== 'number' ||
      typeof optionObj.quantity !== 'number'
    ) {
      throw new Error('Invalid option structure');
    }
    
    return {
      id: optionObj.id as Id<'option'>,
      name: optionObj.name,
      price: optionObj.price,
      quantity: optionObj.quantity,
    } satisfies ReservationOption;
  });
}

// 予約データの統合型
export type IntegratedReservation = {
  // 共通フィールド
  id: string; // ConvexまたはSupabaseのID
  source: 'convex' | 'supabase';
  tenantId: string;
  orgId: string;
  customerUid: string;
  staffId: string | undefined;
  customerName: string;
  staffName: string | undefined;
  isFreeNomination: boolean;
  status: string;
  paymentStatus: string;
  date: string;
  startTimeUnix: number;
  endTimeUnix: number;
  createdAt: Date;
  
  // 詳細情報（どちらかに存在する場合）
  detail?: {
    menus?: ReservationMenu[];
    options?: ReservationOption[];
    totalPrice?: number;
    extraCharge?: number;
    paymentMethod?: string;
    couponId?: string;
    couponDiscount?: number;
    usePoints?: number;
    notes?: string;
  };
  
  // 元データへの参照
  convexData?: Doc<'reservation'>;
  supabaseData?: {
    reservation: RowType<'reservation'>;
    detail: RowType<'reservation_detail'> | null;
  };
};

type UseOrganizationReservationsOptions = {
  tenantId: string;
  orgId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  pageSize?: number;
};

type UseOrganizationReservationsReturn = {
  reservations: IntegratedReservation[];
  isLoading: boolean;
  loadMore: () => void;
  hasMore: boolean;
  totalCount: number;
  stats: {
    totalCount: number;
    completedCount: number;
    cancelledCount: number;
    upcomingCount: number;
    totalAmount: number;
  } | null;
};

/**
 * ConvexとSupabaseの予約データを組織レベルで統合して取得するフック
 * - Convex: リアルタイムのアクティブ予約（confirmed, pending）
 * - Supabase: 非アクティブ予約（completed, cancelled, refunded等）
 * 期間絞り込み機能付き
 */
export function useOrganizationReservations({
  tenantId,
  orgId,
  status,
  startDate,
  endDate,
  pageSize = 20,
}: UseOrganizationReservationsOptions): UseOrganizationReservationsReturn {
  const [supabaseReservations, setSupabaseReservations] = useState<IntegratedReservation[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabasePage, setSupabasePage] = useState(1);
  const [supabaseHasMore, setSupabaseHasMore] = useState(true);
  const [stats, setStats] = useState<UseOrganizationReservationsReturn['stats']>(null);

  const reservationRepo = useMemo(() => new ReservationRepository(), []);
  // Convexからリアルタイムデータを取得（全ステータスを含む）
  // データの鮮度を考慮して、最近のデータはConvexからも取得する
  const shouldFetchFromConvex = !status || status === 'confirmed' || status === 'pending' || status === 'cancelled' || status === 'completed' || status === 'all';
  
  // refundedのみSupabaseから取得（返金処理は通常Supabaseで管理）
  const skipConvexForHistoricalData = status === 'refunded';
  
  // tenantIdとorgIdが揃っていることを確認
  const canFetchConvex = shouldFetchFromConvex && !skipConvexForHistoricalData && tenantId && orgId;
  
  // 日付範囲がある場合は専用のクエリを使用
  const useDataRangeQuery = canFetchConvex && startDate && endDate;
  
  console.log('[useOrganizationReservations] Query parameters:', {
    canFetchConvex,
    startDate,
    endDate,
    useDataRangeQuery,
    tenantId,
    orgId,
    status,
    statusFilter: status === 'all' ? undefined : status
  });
  
  // 日付範囲クエリ（Convex） - paginationOptsを追加
  const {
    results: convexDateRangeResults,
    status: convexDateRangeStatus,
    loadMore: convexDateRangeLoadMore,
  } = usePaginatedQuery(
    api.reservation.query.listOrganizationAllStatus,
    useDataRangeQuery && tenantId && orgId
      ? {
          tenant_id: tenantId as Id<'tenant'>,
          org_id: orgId as Id<'organization'>,
          start_date: startDate,
          end_date: endDate,
          status_filter: status === 'all' ? undefined : (status as 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'refunded' | undefined),
          sort: 'asc',
        }
      : 'skip',
    { initialNumItems: pageSize }
  );
  
  // 通常クエリ（Convex） - paginationOptsを追加
  const {
    results: convexResults,
    status: convexStatus,
    loadMore: convexLoadMore,
  } = usePaginatedQuery(
    api.reservation.query.listOrganizationAllStatus,
    canFetchConvex && !useDataRangeQuery && tenantId && orgId
      ? {
          tenant_id: tenantId as Id<'tenant'>,
          org_id: orgId as Id<'organization'>,
          status_filter: status === 'all' ? undefined : (status as 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'refunded' | undefined),
          sort: 'asc',
        }
      : 'skip',
    { initialNumItems: pageSize }
  );
  
  // Convex予約データを統合型に変換（日付範囲クエリと通常クエリの結果をマージ）
  const convexReservations: IntegratedReservation[] = useMemo(() => {
    const results = useDataRangeQuery ? convexDateRangeResults : convexResults;
    
    console.log('[useOrganizationReservations] Convex data processing:', {
      useDataRangeQuery,
      startDate,
      endDate,
      status,
      resultsCount: results?.length || 0,
      sampleResults: results?.slice(0, 3).map(r => ({ id: r._id, date: r.date, status: r.status }))
    });
    
    if (!results) return [];
    
    const filteredResults = results
      .filter((res) => {
        // ステータスフィルター
        if (!status || status === 'all') return true;
        return res.status === status;
      });
    
    console.log('[useOrganizationReservations] After status filter:', {
      originalCount: results.length,
      filteredCount: filteredResults.length,
      status,
      sampleFiltered: filteredResults.slice(0, 3).map(r => ({ id: r._id, date: r.date, status: r.status }))
    });
    
    return filteredResults.map((res) => {
      return {
        id: res._id,
        source: 'convex' as const,
        tenantId: res.tenant_id,
        orgId: res.org_id,
        customerUid: res.customer_uid || '',
        staffId: res.staff_id,
        customerName: res.customer_name,
        staffName: res.staff_name,
        status: res.status,
        paymentStatus: res.payment_status,
        isFreeNomination: res.is_free_nomination ?? false,
        date: res.date,
        startTimeUnix: res.start_time_unix,
        endTimeUnix: res.end_time_unix,
        createdAt: new Date(res._creationTime),
        convexData: res,
      };
    });
  }, [convexResults, convexDateRangeResults, useDataRangeQuery, status, startDate, endDate]);
  
  // Convexから予約詳細を取得（現在は無効化）
  // TODO: 必要に応じて詳細情報取得ロジックを実装
  // const fetchConvexDetails = useCallback(async (_reservationIds: Id<'reservation'>[]) => {
  //   return [];
  // }, []);
  
  // 統計情報を取得する関数（ConvexとSupabaseのデータを統合して計算）
  const fetchStats = useCallback(async () => {
    if (!tenantId || !orgId) return;
    
    console.log('[useOrganizationReservations] Fetching stats with params:', { tenantId, orgId, startDate, endDate });
    
    try {
      // Supabaseから統計情報を取得（履歴データの統計）
      const supabaseStats = await reservationRepo.getOrganizationReservationStats(
        tenantId,
        orgId,
        startDate,
        endDate
      );
      console.log('[useOrganizationReservations] Supabase stats:', supabaseStats);
      setStats(supabaseStats);
    } catch (error) {
      console.error('[useOrganizationReservations] Failed to fetch stats:', error);
      // 統計情報の取得に失敗した場合は空の統計を設定
      setStats({
        totalCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        upcomingCount: 0,
        totalAmount: 0,
      });
    }
  }, [tenantId, orgId, startDate, endDate, reservationRepo]);

  // Supabaseから履歴データを取得
  const fetchSupabaseReservations = useCallback(async (page: number, reset: boolean = false) => {
    console.log('[useOrganizationReservations] fetchSupabaseReservations called:', { tenantId, orgId, status, startDate, endDate, page, reset });
    
    if (!tenantId || !orgId) {
      console.log('[useOrganizationReservations] Missing required IDs, returning early');
      return;
    }
    
    // 純粋にConvexでのみ管理するステータスの場合はSupabaseからのデータ取得をスキップ
    if (status === 'confirmed' || status === 'pending') {
      console.log('[useOrganizationReservations] Status is handled primarily by Convex, skipping Supabase data fetch');
      setSupabaseLoading(false);
      return;
    }
    
    console.log('[useOrganizationReservations] Setting supabaseLoading to true');
    setSupabaseLoading(true);
    
    try {
      // 予約データの取得
      const { data, count } = await reservationRepo.findByOrganizationWithDetails(
        tenantId,
        orgId,
        {
          page,
          pageSize,
          status: status === 'all' ? undefined : status,
          startDate,
          endDate,
        }
      );
      
      // Supabaseデータを統合型に変換
      const converted = data
        .filter((item) => {
          // ステータスフィルタリング
          // - confirmed/pending: Convexから取得するためスキップ（重複防止）
          // - all: 全て取得（ただしConvexとの重複は後で除去）
          // - その他: 指定されたステータスのみ
          if (status === 'all') {
            return true; // 全てのステータスを取得
          }
          if (status === 'confirmed' || status === 'pending') {
            return false; // これらはConvexから取得
          }
          return item.reservation.status === status;
        })
        .map((item) => ({
          id: item.reservation.uid,
          source: 'supabase' as const,
          tenantId: item.reservation.tenant_id,
          orgId: item.reservation.org_id,
          customerUid: item.reservation.customer_uid || '',
          staffId: item.reservation.staff_id,
          customerName: item.reservation.customer_name,
          staffName: item.reservation.staff_name,
          status: item.reservation.status,
          paymentStatus: item.reservation.payment_status,
          isFreeNomination: item.reservation.is_free_nomination ?? false,
          date: item.reservation.date,
          startTimeUnix: Number(item.reservation.start_time_unix),
          endTimeUnix: Number(item.reservation.end_time_unix),
          createdAt: new Date(item.reservation.created_at),
          detail: item.detail ? {
            menus: item.detail.menus ? parseReservationMenus(item.detail.menus) : undefined,
            options: item.detail.options ? parseReservationOptions(item.detail.options) : undefined,
            totalPrice: item.detail.total_price || undefined,
            paymentMethod: item.detail.payment_method,
            couponId: item.detail.coupon_id || undefined,
            couponDiscount: item.detail.coupon_discount || undefined,
            usePoints: item.detail.use_points || undefined,
            notes: item.detail.notes || undefined,
          } : undefined,
          supabaseData: item,
        }));
      
      if (reset) {
        setSupabaseReservations(converted);
      } else {
        setSupabaseReservations(prev => [...prev, ...converted]);
      }
      
      setSupabaseHasMore(data.length === pageSize && page * pageSize < (count || 0));
      console.log('[useOrganizationReservations] Supabase data fetched successfully:', { dataLength: data.length, count });
    } catch (error) {
      console.error('[useOrganizationReservations] Failed to fetch Supabase reservations:', error);
      toast.error('過去の予約履歴の取得に失敗しました');
    } finally {
      console.log('[useOrganizationReservations] Setting supabaseLoading to false');
      setSupabaseLoading(false);
    }
  }, [tenantId, orgId, status, startDate, endDate, pageSize, reservationRepo, stats]);
  
  // 統計情報の初回取得
  useEffect(() => {
    if (tenantId && orgId) {
      // パラメータが変更された場合は統計情報をリセット
      setStats(null);
      fetchStats();
    }
  }, [tenantId, orgId, startDate, endDate, fetchStats]);
  

  // 初回読み込み
  useEffect(() => {
    if (tenantId && orgId) {
      setSupabasePage(1);
      fetchSupabaseReservations(1, true);
    }
  }, [tenantId, orgId, status, startDate, endDate, fetchSupabaseReservations]);

  
  // Convex予約詳細の取得と統合（現在は無効化）
  // TODO: 必要に応じて詳細情報取得ロジックを実装
  // 現在は組織レベルの一覧表示では詳細情報は不要なため、パフォーマンスのために無効化
  
  // データの統合とソート（顧客名統合処理付き）
  const integratedReservations = useMemo(() => {
    console.log('[useOrganizationReservations] Data integration:', {
      status,
      convexCount: convexReservations.length,
      supabaseCount: supabaseReservations.length,
      convexSample: convexReservations.slice(0, 2).map(r => ({ id: r.id, date: r.date, status: r.status, source: r.source })),
      supabaseSample: supabaseReservations.slice(0, 2).map(r => ({ id: r.id, date: r.date, status: r.status, source: r.source }))
    });
    
    // ステータスごとのデータソース選択
    // - confirmed, pending: アクティブな予約 → Convexのみ
    // - completed: 最近の完了データも含む → 両方から取得して統合
    // - cancelled: 最近のキャンセルも含む → 両方から取得
    // - refunded: 履歴データ → Supabaseのみ（Convexはスキップ）
    // - all/未指定: 両方から取得
    let allReservations: IntegratedReservation[] = [];
    
    if (status === 'confirmed' || status === 'pending') {
      // アクティブな予約はConvexのみ
      allReservations = [...convexReservations];
    } else if (status === 'refunded') {
      // 返金データはSupabaseのみ（Convexはスキップ）
      allReservations = [...supabaseReservations];
    } else {
      // completed, cancelled, allまたは未指定の場合は両方から取得
      allReservations = [...convexReservations, ...supabaseReservations];
    }
    
    console.log('[useOrganizationReservations] Before deduplication:', {
      allReservationsCount: allReservations.length,
      dateRange: { startDate, endDate },
      sampleDates: allReservations.slice(0, 5).map(r => r.date)
    });
    
    // 重複除去（Convex IDとSupabase _convex_idの照合）
    const uniqueReservations = allReservations.reduce((acc, reservation) => {
      const isDuplicate = acc.some(existing => {
        if (existing.source === 'convex' && reservation.source === 'supabase') {
          return existing.id === reservation.supabaseData?.reservation._convex_id;
        }
        if (existing.source === 'supabase' && reservation.source === 'convex') {
          return existing.supabaseData?.reservation._convex_id === reservation.id;
        }
        return false;
      });
      
      if (!isDuplicate) {
        acc.push(reservation);
      }
      
      return acc;
    }, [] as IntegratedReservation[]);

    // 日時でソート（早い順）
    return uniqueReservations.sort((a, b) => {
      const aTime = Number(a.startTimeUnix) || 0;
      const bTime = Number(b.startTimeUnix) || 0;
      return aTime - bTime;
    });
  }, [convexReservations, supabaseReservations, status, startDate, endDate]);
  
  // さらに読み込む
  const loadMore = useCallback(() => {
    const currentConvexStatus = useDataRangeQuery ? convexDateRangeStatus : convexStatus;
    const currentConvexLoadMore = useDataRangeQuery ? convexDateRangeLoadMore : convexLoadMore;
    
    if (currentConvexStatus === 'CanLoadMore') {
      currentConvexLoadMore(pageSize);
    }
    
    if (supabaseHasMore && !supabaseLoading) {
      const nextPage = supabasePage + 1;
      setSupabasePage(nextPage);
      fetchSupabaseReservations(nextPage, false);
    }
  }, [convexStatus, convexDateRangeStatus, convexLoadMore, convexDateRangeLoadMore, pageSize, supabaseHasMore, supabaseLoading, supabasePage, fetchSupabaseReservations, useDataRangeQuery]);
  
  // 全体のローディング状態
  const isLoading = useMemo(() => {
    const currentConvexStatus = useDataRangeQuery ? convexDateRangeStatus : convexStatus;
    
    console.log('[useOrganizationReservations] Loading status check:', {
      status,
      currentConvexStatus,
      supabaseLoading,
      convexReservationsLength: convexReservations.length,
      supabaseReservationsLength: supabaseReservations.length,
      integratedReservationsLength: integratedReservations.length,
      canFetchConvex,
      skipConvexForHistoricalData
    });
    
    // confirmed, pendingの場合はConvexのみチェック
    if (status === 'confirmed' || status === 'pending') {
      return currentConvexStatus === 'LoadingFirstPage';
    }
    // refundedの場合はSupabaseのみチェック（Convexはスキップ）
    if (status === 'refunded') {
      return supabaseLoading;
    }
    // completed, cancelled, allまたは未指定の場合は両方チェック
    return (canFetchConvex && currentConvexStatus === 'LoadingFirstPage') || supabaseLoading;
  }, [convexStatus, convexDateRangeStatus, supabaseLoading, status, useDataRangeQuery, convexReservations.length, supabaseReservations.length, integratedReservations.length, canFetchConvex, skipConvexForHistoricalData]);
  
  // さらに読み込めるか
  const hasMore = useMemo(() => {
    const currentConvexStatus = useDataRangeQuery ? convexDateRangeStatus : convexStatus;
    
    // confirmed, pendingの場合はConvexのみチェック
    if (status === 'confirmed' || status === 'pending') {
      return currentConvexStatus === 'CanLoadMore';
    }
    // refundedの場合はSupabaseのみチェック（Convexはスキップ）
    if (status === 'refunded') {
      return supabaseHasMore;
    }
    // completed, cancelled, allまたは未指定の場合は両方チェック
    return (canFetchConvex && currentConvexStatus === 'CanLoadMore') || supabaseHasMore;
  }, [convexStatus, convexDateRangeStatus, supabaseHasMore, status, useDataRangeQuery, canFetchConvex]);
  
  // 統計情報を統合された予約データから計算
  const calculatedStats = useMemo(() => {
    if (!stats) return null;
    
    // Supabaseから取得した統計情報を基本として使用
    // Convexのアクティブ予約も含めて調整
    const convexActiveCount = convexReservations.filter(r => 
      r.status === 'confirmed' || r.status === 'pending'
    ).length;
    
    const convexUpcomingCount = convexReservations.filter(r => 
      (r.status === 'confirmed' || r.status === 'pending') && r.startTimeUnix > Date.now()
    ).length;

    return {
      ...stats,
      totalCount: stats.totalCount + convexActiveCount,
      upcomingCount: stats.upcomingCount + convexUpcomingCount,
    };
  }, [stats, convexReservations]);
  
  // 総件数（日付範囲フィルタリングを考慮して実際の表示件数を使用）
  // 統計情報は日付範囲を考慮していない可能性があるため、実際の統合データの件数を優先
  const totalCount = integratedReservations.length;
  
  return {
    reservations: integratedReservations,
    isLoading,
    loadMore,
    hasMore,
    totalCount,
    stats: calculatedStats,
  };
}