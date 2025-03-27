import { mutation } from './../_generated/server';
import { v } from 'convex/values';
import schema from '../schema';
import { excludeFields } from '../helpers';
import { handleConvexApiError, removeEmptyFields } from '../helpers';
import { ERROR_CODES } from '../errors';
import { validateSalonConfig } from '../salon/config';
import { validateSalonApiConfig } from '../salon/api_config';
import { validateSalonScheduleConfig } from '../salon/schedule_config';

const commonExcludedFields = ['isArchive', 'salonId', 'deletedAt'];

export const upsertAllSettings = mutation({
  args: {
    salonId: v.id('salon'),
    configId: v.id('salon_config'),
    scheduleConfigId: v.id('salon_schedule_config'),
    apiConfigId: v.id('salon_api_config'),
    config: excludeFields(schema.tables.salon_config.validator.fields, commonExcludedFields),
    api_config: excludeFields(
      schema.tables.salon_api_config.validator.fields,
      commonExcludedFields
    ),
    schedule_config: excludeFields(
      schema.tables.salon_schedule_config.validator.fields,
      commonExcludedFields
    ),
  },
  handler: async (ctx, args) => {
    try {
      validateSalonConfig(args.config);
      validateSalonApiConfig(args.api_config);
      validateSalonScheduleConfig(args.schedule_config);
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        handleConvexApiError('サロンが見つかりません', ERROR_CODES.NOT_FOUND);
      }
      const config = await ctx.db.get(args.configId);
      if (!config) {
        await ctx.db.insert('salon_config', {
          ...args.config,
          salonId: args.salonId,
          isArchive: false,
        });
      } else {
        const updatedConfig = removeEmptyFields(args.config);
        await ctx.db.patch(args.configId, {
          ...updatedConfig,
        });
      }
      const scheduleConfig = await ctx.db.get(args.scheduleConfigId);
      if (!scheduleConfig) {
        await ctx.db.insert('salon_schedule_config', {
          ...args.schedule_config,
          salonId: args.salonId,
          isArchive: false,
        });
      } else {
        const updatedScheduleConfig = removeEmptyFields(args.schedule_config);
        await ctx.db.patch(args.scheduleConfigId, {
          ...updatedScheduleConfig,
        });
      }
      const apiConfig = await ctx.db.get(args.apiConfigId);
      if (!apiConfig) {
        await ctx.db.insert('salon_api_config', {
          ...args.api_config,
          salonId: args.salonId,
          isArchive: false,
        });
      } else {
        const updatedApiConfig = removeEmptyFields(args.api_config);
        await ctx.db.patch(args.apiConfigId, {
          ...updatedApiConfig,
        });
      }
    } catch (error) {
      handleConvexApiError('Failed to add all settings', ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});
