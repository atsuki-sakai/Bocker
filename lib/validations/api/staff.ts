import { z } from 'zod'
import { convexIdSchema, roleSchema, genderSchema, emailSchema, nameSchema, phoneSchema } from './common'

// Staff role update schema
export const updateStaffRoleSchema = z.object({
  staff_id: convexIdSchema,
  clerk_user_id: z.string().optional(),
  new_role: roleSchema,
})

// Staff invitation schema
export const inviteStaffSchema = z.object({
  email: emailSchema,
  tenant_id: convexIdSchema,
  org_id: convexIdSchema,
  name: nameSchema,
  role: roleSchema,
  age: z.number().int().min(18).max(100).optional(),
  gender: genderSchema.optional(),
  extra_charge: z.number().min(0).max(100000).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  phone: phoneSchema.optional(),
  images: z.array(z.string().url()).max(10).optional(),
  description: z.string().max(500).optional(),
})

// Staff deletion schema
export const deleteStaffSchema = z.object({
  staff_id: convexIdSchema,
  org_id: convexIdSchema,
})

// Invitation resend schema
export const resendInvitationSchema = z.object({
  invitation_id: z.string(),
  org_id: convexIdSchema,
})

// Get invitation schema
export const getInvitationSchema = z.object({
  org_id: convexIdSchema,
})

// Accept invitation params schema
export const acceptInvitationParamsSchema = z.object({
  params: z.object({
    invitation_id: z.string(),
  }),
})