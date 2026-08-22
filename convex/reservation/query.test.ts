import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

declare global {
  interface ImportMeta {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>
  }
}

const modules = {
  ...import.meta.glob('./../**/*.*s'),
  '../reservation/query.ts': () => import('./query'),
}

test('reservation - getById', async () => {
  const t = convexTest(schema, modules)
  const reservationId = await t.run(async (ctx) => {
    const tenantId = await ctx.db.insert('tenant', {
      user_id: 'test-user',
      user_email: 'test@example.com',
    })
    const orgId = await ctx.db.insert('organization', {
      tenant_id: tenantId,
      is_active: true,
      org_name: 'Test Salon',
    })

    return await ctx.db.insert('reservation', {
      tenant_id: tenantId,
      org_id: orgId,
      customer_name: 'Test Customer',
      status: 'confirmed',
      payment_status: 'pending',
      date: '2026-08-22',
      start_time_unix: 1_777_000_000_000,
      end_time_unix: 1_777_003_600_000,
    })
  })

  const result = await t.query(api.reservation.query.getById, { id: reservationId })
  expect(reservationId).toBe(result?._id)
})
