import { z } from 'zod'
import { convexIdSchema } from './common'

// Stripe Connect account creation schema
export const stripeConnectRequestSchema = z.object({
  tenant_id: convexIdSchema,
  org_id: convexIdSchema,
})

// Stripe Connect status check schema
export const stripeConnectStatusSchema = z.object({
  tenant_id: convexIdSchema,
  org_id: convexIdSchema,
})

// Stripe Connect login schema
export const stripeConnectLoginSchema = z.object({
  tenant_id: convexIdSchema,
  org_id: convexIdSchema,
})

// Stripe Checkout session schema
export const stripeCheckoutSchema = z.object({
  stripeConnectId: z.string().startsWith('acct_'),
  reservationId: convexIdSchema,
  tenantId: convexIdSchema,
  orgId: convexIdSchema,
  customerEmail: z.string().email().optional(),
  lineItems: z.array(z.object({
    price_data: z.object({
      unit_amount: z.number().int().positive(),
      currency: z.string().length(3),
      product_data: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        images: z.array(z.string().url()).optional(),
      }),
    }),
    quantity: z.number().int().positive().default(1),
  })).min(1),
  couponId: z.string().optional(),
  pointsUsedAmount: z.number().int().min(0).optional(),
}).refine((data) => {
  // JPY currency check for minimum amount
  return data.lineItems.every(item => {
    if (item.price_data.currency.toLowerCase() === 'jpy') {
      return item.price_data.unit_amount >= 50;
    }
    return true;
  });
}, {
  message: 'JPY通貨の場合、金額は50円以上である必要があります',
})