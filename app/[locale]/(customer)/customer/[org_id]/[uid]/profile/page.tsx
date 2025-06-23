import { getCustomerWithDetails } from '@/lib/auth/customer'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Mail, Phone, Calendar, User } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Id } from '@/convex/_generated/dataModel'
import { Gender, ActiveCustomerType } from '@/convex/types'
import { getCustomerSession } from '@/lib/auth/customer'

interface ProfilePageProps {
  params: Promise<{
    org_id: Id<'organization'>
    uid: string
  }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { org_id, uid } = await params

  // まずセッション情報を取得
  const session = await getCustomerSession()
  if (!session) {
    redirect(`/customer/${org_id}/auth/login`)
  }

  // 顧客情報を取得
  let customerData
  try {
    customerData = await getCustomerWithDetails(uid, session.orgId, session.tenantId)
  } catch (error) {
    console.error('[ProfilePage] Failed to get customer details:', error)
    redirect(`/customer/${org_id}/auth/login`)
  }

  const { customer, customerDetail: detail, customerPoints: points } = customerData

  // 顧客情報が取得できない場合はログイン画面へ
  if (!customer) {
    redirect(`/customer/${org_id}/auth/login`)
  }

  // 年齢を誕生日から計算
  const calculateAge = (birthday: string | null): number | null => {
    if (!birthday) return null
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const age = detail?.birthday ? calculateAge(detail.birthday) : null

  // 性別の表示
  const getGenderDisplay = (gender: Gender | null): string => {
    if (!gender) return '未設定'
    return gender
  }

  // 顧客タイプの表示
  const getCustomerTypeDisplay = (
    type: ActiveCustomerType | null
  ): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (!type) return { label: '一般', variant: 'default' }
    switch (type) {
      case 'first_time':
        return { label: '初回', variant: 'secondary' }
      case 'repeat':
        return { label: 'リピーター', variant: 'default' }
      case 'all':
        return { label: '全て', variant: 'default' }
      default:
        return { label: '一般', variant: 'outline' }
    }
  }

  const customerType = getCustomerTypeDisplay(customer.customer_type as ActiveCustomerType)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">プロフィール</h2>
        <Link href={`/customer/${org_id}/${uid}/profile/edit`}>
          <Button>
            <Edit2 className="h-4 w-4 mr-2" />
            編集
          </Button>
        </Link>
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>基本情報</span>
            <Badge variant={customerType.variant}>{customerType.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 名前 */}
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">お名前</p>
                <p className="font-medium">
                  {customer.last_name || ''} {customer.first_name || ''}
                  {!customer.last_name && !customer.first_name && '未設定'}
                </p>
              </div>
            </div>

            {/* メールアドレス */}
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-primary">メールアドレス</p>
                <p className="font-medium">{customer.email || detail?.email || '未設定'}</p>
              </div>
            </div>

            {/* 電話番号 */}
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-primary">電話番号</p>
                <p className="font-medium">{customer.phone || '未設定'}</p>
              </div>
            </div>

            {/* 誕生日・年齢 */}
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-primary">生年月日</p>
                <p className="font-medium">
                  {detail?.birthday
                    ? `${format(new Date(detail.birthday), 'yyyy年M月d日', { locale: ja })}（${age}歳）`
                    : '未設定'}
                </p>
              </div>
            </div>

            {/* 性別 */}
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-primary">性別</p>
                <p className="font-medium">{getGenderDisplay(detail?.gender as Gender | null)}</p>
              </div>
            </div>
          </div>

          {/* 備考 */}
          {detail?.notes && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">備考</p>
              <p className="text-primary whitespace-pre-wrap">{detail.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 利用状況 */}
      <Card>
        <CardHeader>
          <CardTitle>利用状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ポイント */}
            <div className="bg-background rounded-lg p-4">
              <p className="text-sm text-muted-foreground">保有ポイント</p>
              <p className="text-2xl font-bold text-primary">
                {points?.total_points || 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">pt</span>
              </p>
            </div>

            {/* 総利用回数 */}
            <div className="bg-background rounded-lg p-4">
              <p className="text-sm text-muted-foreground">総利用回数</p>
              <p className="text-2xl font-bold text-primary">
                {customer.total_reservation_count || 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">回</span>
              </p>
            </div>

            {/* 最終来店日 */}
            <div className="bg-background rounded-lg p-4">
              <p className="text-sm text-muted-foreground">最終来店日</p>
              <p className="text-lg font-bold text-primary">
                {/* 秒単位のUnixタイムスタンプを1000倍してミリ秒に変換してDate関数に渡す */}
                {customer.last_reservation_date_unix
                  ? format(new Date(customer.last_reservation_date_unix * 1000), 'yyyy/MM/dd', {
                      locale: ja,
                    })
                  : '未設定'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LINE連携状況 */}
      {customer.line_id && (
        <Card>
          <CardHeader>
            <CardTitle>LINE連携</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-accent-2 border-accent-2">
                連携済み
              </Badge>
              <span className="text-sm text-muted-foreground">
                LINEアカウント: {customer.line_user_name || 'LINE User'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
