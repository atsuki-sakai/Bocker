// lib/staff-invitation-utils.ts
// スタッフ招待関連のユーティリティ関数

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * メールアドレスの使用可能性をチェック
 * Convex側でメール重複確認を行う
 */
export const validateEmailAvailability = async (
  email: string,
  tenantId: Id<"tenant">,
  orgId: Id<"organization">,
  excludeStaffId?: Id<"staff">
): Promise<{ isAvailable: boolean; message?: string }> => {
  try {
    const result = await convex.query(api.staff.invitation.query.checkEmailAvailability, {
      tenant_id: tenantId,
      org_id: orgId,
      email,
      exclude_staff_id: excludeStaffId,
    })

    if (!result.isAvailable && result.existingStaff) {
      return {
        isAvailable: false,
        message: `このメールアドレスは既に${result.existingStaff.name}さんが使用しています`,
      }
    }

    return { isAvailable: true }
  } catch (error) {
    console.error('メールアドレス確認エラー:', error)
    return {
      isAvailable: false,
      message: 'メールアドレスの確認中にエラーが発生しました',
    }
  }
}

/**
 * ConvexスタッフデータとClerk招待データをマージ
 */
export interface MergedStaffInvitationData {
  // Convexデータ
  staff_id: string
  name: string
  email: string
  gender: string
  age?: number
  tags: string[]
  created_at: number
  
  // Clerk招待データ
  invitation_id: string | null
  invitation_status: 'pending' | 'missing' | 'accepted'
  invitation_created_at: number | null
  
  // メタデータ
  metadata: {
    tenant_id: string
    org_id: string
    role: string
    staff_id: string
    extra_charge?: number
    priority?: number
    invited_by?: string
    invited_at?: string
    resent?: boolean
  } | null
}

/**
 * スタッフ招待データのマージング
 */
export const mergeStaffWithInvitationData = (
  convexStaff: any[],
  clerkInvitations: any[]
): MergedStaffInvitationData[] => {
  return convexStaff.map(staff => {
    // このスタッフに対応するClerk招待を探す
    const clerkInvitation = clerkInvitations.find(inv => {
      const metadata = inv.publicMetadata as any
      return metadata?.staff_id === staff._id
    })

    return {
      // Convexデータ
      staff_id: staff._id,
      name: staff.name,
      email: staff.email,
      gender: staff.gender,
      age: staff.age,
      tags: staff.tags || [],
      created_at: staff.created_at,
      
      // Clerk招待データ
      invitation_id: clerkInvitation?.id || null,
      invitation_status: staff.clerk_user_id ? 'accepted' : (clerkInvitation ? 'pending' : 'missing'),
      invitation_created_at: clerkInvitation?.createdAt || null,
      
      // メタデータ
      metadata: clerkInvitation?.publicMetadata as any || null,
    }
  })
}

/**
 * 招待の有効期限チェック（30日）
 */
export const checkInvitationExpiry = (createdAt: number): {
  isExpired: boolean
  daysRemaining: number
} => {
  const EXPIRY_DAYS = 30
  const now = Date.now()
  const expiryDate = createdAt + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  const daysRemaining = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000))
  
  return {
    isExpired: now > expiryDate,
    daysRemaining: Math.max(0, daysRemaining),
  }
}

/**
 * 招待エラーメッセージの取得
 */
export const getInvitationErrorMessage = (error: any): string => {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkErrors = error.errors as any[]
    if (clerkErrors?.[0]?.code === 'form_identifier_exists') {
      return 'このメールアドレスは既に登録されています'
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return '招待の処理中にエラーが発生しました'
}