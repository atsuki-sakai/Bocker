// convex/actions.ts
import { internalAction } from "@/convex/_generated/server";

export const triggerSupabaseSync = internalAction({
  args: {},
  handler: async (ctx) => {

    const baseUrl = process.env.NEXT_PUBLIC_DEPLOY_URL ?? 'http://localhost:3000';

    const response = await fetch(
      `${baseUrl}/api/supabase/reservation`, 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to trigger sync: ${response.status} ${await response.text()}`);
    }
    
    const result = await response.json();
    return result;
  },
});