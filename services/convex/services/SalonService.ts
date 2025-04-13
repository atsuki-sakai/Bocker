import { upsert } from './../../../convex/customer/core';
/**
 * サロンサービス
 *
 * このモジュールはサロン関連のビジネスロジックを実装します。
 * 複数のリポジトリを組み合わせた複雑な操作や、トランザクション的な処理を提供します。
 */

import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { Id, Doc } from '@/convex/_generated/dataModel';
import {
  SalonRepository,
  SalonConfigRepository,
  SalonApiConfigRepository,
  SalonScheduleConfigRepository,
} from '@/services/convex/repositories/salon';
import {
  SalonCreateInput,
  SalonUpdateInput,
  SalonConfigInput,
  SalonApiConfigInput,
  SalonScheduleConfigInput,
  SalonStripeConnectInput,
} from '@/services/convex/types/salon';
import { removeEmptyFields, excludeFields } from '@/services/convex/shared/utils/helper';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
import { checkSalonAccess } from '@/services/convex/shared/utils/auth';
import { WithoutSystemFields } from 'convex/server';
/**
 * サロンサービスクラス
 * サロン関連の複合的なビジネスロジックを実装します
 */
class SalonService {
  private static instance: SalonService | null = null;

  private constructor(
    private salonRepo: SalonRepository,
    private configRepo: SalonConfigRepository,
    private apiConfigRepo: SalonApiConfigRepository,
    private scheduleConfigRepo: SalonScheduleConfigRepository
  ) {}

  public static getInstance(): SalonService {
    if (!SalonService.instance) {
      SalonService.instance = new SalonService(
        SalonRepository.getInstance(),
        SalonConfigRepository.getInstance(),
        SalonApiConfigRepository.getInstance(),
        SalonScheduleConfigRepository.getInstance()
      );
    }
    return SalonService.instance;
  }

  // Core
  async createSalon(ctx: MutationCtx, salonData: SalonCreateInput) {
    return await this.salonRepo.createSalon(ctx, salonData);
  }
  async getSalon(ctx: QueryCtx, salonId: Id<'salon'>) {
    return await this.salonRepo.get(ctx, salonId);
  }
  async findSalonByClerkId(ctx: QueryCtx, clerkId: string) {
    return await this.salonRepo.findByClerkId(ctx, clerkId);
  }
  async updateSalon(ctx: MutationCtx, salonId: Id<'salon'>, data: SalonUpdateInput) {
    return await this.salonRepo.updateSalon(ctx, salonId, data);
  }
  async upsertSalon(ctx: MutationCtx, id: Id<'salon'>, data: SalonCreateInput) {
    await checkSalonAccess(ctx, id);
    return await this.salonRepo.upsert(ctx, id, data);
  }

  // Config
  async createConfig(ctx: MutationCtx, data: SalonConfigInput) {
    await checkSalonAccess(ctx, data.salonId);
    return await this.configRepo.create(ctx, data);
  }
  async findConfigBySalonId(ctx: QueryCtx, salonId: Id<'salon'>) {
    return await this.configRepo.findBySalonId(ctx, salonId);
  }
  async upsertConfig(ctx: MutationCtx, data: SalonConfigInput) {
    await checkSalonAccess(ctx, data.salonId);
    return await this.configRepo.upsert(ctx, data);
  }

