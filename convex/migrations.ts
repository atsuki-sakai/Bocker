// convex/fixData.ts
import { internalMutation } from './_generated/server';

export const migrateGenderAllToUnselected = internalMutation({
  args: {},
  handler: async (ctx) => {
    const menus = await ctx.db.query('menu').collect();

    let updatedCount = 0;

    for (const menu of menus) {
      if ((menu.targetGender as any) === 'all') {
        await ctx.db.patch(menu._id, {
          targetGender: 'unselected' as const,
        });
        updatedCount++;
      }
    }

    return { updatedCount };
  },
});

export const migrateTimeToMinStringToNumber = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('Starting migration: timeToMin from string to number');

    // 全てのmenuレコードを取得
    const menus = await ctx.db.query('menu').collect();

    let updatedCount = 0;

    // timeToMinが文字列のレコードをすべて数値に更新
    for (const menu of menus) {
      if (menu.timeToMin !== undefined && typeof menu.timeToMin === 'string') {
        // 文字列を数値に変換
        const timeToMinNumber = parseInt(menu.timeToMin, 10);

        if (!isNaN(timeToMinNumber)) {
          await ctx.db.patch(menu._id, {
            timeToMin: timeToMinNumber,
          });
          console.log(
            `Updated menu ${menu._id}: timeToMin from "${menu.timeToMin}" to ${timeToMinNumber}`
          );
          updatedCount++;
        } else {
          console.warn(`Invalid timeToMin value for menu ${menu._id}: "${menu.timeToMin}"`);
        }
      }
    }

    console.log(`Migration completed: ${updatedCount} menu records updated from string to number`);

    return {
      success: true,
      updatedCount,
    };
  },
});

export const migratePriceToUnitPrice = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('Starting migration: price to unitPrice');

    // 全てのmenuレコードを取得
    const menus = await ctx.db.query('menu').collect();

    let updatedCount = 0;

    // priceフィールドを持つレコードをunitPriceに移行
    for (const menu of menus) {
      // anyを使ってpriceフィールドにアクセス
      const price = (menu as any).price;

      if (price !== undefined && (!menu.unitPrice || menu.unitPrice === 0)) {
        // パッチ操作用のオブジェクトを作成
        const patchData: any = {
          unitPrice: price,
        };

        // 直接priceを削除するのではなく、Document.patchを使用して更新
        await ctx.db.patch(menu._id, patchData);

        // 別の操作でpriceフィールドを削除
        const menuWithPrice = await ctx.db.get(menu._id);
        if (menuWithPrice) {
          // データベースに直接アクセスしてpriceフィールドを削除
          const { _id, ...fieldsWithoutId } = menuWithPrice;
          const rawData = { ...fieldsWithoutId } as any;
          delete rawData.price;
          await ctx.db.replace(menu._id, rawData);
        }

        console.log(`Updated menu ${menu._id}: price ${price} moved to unitPrice`);
        updatedCount++;
      }
    }

    console.log(
      `Migration completed: ${updatedCount} menu records updated from price to unitPrice`
    );

    return {
      success: true,
      updatedCount,
    };
  },
});

export const migrateStaffAuthAdminRole = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('Starting migration: staff_auth admin role to owner');

    // staff_authテーブルの全レコードを取得
    const staffAuths = await ctx.db.query('staff_auth').collect();

    let updatedCount = 0;

    // roleが"admin"のレコードを"owner"に更新
    for (const staffAuth of staffAuths) {
      if ((staffAuth.role as any) === 'admin') {
        await ctx.db.patch(staffAuth._id, {
          role: 'owner' as const,
        });
        console.log(`Updated staff_auth ${staffAuth._id}: role from "admin" to "owner"`);
        updatedCount++;
      }
    }

    console.log(
      `Migration completed: ${updatedCount} staff_auth records updated from "admin" to "owner"`
    );

    return {
      success: true,
      updatedCount,
    };
  },
});
