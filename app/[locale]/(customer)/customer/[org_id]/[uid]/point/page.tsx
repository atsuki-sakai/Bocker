import { getCustomerWithDetails, getCustomerSession } from '@/lib/auth/customer'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Wallet, TrendingUp, TrendingDown, Calendar, Clock, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService'
import { PointTransactionRepository } from '@/services/supabase/repositories/point/PointTransactionRepository'

interface PointPageProps {
  params: Promise<{
    org_id: string
    uid: string
  }>
}

export default async function PointPage({ params }: PointPageProps) {
  const { org_id, uid } = await params

  // まずセッション情報を取得
  const session = await getCustomerSession()
  if (!session) {
    redirect(`/customer/${org_id}/auth/login`)
  }

  // 顧客情報を取得
  let customerData
  try {
    customerData = await getCustomerWithDetails(
      uid,
      session.orgId,
      session.tenantId
    )
  } catch (error) {
    console.error('[PointPage] Failed to get customer details:', error)
    redirect(`/customer/${org_id}/auth/login`)
  }

  const { customer, customerPoints: points } = customerData

  // 顧客情報が取得できない場合はログイン画面へ
  if (!customer) {
    redirect(`/customer/${org_id}/auth/login`)
  }

  // ポイント履歴を取得
  const supabaseAdmin = getSupabaseAdminService()
  const pointTransactionRepo = new PointTransactionRepository(supabaseAdmin)

  const { data: transactions } = await pointTransactionRepo.findByCustomer(
    customer.tenant_id,
    customer.org_id,
    uid,
    {
      orderBy: {
        column: 'transaction_date_unix',
        ascending: false,
      },
      pageSize: 20, // 最新20件を取得
    }
  )

  // 統計情報を取得
  const stats = await pointTransactionRepo.getCustomerTransactionStats(
    customer.tenant_id,
    customer.org_id,
    uid
  )

  // トランザクションタイプの表示
  const getTransactionTypeDisplay = (
    type: string | null
  ): {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: LucideIcon
  } => {
    switch (type) {
      case 'earned':
        return { label: '獲得', variant: 'secondary', icon: TrendingUp }
      case 'used':
        return { label: '使用', variant: 'destructive', icon: TrendingDown }
      case 'expired':
        return { label: '失効', variant: 'outline', icon: Clock }
      case 'adjusted':
        return { label: '調整', variant: 'default', icon: Wallet }
      default:
        return { label: '不明', variant: 'outline', icon: Wallet }
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-bold text-primary">ポイント</h2>
        <p className="text-muted-foreground mt-1">ポイントの残高と履歴を確認できます</p>
        <p className="w-fit text-xs md:text-sm bg-warning text-warning-foreground  rounded-md p-2 mt-2">
          ポイントはご利用日から30日後に自動的に付与されます。
        </p>
      </div>

      {/* ポイント残高カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>現在のポイント残高</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-primary">
              {points?.total_points || 0}
              <span className="text-2xl font-normal text-muted-foreground ml-2">pt</span>
            </p>
            {points?.last_transaction_date_unix && (
              <p className="text-sm text-muted-foreground mt-2">
                最終更新:{' '}
                {format(new Date(points.last_transaction_date_unix * 1000), 'yyyy年M月d日 HH:mm', {
                  locale: ja,
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ポイント統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">累計獲得ポイント</p>
                <p className="text-2xl font-bold text-accent-2">
                  +{stats.totalEarned}
                  <span className="text-sm font-normal text-muted-foreground ml-1">pt</span>
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent-2 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">累計使用ポイント</p>
                <p className="text-2xl font-bold text-destructive">
                  -{stats.totalUsed}
                  <span className="text-sm font-normal text-muted-foreground ml-1">pt</span>
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">取引回数</p>
                <p className="text-2xl font-bold text-primary">
                  {stats.transactionCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">回</span>
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ポイント履歴 */}
      <Card>
        <CardHeader>
          <CardTitle>ポイント履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ポイント履歴がありません</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {transactions.map((transaction) => {
                  const typeDisplay = getTransactionTypeDisplay(transaction.transaction_type)
                  const Icon = typeDisplay.icon
                  const isPositive = (transaction.points || 0) > 0

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-full ${isPositive ? 'bg-accent-2' : 'bg-destructive'}`}
                        >
                          <Icon
                            className={`h-4 w-4 ${isPositive ? 'text-accent-2' : 'text-destructive'}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={typeDisplay.variant}>{typeDisplay.label}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(
                                new Date(transaction.transaction_date_unix * 1000),
                                'yyyy/MM/dd HH:mm',
                                { locale: ja }
                              )}
                            </span>
                          </div>
                          {transaction.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {transaction.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-semibold ${isPositive ? 'text-accent-2' : 'text-destructive'}`}
                      >
                        {isPositive ? '+' : ''}
                        {transaction.points} pt
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
