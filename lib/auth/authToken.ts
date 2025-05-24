import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * サーバー上でConvexの認証を行う
 * @returns ユーザーIDとトークン
 */
export async function serverConvexAuth() {
    const { userId, getToken } = await auth();
    const token = await getToken({ template: 'convex' });
  
    if (!userId || !token) {
      return redirect('/sign-in');
    }
    return { userId, token };
  }