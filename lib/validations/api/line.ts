import { z } from 'zod'

// LINE message request schema
export const lineMessageRequestSchema = z.object({
  lineId: z.string().min(1),
  message: z.string().min(1).max(5000),
  accessToken: z.string().min(1),
})

// LINE Flex message request schema
export const lineFlexMessageRequestSchema = z.object({
  lineId: z.string().min(1),
  messageData: z.object({
    menus: z.array(z.object({
      name: z.string(),
      price: z.number(),
      duration: z.number(),
    })),
    options: z.array(z.object({
      name: z.string(),
      price: z.number(),
    })).optional(),
    date: z.string(),
    time: z.string(),
    staffName: z.string(),
    shopName: z.string(),
    customerId: z.string(),
    organizationId: z.string(),
  }),
  accessToken: z.string().min(1),
})

// LINE session request schema
export const lineSessionRequestSchema = z.object({
  sessionId: z.string().min(1),
})

// LINE token verification schema
export const lineVerifyTokenSchema = z.object({
  accessToken: z.string().min(1),
})