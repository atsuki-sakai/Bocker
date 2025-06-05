import { action } from '../_generated/server';
import { v } from 'convex/values';
import { api } from '../_generated/api';
import { Id } from '../_generated/dataModel';

// Input validation for the action
export const setupNewUserWorkflowArgs = {
  userId: v.string(),
  userEmail: v.string(),
  stripeCustomerId: v.string(),
  referralCode: v.optional(v.string()), // Optional referral code
  orgName: v.optional(v.string()),     // Optional organization name from unsafe_metadata
};

export const setupNewUserWorkflow = action({
  args: setupNewUserWorkflowArgs,
  handler: async (ctx, args) => {
    // 1. Check if tenant already exists by userId
    const existingTenant = await ctx.runQuery(api.tenant.query.findByUserId, {
      user_id: args.userId,
    });

    if (existingTenant) {
      // 1a. Tenant exists, update their email (idempotency for user.created if user somehow re-triggers)
      // and ensure essential data is mostly up-to-date.
      // This part handles the case where user.created might be re-fired for an existing user.
      // The original webhook handler only updated the email.
      // We might want to enhance this to also update org_email if it changed,
      // but for now, we will stick to the original logic of only updating tenant's email.
      await ctx.runMutation(api.tenant.mutation.upsert, {
        user_id: args.userId,
        user_email: args.userEmail,
        // stripe_customer_id is not updated here as it should be stable for an existing tenant.
      });

      // Attempt to find the organization associated with this tenant.
      // This assumes a tenant has one primary organization.
      // If there could be multiple, this logic would need refinement.
      const organization = await ctx.runQuery(api.organization.query.findPrimaryByTenantId, { // Assuming findPrimaryByTenantId query exists or needs to be created.
        tenant_id: existingTenant._id,
      });

      console.log(`Tenant ${existingTenant._id} already exists. Email updated. OrgId: ${organization?._id}`);
      return {
        tenantId: existingTenant._id,
        orgId: organization?._id, // May be undefined if no org or query fails
        wasExisting: true,
      };
    }

    // 2. Tenant does not exist, proceed with full creation flow
    const tenantId = await ctx.runMutation(api.tenant.mutation.create, {
      user_id: args.userId,
      user_email: args.userEmail,
      stripe_customer_id: args.stripeCustomerId,
    });

    // 3. Create associated Organization
    // The original handler used org_name from unsafe_metadata or empty string, and user_email for org_email.
    const orgId = await ctx.runMutation(api.organization.mutation.create, {
      tenant_id: tenantId,
      org_name: args.orgName || `${args.userEmail}'s Organization`, // Default name if not provided
      org_email: args.userEmail, // Using user's email as organization's email
    });

    // 4. Create default configurations for the organization (run in parallel)
    // The original handler had these as non-critical, individually try-catched.
    // In an action, if one of these critical setup steps fails, the action might partially succeed
    // or we might want to roll back (which Convex doesn't support automatically across mutations).
    // For now, let them run, and if one fails, the overall action might still be considered
    // a partial success, or the client-side webhook handler can decide.
    // Alternatively, make them sequential and critical.
    // Given the original handler's approach, we'll log errors but not fail the whole action if one of these fails.

    try {
      await ctx.runMutation(api.tenant.referral.mutation.create, {
        tenant_id: tenantId,
        // referral_code from args.referralCode could be used here if needed by this mutation
      });
    } catch (error) {
      console.warn(`Failed to create referral for tenant ${tenantId}:`, error);
      // Optionally, collect/log these specific errors to be returned by the action
    }

    try {
      await ctx.runMutation(api.organization.config.mutation.create, {
        org_id: orgId,
        tenant_id: tenantId,
        images: [], // Default empty images
      });
    } catch (error) {
      console.warn(`Failed to create organization config for org ${orgId}:`, error);
    }

    try {
      await ctx.runMutation(api.organization.api_config.mutation.create, {
        org_id: orgId,
        tenant_id: tenantId,
      });
    } catch (error) {
      console.warn(`Failed to create organization API config for org ${orgId}:`, error);
    }

    try {
      await ctx.runMutation(api.organization.reservation_config.mutation.create, {
        org_id: orgId,
        tenant_id: tenantId,
        reservation_interval_minutes: 30,
        available_sheet: 2,
        reservation_limit_days: 30,
        available_cancel_days: 3,
        today_first_later_minutes: 30,
      });
    } catch (error) {
      console.warn(`Failed to create organization reservation config for org ${orgId}:`, error);
    }

    console.log(`New user workflow completed. TenantId: ${tenantId}, OrgId: ${orgId}`);
    return {
      tenantId,
      orgId,
      wasExisting: false,
    };
  },
});

// Helper query that might be needed in organization/query.ts
// export const findPrimaryByTenantId = query({
//   args: { tenant_id: v.id("tenant") },
//   handler: async (ctx, args) => {
//     return await ctx.db
//       .query("organization")
//       .withIndex("by_tenant_id", (q) => q.eq("tenant_id", args.tenant_id))
//       .first(); // Assuming the first one found is the "primary"
//   },
// });
