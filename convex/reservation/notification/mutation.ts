import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { createRecord, killRecord } from '@/convex/utils/helpers';


export const create = mutation({
  args: v.object({
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    reservation_id: v.id('reservation'),
  }),
  handler: async (ctx, args) => {
    const { tenant_id, org_id, reservation_id } = args;
    const reservation = await ctx.db.get(reservation_id);
    if (!reservation) {
      throw new ConvexError({
        severity: ERROR_SEVERITY.ERROR,
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        message: 'Reservation not found',
      });
    }
    const notificationId = await createRecord(ctx, 'reservation_notification', {
      tenant_id,
      org_id,
      reservation_id,
      notification_sent: false,
      notification_sent_at: new Date().getTime(),
      date: reservation.date,
      start_time_unix: reservation.start_time_unix,
      end_time_unix: reservation.end_time_unix,
      customer_name: reservation.customer_name,
      staff_name: reservation.staff_name,
      status: reservation.status,
      payment_status: reservation.payment_status,
    });
    return {
      success: true,
      reservation_notification_id: notificationId,
    };
  },
});

export const kill = mutation({
  args: v.object({
    reservation_notification_id: v.id('reservation_notification'),
  }),
  handler: async (ctx, args) => {
    const { reservation_notification_id } = args;
    await killRecord(ctx, reservation_notification_id);
    return {
      success: true,
    };
  },
});

export const killAll = mutation({
  args: v.object({
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    reservation_ids: v.array(v.id('reservation')),
  }),
  handler: async (ctx, args) => {
    Promise.all(args.reservation_ids.map(async (reservation_id) => {
      await killRecord(ctx, reservation_id);
    }));
    return {
      success: true,
    };
  },
});

