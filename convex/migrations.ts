// convex/fixData.ts
//**
// マイグレーションの際はschema.tsのdefineSchemaのschemaValidationをfalseにする。
// 以下のように記載する。
// ,{
//   schemaValidation: false
// } */

import { internalMutation } from './_generated/server';

export const migrateGenderAllToUnselected = internalMutation({
  args: {},
  handler: async (ctx) => {
    const menus = await ctx.db.query('menu').collect();

    let updatedCount = 0;

    for (const menu of menus) {
      if ((menu as any).targetGender === 'all') {
        await ctx.db.patch(menu._id, {
          target_gender: 'unselected' as const,
        });
        updatedCount++;
      }
    }

    return { updatedCount };
  },
});
