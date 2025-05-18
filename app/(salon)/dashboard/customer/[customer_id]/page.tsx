'use client'

import { DashboardSection } from '@/components/common' // Assuming this is your layout component
import { useParams } from 'next/navigation'
import { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { Loading } from '@/components/common' // Assuming this is your loading component
import { convertGender, Gender } from '@/services/convex/shared/types/common'
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

// Import date formatting library
import { format } from 'date-fns'
import { ja } from 'date-fns/locale' // Japanese locale for date formatting

// Assuming these types are defined in your dataModel.ts
// import type { Doc } from '@/convex/_generated/dataModel';
// type Customer = Doc<'customer'>;
// type CustomerDetails = Doc<'customerDetails'>; // Assuming a document type for details
// type CustomerTransaction = Doc<'customerTransaction'>; // Assuming a document type for transaction summary

// Define the CustomerDetailPage component
export default function CustomerDetailPage() {
  const params = useParams()
  // Extract customer_id and cast it to the correct type, checking for existence
  const customerId = params.customer_id ? (params.customer_id as Id<'customer'>) : undefined

  const completeCustomer = useQuery(
    api.customer.core.query.completeCustomer,
    customerId ? { customerId } : 'skip'
  )
  if (!completeCustomer) {
    return <Loading />
  }

  // --- Loading State ---
  // Show a loading state if any of the required data is not yet loaded
  if (
    !completeCustomer.customer ||
    !completeCustomer.customerDetails ||
    !completeCustomer.customerPoints
  ) {
    return <Loading />
  }
  // --- End Loading State ---

  // --- Data Formatting ---
  // Format the creation time
  const formattedCreationTime = format(
    new Date(completeCustomer.customer._creationTime),
    'yyyy年MM月dd日 HH:mm',
    {
      locale: ja,
    }
  )

  // Format the birthday if it exists
  const formattedBirthday = completeCustomer.customerDetails.birthday
    ? format(new Date(completeCustomer.customerDetails.birthday), 'yyyy年MM月dd日', { locale: ja })
    : '未登録'


  const formattedLastReservationDate = completeCustomer.customer.lastReservationDateUnix
    ? format(
        new Date(completeCustomer.customer.lastReservationDateUnix * 1000),
        'yyyy年MM月dd日 HH:mm',
        {
          locale: ja,
        }
      ) // Convert unix timestamp to milliseconds
    : '予約履歴なし'
  // --- End Data Formatting ---

  return (
    // Use the existing DashboardSection for consistent layout
    <DashboardSection
      title="顧客詳細"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
    >
      <div>
        <div className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <h3 className="text-3xl font-bold text-primary">
              {completeCustomer.customer.lastName ?? '未登録'}{' '}
              {completeCustomer.customer.firstName ?? '未登録'}
              <span className="text-sm text-muted-foreground ml-1">様</span>
            </h3>
          </div>
          <Badge>
            <div className="flex flex-col md:flex-row items-center justify-end space-x-2">
              <span className="text-sm font-medium">保有ポイント</span>
              <span className="text-base ml-1">
                {completeCustomer.customerPoints.totalPoints ?? 0}
              </span>
            </div>
          </Badge>
        </div>
        {completeCustomer.customer.lineUserName && (
          <p className="w-fit text-sm mt-1 text-green-600 border-green-600 border rounded-md font-bold py-1 bg-green-50 px-3">
            LINEユーザー名: {completeCustomer.customer.lineUserName}
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
                  {completeCustomer.customer.lastName}
                </span>
              </div>
              {/* First Name */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">名:</span>
                <span className="text-base font-semibold">
                  {completeCustomer.customer.firstName}
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
                  {completeCustomer.customerDetails.age || '未登録'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">性別:</span>
                <span className="text-base">
                  {convertGender(completeCustomer.customerDetails.gender as Gender)}
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
                {completeCustomer.customerDetails.notes ? (
                  <ScrollArea className="h-24 w-full rounded-md border p-4 text-sm">
                    {' '}
                    {/* ScrollArea for long notes */}
                    {completeCustomer.customerDetails.notes}
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
              <span className="text-sm">{completeCustomer.customer.useCount || 0}回</span>
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
                  {completeCustomer.customer.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-sm">
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
                    {completeCustomer.customer._id.substring(0, 8)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{completeCustomer.customer._id}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </DashboardSection>
  )
}
