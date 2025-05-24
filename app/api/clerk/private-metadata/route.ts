// app/api/private-metadata/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { verifyToken } from '@clerk/clerk-sdk-node'; // Clerk公式SDKのverify推奨

interface ClerkJwtPayload {
    sub: string;
    tenant_id: string;
    org_id: string;
    role: string;
}

export async function GET(req: NextRequest) {
  // AuthorizationヘッダーからBearerトークン取得
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const { payload } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      audience: process.env.NEXT_PUBLIC_CONVEX_AUD ?? 'convex',
    });
      
      console.log('payload', payload)
      const typedPayload = payload as ClerkJwtPayload;
      const tenant_id = typedPayload.tenant_id;

    return NextResponse.json({ tenant_id });
    
  } catch (e) {
    console.log('e', e)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}