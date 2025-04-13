/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as carte_core from "../carte/core.js";
import type * as carte_detail from "../carte/detail.js";
import type * as coupon_config from "../coupon/config.js";
import type * as coupon_core from "../coupon/core.js";
import type * as coupon_coupon_exclusion_menu from "../coupon/coupon_exclusion_menu.js";
import type * as coupon_transaction from "../coupon/transaction.js";
import type * as customer_core from "../customer/core.js";
import type * as customer_detail from "../customer/detail.js";
import type * as customer_points from "../customer/points.js";
import type * as menu_core from "../menu/core.js";
import type * as menu_menu_exclusion_staff from "../menu/menu_exclusion_staff.js";
import type * as migrations from "../migrations.js";
import type * as option_core from "../option/core.js";
import type * as point_auth from "../point/auth.js";
import type * as point_config from "../point/config.js";
import type * as point_exclusion_menu from "../point/exclusion_menu.js";
import type * as point_task_queue from "../point/task_queue.js";
import type * as point_transaction from "../point/transaction.js";
import type * as reservation_core from "../reservation/core.js";
import type * as salon_api_config_mutation from "../salon/api_config/mutation.js";
import type * as salon_api_config_query from "../salon/api_config/query.js";
import type * as salon_config_mutation from "../salon/config/mutation.js";
import type * as salon_config_query from "../salon/config/query.js";
import type * as salon_core_mutation from "../salon/core/mutation.js";
import type * as salon_core_query from "../salon/core/query.js";
import type * as salon_schedule_mutation from "../salon/schedule/mutation.js";
import type * as salon_schedule_query from "../salon/schedule/query.js";
import type * as schedule_salon_schedule_exception from "../schedule/salon_schedule_exception.js";
import type * as schedule_salon_week_schedule from "../schedule/salon_week_schedule.js";
import type * as schedule_staff_schedule_exception from "../schedule/staff_schedule_exception.js";
import type * as schedule_staff_week_schedule from "../schedule/staff_week_schedule.js";
import type * as staff_auth from "../staff/auth.js";
import type * as staff_config from "../staff/config.js";
import type * as staff_core from "../staff/core.js";
import type * as staff_time_card from "../staff/time_card.js";
import type * as storage_action from "../storage/action.js";
import type * as subscription_action from "../subscription/action.js";
import type * as subscription_mutation from "../subscription/mutation.js";
import type * as subscription_query from "../subscription/query.js";

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
  "carte/core": typeof carte_core;
  "carte/detail": typeof carte_detail;
  "coupon/config": typeof coupon_config;
  "coupon/core": typeof coupon_core;
  "coupon/coupon_exclusion_menu": typeof coupon_coupon_exclusion_menu;
  "coupon/transaction": typeof coupon_transaction;
  "customer/core": typeof customer_core;
  "customer/detail": typeof customer_detail;
  "customer/points": typeof customer_points;
  "menu/core": typeof menu_core;
  "menu/menu_exclusion_staff": typeof menu_menu_exclusion_staff;
  migrations: typeof migrations;
  "option/core": typeof option_core;
  "point/auth": typeof point_auth;
  "point/config": typeof point_config;
  "point/exclusion_menu": typeof point_exclusion_menu;
  "point/task_queue": typeof point_task_queue;
  "point/transaction": typeof point_transaction;
  "reservation/core": typeof reservation_core;
  "salon/api_config/mutation": typeof salon_api_config_mutation;
  "salon/api_config/query": typeof salon_api_config_query;
  "salon/config/mutation": typeof salon_config_mutation;
  "salon/config/query": typeof salon_config_query;
  "salon/core/mutation": typeof salon_core_mutation;
  "salon/core/query": typeof salon_core_query;
  "salon/schedule/mutation": typeof salon_schedule_mutation;
  "salon/schedule/query": typeof salon_schedule_query;
  "schedule/salon_schedule_exception": typeof schedule_salon_schedule_exception;
  "schedule/salon_week_schedule": typeof schedule_salon_week_schedule;
  "schedule/staff_schedule_exception": typeof schedule_staff_schedule_exception;
  "schedule/staff_week_schedule": typeof schedule_staff_week_schedule;
  "staff/auth": typeof staff_auth;
  "staff/config": typeof staff_config;
  "staff/core": typeof staff_core;
  "staff/time_card": typeof staff_time_card;
  "storage/action": typeof storage_action;
  "subscription/action": typeof subscription_action;
  "subscription/mutation": typeof subscription_mutation;
  "subscription/query": typeof subscription_query;
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
};
