
import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { BASE_URL } from '@/lib/constants';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    
    const clerk = await clerkClient();
    const { staff_id, invitation_id, org_id } = await request.json();

    if (!staff_id || !invitation_id) {
      return NextResponse.json(
        { error: 'staff_id and invitation_id are required' },
        { status: 400 }
      );
    }


    // Clerkに再送リクエストを送信
    await clerk.invitations.revokeInvitation(invitation_id);

    // 環境に応じてベースURLを設定
    const redirectUrl = `${BASE_URL}/staff/invite-accept?invitationId=${invitation_id}`;
  

    const existingInvitation = await convex.query(api.staff.invitation.query.getInvitation, {
      invitation_id: invitation_id,
    });
    if(!existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    // 新しい招待を作成
    const newInvitation = await clerk.invitations.createInvitation({
      emailAddress: existingInvitation.invitation_email!,
      redirectUrl,
      publicMetadata: {
        org_id: org_id,
        role: existingInvitation.role,
        staff_id: staff_id,
      },
    });

    // 招待情報を更新
    await convex.mutation(api.staff.mutation.updateInvitationInfo, {
      staff_id: staff_id,
      invitation_id: newInvitation.id,
      invitation_email: existingInvitation.invitation_email!,
      invitation_status: 'pending' as const,
      role: existingInvitation.role,
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