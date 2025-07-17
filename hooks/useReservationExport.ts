import { useState, useCallback, useMemo } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ReservationRepository } from '@/services/supabase/repositories';
import { toast } from 'sonner';
import type { IntegratedReservation } from './useOrganizationReservations';
import type { ReservationMenu, ReservationOption, ReservationStatus } from '@/convex/types';

// Helper functions to parse JSONB data from Supabase
function parseReservationMenus(menus: unknown): ReservationMenu[] | undefined {
  if (!menus || !Array.isArray(menus)) return undefined;
  
  return menus.map((menu) => {
    if (typeof menu !== 'object' || menu === null) {
      throw new Error('Invalid menu format');
    }
    
    const menuObj = menu as Record<string, unknown>;
    
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

type UseReservationExportOptions = {
  tenantId: string;
  orgId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

type UseReservationExportReturn = {
  exportToCsv: () => Promise<void>;
  isExporting: boolean;
  isValidPeriod: boolean;
  maxDate: string;
  minDate: string;
};

/**
 * 予約データを全件取得してCSV出力するフック
 * 最大3ヶ月間の期間制限あり
 */
export function useReservationExport({
  tenantId,
  orgId,
  status,
  startDate,
  endDate,
}: UseReservationExportOptions): UseReservationExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  
  const reservationRepo = useMemo(() => new ReservationRepository(), []);
  
  // Convexアクション（長時間実行用）
  const fetchAllConvexReservations = useAction(api.reservation.action.exportReservations);
  
  // 期間制限の計算（最大3ヶ月）
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 1); // 明日まで
  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() - 3); // 3ヶ月前
  
  // 期間の妥当性チェック
  const isValidPeriod = (() => {
    if (!startDate || !endDate) return false;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const maxPeriod = new Date(minDate);
    const maxEndDate = new Date(maxDate);
    
    // 開始日が3ヶ月前以降で、終了日が明日以前であることを確認
    return start >= maxPeriod && end <= maxEndDate && start <= end;
  })();
  
  // ConvexとSupabaseから全件データを取得
  const fetchAllReservations = useCallback(async (): Promise<IntegratedReservation[]> => {
    if (!tenantId || !orgId || !startDate || !endDate) {
      throw new Error('必要なパラメータが不足しています');
    }
    
    if (!isValidPeriod) {
      throw new Error('期間は最大3ヶ月間まで指定可能です');
    }
    
    const allReservations: IntegratedReservation[] = [];
    
    try {
      // Convexから全件取得（アクション経由で大量データを効率的に取得）
      const convexData = await fetchAllConvexReservations({
        tenant_id: tenantId as Id<'tenant'>,
        org_id: orgId as Id<'organization'>,
        start_date: startDate,
        end_date: endDate,
        status_filter: status === 'all' ? undefined : status as ReservationStatus,
      });
      
      // Convexデータを統合型に変換
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convertedConvexData: IntegratedReservation[] = convexData.map((res: any) => ({
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
      }));
      
      allReservations.push(...convertedConvexData);
      
      // Supabaseから全件取得
      const { data: supabaseData } = await reservationRepo.findByOrganizationWithDetails(
        tenantId,
        orgId,
        {
          page: 1,
          pageSize: 10000, // 大きな値で全件取得
          status: status === 'all' ? undefined : status,
          startDate,
          endDate,
        }
      );
      
      // Supabaseデータを統合型に変換
      const convertedSupabaseData: IntegratedReservation[] = supabaseData
        .filter((item) => {
          if (status === 'all') return true;
          if (status === 'confirmed' || status === 'pending') return false;
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
      
      allReservations.push(...convertedSupabaseData);
      
      // 重複除去
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
      
      // 日時でソート
      return uniqueReservations.sort((a, b) => {
        const aTime = Number(a.startTimeUnix) || 0;
        const bTime = Number(b.startTimeUnix) || 0;
        return aTime - bTime;
      });
      
    } catch (error) {
      console.error('Failed to fetch all reservations:', error);
      throw error;
    }
  }, [tenantId, orgId, status, startDate, endDate, isValidPeriod, reservationRepo]);
  
  // CSVを生成してダウンロード
  const generateCsv = useCallback((reservations: IntegratedReservation[]): void => {
    const headers = [
      '予約ID',
      '顧客名',
      'スタッフ名',
      'ステータス',
      '支払いステータス',
      '予約日',
      '開始時間',
      '終了時間',
      'フリー指名',
      'メニュー',
      'オプション',
      '合計金額',
      '支払い方法',
      'クーポン割引',
      '使用ポイント',
      '備考',
      '作成日時',
    ];
    
    const csvContent = [
      headers.join(','),
      ...reservations.map((reservation) => {
        const menus = reservation.detail?.menus
          ?.map(m => `${m.name}(${m.quantity}個)`)
          .join('; ') || '';
        
        const options = reservation.detail?.options
          ?.map(o => `${o.name}(${o.quantity}個)`)
          .join('; ') || '';
        
        const startTime = new Date(reservation.startTimeUnix).toLocaleString('ja-JP');
        const endTime = new Date(reservation.endTimeUnix).toLocaleString('ja-JP');
        const createdAt = reservation.createdAt.toLocaleString('ja-JP');
        
        return [
          `"${reservation.id}"`,
          `"${reservation.customerName}"`,
          `"${reservation.staffName || ''}"`,
          `"${reservation.status}"`,
          `"${reservation.paymentStatus}"`,
          `"${reservation.date}"`,
          `"${startTime}"`,
          `"${endTime}"`,
          `"${reservation.isFreeNomination ? 'はい' : 'いいえ'}"`,
          `"${menus}"`,
          `"${options}"`,
          `"${reservation.detail?.totalPrice || ''}"`,
          `"${reservation.detail?.paymentMethod || ''}"`,
          `"${reservation.detail?.couponDiscount || ''}"`,
          `"${reservation.detail?.usePoints || ''}"`,
          `"${reservation.detail?.notes || ''}"`,
          `"${createdAt}"`,
        ].join(',');
      }),
    ].join('\n');
    
    // BOMを追加してUTF-8で保存
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservations_${startDate}_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [startDate, endDate]);
  
  // CSV出力メイン関数
  const exportToCsv = useCallback(async () => {
    if (!isValidPeriod) {
      toast.error('期間は最大3ヶ月間まで指定可能です');
      return;
    }
    
    setIsExporting(true);
    
    try {
      const reservations = await fetchAllReservations();
      
      if (reservations.length === 0) {
        toast.warning('指定期間に予約データがありません');
        return;
      }
      
      generateCsv(reservations);
      toast.success(`${reservations.length}件の予約データをCSVで出力しました`);
      
    } catch (error) {
      console.error('CSV export failed:', error);
      toast.error('CSV出力に失敗しました');
    } finally {
      setIsExporting(false);
    }
  }, [isValidPeriod, fetchAllReservations, generateCsv, fetchAllConvexReservations]);
  
  return {
    exportToCsv,
    isExporting,
    isValidPeriod,
    maxDate: maxDate.toISOString().split('T')[0],
    minDate: minDate.toISOString().split('T')[0],
  };
}