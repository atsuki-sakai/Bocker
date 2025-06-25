
import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { BASE_URL } from '@/lib/constants';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { getEnv } from '@/lib/env-config'

const convex = new ConvexHttpClient(getEnv('NEXT_PUBLIC_CONVEX_URL'))

export async function POST(request: NextRequest) {
  try {
    
    const clerk = await clerkClient();
    const { staff_id, invitation_id, org_id, email, role } = await request.json();

    if (!staff_id) {
      return NextResponse.json(
        { error: 'staff_id is required' },
        { status: 400 }
      );
    }

    let invitationEmail = email;
    let invitationRole = role;

    // invitation_idがある場合は既存の招待情報を取得
    if (invitation_id) {
      const existingInvitation = await convex.query(api.staff.invitation.query.getInvitation, {
        invitation_id: invitation_id,
      });
      
      if (existingInvitation) {
        invitationEmail = existingInvitation.invitation_email || email;
        invitationRole = existingInvitation.role || role;
      }
    }

    // メールアドレスが取得できない場合はエラー
    if (!invitationEmail) {
      return NextResponse.json(
        { error: 'Invitation email not found' },
        { status: 400 }
      );
    }

    // 古い招待を取り消す（invitation_idが存在する場合のみ）
    if (invitation_id) {
      try {
        await clerk.invitations.revokeInvitation(invitation_id);
      } catch (error) {
        console.warn('Failed to revoke old invitation:', error);
        // 既に取り消されている可能性があるため、エラーは無視して続行
      }
    }

    // 環境に応じてベースURLを設定  
    const redirectUrl = `${BASE_URL}/staff/invite-accept`;

    // 新しい招待を作成
    const newInvitation = await clerk.invitations.createInvitation({
      emailAddress: invitationEmail,
      redirectUrl,
      publicMetadata: {
        org_id: org_id,
        role: invitationRole,
        staff_id: staff_id,
      },
    });

    // 招待情報を更新
    await convex.mutation(api.staff.mutation.updateInvitationInfo, {
      staff_id: staff_id,
      invitation_id: newInvitation.id,
      invitation_email: invitationEmail,
      invitation_status: 'pending' as const,
      role: invitationRole,
    });

    return NextResponse.json({
      success: true,
      invitation: newInvitation,
    });
  } catch (error) {
    console.error('Failed to resend invitation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to resend invitation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}