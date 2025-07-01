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
  customerId: string;
  staffId: string | undefined;
  customerName: string;
  staffName: string | undefined;
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

type UseIntegratedReservationsOptions = {
  tenantId: string;
  orgId: string;
  customerId: string;
  status?: string;
  pageSize?: number;
};

type UseIntegratedReservationsReturn = {
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
 * ConvexとSupabaseの予約データを統合して取得するフック
 * - Convex: リアルタイムのアクティブ予約（confirmed, pending）
 * - Supabase: 非アクティブ予約（completed, cancelled, refunded等）
 */
export function useIntegratedReservations({
  tenantId,
  orgId,
  customerId,
  status,
  pageSize = 10,
}: UseIntegratedReservationsOptions): UseIntegratedReservationsReturn {
  const [supabaseReservations, setSupabaseReservations] = useState<IntegratedReservation[]>([]);
  // 初期値をfalseに変更（データ取得時にtrueになる）
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabasePage, setSupabasePage] = useState(1);
  const [supabaseHasMore, setSupabaseHasMore] = useState(true);
  const [stats, setStats] = useState<UseIntegratedReservationsReturn['stats']>(null);
  
  const reservationRepo = useMemo(() => new ReservationRepository(), []);
  
  // Convexからリアルタイムデータを取得（confirmed, pending, cancelledを含む）
  const shouldFetchFromConvex = !status || status === 'confirmed' || status === 'pending' || status === 'cancelled' || status === 'all';
  
  // tenantId、orgId、customerIdが揃っていることを確認
  const canFetchConvex = shouldFetchFromConvex && tenantId && orgId && customerId;
  
  const {
    results: convexResults,
    status: convexStatus,
    loadMore: convexLoadMore,
  } = usePaginatedQuery(
    api.reservation.query.listByCustomerIdWithDetails,
    canFetchConvex
      ? {
          tenant_id: tenantId as Id<'tenant'>,
          org_id: orgId as Id<'organization'>,
          customer_id: customerId,
          sort: 'desc',
        }
      : 'skip',
    { initialNumItems: pageSize }
  );
  
  // Convex予約データを統合型に変換
  const convexReservations: IntegratedReservation[] = useMemo(() => {
    if (!convexResults) return [];
    
    return convexResults
      .filter((item) => {
        const res = item.reservation;
        // ステータスフィルター
        if (!status || status === 'all') return true;
        return res.status === status;
      })
      .filter((item) => {
        const res = item.reservation;
        // キャンセル済み予約も含める（Supabaseに移行される前のキャンセル予約表示のため）
        return res.status === 'confirmed' || res.status === 'pending' || res.status === 'cancelled' || res.status === 'completed' || res.status === 'refunded';
      })
      .map((item) => {
        const res = item.reservation;
        const detail = item.detail;
        return {
          id: res._id,
          source: 'convex' as const,
          tenantId: res.tenant_id,
          orgId: res.org_id,
          customerId: res.customer_id || '',
          staffId: res.staff_id,
          customerName: res.customer_name,
          staffName: res.staff_name,
          status: res.status,
          paymentStatus: res.payment_status,
          date: res.date,
          startTimeUnix: res.start_time_unix,
          endTimeUnix: res.end_time_unix,
          createdAt: new Date(res._creationTime),
          detail: detail ? {
            menus: detail.menus || undefined,
            options: detail.options || undefined,
            totalPrice: detail.total_price || undefined,
            extraCharge: detail.extra_charge || undefined,
            paymentMethod: detail.payment_method,
            couponId: detail.coupon_id || undefined,
            couponDiscount: detail.coupon_discount || undefined,
            usePoints: detail.use_points || undefined,
            notes: detail.notes || undefined,
          } : undefined,
          convexData: res,
        };
      });
  }, [convexResults, status]);
  
  // Supabaseから履歴データを取得（completed, cancelledのみ）
  const fetchSupabaseReservations = useCallback(async (page: number, reset: boolean = false) => {
    console.log('[useIntegratedReservations] fetchSupabaseReservations called:', { tenantId, orgId, customerId, status, page, reset });
    
    if (!tenantId || !orgId || !customerId) {
      console.log('[useIntegratedReservations] Missing required IDs, returning early');
      return;
    }
    
    // Convexが扱うステータスの場合はSupabaseから取得しない
    if (status === 'confirmed' || status === 'pending' || status === 'cancelled') {
      console.log('[useIntegratedReservations] Status is handled by Convex, skipping Supabase');
      setSupabaseLoading(false);
      return;
    }
    
    console.log('[useIntegratedReservations] Setting supabaseLoading to true');
    setSupabaseLoading(true);
    
    try {
      // 統計情報の取得（初回のみ）
      if (!stats && reset) {
        const statsData = await reservationRepo.getCustomerReservationStats(
          tenantId,
          orgId,
          customerId
        );
        setStats(statsData);
      }
      
      // 予約データの取得
      const { data, count } = await reservationRepo.findByCustomerWithDetails(
        tenantId,
        orgId,
        customerId,
        {
          page,
          pageSize,
          status: status === 'all' ? undefined : status,
        }
      );
      
      // Supabaseデータを統合型に変換
      const converted = data
        .filter((item) => {
          // confirmed/pending以外の全てのステータス（completed, cancelled, refunded等）
          return item.reservation.status !== 'confirmed' && item.reservation.status !== 'pending';
        })
        .map((item) => ({
          id: item.reservation.uid,
          source: 'supabase' as const,
          tenantId: item.reservation.tenant_id,
          orgId: item.reservation.org_id,
          customerId: item.reservation.customer_id || '',
          staffId: item.reservation.staff_id,
          customerName: item.reservation.customer_name,
          staffName: item.reservation.staff_name,
          status: item.reservation.status,
          paymentStatus: item.reservation.payment_status,
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
      console.log('[useIntegratedReservations] Supabase data fetched successfully:', { dataLength: data.length, count });
    } catch (error) {
      console.error('[useIntegratedReservations] Failed to fetch Supabase reservations:', error);
      toast.error('過去の予約履歴の取得に失敗しました');
    } finally {
      console.log('[useIntegratedReservations] Setting supabaseLoading to false');
      setSupabaseLoading(false);
    }
  }, [tenantId, orgId, customerId, status, pageSize, reservationRepo, stats]);
  
  // 初回読み込み
  useEffect(() => {
    if (tenantId && orgId && customerId) {
      setSupabasePage(1);
      fetchSupabaseReservations(1, true);
    }
  }, [tenantId, orgId, customerId, status, fetchSupabaseReservations]);
  
  // データの統合とソート
  const integratedReservations = useMemo(() => {
    // CompletedとCancelledの場合はSupabaseのみ、それ以外は両方から取得
    let allReservations: IntegratedReservation[] = [];
    
    if (status === 'completed') {
      // Supabaseのみ（完了済みは履歴データ）
      allReservations = [...supabaseReservations,];
    } else if (status === 'confirmed' || status === 'pending' || status === 'cancelled') {
      // Convexのみ（現在アクティブなデータ）
      allReservations = [...convexReservations];
    } else {
      // 両方から取得（allまたは未指定）
      allReservations = [...convexReservations, ...supabaseReservations];
    }
    
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
    
    // 日時でソート（新しい順）- startTimeUnixの値を確実に数値として比較
    return uniqueReservations.sort((a, b) => {
      const aTime = Number(a.startTimeUnix) || 0;
      const bTime = Number(b.startTimeUnix) || 0;
      return bTime - aTime;
    });
  }, [convexReservations, supabaseReservations, status]);
  
  // さらに読み込む
  const loadMore = useCallback(() => {
    if (convexStatus === 'CanLoadMore') {
      convexLoadMore(pageSize);
    }
    
    if (supabaseHasMore && !supabaseLoading) {
      const nextPage = supabasePage + 1;
      setSupabasePage(nextPage);
      fetchSupabaseReservations(nextPage, false);
    }
  }, [convexStatus, convexLoadMore, pageSize, supabaseHasMore, supabaseLoading, supabasePage, fetchSupabaseReservations]);
  
  
  // 全体のローディング状態
  const isLoading = useMemo(() => {
    // completedの場合はSupabaseのみチェック
    if (status === 'completed') {
      return supabaseLoading;
    }
    // confirmed, pending, cancelledの場合はConvexのみチェック
    if (status === 'confirmed' || status === 'pending' || status === 'cancelled') {
      return convexStatus === 'LoadingFirstPage';
    }
    // allまたは未指定の場合は両方チェック
    return convexStatus === 'LoadingFirstPage' || supabaseLoading;
  }, [convexStatus, supabaseLoading, status]);
  
  // さらに読み込めるか
  const hasMore = useMemo(() => {
    // completedの場合はSupabaseのみチェック
    if (status === 'completed') {
      return supabaseHasMore;
    }
    // confirmed, pending, cancelledの場合はConvexのみチェック
    if (status === 'confirmed' || status === 'pending' || status === 'cancelled') {
      return convexStatus === 'CanLoadMore';
    }
    // allまたは未指定の場合は両方チェック
    return convexStatus === 'CanLoadMore' || supabaseHasMore;
  }, [convexStatus, supabaseHasMore, status]);
  
  // 総件数（統計情報から取得）
  const totalCount = stats?.totalCount || integratedReservations.length;
  
  return {
    reservations: integratedReservations,
    isLoading,
    loadMore,
    hasMore,
    totalCount,
    stats,
  };
}