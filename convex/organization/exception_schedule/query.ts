import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequired, validateDateStrFormat } from '@/convex/utils/validations';
import { exceptionScheduleType } from '@/convex/types';
import { checkAuth } from '@/convex/utils/auth';

export const displayExceptionSchedule = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    date: v.string(),
    take: v.optional(v.number()),
  },
  handler: async (ctx, args) => {

    validateRequired(args.org_id, 'org_id');
    validateDateStrFormat(args.date, 'date');
    return await ctx.db
      .query('exception_schedule')
      .withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false))
      .filter((q) => q.gte(q.field('date'), args.date)) // gteを使用して当日を含める
      .order('desc')
      .take(args.take || 30);
  },
});
// 取得関数の修正
export const getByScheduleList = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    type: exceptionScheduleType
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    validateRequired(args.org_id, 'org_id');
    
    // typeが指定されている場合は専用のインデックスを使用
    if (args.type !== undefined) {
      // by_tenant_org_type_archiveインデックスが存在する場合
      return await ctx.db
        .query('exception_schedule')
        .withIndex('by_tenant_org_archive', (q) =>
          q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)
        )
        .filter((q) => q.eq(q.field('type'), args.type))
        .collect();
    }
    
    // typeが指定されていない場合は全て取得
    return await ctx.db
      .query('exception_schedule')
      .withIndex('by_tenant_org_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)
      )
      .collect();
  },
});

// サロンIDと日付からサロンスケジュール例外を取得
export const getByOrgAndDate = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    type: exceptionScheduleType,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    return await ctx.db
      .query('exception_schedule')
      .withIndex('by_tenant_org_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('is_archive', false)
      ).collect();
  },
});
