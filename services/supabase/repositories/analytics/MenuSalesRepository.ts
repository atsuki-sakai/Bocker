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
  SelectOption
} from './types';

/**
 * メニュー別売上データのリポジトリクラス
 * menu_sales_summaryテーブルからデータを取得・分析
 */
export class MenuSalesRepository extends AnalyticsRepository {
  
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
      let query = supabase
        .from('menu_sales_summary')
        .select('*');

      // 基本フィルタ
      query = this.addTenantOrgFilter(query, filters.tenantId, filters.orgId);

      // メニューIDフィルタ
      if (filters.menuIds && filters.menuIds.length > 0) {
        query = query.in('menu_id', filters.menuIds);
      }

      // ソート
      const orderColumn = options.orderBy === 'amount' ? 'total_amount' : 
                         options.orderBy === 'count' ? 'booking_count' : 
                         'menu_name';
      query = query.order(orderColumn, { ascending: options.order === 'asc' });

      // リミット・オフセット
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.handleError(error, 'get menu sales data');
      }

      // データを変換して平均額を計算
      const menuData: MenuSalesData[] = (data || []).map(item => ({
        menu_id: item.menu_id,
        menu_name: item.menu_name,
        total_amount: item.total_amount || 0,
        booking_count: item.booking_count || 0,
        average_amount: this.calculateAverage(item.total_amount || 0, item.booking_count || 0),
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      return {
        data: menuData,
        meta: {
          total: menuData.length
        }
      };
    } catch (error) {
      this.handleError(error, 'get menu sales data');
    }
  }

  /**
   * メニュー売上ランキングを取得
   */
  async getMenuRanking(
    filters: FilterOptions, 
    limit: number = 10
  ): Promise<RankingData[]> {
    try {
      const { data } = await this.getMenuSales(filters, {
        groupBy: 'menu',
        orderBy: 'amount',
        order: 'desc',
        limit
      });

      const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);

      return data.map((item, index) => ({
        id: item.menu_id,
        name: item.menu_name || `メニュー${item.menu_id}`,
        value: item.total_amount,
        percentage: this.calculatePercentage(item.total_amount, totalAmount),
        rank: index + 1
      }));
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

      const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);
      const totalBookings = data.reduce((sum, item) => sum + item.booking_count, 0);
      const averageAmount = this.calculateAverage(totalAmount, totalBookings);
      
      const periodDays = Math.ceil(
        (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      
      const dailyAverage = Math.round(totalAmount / periodDays);
      const activeMenuCount = data.filter(item => item.total_amount > 0).length;
      const topMenu = data.length > 0 ? data[0] : null;

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
      let query = supabase
        .from('menu_sales_summary')
        .select('menu_id, menu_name');

      query = this.addTenantOrgFilter(query, tenantId, orgId);
      query = query.order('menu_name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        this.handleError(error, 'get menu options');
      }

      return (data || []).map(item => ({
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

      // 全体平均を計算
      const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);
      const totalBookings = data.reduce((sum, item) => sum + item.booking_count, 0);
      const averageAmount = totalAmount / data.length;
      const averageBookings = totalBookings / data.length;

      // トップパフォーマー（上位5メニュー）
      const topPerformers = data.slice(0, 5);

      // パフォーマンス分布
      let high = 0, medium = 0, low = 0;
      data.forEach(menu => {
        if (menu.total_amount >= averageAmount) {
          high++;
        } else if (menu.total_amount >= averageAmount * 0.5) {
          medium++;
        } else {
          low++;
        }
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

      // 価格帯を計算（平均価格ベース）
      const menuPrices = data.map(item => item.average_amount).filter(price => price > 0);
      const priceRanges = [
        { tier: 'エコノミー', min: 0, max: 3000 },
        { tier: 'スタンダード', min: 3000, max: 6000 },
        { tier: 'プレミアム', min: 6000, max: 10000 },
        { tier: 'ラグジュアリー', min: 10000, max: Infinity }
      ];

      const priceTiers = priceRanges.map(range => {
        const tieredMenus = data.filter(menu => 
          menu.average_amount >= range.min && menu.average_amount < range.max
        );

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
}