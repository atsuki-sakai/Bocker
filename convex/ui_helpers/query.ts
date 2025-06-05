import { v } from "convex/values";
import { query } from "../_generated/server";
import { api } from "../_generated/api";

export const getInitialReservationUIData = query({
  args: {
    tenant_id: v.id("tenant"),
    org_id: v.id("organization"),
  },
  handler: async (ctx, args) => {
    const reservationConfigData = await ctx.runQuery(
      api.organization.reservation_config.query.findByTenantAndOrg,
      {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
      }
    );

    const orgWeekSchedulesData = await ctx.runQuery(
      api.organization.week_schedule.query.getAllByTenantAndOrg,
      {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
      }
    );

    // For orgExceptionSchedules, we'll use getByScheduleList to fetch all non-archived schedules.
    const orgExceptionSchedulesData = await ctx.runQuery(
      api.organization.exception_schedule.query.getByScheduleList,
      {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        // type is optional in getByScheduleList, omitting it will return all types
      }
    );

    return {
      reservationConfig: reservationConfigData,
      orgWeekSchedules: orgWeekSchedulesData,
      orgExceptionSchedules: orgExceptionSchedulesData, // This will be an array of all exception schedules
    };
  },
});
