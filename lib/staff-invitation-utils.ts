// lib/staff-invitation-utils.ts
// スタッフ招待関連のユーティリティ関数

import { Doc, Id } from '@/convex/_generated/dataModel'
import { Role } from '@/convex/types'
import { InvitationStatus } from '@/lib/types'


interface ClerkInvitation {
  object: "invitation";
  id: string;
  email_address: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public_metadata: Record<string, any>;
  revoked: boolean;
  status: InvitationStatus;
  url: string;
  expires_at: number;
  created_at: number;
  updated_at: number;
}


// 招待メタデータの型定義
interface InvitationMetadata {
  tenant_id: Id<"tenant">
  org_id: Id<"organization">
  role: Role
  staff_id: Id<"staff">
  extra_charge?: number
  priority?: number
  invited_by?: string // ClerkのユーザーID
  invited_at?: string // 招待日時
  resent?: boolean // 再送信フラグ
}

/**
 * ConvexスタッフデータとClerk招待データをマージ
 */
export interface MergedStaffInvitationData {
  // Convexデータ
  staff_id: Id<"staff">
  name: string
  created_at: number
  
  // Clerk招待データ
  invitation_id: string | null
  invitation_status: InvitationStatus
  invitation_created_at: number | null
  
  // メタデータ
  metadata: InvitationMetadata | null
}

/**
 * スタッフ招待データのマージング
 */
export const mergeStaffWithInvitationData = (
  convexStaff: Doc<'staff'>[],
  clerkInvitations: ClerkInvitation[]
): MergedStaffInvitationData[] => {
  return convexStaff.map(staff => {
    // このスタッフに対応するClerk招待を探す
    const clerkInvitation = clerkInvitations.find(inv => {
      const metadata = inv.public_metadata
      return metadata?.staff_id === staff._id
    })

    return {
      // Convexデータ
      staff_id: staff._id,
      name: staff.name,
      created_at: staff._creationTime,
      
      // Clerk招待データ
      invitation_id: clerkInvitation?.id || null,
      invitation_status: clerkInvitation?.status || (staff.clerk_user_id ? 'accepted' : 'missing'),
      invitation_created_at: clerkInvitation?.created_at || null,
      
      // メタデータ
      metadata: clerkInvitation?.public_metadata as InvitationMetadata || null,
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
export const getInvitationErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkErrors = error.errors as { code: string }[]
    if (clerkErrors?.[0]?.code === 'form_identifier_exists') {
      return 'このメールアドレスは既に登録されています'
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return '招待の処理中にエラーが発生しました'
}