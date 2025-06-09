"use node"

import { action } from "../_generated/server";
import { v } from "convex/values";
import { clerkClient } from "@clerk/nextjs/server";

export const fetchUserEmail = action({
    args: {
        clerk_user_id: v.string(),
    },
    handler: async (ctx, args) => {
        const clerk = await clerkClient()
        const user = await clerk.users.getUser(args.clerk_user_id)

        // プライマリーメールアドレスIDを取得
        const primaryEmailId = user.primaryEmailAddressId

        // プライマリーメールアドレスを配列から検索
        const primaryEmail = user.emailAddresses.find(
            email => email.id === primaryEmailId
        )

        return primaryEmail?.emailAddress
    }
})  