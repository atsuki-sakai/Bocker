/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_mutation from "../admin/mutation.js";
import type * as admin_query from "../admin/query.js";
import type * as carte_core_mutation from "../carte/core/mutation.js";
import type * as carte_core_query from "../carte/core/query.js";
import type * as carte_detail_mutation from "../carte/detail/mutation.js";
import type * as carte_detail_query from "../carte/detail/query.js";
import type * as coupon_config_mutation from "../coupon/config/mutation.js";
import type * as coupon_config_query from "../coupon/config/query.js";
import type * as coupon_core_mutation from "../coupon/core/mutation.js";
import type * as coupon_core_query from "../coupon/core/query.js";
import type * as coupon_exclusion_menu_mutation from "../coupon/exclusion_menu/mutation.js";
import type * as coupon_exclusion_menu_query from "../coupon/exclusion_menu/query.js";
import type * as coupon_transaction_transaction from "../coupon/transaction/transaction.js";
import type * as crons from "../crons.js";
import type * as customer_core_mutation from "../customer/core/mutation.js";
import type * as customer_core_query from "../customer/core/query.js";
import type * as customer_detail_mutaiton from "../customer/detail/mutaiton.js";
import type * as customer_detail_query from "../customer/detail/query.js";
import type * as customer_points_mutation from "../customer/points/mutation.js";
import type * as customer_points_query from "../customer/points/query.js";
import type * as menu_core_mutation from "../menu/core/mutation.js";
import type * as menu_core_query from "../menu/core/query.js";
import type * as menu_menu_exclusion_staff_mutation from "../menu/menu_exclusion_staff/mutation.js";
import type * as menu_menu_exclusion_staff_query from "../menu/menu_exclusion_staff/query.js";
import type * as migrations from "../migrations.js";
import type * as option_mutation from "../option/mutation.js";
import type * as option_query from "../option/query.js";
import type * as point_auth_mutation from "../point/auth/mutation.js";
import type * as point_auth_query from "../point/auth/query.js";
import type * as point_config_mutation from "../point/config/mutation.js";
import type * as point_config_query from "../point/config/query.js";
import type * as point_exclusion_menu_mutation from "../point/exclusion_menu/mutation.js";
import type * as point_exclusion_menu_query from "../point/exclusion_menu/query.js";
import type * as point_task_queue_mutation from "../point/task_queue/mutation.js";
import type * as point_task_queue_query from "../point/task_queue/query.js";
import type * as point_transaction_mutation from "../point/transaction/mutation.js";
import type * as point_transaction_query from "../point/transaction/query.js";
import type * as reservation_mutation from "../reservation/mutation.js";
import type * as reservation_query from "../reservation/query.js";
import type * as salon_api_config_mutation from "../salon/api_config/mutation.js";
import type * as salon_api_config_query from "../salon/api_config/query.js";
import type * as salon_config_mutation from "../salon/config/mutation.js";
import type * as salon_config_query from "../salon/config/query.js";
import type * as salon_core_mutation from "../salon/core/mutation.js";
import type * as salon_core_query from "../salon/core/query.js";
import type * as salon_referral_action from "../salon/referral/action.js";
import type * as salon_referral_mutation from "../salon/referral/mutation.js";
import type * as salon_referral_query from "../salon/referral/query.js";
import type * as salon_schedule_mutation from "../salon/schedule/mutation.js";
import type * as salon_schedule_query from "../salon/schedule/query.js";
import type * as schedule_salon_exception_mutation from "../schedule/salon_exception/mutation.js";
import type * as schedule_salon_exception_query from "../schedule/salon_exception/query.js";
import type * as schedule_salon_week_schedule_mutation from "../schedule/salon_week_schedule/mutation.js";
import type * as schedule_salon_week_schedule_query from "../schedule/salon_week_schedule/query.js";
import type * as schedule_staff_exception_mutation from "../schedule/staff_exception/mutation.js";
import type * as schedule_staff_exception_query from "../schedule/staff_exception/query.js";
import type * as schedule_staff_week_schedule_mutation from "../schedule/staff_week_schedule/mutation.js";
import type * as schedule_staff_week_schedule_query from "../schedule/staff_week_schedule/query.js";
import type * as staff_auth_mutation from "../staff/auth/mutation.js";
import type * as staff_auth_query from "../staff/auth/query.js";
import type * as staff_config_mutation from "../staff/config/mutation.js";
import type * as staff_config_query from "../staff/config/query.js";
import type * as staff_core_mutation from "../staff/core/mutation.js";
import type * as staff_core_query from "../staff/core/query.js";
import type * as storage_action from "../storage/action.js";
import type * as subscription_action from "../subscription/action.js";
import type * as subscription_mutation from "../subscription/mutation.js";
import type * as subscription_query from "../subscription/query.js";
import type * as tracking_aggregate from "../tracking/aggregate.js";
import type * as tracking_mutation from "../tracking/mutation.js";
import type * as tracking_query from "../tracking/query.js";
import type * as tracking_triggers from "../tracking/triggers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "admin/mutation": typeof admin_mutation;
  "admin/query": typeof admin_query;
  "carte/core/mutation": typeof carte_core_mutation;
  "carte/core/query": typeof carte_core_query;
  "carte/detail/mutation": typeof carte_detail_mutation;
  "carte/detail/query": typeof carte_detail_query;
  "coupon/config/mutation": typeof coupon_config_mutation;
  "coupon/config/query": typeof coupon_config_query;
  "coupon/core/mutation": typeof coupon_core_mutation;
  "coupon/core/query": typeof coupon_core_query;
  "coupon/exclusion_menu/mutation": typeof coupon_exclusion_menu_mutation;
  "coupon/exclusion_menu/query": typeof coupon_exclusion_menu_query;
  "coupon/transaction/transaction": typeof coupon_transaction_transaction;
  crons: typeof crons;
  "customer/core/mutation": typeof customer_core_mutation;
  "customer/core/query": typeof customer_core_query;
  "customer/detail/mutaiton": typeof customer_detail_mutaiton;
  "customer/detail/query": typeof customer_detail_query;
  "customer/points/mutation": typeof customer_points_mutation;
  "customer/points/query": typeof customer_points_query;
  "menu/core/mutation": typeof menu_core_mutation;
  "menu/core/query": typeof menu_core_query;
  "menu/menu_exclusion_staff/mutation": typeof menu_menu_exclusion_staff_mutation;
  "menu/menu_exclusion_staff/query": typeof menu_menu_exclusion_staff_query;
  migrations: typeof migrations;
  "option/mutation": typeof option_mutation;
  "option/query": typeof option_query;
  "point/auth/mutation": typeof point_auth_mutation;
  "point/auth/query": typeof point_auth_query;
  "point/config/mutation": typeof point_config_mutation;
  "point/config/query": typeof point_config_query;
  "point/exclusion_menu/mutation": typeof point_exclusion_menu_mutation;
  "point/exclusion_menu/query": typeof point_exclusion_menu_query;
  "point/task_queue/mutation": typeof point_task_queue_mutation;
  "point/task_queue/query": typeof point_task_queue_query;
  "point/transaction/mutation": typeof point_transaction_mutation;
  "point/transaction/query": typeof point_transaction_query;
  "reservation/mutation": typeof reservation_mutation;
  "reservation/query": typeof reservation_query;
  "salon/api_config/mutation": typeof salon_api_config_mutation;
  "salon/api_config/query": typeof salon_api_config_query;
  "salon/config/mutation": typeof salon_config_mutation;
  "salon/config/query": typeof salon_config_query;
  "salon/core/mutation": typeof salon_core_mutation;
  "salon/core/query": typeof salon_core_query;
  "salon/referral/action": typeof salon_referral_action;
  "salon/referral/mutation": typeof salon_referral_mutation;
  "salon/referral/query": typeof salon_referral_query;
  "salon/schedule/mutation": typeof salon_schedule_mutation;
  "salon/schedule/query": typeof salon_schedule_query;
  "schedule/salon_exception/mutation": typeof schedule_salon_exception_mutation;
  "schedule/salon_exception/query": typeof schedule_salon_exception_query;
  "schedule/salon_week_schedule/mutation": typeof schedule_salon_week_schedule_mutation;
  "schedule/salon_week_schedule/query": typeof schedule_salon_week_schedule_query;
  "schedule/staff_exception/mutation": typeof schedule_staff_exception_mutation;
  "schedule/staff_exception/query": typeof schedule_staff_exception_query;
  "schedule/staff_week_schedule/mutation": typeof schedule_staff_week_schedule_mutation;
  "schedule/staff_week_schedule/query": typeof schedule_staff_week_schedule_query;
  "staff/auth/mutation": typeof staff_auth_mutation;
  "staff/auth/query": typeof staff_auth_query;
  "staff/config/mutation": typeof staff_config_mutation;
  "staff/config/query": typeof staff_config_query;
  "staff/core/mutation": typeof staff_core_mutation;
  "staff/core/query": typeof staff_core_query;
  "storage/action": typeof storage_action;
  "subscription/action": typeof subscription_action;
  "subscription/mutation": typeof subscription_mutation;
  "subscription/query": typeof subscription_query;
  "tracking/aggregate": typeof tracking_aggregate;
  "tracking/mutation": typeof tracking_mutation;
  "tracking/query": typeof tracking_query;
  "tracking/triggers": typeof tracking_triggers;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
    public: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; migrationNames?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      runMigration: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
  trackingSummaryAggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  trackingByDateAggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  trackingByCodeAggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  trackingByDateCodeEventTypeAggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
};