  // Api Config
  async createApiConfig(ctx: MutationCtx, data: SalonApiConfigInput) {
    await checkSalonAccess(ctx, data.salonId);
    return await this.apiConfigRepo.create(ctx, data);
  }
  async findApiConfigBySalonId(ctx: QueryCtx, salonId: Id<'salon'>) {
    return await this.apiConfigRepo.findBySalonId(ctx, salonId);
  }
  async updateApiConfig(ctx: MutationCtx, data: SalonApiConfigInput) {
    await checkSalonAccess(ctx, data.salonId);
    const apiConfig = await ctx.db
      .query('salon_api_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', data.salonId))
      .first();
    if (!apiConfig) {
      throw new ConvexCustomError('low', 'API設定が見つかりません', 'NOT_FOUND', 404, {
        salonId: data.salonId,
      });
    }
    return await this.apiConfigRepo.update(ctx, apiConfig._id, data);
  }
  async upsertApiConfig(ctx: MutationCtx, data: SalonApiConfigInput) {
    await checkSalonAccess(ctx, data.salonId);
    return await this.apiConfigRepo.upsert(ctx, data);
  }

  // Schedule Config
  async createScheduleConfig(ctx: MutationCtx, data: SalonScheduleConfigInput) {
    await checkSalonAccess(ctx, data.salonId);
    return await this.scheduleConfigRepo.create(ctx, data);
  }
  async findScheduleConfigBySalonId(ctx: QueryCtx, salonId: Id<'salon'>) {
    return await this.scheduleConfigRepo.findBySalonId(ctx, salonId);
  }
  async updateScheduleConfig(ctx: MutationCtx, data: SalonScheduleConfigInput) {
    await checkSalonAccess(ctx, data.salonId);
    const scheduleConfig = await ctx.db
      .query('salon_schedule_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', data.salonId))
      .first();
    if (!scheduleConfig) {
      throw new ConvexCustomError('low', 'スケジュール設定が見つかりません', 'NOT_FOUND', 404, {
        salonId: data.salonId,
      });
    }
    return await this.scheduleConfigRepo.update(ctx, scheduleConfig._id, data);
  }
  async upsertScheduleConfig(ctx: MutationCtx, data: SalonScheduleConfigInput) {
    // サロンの存在確認
    if (!data.salonId) {
      throw new Error('サロンIDは必須です');
    }

    await this.salonRepo.get(ctx, data.salonId);
    const cleanData = {
      ...removeEmptyFields(data),
      salonId: data.salonId, // salonIdは必ず保持する
    };
    return await this.scheduleConfigRepo.upsert(ctx, cleanData);
  }

  // Complete
  async getSalonRelations(ctx: QueryCtx, salonId: Id<'salon'>) {
    try {
      const [salon, config, apiConfig, scheduleConfig] = await Promise.all([
        this.salonRepo.get(ctx, salonId),
        this.configRepo.findBySalonId(ctx, salonId),
        this.apiConfigRepo.findBySalonId(ctx, salonId),
        this.scheduleConfigRepo.findBySalonId(ctx, salonId),
      ]);

      if (!salon) {
        throw new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
          salonId,
        });
      }

      return {
        salon: excludeFields(salon, ['deletedAt', 'isArchive']),
        config: config ? excludeFields(config, ['_creationTime', 'deletedAt', 'isArchive']) : null,
        apiConfig: apiConfig
          ? excludeFields(apiConfig, ['_creationTime', 'deletedAt', 'isArchive'])
          : null,
        scheduleConfig: scheduleConfig
          ? excludeFields(scheduleConfig, ['_creationTime', 'deletedAt', 'isArchive'])
          : null,
      };
    } catch (error) {
      if (error instanceof ConvexCustomError) {
        throw error; // すでにフォーマット済みなのでそのままスロー
      }
      throw new ConvexCustomError(
        'medium',
        'サロン情報の取得中にエラーが発生しました',
        'INTERNAL_ERROR',
        500,
        { salonId, error: error instanceof Error ? error.message : '不明なエラー' }
      );
    }
  }
  async upsertSalonRelations(
    ctx: MutationCtx,
    {
      salonId,
      salon,
      config,
      apiConfig,
      scheduleConfig,
    }: {
      salonId: Id<'salon'>;
      salon: WithoutSystemFields<
        Omit<Doc<'salon'>, 'deletedAt' | 'isArchive' | '_creationTime' | 'salonId'>
      >;
      config: WithoutSystemFields<
        Omit<Doc<'salon_config'>, 'deletedAt' | 'isArchive' | '_creationTime' | 'salonId'>
      >;
      apiConfig: WithoutSystemFields<
        Omit<Doc<'salon_api_config'>, 'deletedAt' | 'isArchive' | '_creationTime' | 'salonId'>
      >;
      scheduleConfig: WithoutSystemFields<
        Omit<Doc<'salon_schedule_config'>, 'deletedAt' | 'isArchive' | '_creationTime' | 'salonId'>
      >;
    }
  ) {
    try {
      // アクセス権のチェック
      await checkSalonAccess(ctx, salonId);

      // サロンの存在確認
      const existingSalon = await this.salonRepo.get(ctx, salonId);
      if (!existingSalon) {
        throw new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, { salonId });
      }

      // 各リポジトリを順番に更新
      await this.salonRepo.upsert(ctx, salonId, {
        ...salon,
      });

      await this.configRepo.upsert(ctx, {
        ...config,
        salonId,
      });

      await this.apiConfigRepo.upsert(ctx, {
        ...apiConfig,
        salonId,
      });

      await this.scheduleConfigRepo.upsert(ctx, {
        ...scheduleConfig,
        salonId,
      });

      return true;
    } catch (error) {
      if (error instanceof ConvexCustomError) {
        throw error; // すでにフォーマット済みのエラーはそのままスロー
      }
      throw new ConvexCustomError(
        'medium',
        'サロン情報の更新中にエラーが発生しました',
        'INTERNAL_ERROR',
        500,
        { salonId, error: error instanceof Error ? error.message : '不明なエラー' }
      );
    }
  }

  // Stripe - Connect

  async getConnectAccount(ctx: QueryCtx, salonId: Id<'salon'>) {
    return await this.salonRepo.getConnectAccount(ctx, salonId);
  }
  async findSalonByConnectId(ctx: QueryCtx, accountId: string) {
    return await this.salonRepo.findSalonByConnectId(ctx, accountId);
  }
  async createConnectAccount(ctx: MutationCtx, data: SalonStripeConnectInput) {
    return await this.salonRepo.createConnectAccount(ctx, data.salonId as Id<'salon'>, data);
  }
  async updateStripeConnectStatus(ctx: MutationCtx, data: SalonStripeConnectInput) {
    return await this.salonRepo.updateStripeConnectStatus(
      ctx,
      data.salonId as Id<'salon'>,
      data.status
    );
  }
  async updateStripeConnect(ctx: MutationCtx, data: SalonStripeConnectInput) {
    return await this.salonRepo.updateStripeConnect(
      ctx,
      data.salonId as Id<'salon'>,
      data.accountId,
      data.status
    );
  }
  async getConnectAccountDetails(ctx: QueryCtx, salonId: Id<'salon'>) {
    return await this.salonRepo.getConnectAccountDetails(ctx, salonId);
  }

  // Stripe - Subscription
  async updateSubscriptionByCustomerId(
    ctx: MutationCtx,
    stripeCustomerId: string,
    subscriptionId: string,
    subscriptionStatus: string
  ) {
    // Stripe顧客IDによるサロン検索
    const salon = await this.salonRepo.findByStripeCustomerId(ctx, stripeCustomerId);
    if (!salon) {
      return false;
    }

    // サブスクリプション情報の更新
    return await this.salonRepo.updateSubscription(
      ctx,
      salon._id,
      subscriptionId,
      subscriptionStatus
    );
  }

  /**
   * サロン全ての関連情報を論理削除（アーカイブ）
   */
  async archiveSalonRelations(ctx: MutationCtx, salonId: Id<'salon'>) {
    // サロンの存在確認
    await this.salonRepo.get(ctx, salonId);

    // サロン関連データをすべてアーカイブ
    const config = await this.configRepo.findBySalonId(ctx, salonId);
    if (config) {
      await this.configRepo.archive(ctx, config._id);
    }

    const apiConfig = await this.apiConfigRepo.findBySalonId(ctx, salonId);
    if (apiConfig) {
      await this.apiConfigRepo.archive(ctx, apiConfig._id);
    }

    const scheduleConfig = await this.scheduleConfigRepo.findBySalonId(ctx, salonId);
    if (scheduleConfig) {
      await this.scheduleConfigRepo.archive(ctx, scheduleConfig._id);
    }

    // 最後にサロン自体をアーカイブ
    return await this.salonRepo.archive(ctx, salonId);
  }
}

export default SalonService;
