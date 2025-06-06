// app/api/clerk/staff/invitations/route.ts
// 招待状況管理API - 招待の確認・再送・キャンセル機能

import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// 招待一覧取得（保留中のもののみ）
export async function GET(req: NextRequest) {
  try {
    // 1. 認証チェック
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 2. クエリパラメータからテナント・組織IDを取得（フィルタリング用）
    const { searchParams } = new URL(req.url)
    const tenant_id = searchParams.get('tenant_id')
    const org_id = searchParams.get('org_id')

    if (!tenant_id || !org_id) {
      return NextResponse.json(
        { error: 'tenant_idとorg_idが必要です' },
        { status: 400 }
      )
    }

    // 3. Convexから招待中スタッフ一覧を取得
    const pendingStaff = await convex.query(api.staff.invitation.query.listPending, {
      tenant_id: tenant_id as Id<"tenant">,
      org_id: org_id as Id<"organization">,
    })

    // 4. Clerkから保留中の招待一覧を取得
    const clerk = await clerkClient()
    const invitations = await clerk.invitations.getInvitationList({
      status: 'pending',
      limit: 50,
    })

    // 5. テナント・組織でフィルタリング
    const filteredInvitations = invitations.data.filter((invitation) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = invitation.publicMetadata as any
      return metadata?.tenant_id === tenant_id && metadata?.org_id === org_id
    })

    // 6. ConvexスタッフとClerk招待データをマージ
    const mergedData = pendingStaff.map(staff => {
      // このスタッフに対応するClerk招待を探す
      const clerkInvitation = filteredInvitations.find(inv => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        tags: staff.tags,
        created_at: staff._creationTime,
        
        // Clerk招待データ
        invitation_id: clerkInvitation?.id || null,
        invitation_status: clerkInvitation?.status || 'missing',
        invitation_created_at: clerkInvitation?.createdAt || null,
        
        // メタデータ
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: clerkInvitation?.publicMetadata as any || null,
      }
    })

    return NextResponse.json({
      success: true,
      invitations: mergedData,
      total: mergedData.length,
    })

  } catch (error: unknown) {
    console.error('招待一覧取得エラー:', error)
    return NextResponse.json(
      { error: '招待一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 招待の再送
export async function POST(req: NextRequest) {
  try {
    // 1. 認証チェック
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }
    const userId = user.id

    // 2. リクエストボディから再送に必要な情報を取得
    const { staff_id, invitation_id } = await req.json()

    // 3. 必須パラメータの検証
    if (!staff_id) {
      return NextResponse.json(
        { error: 'staff_idが必要です' },
        { status: 400 }
      )
    }

    // 4. Convexからスタッフ情報を取得
    const staffData = await convex.query(api.staff.invitation.query.getStaffWithInvitation, {
      staff_id: staff_id as Id<"staff">,
    })

    if (!staffData) {
      return NextResponse.json(
        { error: 'スタッフが見つかりません' },
        { status: 404 }
      )
    }

    if (staffData.invitationStatus === 'accepted') {
      return NextResponse.json(
        { error: '既に受諾済みの招待です' },
        { status: 400 }
      )
    }

    // 5. 古い招待をキャンセル（存在する場合）
    if (invitation_id) {
      try {
        const clerk = await clerkClient()
        await clerk.invitations.revokeInvitation(invitation_id)
      } catch (revokeError) {
        console.warn('古い招待のキャンセルに失敗:', revokeError)
      }
    }

    // 6. 新しい招待を作成（再送）
    const clerk = await clerkClient()
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: staffData.email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite-accept`,
      publicMetadata: {
        tenant_id: staffData.tenant_id,
        org_id: staffData.org_id,
        role: staffData.auth?.role || 'staff',
        staff_id: staffData._id,
        // 事前設定情報も含める
        extra_charge: staffData.config?.extra_charge,
        priority: staffData.config?.priority,
        invited_by: userId,
        invited_at: new Date().toISOString(),
        resent: true, // 再送フラグ
      },
      notify: true,
      ignoreExisting: true,
    })

    return NextResponse.json({
      success: true,
      invitation_id: invitation.id,
      message: '招待メールを再送しました',
    })

  } catch (error: unknown) {
    console.error('招待再送エラー:', error)
    return NextResponse.json(
      { error: '招待の再送に失敗しました' },
      { status: 500 }
    )
  }
}