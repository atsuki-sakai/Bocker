import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LINE_STATE_SESSION_KEY } from '@/services/line/constants'

/**
 * LINE認証のstateクッキーをクリーンアップするAPI
 */
export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // LINE stateクッキーを削除
    cookieStore.delete({
      name: LINE_STATE_SESSION_KEY,
      path: '/',
    })
    
    console.log('[API /api/auth/line-state/cleanup] Cleanup completed')
    
    return NextResponse.json(
      { success: true, message: 'LINE auth state cleaned up' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /api/auth/line-state/cleanup] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup LINE auth state' },
      { status: 500 }
    )
  }
}