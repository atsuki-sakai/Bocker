import { query } from '@/convex/_generated/server'
import { v } from 'convex/values'
import { validatePointExclusionMenu } from '@/services/convex/shared/utils/validation'
import { checkAuth } from '@/services/convex/shared/utils/auth'
import { pointService } from '@/services/convex/services'
import { throwConvexError } from '@/lib/error'

export const list = query({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validatePointExclusionMenu(args)
    const exclusionMenus = await pointService.listExclusionMenu(
      ctx,
      args.salonId,
      args.pointConfigId
    )
    return exclusionMenus
  },
})

export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    const pointConfig = await pointService.findBySalonId(ctx, args.salonId)

    if (!pointConfig) {
      throw throwConvexError({
        callFunc: 'pointService.findBySalonId',
        message: 'ポイント設定が見つかりません。',
        title: 'ポイント設定が見つかりません。',
        severity: 'low',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          salonId: args.salonId,
        },
      })
    }

    const exclusionMenus = await pointService.listExclusionMenu(ctx, args.salonId, pointConfig._id)

    return exclusionMenus
  },
})