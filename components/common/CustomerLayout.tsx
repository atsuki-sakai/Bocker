import { redirect } from 'next/navigation'
import { validateCustomerAccess, getCustomerWithDetails } from '@/lib/auth/customer'
import Link from 'next/link'
import { User, Receipt, Wallet, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import { cookies } from 'next/headers'
import { LOGIN_SESSION_KEY } from '@/services/line/constants'

interface CustomerLayoutProps {
  children: React.ReactNode
  customerUid: string
  orgId: string
}

export async function CustomerLayout({ children, customerUid, orgId }: CustomerLayoutProps) {
  // 認証とアクセス権限の検証
  const { isValid, session, error } = await validateCustomerAccess(customerUid, orgId)

  if (!isValid || !session) {
    console.error('[CustomerLayout] Access denied:', error)
    redirect(`/customer/${orgId}/auth/login`)
  }

  // 顧客情報を取得
  let customer
  try {
    customer = await getCustomerWithDetails(customerUid, orgId, session.tenantId)
  } catch (error) {
    console.error('[CustomerLayout] Failed to get customer details:', error)
    redirect(`/customer/${orgId}/auth/login`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold text-gray-900">マイページ</h1>
              <span className="text-sm text-gray-500">
                {customer.customer?.first_name ?? '未設定'}{' '}
                {customer.customer?.last_name ?? '未設定'} 様
              </span>
            </div>

            <form action={logoutAction}>
              <input type="hidden" name="orgId" value={orgId} />
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* サイドナビゲーション */}
          <aside className="lg:col-span-1">
            <Card className="p-4">
              <nav className="space-y-2">
                <Link
                  href={`/customer/${orgId}/${customerUid}/profile`}
                  className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-background rounded-md px-3 py-2 transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span>プロフィール</span>
                </Link>

                <Link
                  href={`/customer/${orgId}/${customerUid}/reservation`}
                  className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-background rounded-md px-3 py-2 transition-colors"
                >
                  <Receipt className="h-5 w-5" />
                  <span>予約履歴</span>
                </Link>

                <Link
                  href={`/customer/${orgId}/${customerUid}/point`}
                  className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-background rounded-md px-3 py-2 transition-colors"
                >
                  <Wallet className="h-5 w-5" />
                  <span>ポイント</span>
                </Link>
              </nav>

              <Separator className="my-4" />

              {/* ポイント残高表示 */}
              {customer.customerPoints && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">現在のポイント</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customer.customerPoints.total_points || 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">pt</span>
                  </p>
                </div>
              )}
            </Card>
          </aside>

          {/* メインコンテンツ */}
          <main className="lg:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  )
}

export async function logoutAction(formData: FormData) {
  'use server'

  const orgId = formData.get('orgId') as string | null

  if (!orgId) {
    console.error('[logoutAction] orgId is missing')
    redirect('/auth/login')
  }

  try {
    const cookieStore = await cookies()
    cookieStore.delete(LOGIN_SESSION_KEY)
  } catch (error) {
    console.error('[logoutAction] Failed to delete cookie:', error)
  }

  redirect(`/customer/${orgId}/auth/login`)
}
