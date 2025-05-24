import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { validateRequired, validateStringLength } from '@/convex/utils/validations';
import { imageType } from '@/convex/types';
import { createRecord, updateRecord } from '@/convex/utils/helpers';


export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    org_name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
 
    validateRequired(args.org_id, 'org_id');
    validateRequired(args.org_name, 'org_name');
    validateStringLength(args.email, 'email', 255);
    return await createRecord(ctx, 'config', {
      ...args,
      images: [],
    });
  },
});

export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    org_name: v.string(), // サロン名
    email: v.string(), // メールアドレス
    phone: v.optional(v.string()), // 電話番号
    postal_code: v.optional(v.string()), // 郵便番号
    address: v.optional(v.string()), // 住所
    reservation_rules: v.optional(v.string()), // 予約ルール
    images: v.array(imageType),
    description: v.optional(v.string()), // 説明
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    validateStringLength(args.org_name, 'org_name');
    validateStringLength(args.email, 'email');
    validateStringLength(args.phone, 'phone');
    validateStringLength(args.postal_code, 'postal_code');
    validateStringLength(args.address, 'address');
    validateStringLength(args.reservation_rules, 'reservation_rules');
    validateStringLength(args.description, 'description');

    const existing = await ctx.db.query('config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
    if (existing) {
      return await updateRecord(ctx, existing._id, args);
    } else {  
      return await createRecord(ctx, 'config', {
        ...args,
        images: [],
      });
    }
  },
});
