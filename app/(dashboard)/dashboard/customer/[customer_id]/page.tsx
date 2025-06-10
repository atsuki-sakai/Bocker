'use client'

import { DashboardSection, withManagerAccess } from '@/components/common' // Assuming this is your layout component
import { useParams } from 'next/navigation'
import { Loading } from '@/components/common' // Assuming this is your loading component
import { convertGender, Gender } from '@/convex/types'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator' // Useful for separating sections
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip' // For displaying full IDs on hover
import { ScrollArea } from '@/components/ui/scroll-area' // For potentially long notes
import {
  Phone,
  User,
  Tag,
  CalendarDays,
  Info,
  Cake,
  NotebookPen,
  History,
  Mail,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import type { RowType } from '@/services/supabase/SupabaseService'
import { toast } from 'sonner'

// Import date formatting library
import { format } from 'date-fns'
import { ja } from 'date-fns/locale' // Japanese locale for date formatting

// 完全な顧客データの型定義
type CompleteCustomerData = {
  customer: RowType<'customer'> | null
  customerDetail: RowType<'customer_detail'> | null
  customerPoints: RowType<'customer_points'> | null
}

// Define the CustomerDetailPage component
function CustomerDetailPage() {
  const params = useParams()
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const customerUid = params.customer_id as string

  // 状態管理
  const [completeCustomer, setCompleteCustomer] = useState<CompleteCustomerData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const customerRepo = useMemo(() => new CustomerRepository(), [])

  // 顧客データを取得
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!tenantId || !orgId || !customerUid || !isLoaded) {
        return
      }

      try {
        setIsLoadingData(true)
        const data = await customerRepo.getCompleteCustomerData(customerUid, tenantId, orgId)
        setCompleteCustomer(data)

        if (!data.customer) {
          toast.error('顧客が見つかりません')
        }
      } catch (error) {
        console.error('顧客データの取得に失敗しました:', error)
        toast.error('顧客データの取得に失敗しました')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchCustomerData()
  }, [tenantId, orgId, customerUid, isLoaded, customerRepo])

  // ローディング状態の表示
  if (!isLoaded || isLoadingData || !completeCustomer || !completeCustomer.customer) {
    return <Loading />
  }

  // --- Data Formatting ---
  // 作成日時のフォーマット
  const formattedCreationTime = completeCustomer.customer.created_at
    ? format(new Date(completeCustomer.customer.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })
    : '不明'

  // 誕生日のフォーマット
  const formattedBirthday = completeCustomer.customerDetail?.birthday
    ? format(new Date(completeCustomer.customerDetail.birthday), 'yyyy年MM月dd日', { locale: ja })
    : '未登録'

  // 最終予約日のフォーマット
  const formattedLastReservationDate = completeCustomer.customer.last_reservation_date_unix
    ? format(
        new Date(completeCustomer.customer.last_reservation_date_unix * 1000),
        'yyyy年MM月dd日 HH:mm',
        { locale: ja }
      )
    : '予約履歴なし'
  // --- End Data Formatting ---

  return (
    // Use the existing DashboardSection for consistent layout
    <DashboardSection
      title="顧客詳細"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
      infoBtn={{
        text: '編集',
        link: `/dashboard/customer/${customerUid}/edit`,
      }}
    >
      <div>
        <div className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <h3 className="text-3xl font-bold text-primary">
              {completeCustomer.customer.last_name ?? '未登録'}{' '}
              {completeCustomer.customer.first_name ?? '未登録'}
              <span className="text-sm text-muted-foreground ml-1">様</span>
            </h3>
          </div>
          <Badge>
            <div className="flex flex-col md:flex-row items-center justify-end space-x-2">
              <span className="text-sm font-medium">保有ポイント</span>
              <span className="text-base ml-1">
                {completeCustomer.customerPoints?.total_points ?? 0}
              </span>
            </div>
          </Badge>
        </div>
        {completeCustomer.customer.line_user_name && (
          <p className="w-fit text-sm mt-1 text-green-600 border-green-600 border rounded-md font-bold py-1 bg-green-50 px-3">
            LINEユーザー名: {completeCustomer.customer.line_user_name}
          </p>
        )}
        <div className="space-y-6 pt-4">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <User className="mr-2 h-5 w-5 text-muted-foreground" />
              基本情報
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Last Name */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">姓:</span>
                <span className="text-base font-semibold">
                  {completeCustomer.customer.last_name || '未登録'}
                </span>
              </div>
              {/* First Name */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">名:</span>
                <span className="text-base font-semibold">
                  {completeCustomer.customer.first_name || '未登録'}
                </span>
              </div>
              {/* Phone Number - spans both columns on medium screens and above */}
              <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">電話番号:</span>
                <span className="text-base">{completeCustomer.customer.phone || '未登録'}</span>
              </div>
              <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">メールアドレス:</span>
                <span className="text-base">{completeCustomer.customer.email || '未登録'}</span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <NotebookPen className="mr-2 h-5 w-5 text-muted-foreground" />
              追加情報
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">誕生日:</span>
                <span className="text-base">{formattedBirthday}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">年齢:</span>
                <span className="text-base">
                  {completeCustomer.customerDetail?.age
                    ? `${completeCustomer.customerDetail.age}歳`
                    : '未登録'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">性別:</span>
                <span className="text-base">
                  {convertGender(
                    (completeCustomer.customerDetail?.gender as Gender) || 'unselected'
                  )}
                </span>
              </div>
              {/* Notes - potentially long, use ScrollArea or Collapsible */}
              <div className="col-span-1 md:col-span-2">
                {' '}
                {/* Notes span full width */}
                <span className="text-sm font-medium text-muted-foreground flex items-center mb-2">
                  <NotebookPen className="mr-2 h-5 w-5 text-muted-foreground" />
                  メモ:
                </span>
                {completeCustomer.customerDetail?.notes ? (
                  <ScrollArea className="h-24 w-full rounded-md border p-4 text-sm">
                    {' '}
                    {/* ScrollArea for long notes */}
                    {completeCustomer.customerDetail.notes}
                  </ScrollArea>
                ) : (
                  <p className="text-base text-muted-foreground italic">メモはありません。</p>
                )}
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <History className="mr-2 h-5 w-5 text-muted-foreground" />
              利用情報
            </h3>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">最終予約日:</span>
              <span className="text-sm">{formattedLastReservationDate}</span>
            </div>
            <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
              <span className="text-sm font-medium text-muted-foreground">来店回数:</span>
              <span className="text-sm">
                {completeCustomer.customer.total_reservation_count || 0}回
              </span>
            </div>
          </div>

          {completeCustomer.customer.tags && completeCustomer.customer.tags.length > 0 ? (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Tag className="mr-2 h-5 w-5 text-muted-foreground" />
                  タグ
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {completeCustomer.customer.tags.map((tag: string, index: number) => (
                    <Badge key={`${tag}-${index}`} variant="secondary" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Display a message if no tags are present
            <>
              <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                <Tag className="h-5 w-5" />
                <span>タグは登録されていません。</span>
              </div>
            </>
          )}
          {/* --- End Tags Section --- */}
        </div>
        <div className="flex flex-col items-start space-y-2 text-sm text-muted-foreground pt-4 border-t">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4" />
            <span>登録日: {formattedCreationTime}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>顧客ID: </span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="underline cursor-help">
                    {completeCustomer.customer.uid.substring(0, 8)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{completeCustomer.customer.uid}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </DashboardSection>
  )
}

export default withManagerAccess(CustomerDetailPage);
