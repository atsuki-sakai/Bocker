import { BaseRepository } from '@/services/convex/repositories/BaseRepository';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';
import {
  SalonCreateInput,
  SalonUpdateInput,
  SalonStripeConnectInput,
} from '@/services/convex/types/salon';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

export class SalonRepository extends BaseRepository<'salon'> {
  private static instance: SalonRepository | null = null;
  private constructor() {
    super('salon');
  }

  public static getInstance(): SalonRepository {
    if (!SalonRepository.instance) {
      SalonRepository.instance = new SalonRepository();
    }
    return SalonRepository.instance;
  }

  async findByClerkId(ctx: QueryCtx, clerkId: string): Promise<Doc<'salon'> | null> {
    return await ctx.db
      .query('salon')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId).eq('isArchive', false))
      .first();
  }

  async findByStripeCustomerId(
    ctx: QueryCtx,
    stripeCustomerId: string
  ): Promise<Doc<'salon'> | null> {
    return await ctx.db
      .query('salon')
      .withIndex('by_stripe_customer_id', (q) =>
        q.eq('stripeCustomerId', stripeCustomerId).eq('isArchive', false)
      )
      .first();
  }
  async createSalon(ctx: MutationCtx, data: SalonCreateInput): Promise<Id<'salon'>> {
    // サロンデータ作成
    return await this.create(ctx, { ...data });
  }

  async updateSalon(
    ctx: MutationCtx,
    id: Id<'salon'>,
    data: SalonUpdateInput
  ): Promise<Id<'salon'>> {
    try {
      if (data.stripeCustomerId) {
        const existingSalon = await this.findByStripeCustomerId(ctx, data.stripeCustomerId);
        if (existingSalon) {
          const err = new ConvexCustomError(
            'low',
            'サロンが既に存在します',
            'DUPLICATE_RECORD',
            400,
            {
              stripeCustomerId: data.stripeCustomerId,
            }
          );
          throw err;
        }
      }
      return await this.update(ctx, id, data);
    } catch (error) {
      const err = new ConvexCustomError(
        'high',
        'サロンの更新に失敗しました',
        'INTERNAL_ERROR',
        500,
        {
          data,
        }
      );
      throw err;
    }
  }

  async upsert(ctx: MutationCtx, id: Id<'salon'>, data: SalonCreateInput): Promise<Id<'salon'>> {
    if (!id) {
      const err = new ConvexCustomError('low', 'サロンIDが必要です', 'INVALID_ARGUMENT', 400, {
        ...data,
      });
      throw err;
    }

    const existing = await this.find(ctx, id);

    if (existing) {
      await this.update(ctx, existing._id, data);
      return existing._id;
    } else {
      // salonIdが存在することを保証したデータを作成
      const createData = {
        ...data,
      };
      return await this.create(ctx, createData);
    }
  }

  async updateSubscription(
    ctx: MutationCtx,
    subscriptionId: string,
    subscriptionStatus: string,
    stripeCustomerId: string
  ): Promise<Id<'salon'> | null> {
    // 1. 顧客IDでサロンを検索
    let salon = await ctx.db
      .query('salon')
      .withIndex('by_stripe_customer_id', (q) => q.eq('stripeCustomerId', stripeCustomerId))
      .first();

    // 2. 顧客IDでサロンが見つからない場合
    if (!salon) {
      const err = new ConvexCustomError('high', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        call: 'salonRepository.updateSubscription',
        stripeCustomerId,
        subscriptionId,
        subscriptionStatus,
      });
      throw err;
    }

    // サブスクリプションの情報を更新して返す
    await ctx.db.patch(salon._id, {
      subscriptionId: subscriptionId,
      subscriptionStatus: subscriptionStatus,
    });
    return salon._id;
  }

  async getConnectAccount(ctx: QueryCtx, salonId: Id<'salon'>) {
    const salon = await ctx.db.get(salonId);

    if (!salon) {
      const err = new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        salonId,
      });
      throw err;
    }
    // Stripe Connect情報を返す
    return {
      accountId: salon.stripeConnectId || null,
      status: salon.stripeConnectStatus || 'not_connected',
    };
  }

  async createConnectAccount(
    ctx: MutationCtx,
    salonId: Id<'salon'>,
    data: SalonStripeConnectInput
  ) {
    if (!salonId) {
      const err = new ConvexCustomError(
        'low',
        'サロンIDが指定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          salonId,
        }
      );
      throw err;
    }

    // サロン取得
    const salon = await ctx.db.get(salonId);

    if (!salon) {
      const err = new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        salonId,
      });
      throw err;
    }

    // StripeConnect情報をサロンに保存
    return await ctx.db.patch(salon._id, {
      stripeConnectId: data.accountId,
      stripeConnectStatus: data.status,
      stripeConnectCreatedAt: Date.now(),
    });
  }

  async updateStripeConnectStatus(
    ctx: MutationCtx,
    id: Id<'salon'>,
    status: string
  ): Promise<Id<'salon'>> {
    return await this.update(ctx, id, {
      stripeConnectStatus: status,
    });
  }

  async updateStripeConnect(
    ctx: MutationCtx,
    id: Id<'salon'>,
    status: string,
    accountId: string
  ): Promise<Id<'salon'>> {
    try {
      return await this.update(ctx, id, {
        stripeConnectStatus: status,
        stripeConnectId: accountId,
      });
    } catch (error) {
      const err = new ConvexCustomError(
        'high',
        'Stripe連携の更新に失敗しました',
        'INTERNAL_ERROR',
        500,
        {
          status,
          accountId,
        }
      );
      throw err;
    }
  }

  async findSalonByConnectId(ctx: QueryCtx, accountId: string): Promise<Doc<'salon'>[]> {
    if (!accountId) {
      const err = new ConvexCustomError(
        'low',
        'StripeConnectアカウントIDが指定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          accountId,
        }
      );
      throw err;
    }

    // Stripe ConnectIDに紐づくサロンを検索
    const salons = await ctx.db
      .query('salon')
      .withIndex('by_stripe_connect_id', (q) => q.eq('stripeConnectId', accountId))
      .collect();

    return salons;
  }

  async getConnectAccountDetails(
    ctx: QueryCtx,
    salonId: Id<'salon'>
  ): Promise<{
    accountId: string | null;
    status: string | null;
    createdAt: string | null;
  }> {
    const salon = await ctx.db.get(salonId);
    if (!salon) {
      const err = new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        salonId,
      });
      throw err;
    }
    return {
      accountId: salon.stripeConnectId || null,
      status: salon.stripeConnectStatus || null,
      createdAt: salon.stripeConnectCreatedAt
        ? new Date(salon.stripeConnectCreatedAt).toISOString()
        : null,
    };
  }
}
