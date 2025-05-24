/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as migrations from "../migrations.js";
import type * as organization_api_config_mutation from "../organization/api_config/mutation.js";
import type * as organization_api_config_query from "../organization/api_config/query.js";
import type * as organization_config_mutation from "../organization/config/mutation.js";
import type * as organization_config_query from "../organization/config/query.js";
import type * as organization_exception_schedule_mutation from "../organization/exception_schedule/mutation.js";
import type * as organization_exception_schedule_query from "../organization/exception_schedule/query.js";
import type * as organization_reservation_config_mutation from "../organization/reservation_config/mutation.js";
import type * as organization_reservation_config_query from "../organization/reservation_config/query.js";
import type * as organization_stripe_connect_mutation from "../organization/stripe_connect/mutation.js";
import type * as organization_stripe_connect_query from "../organization/stripe_connect/query.js";
import type * as organization_week_schedule_mutation from "../organization/week_schedule/mutation.js";
import type * as organization_week_schedule_query from "../organization/week_schedule/query.js";
import type * as reservation_action from "../reservation/action.js";
import type * as reservation_mutation from "../reservation/mutation.js";
import type * as reservation_query from "../reservation/query.js";
import type * as storage_action from "../storage/action.js";
import type * as tenant_mutation from "../tenant/mutation.js";
import type * as tenant_query from "../tenant/query.js";
import type * as tenant_referral_action from "../tenant/referral/action.js";
import type * as tenant_referral_mutation from "../tenant/referral/mutation.js";
import type * as tenant_referral_query from "../tenant/referral/query.js";
import type * as tenant_subscription_action from "../tenant/subscription/action.js";
import type * as tenant_subscription_mutation from "../tenant/subscription/mutation.js";
import type * as tenant_subscription_query from "../tenant/subscription/query.js";
import type * as types from "../types.js";
import type * as utils_auth from "../utils/auth.js";
import type * as utils_helpers from "../utils/helpers.js";
import type * as utils_validations from "../utils/validations.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  constants: typeof constants;
  crons: typeof crons;
  migrations: typeof migrations;
  "organization/api_config/mutation": typeof organization_api_config_mutation;
  "organization/api_config/query": typeof organization_api_config_query;
  "organization/config/mutation": typeof organization_config_mutation;
  "organization/config/query": typeof organization_config_query;
  "organization/exception_schedule/mutation": typeof organization_exception_schedule_mutation;
  "organization/exception_schedule/query": typeof organization_exception_schedule_query;
  "organization/reservation_config/mutation": typeof organization_reservation_config_mutation;
  "organization/reservation_config/query": typeof organization_reservation_config_query;
  "organization/stripe_connect/mutation": typeof organization_stripe_connect_mutation;
  "organization/stripe_connect/query": typeof organization_stripe_connect_query;
  "organization/week_schedule/mutation": typeof organization_week_schedule_mutation;
  "organization/week_schedule/query": typeof organization_week_schedule_query;
  "reservation/action": typeof reservation_action;
  "reservation/mutation": typeof reservation_mutation;
  "reservation/query": typeof reservation_query;
  "storage/action": typeof storage_action;
  "tenant/mutation": typeof tenant_mutation;
  "tenant/query": typeof tenant_query;
  "tenant/referral/action": typeof tenant_referral_action;
  "tenant/referral/mutation": typeof tenant_referral_mutation;
  "tenant/referral/query": typeof tenant_referral_query;
  "tenant/subscription/action": typeof tenant_subscription_action;
  "tenant/subscription/mutation": typeof tenant_subscription_mutation;
  "tenant/subscription/query": typeof tenant_subscription_query;
  types: typeof types;
  "utils/auth": typeof utils_auth;
  "utils/helpers": typeof utils_helpers;
  "utils/validations": typeof utils_validations;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
