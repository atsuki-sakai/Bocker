import { BaseRepository } from '@/services/convex/repositories/BaseRepository';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';
import {
  SalonCreateInput,
  SalonUpdateInput,
  SalonStripeConnectInput,
} from '@/services/convex/types/salon';
import { throwConvexError } from '@/lib/error';

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

  async updateSalon(ctx: MutationCtx, id: Id<'salon'>, data: SalonUpdateInput) {
    try {
      if (data.stripeCustomerId) {
        const existingSalon = await this.findByStripeCustomerId(ctx, data.stripeCustomerId);
        if (existingSalon) {
          throw throwConvexError({
            message: 'サロンが既に存在します',
            status: 400,
            code: 'DUPLICATE_RECORD',
            title: 'サロンが既に存在します',
            callFunc: 'salonRepository.updateSalon',
            severity: 'low',
            details: {
              stripeCustomerId: data.stripeCustomerId,
            },
          });
        }
      }
      return await this.update(ctx, id, data);
    } catch (error) {
      throw throwConvexError({
        message: 'サロンの更新に失敗しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'サロンの更新に失敗しました',
        callFunc: 'salonRepository.updateSalon',
        severity: 'low',
        details: {
          ...data,
        },
      });
    }
  }

  async upsert(ctx: MutationCtx, id: Id<'salon'>, data: SalonCreateInput): Promise<Id<'salon'>> {
    if (!id) {
      throw throwConvexError({
        message: 'サロンIDが必要です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: 'サロンIDが必要です',
        callFunc: 'salonRepository.upsert',
        severity: 'low',
        details: {
          ...data,
        },
      });
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
      throw throwConvexError({
        message: 'サロンが見つかりません',
        status: 404,
        code: 'NOT_FOUND',
        title: 'サロンが見つかりません',
        callFunc: 'salonRepository.updateSubscription',
        severity: 'low',
        details: {
          stripeCustomerId,
          subscriptionId,
          subscriptionStatus,
        },
      });
      return null;
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
      throw throwConvexError({
        message: 'サロンが見つかりません',
        status: 404,
        code: 'NOT_FOUND',
        title: 'サロンが見つかりません',
        callFunc: 'salonRepository.getConnectAccount',
        severity: 'low',
        details: {
          salonId,
        },
      });
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
      throw throwConvexError({
        message: 'サロンIDが指定されていません',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: 'サロンIDが指定されていません',
        callFunc: 'salonRepository.createConnectAccount',
        severity: 'low',
        details: {
          salonId,
        },
      });
    }

    // サロン取得
    const salon = await ctx.db.get(salonId);

    if (!salon) {
      throw throwConvexError({
        message: 'サロンが見つかりません',
        status: 404,
        code: 'NOT_FOUND',
        title: 'サロンが見つかりません',
        callFunc: 'salonRepository.createConnectAccount',
        severity: 'low',
        details: {
          salonId,
        },
      });
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

  async updateStripeConnect(ctx: MutationCtx, id: Id<'salon'>, status: string, accountId: string) {
    try {
      return await this.update(ctx, id, {
        stripeConnectStatus: status,
        stripeConnectId: accountId,
      });
    } catch (error) {
      throw throwConvexError({
        message: 'Stripe連携の更新に失敗しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'Stripe連携の更新に失敗しました',
        callFunc: 'salonRepository.updateStripeConnect',
        severity: 'low',
        details: {
          status,
          accountId,
        },
      });
    }
  }

  async findSalonByConnectId(ctx: QueryCtx, accountId: string): Promise<Doc<'salon'>[]> {
    if (!accountId) {
      throw throwConvexError({
        message: 'StripeConnectアカウントIDが指定されていません',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: 'StripeConnectアカウントIDが指定されていません',
        callFunc: 'salonRepository.findSalonByConnectId',
        severity: 'low',
        details: {
          accountId,
        },
      });
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
      throw throwConvexError({
        message: 'サロンが見つかりません',
        status: 404,
        code: 'NOT_FOUND',
        title: 'サロンが見つかりません',
        callFunc: 'salonRepository.getConnectAccountDetails',
        severity: 'low',
        details: {
          salonId,
        },
      });
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
