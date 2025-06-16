/**
 * Convex API 型定義ヘルパー
 * 
 * Convexが生成する型定義では、パスがそのまま保持されるため、
 * より直感的なアクセスを可能にするヘルパー型を定義します。
 */

import { internal as _internal } from "../_generated/api";

/**
 * internal APIのエイリアス
 * migration/query のようなパスをドット記法でアクセスできるようにする
 */
export const internal = {
  migration: {
    query: (_internal as any)["migration/query"],
    mutation: (_internal as any)["migration/mutation"],
    action: (_internal as any)["migration/action"]
  },
  // 他のモジュールも必要に応じて追加
  coupon: {
    query: (_internal as any)["coupon/query"],
    mutation: (_internal as any)["coupon/mutation"],
    config: {
      query: (_internal as any)["coupon/config/query"],
      mutation: (_internal as any)["coupon/config/mutation"]
    },
    exclusion_menu: {
      query: (_internal as any)["coupon/exclusion_menu/query"],
      mutation: (_internal as any)["coupon/exclusion_menu/mutation"]
    }
  },
  menu: {
    query: (_internal as any)["menu/query"],
    mutation: (_internal as any)["menu/mutation"],
    menu_exclusion_staff: {
      query: (_internal as any)["menu/menu_exclusion_staff/query"],
      mutation: (_internal as any)["menu/menu_exclusion_staff/mutation"]
    }
  },
  option: {
    query: (_internal as any)["option/query"],
    mutation: (_internal as any)["option/mutation"]
  },
  organization: {
    query: (_internal as any)["organization/query"],
    mutation: (_internal as any)["organization/mutation"],
    api_config: {
      query: (_internal as any)["organization/api_config/query"],
      mutation: (_internal as any)["organization/api_config/mutation"]
    },
    config: {
      query: (_internal as any)["organization/config/query"],
      mutation: (_internal as any)["organization/config/mutation"]
    },
    exception_schedule: {
      query: (_internal as any)["organization/exception_schedule/query"],
      mutation: (_internal as any)["organization/exception_schedule/mutation"]
    },
    reservation_config: {
      query: (_internal as any)["organization/reservation_config/query"],
      mutation: (_internal as any)["organization/reservation_config/mutation"]
    },
    week_schedule: {
      query: (_internal as any)["organization/week_schedule/query"],
      mutation: (_internal as any)["organization/week_schedule/mutation"]
    }
  },
  point: {
    query: (_internal as any)["point/query"],
    mutation: (_internal as any)["point/mutation"],
    exclusion_menu: {
      query: (_internal as any)["point/exclusion_menu/query"],
      mutation: (_internal as any)["point/exclusion_menu/mutation"]
    },
    queue: {
      query: (_internal as any)["point/queue/query"],
      mutation: (_internal as any)["point/queue/mutation"]
    }
  },
  reservation: {
    query: (_internal as any)["reservation/query"],
    mutation: (_internal as any)["reservation/mutation"]
  },
  staff: {
    query: (_internal as any)["staff/query"],
    mutation: (_internal as any)["staff/mutation"],
    action: (_internal as any)["staff/action"],
    config: {
      query: (_internal as any)["staff/config/query"],
      mutation: (_internal as any)["staff/config/mutation"]
    },
    exception_schedule: {
      query: (_internal as any)["staff/exception_schedule/query"],
      mutation: (_internal as any)["staff/exception_schedule/mutation"]
    },
    invitation: {
      query: (_internal as any)["staff/invitation/query"],
      mutation: (_internal as any)["staff/invitation/mutation"],
      action: (_internal as any)["staff/invitation/action"]
    },
    week_schedule: {
      query: (_internal as any)["staff/week_schedule/query"],
      mutation: (_internal as any)["staff/week_schedule/mutation"]
    }
  },
  storage: {
    action: (_internal as any)["storage/action"]
  },
  tenant: {
    query: (_internal as any)["tenant/query"],
    mutation: (_internal as any)["tenant/mutation"],
    plan: {
      query: (_internal as any)["tenant/plan/query"]
    },
    referral: {
      query: (_internal as any)["tenant/referral/query"],
      mutation: (_internal as any)["tenant/referral/mutation"],
      action: (_internal as any)["tenant/referral/action"]
    },
    subscription: {
      query: (_internal as any)["tenant/subscription/query"],
      mutation: (_internal as any)["tenant/subscription/mutation"],
      action: (_internal as any)["tenant/subscription/action"]
    }
  },
  webhook_events: {
    mutation: (_internal as any)["webhook_events/mutation"]
  }
};

/**
 * 型安全なinternal API参照
 * 
 * 使用例:
 * ```typescript
 * import { internal } from "../types/api-helpers";
 * 
 * // anyキャストなしで使用可能
 * const stats = await ctx.runQuery(internal.migration.query.getMigrationStats, {
 *   cutoffTime
 * });
 * ```
 */
export type InternalAPI = typeof internal;
