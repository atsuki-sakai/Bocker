// app/api/clerk/staff/delete/route.ts
// スタッフ削除API - Clerkユーザーの完全削除

import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
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

    // 2. リクエストボディから削除対象のユーザーIDを取得
    const { user_id, email } = await req.json()

    // 3. 必須パラメータの検証
    if (!user_id && !email) {
      return NextResponse.json(
        { error: 'user_idまたはemailが必要です' },
        { status: 400 }
      )
    }

    let targetUserId = user_id

    // 4. メールアドレスが提供された場合、ユーザーIDを取得
    if (!targetUserId && email) {
      try {
        const clerk = await clerkClient()
        const users = await clerk.users.getUserList({
          emailAddress: [email],
          limit: 1,
        })
        
        if (users.data.length === 0) {
          return NextResponse.json(
            { error: '指定されたユーザーが見つかりません' },
            { status: 404 }
          )
        }
        
        targetUserId = users.data[0].id
      } catch (error) {
        console.error('ユーザー検索エラー:', error)
        return NextResponse.json(
          { error: 'ユーザーの検索に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 5. 自分自身の削除を防止
    if (targetUserId === userId) {
      return NextResponse.json(
        { error: '自分自身を削除することはできません' },
        { status: 400 }
      )
    }

    // 6. ユーザーの削除を実行
    const clerk = await clerkClient()
    await clerk.users.deleteUser(targetUserId)

    // 7. 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'ユーザーを削除しました',
      deleted_user_id: targetUserId,
    })

  } catch (error: unknown) {
    console.error('ユーザー削除エラー:', error)
    
    // ユーザーが見つからない場合のエラーハンドリング
    if (error && typeof error === 'object' && 'errors' in error) {
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clerkErrors = error.errors as any[]
      if (clerkErrors?.[0]?.code === 'resource_not_found') {
        return NextResponse.json(
          { error: '指定されたユーザーが見つかりません' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'ユーザーの削除に失敗しました' },
      { status: 500 }
    )
  }
}