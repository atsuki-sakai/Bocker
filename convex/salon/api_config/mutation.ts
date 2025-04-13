import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateSalonApiConfig } from '@/services/convex/shared/utils/validation';
import { salonService } from '@/services/convex/services';

export const create = mutation({
  args: {
    salonId: v.id('salon'),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonApiConfig(args);
    return await salonService.createApiConfig(ctx, args);
  },
});

export const update = mutation({
  args: {
    salonId: v.id('salon'),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonApiConfig(args);
    return await salonService.updateApiConfig(ctx, args);
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonApiConfig(args);
    return await salonService.upsertApiConfig(ctx, args);
  },
});
