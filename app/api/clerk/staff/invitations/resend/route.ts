
import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { BASE_URL } from '@/lib/constants';

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

    // Clerkから既存の招待情報を取得
    let existingInvitation;
    try {
      existingInvitation = await clerk.invitations.getInvitationList(invitation_id);
    } catch (error) {
      console.error('Failed to get invitation from Clerk:', error);
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    console.log('existingInvitation', existingInvitation);
    if (!existingInvitation || existingInvitation.data[0].status !== 'pending') {
      return NextResponse.json(
        { error: 'atus' },
        { status: 400 }
      );
    }

    // Clerkに再送リクエストを送信
    await clerk.invitations.revokeInvitation(invitation_id);

    // 環境に応じてベースURLを設定
    const redirectUrl = `${BASE_URL}/invite-accept?invitationId=${invitation_id}`;

    // 新しい招待を作成
    
    const newInvitation = await clerk.invitations.createInvitation({
      emailAddress: existingInvitation.data[0].emailAddress,
      redirectUrl,
      publicMetadata: {
        organizationId: org_id,
        role: existingInvitation.data[0].publicMetadata?.role || 'staff',
        staffId: staff_id,
      },
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