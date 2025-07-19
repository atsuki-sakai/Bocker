import { AnalyticsRepository } from './AnalyticsRepository';
import { 
  MenuSalesData, 
  FilterOptions, 
  RankingData,
  SalesSummary,
  PeriodComparisonData,
  BarChartDataPoint,
  AnalyticsResponse,
  AggregationOptions,
  SelectOption,
  PartitionAwareFilterOptions,
  RpcMenuSalesRow,
  RpcAggregatedMenuSalesParams
} from './types';
import { SupabaseService } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';

/**
 * メニュー別売上データのリポジトリクラス
 * menu_sales_summaryテーブルからデータを取得・分析
 */
export class MenuSalesRepository extends AnalyticsRepository {

  constructor(supabaseService: SupabaseService = supabaseClientService) {
    super(supabaseService);
  }

  /**
   * RPC関数から返される値を安全に数値に変換するヘルパー
   */
  private safeParseNumber(value: string | number | bigint | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * エンタープライズレベル：BIGINT値を安全にnumberに変換（3,000店舗対応）
   */
  private safeParseInteger(value: string | number | bigint | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'bigint') {
      // BigIntの範囲チェック（JavaScriptのMAX_SAFE_INTEGER以内）
      if (value > Number.MAX_SAFE_INTEGER) {
        console.warn('[Enterprise] BigInt value exceeds MAX_SAFE_INTEGER:', value);
        return Number.MAX_SAFE_INTEGER;
      }
      return Number(value);
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) return 0;
      // 文字列からのパースでも安全性チェック
      if (parsed > Number.MAX_SAFE_INTEGER) {
        console.warn('[Enterprise] Parsed integer exceeds MAX_SAFE_INTEGER:', parsed);
        return Number.MAX_SAFE_INTEGER;
      }
      return parsed;
    }
    return 0;
  }
  
  /**
   * 指定期間のメニュー別売上データを取得
   */
  async getMenuSales(filters: FilterOptions, options: AggregationOptions = {
    groupBy: 'menu',
    orderBy: 'amount',
    order: 'desc'
  }): Promise<AnalyticsResponse<MenuSalesData[]>> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      
      // パーティション対応: RPC関数を使用してメニュー別に集計
      const dateRange = this.formatDateRange(filters.dateRange);
      const rpcParams: RpcAggregatedMenuSalesParams = {
        p_tenant_id: filters.tenantId,
        p_org_id: filters.orgId,
        p_date_from: dateRange.from,
        p_date_to: dateRange.to,
        p_menu_ids: (filters.menuIds?.length ? filters.menuIds : null)
      };

      console.log('[MenuSalesRepository] RPC function params:', {
        p_tenant_id: filters.tenantId,
        p_org_id: filters.orgId,
        p_date_from: dateRange.from,
        p_date_to: dateRange.to,
        p_menu_ids: (filters.menuIds?.length ? filters.menuIds : null),
        daysDiff: Math.ceil((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shouldUsePartitions: this.shouldUsePartitions(filters as any)
      });

      const { data, error } = await supabase.rpc('get_aggregated_menu_sales', rpcParams);

      if (error) {
        console.error('[MenuSalesRepository] RPC function error:', error);
        this.handleError(error, 'get menu sales data');
      }

      console.log('[Enterprise] RPC function response received:', {
        dataLength: data?.length,
        sampleData: data?.[0],
        error,
        filterDateRange: {
          from: dateRange.from,
          to: dateRange.to,
          dateTruncFrom: `DATE_TRUNC('month', '${dateRange.from}')`,
          dateTruncTo: `DATE_TRUNC('month', '${dateRange.to}')`
        }
      });

      // エンタープライズレベル：大規模SaaS向けデータ変換・検証
      const menuData: MenuSalesData[] = (data as RpcMenuSalesRow[] || []).map((item: RpcMenuSalesRow, index: number) => {
        try {
          const totalAmount = this.safeParseNumber(item.total_amount);
          const bookingCount = this.safeParseInteger(item.booking_count);
          const averageAmount = this.calculateAverage(totalAmount, bookingCount);

          return {
            menu_id: item.menu_id,
            menu_name: item.menu_name || null,
            total_amount: totalAmount,
            booking_count: bookingCount,
            average_amount: averageAmount,
            created_at: item.created_at,
            updated_at: item.updated_at
          };
        } catch (itemError) {
          console.error(`[Enterprise] Error processing menu item ${index}:`, {
            item,
            error: itemError
          });
          
          return {
            menu_id: item.menu_id || `unknown_${index}`,
            menu_name: 'Data Error',
            total_amount: 0,
            booking_count: 0,
            average_amount: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      });

      // ソートを適用
      const sortedData = this.applySorting(menuData, options);
      
      // リミット・オフセットを適用
      const paginatedData = this.applyPagination(sortedData, options);

      console.log('[Enterprise] Successfully processed menu sales data:', {
        originalCount: data?.length || 0,
        processedCount: menuData.length,
        sortedCount: sortedData.length,
        paginatedCount: paginatedData.length,
        topMenus: paginatedData.map(m => ({ 
          name: m.menu_name, 
          amount: m.total_amount 
        }))
      });

      return {
        data: paginatedData,
        meta: {
          total: menuData.length,
          aggregationLevel: 'monthly'
        }
      };
    } catch (error) {
      console.error('[Enterprise] Unexpected error in getMenuSales:', error);
      this.handleError(error, 'get menu sales data');
    }
  }

  /**
   * メニューデータのソートを適用
   */
  private applySorting(data: MenuSalesData[], options: AggregationOptions): MenuSalesData[] {
    const { orderBy = 'amount', order = 'desc' } = options;
    
    return [...data].sort((a, b) => {
      let aValue: number | string, bValue: number | string;
      
      switch (orderBy) {
        case 'amount':
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case 'count':
          aValue = a.booking_count;
          bValue = b.booking_count;
          break;
        default:
          aValue = a.menu_name || '';
          bValue = b.menu_name || '';
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      const numA = Number(aValue);
      const numB = Number(bValue);
      return order === 'asc' ? numA - numB : numB - numA;
    });
  }

  /**
   * ページネーションを適用
   */
  private applyPagination(data: MenuSalesData[], options: AggregationOptions): MenuSalesData[] {
    const { limit, offset = 0 } = options;
    
    if (!limit) return data;
    
    return data.slice(offset, offset + limit);
  }

  /**
   * メニュー売上ランキングを取得
   */
  async getMenuRanking(
    filters: FilterOptions, 
    limit: number = 10
  ): Promise<RankingData[]> {
    try {
      const isSpecificMenuSelected = filters.menuIds && filters.menuIds.length > 0;
      
      if (isSpecificMenuSelected) {
        // 特定メニューが選択されている場合：選択されたメニュー群内でのランキング
        const { data: selectedData } = await this.getMenuSales(filters, {
          groupBy: 'menu',
          orderBy: 'amount',
          order: 'desc'
        });

        // 実際の予約実績があるメニューのみフィルタリング
        const validMenus = selectedData.filter(item => 
          item.booking_count > 0 && item.total_amount > 0
        );

        // データ整合性チェック：予約数と売上額の整合性を検証
        const verifiedMenus = validMenus.filter(item => {
          const expectedMinAmount = item.booking_count * 100; // 最低単価100円と仮定
          return item.total_amount >= expectedMinAmount;
        });

        if (verifiedMenus.length === 0) {
          console.warn('[MenuSalesRepository] No valid menu data found for ranking');
          return [];
        }

        const totalAmount = verifiedMenus.reduce((sum, item) => sum + item.total_amount, 0);
        const limitedData = verifiedMenus.slice(0, limit);

        return limitedData.map((item, index) => ({
          id: item.menu_id,
          name: item.menu_name || `メニュー${item.menu_id}`,
          value: item.total_amount,
          percentage: this.calculatePercentage(item.total_amount, totalAmount),
          rank: index + 1
        }));
      } else {
        // 全メニュー表示の場合：全体に対するランキング
        const { data: allData } = await this.getMenuSales(filters, {
          groupBy: 'menu',
          orderBy: 'amount',
          order: 'desc'
        });

        // 実際の予約実績があるメニューのみフィルタリング
        const validMenus = allData.filter(item => 
          item.booking_count > 0 && item.total_amount > 0
        );

        // データ整合性チェック：予約数と売上額の整合性を検証
        const verifiedMenus = validMenus.filter(item => {
          const expectedMinAmount = item.booking_count * 100; // 最低単価100円と仮定
          return item.total_amount >= expectedMinAmount;
        });

        if (verifiedMenus.length === 0) {
          console.warn('[MenuSalesRepository] No valid menu data found for ranking');
          return [];
        }

        const totalAmount = verifiedMenus.reduce((sum, item) => sum + item.total_amount, 0);
        const limitedData = verifiedMenus.slice(0, limit);

        return limitedData.map((item, index) => ({
          id: item.menu_id,
          name: item.menu_name || `メニュー${item.menu_id}`,
          value: item.total_amount,
          percentage: this.calculatePercentage(item.total_amount, totalAmount),
          rank: index + 1
        }));
      }
    } catch (error) {
      this.handleError(error, 'get menu ranking');
    }
  }

  /**
   * チャート用データを取得（棒グラフ用）
   */
  async getChartData(filters: FilterOptions, limit: number = 10): Promise<BarChartDataPoint[]> {
    try {
      const { data } = await this.getMenuSales(filters, {
        groupBy: 'menu',
        orderBy: 'amount',
        order: 'desc',
        limit
      });

      return data.map(item => ({
        name: item.menu_name || `メニュー${item.menu_id}`,
        value: item.total_amount,
        label: this.formatCurrency(item.total_amount)
      }));
    } catch (error) {
      this.handleError(error, 'get chart data');
    }
  }

  /**
   * メニュー売上サマリーを取得
   */
  async getMenuSummary(filters: FilterOptions): Promise<SalesSummary & {
    topMenu: MenuSalesData | null;
    activeMenuCount: number;
    menuCategories?: {
      categoryName: string;
      menuCount: number;
      totalAmount: number;
    }[];
  }> {
    try {
      const { data } = await this.getMenuSales(filters);

      // 実際の予約実績があるメニューのみフィルタリング
      const validMenus = data.filter(item => 
        item.booking_count > 0 && item.total_amount > 0
      );

      // データ整合性チェック：予約数と売上額の整合性を検証
      const verifiedMenus = validMenus.filter(item => {
        const expectedMinAmount = item.booking_count * 100; // 最低単価100円と仮定
        return item.total_amount >= expectedMinAmount;
      });

      console.log('[MenuSalesRepository] Summary data verification:', {
        totalMenus: data.length,
        validMenus: validMenus.length,
        verifiedMenus: verifiedMenus.length,
        filteredOut: data.length - verifiedMenus.length
      });

      // 検証済みデータのみで計算
      const totalAmount = verifiedMenus.reduce((sum, item) => sum + item.total_amount, 0);
      const totalBookings = verifiedMenus.reduce((sum, item) => sum + item.booking_count, 0);
      const averageAmount = this.calculateAverage(totalAmount, totalBookings);
      
      const periodDays = Math.ceil(
        (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      
      const dailyAverage = this.calculateDailyAverage(totalAmount, periodDays);
      const activeMenuCount = verifiedMenus.length; // 検証済みメニュー数
      const topMenu = verifiedMenus.length > 0 ? verifiedMenus[0] : null;

      return {
        totalAmount,
        totalBookings,
        averageAmount,
        periodDays,
        dailyAverage,
        topMenu,
        activeMenuCount
      };
    } catch (error) {
      this.handleError(error, 'get menu summary');
    }
  }

  /**
   * 特定メニューの詳細データを取得
   */
  async getMenuDetail(
    tenantId: string, 
    orgId: string, 
    menuId: string
  ): Promise<MenuSalesData | null> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      let query = supabase
        .from('menu_sales_summary')
        .select('*');

      query = this.addTenantOrgFilter(query, tenantId, orgId);
      query = query.eq('menu_id', menuId);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // データが見つからない場合
          return null;
        }
        this.handleError(error, 'get menu detail');
      }

      return {
        menu_id: data.menu_id,
        menu_name: data.menu_name,
        total_amount: data.total_amount || 0,
        booking_count: data.booking_count || 0,
        average_amount: this.calculateAverage(data.total_amount || 0, data.booking_count || 0),
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      this.handleError(error, 'get menu detail');
    }
  }

  /**
   * メニュー選択用オプションを取得
   */
  async getMenuOptions(tenantId: string, orgId: string): Promise<SelectOption[]> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      
      // パーティション対応: 生SQLでDISTINCTを使用してパフォーマンス最適化
      const { data, error } = await supabase
        .rpc('get_distinct_menu_options', {
          p_tenant_id: tenantId,
          p_org_id: orgId
        });

      if (error) {
        this.handleError(error, 'get menu options');
      }

      return (data || []).map((item: { menu_id: string; menu_name: string }) => ({
        value: item.menu_id,
        label: item.menu_name || `メニュー${item.menu_id}`
      }));
    } catch (error) {
      this.handleError(error, 'get menu options');
    }
  }

  /**
   * メニューパフォーマンス分析を取得
   */
  async getMenuPerformanceAnalysis(
    filters: FilterOptions
  ): Promise<{
    topPerformers: MenuSalesData[];
    averagePerformance: {
      averageAmount: number;
      averageBookings: number;
    };
    performanceDistribution: {
      high: number; // 平均以上
      medium: number; // 平均の50-100%
      low: number; // 平均の50%未満
    };
    popularityTrend: {
      menu_id: string;
      menu_name: string;
      booking_trend: number; // 予約数の伸び率
      revenue_trend: number; // 売上の伸び率
    }[];
  }> {
    try {
      const { data } = await this.getMenuSales(filters);

      if (data.length === 0) {
        return {
          topPerformers: [],
          averagePerformance: { averageAmount: 0, averageBookings: 0 },
          performanceDistribution: { high: 0, medium: 0, low: 0 },
          popularityTrend: []
        };
      }

      // 実際の予約実績があるメニューのみフィルタリング
      const validMenus = data.filter(item => 
        item.booking_count > 0 && item.total_amount > 0
      );

      // データ整合性チェック：予約数と売上額の整合性を検証
      const verifiedMenus = validMenus.filter(item => {
        const expectedMinAmount = item.booking_count * 100; // 最低単価100円と仮定
        return item.total_amount >= expectedMinAmount;
      });

      if (verifiedMenus.length === 0) {
        console.warn('[MenuSalesRepository] No valid menu data found for performance analysis');
        return {
          topPerformers: [],
          averagePerformance: { averageAmount: 0, averageBookings: 0 },
          performanceDistribution: { high: 0, medium: 0, low: 0 },
          popularityTrend: []
        };
      }

      // 全体平均を計算（検証済みデータのみ使用）
      const totalAmount = verifiedMenus.reduce((sum, item) => sum + item.total_amount, 0);
      const totalBookings = verifiedMenus.reduce((sum, item) => sum + item.booking_count, 0);
      const averageAmount = totalAmount / verifiedMenus.length;
      const averageBookings = totalBookings / verifiedMenus.length;

      // トップパフォーマー（上位5メニュー）
      const topPerformers = verifiedMenus.slice(0, 5);

      // パフォーマンス分布
      let high = 0, medium = 0, low = 0;
      verifiedMenus.forEach(menu => {
        if (menu.total_amount >= averageAmount) {
          high++;
        } else if (menu.total_amount >= averageAmount * 0.5) {
          medium++;
        } else {
          low++;
        }
      });

      console.log('[MenuSalesRepository] Performance analysis completed:', {
        totalMenus: data.length,
        validMenus: validMenus.length,
        verifiedMenus: verifiedMenus.length,
        averageAmount: Math.round(averageAmount),
        performanceDistribution: { high, medium, low }
      });

      return {
        topPerformers,
        averagePerformance: {
          averageAmount: Math.round(averageAmount),
          averageBookings: Math.round(averageBookings)
        },
        performanceDistribution: { high, medium, low },
        popularityTrend: [] // 複期間比較が必要なため、別途実装
      };
    } catch (error) {
      this.handleError(error, 'get menu performance analysis');
    }
  }

  /**
   * 価格帯別メニュー分析を取得
   */
  async getPriceTierAnalysis(filters: FilterOptions): Promise<{
    priceTiers: {
      tier: string;
      priceRange: string;
      menuCount: number;
      totalAmount: number;
      averageAmount: number;
      bookingCount: number;
    }[];
    insights: {
      mostProfitableTier: string;
      mostPopularTier: string;
      averageMenuPrice: number;
    };
  }> {
    try {
      const { data } = await this.getMenuSales(filters);

      if (data.length === 0) {
        return {
          priceTiers: [],
          insights: {
            mostProfitableTier: '',
            mostPopularTier: '',
            averageMenuPrice: 0
          }
        };
      }

      // 実際の予約実績があるメニューのみフィルタリング
      const validMenus = data.filter(item => 
        item.booking_count > 0 && item.total_amount > 0
      );

      // データ整合性チェック：予約数と売上額の整合性を検証
      const verifiedMenus = validMenus.filter(item => {
        const expectedMinAmount = item.booking_count * 100; // 最低単価100円と仮定
        return item.total_amount >= expectedMinAmount;
      });

      if (verifiedMenus.length === 0) {
        console.warn('[MenuSalesRepository] No valid menu data found for price tier analysis');
        return {
          priceTiers: [],
          insights: {
            mostProfitableTier: '',
            mostPopularTier: '',
            averageMenuPrice: 0
          }
        };
      }

      // 価格帯を実際のメニューデータから自動計算（検証済みデータのみ使用）
      const menuPrices = verifiedMenus.map(item => item.average_amount).filter(price => price > 0);
      
      if (menuPrices.length === 0) {
        return {
          priceTiers: [],
          insights: {
            mostProfitableTier: '',
            mostPopularTier: '',
            averageMenuPrice: 0
          }
        };
      }

      // 固定価格帯で分類
      const priceRanges = [
        { 
          tier: `低価格帯`, 
          min: 0, 
          max: 5000 
        },
        { 
          tier: `中価格帯`, 
          min: 5000, 
          max: 10000 
        },
        { 
          tier: `高価格帯`, 
          min: 10000, 
          max: Infinity 
        }
      ];

      const priceTiers = priceRanges.map((range, index) => {
        const tieredMenus = verifiedMenus.filter(menu => {
          // 最後の価格帯（高価格帯）は最大値を含む
          if (index === priceRanges.length - 1) {
            return menu.average_amount >= range.min && menu.average_amount <= range.max;
          } else {
            return menu.average_amount >= range.min && menu.average_amount < range.max;
          }
        });

        const totalAmount = tieredMenus.reduce((sum, menu) => sum + menu.total_amount, 0);
        const bookingCount = tieredMenus.reduce((sum, menu) => sum + menu.booking_count, 0);

        return {
          tier: range.tier,
          priceRange: range.max === Infinity ? 
            `¥${range.min.toLocaleString()}以上` : 
            `¥${range.min.toLocaleString()} - ¥${range.max.toLocaleString()}`,
          menuCount: tieredMenus.length,
          totalAmount,
          averageAmount: tieredMenus.length > 0 ? Math.round(totalAmount / tieredMenus.length) : 0,
          bookingCount
        };
      }).filter(tier => tier.menuCount > 0);

      // 最も収益性の高い価格帯と人気の価格帯を特定
      const mostProfitableTier = priceTiers.reduce((prev, current) => 
        prev.totalAmount > current.totalAmount ? prev : current
      );
      const mostPopularTier = priceTiers.reduce((prev, current) => 
        prev.bookingCount > current.bookingCount ? prev : current
      );

      const averageMenuPrice = menuPrices.length > 0 ? 
        Math.round(menuPrices.reduce((sum, price) => sum + price, 0) / menuPrices.length) : 0;

      return {
        priceTiers,
        insights: {
          mostProfitableTier: mostProfitableTier?.tier || '',
          mostPopularTier: mostPopularTier?.tier || '',
          averageMenuPrice
        }
      };
    } catch (error) {
      this.handleError(error, 'get price tier analysis');
    }
  }

  /**
   * 前期間データを取得（基底クラスの抽象メソッド実装）
   */
  protected async getPeriodData(filters: FilterOptions): Promise<{ total_amount: number; booking_count: number }> {
    const summary = await this.getMenuSummary(filters);
    return {
      total_amount: summary.totalAmount,
      booking_count: summary.totalBookings
    };
  }

  /**
   * 期間比較データを取得
   */
  async getPeriodComparison(filters: FilterOptions): Promise<PeriodComparisonData> {
    try {
      const currentSummary = await this.getMenuSummary(filters);
      
      return await this.generatePeriodComparison(
        {
          total_amount: currentSummary.totalAmount,
          booking_count: currentSummary.totalBookings
        },
        filters
      );
    } catch (error) {
      this.handleError(error, 'get period comparison');
    }
  }

  /**
   * パーティション対応前期間データを取得（基底クラスの抽象メソッド実装）
   */
  protected async getPartitionAwarePeriodData(filters: PartitionAwareFilterOptions): Promise<{ total_amount: number; booking_count: number }> {
    const summary = await this.getMenuSummary(filters);
    return {
      total_amount: summary.totalAmount,
      booking_count: summary.totalBookings
    };
  }






}