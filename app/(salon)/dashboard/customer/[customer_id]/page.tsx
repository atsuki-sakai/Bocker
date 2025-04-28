'use client'

import { DashboardSection } from '@/components/common' // Assuming this is your layout component
import { useParams } from 'next/navigation'
import { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { Loading } from '@/components/common' // Assuming this is your loading component

// Import Shadcn UI components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator' // Useful for separating sections
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip' // For displaying full IDs on hover
import { ScrollArea } from '@/components/ui/scroll-area' // For potentially long notes
import { useSalon } from '@/hooks/useSalon'
// Import Lucide Icons
import {
  Phone,
  User,
  Archive,
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
  const salon = useSalon()
  const params = useParams()
  // Extract customer_id and cast it to the correct type, checking for existence
  const customerId = params.customer_id ? (params.customer_id as Id<'customer'>) : undefined

  // --- Data Fetching ---
  // Fetch customer basic data
  const customer = useQuery(api.customer.core.query.getById, customerId ? { customerId } : 'skip')

  // Fetch customer details data (birthday, notes) - Assuming a query exists
  // Replace 'api.customer.details.query.getByCustomerId' with your actual query name
  const customerDetails = useQuery(
    api.customer.detail.query.getByCustomerId,
    customerId ? { customerId } : 'skip'
  )

  // Fetch customer transaction summary data (last transaction date) - Assuming a query exists
  // Replace 'api.customer.transactions.query.getByCustomerId' with your actual query name
  const customerPoints = useQuery(
    api.customer.points.query.findBySalonAndCustomerId,
    customerId && salon?.salonId ? { salonId: salon.salonId, customerId } : 'skip'
  )
  // --- End Data Fetching ---

  // --- Loading State ---
  // Show a loading state if any of the required data is not yet loaded
  if (!customer || !customerDetails || !customerPoints) {
    return <Loading />
  }
  // --- End Loading State ---

  // --- Data Formatting ---
  // Format the creation time
  const formattedCreationTime = format(new Date(customer._creationTime), 'yyyy年MM月dd日 HH:mm', {
    locale: ja,
  })

  // Format the birthday if it exists
  const formattedBirthday = customerDetails.birthday
    ? format(new Date(customerDetails.birthday), 'yyyy年MM月dd日', { locale: ja })
    : '未登録'

  // Format the last transaction date if it exists
  const formattedLastTransactionDate = customerPoints.lastTransactionDate_unix
    ? format(new Date(customerPoints.lastTransactionDate_unix * 1000), 'yyyy年MM月dd日 HH:mm', {
        locale: ja,
      }) // Convert unix timestamp to milliseconds
    : '取引履歴なし'

  const formattedLastReservationDate = customer.lastReservationDate_unix
    ? format(new Date(customer.lastReservationDate_unix * 1000), 'yyyy年MM月dd日 HH:mm', {
        locale: ja,
      }) // Convert unix timestamp to milliseconds
    : '予約履歴なし'
  // --- End Data Formatting ---

  return (
    // Use the existing DashboardSection for consistent layout
    <DashboardSection
      title="顧客詳細"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
    >
      {/* Use a Card component to structure and style the customer details */}
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        {' '}
        {/* Increased max-w for more content */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          {' '}
          {/* Increased padding */}
          {/* Display the full name as the card title */}
          <CardTitle className="text-3xl font-bold text-primary">
            {' '}
            {/* Larger and highlighted name */}
            {customer.fullName}
          </CardTitle>
          <Badge variant="default">
            {!customerPoints.totalPoints ? (
              <>
                <span className="text-sm font-medium text-muted-foreground">保有ポイント : </span>
                <span className="text-base ml-1">{customerPoints.totalPoints ?? 0}</span>
              </>
            ) : (
              'ポイント無し'
            )}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {' '}
          {/* Increased space-y for better separation */}
          {/* --- Basic Info Section --- */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <User className="mr-2 h-5 w-5 text-muted-foreground" />
              基本情報
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Last Name */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">姓:</span>
                <span className="text-base font-semibold">{customer.lastName}</span>
              </div>
              {/* First Name */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">名:</span>
                <span className="text-base font-semibold">{customer.firstName}</span>
              </div>
              {/* Phone Number - spans both columns on medium screens and above */}
              <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">電話番号:</span>
                <span className="text-base">{customer.phone || '未登録'}</span>
              </div>
              <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">メールアドレス:</span>
                <span className="text-base">{customer.email || '未登録'}</span>
              </div>
            </div>
          </div>
          {/* --- End Basic Info Section --- */}
          <Separator /> {/* Separator between sections */}
          {/* --- Additional Info Section (Birthday, Notes) --- */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <NotebookPen className="mr-2 h-5 w-5 text-muted-foreground" />
              追加情報
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Birthday */}
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">誕生日:</span>
                <span className="text-base">{formattedBirthday}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">年齢:</span>
                <span className="text-base">{customerDetails.age || '未登録'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">性別:</span>
                <span className="text-base">{customerDetails.gender || '未登録'}</span>
              </div>
              {/* Notes - potentially long, use ScrollArea or Collapsible */}
              <div className="col-span-1 md:col-span-2">
                {' '}
                {/* Notes span full width */}
                <span className="text-sm font-medium text-muted-foreground flex items-center mb-2">
                  <NotebookPen className="mr-2 h-5 w-5 text-muted-foreground" />
                  メモ:
                </span>
                {customerDetails.notes ? (
                  <ScrollArea className="h-24 w-full rounded-md border p-4 text-sm">
                    {' '}
                    {/* ScrollArea for long notes */}
                    {customerDetails.notes}
                  </ScrollArea>
                ) : (
                  <p className="text-base text-muted-foreground italic">メモはありません。</p>
                )}
              </div>
            </div>
          </div>
          {/* --- End Additional Info Section --- */}
          <Separator /> {/* Separator between sections */}
          {/* --- Transaction Info Section --- */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <History className="mr-2 h-5 w-5 text-muted-foreground" />
              取引情報
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">最終取引日:</span>
              <span className="text-base">{formattedLastTransactionDate}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">最終予約日:</span>
              <span className="text-base">{formattedLastReservationDate}</span>
            </div>
            <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
              <span className="text-sm font-medium text-muted-foreground">来店回数:</span>
              <span className="text-base">{customer.useCount || 0}回</span>
            </div>
            {/* Future: Add a table or list of recent transactions here */}
          </div>
          {/* --- End Transaction Info Section --- */}
          {/* --- Tags Section --- */}
          {/* Only render the tags section if tags exist and the array is not empty */}
          {customer.tags && customer.tags.length > 0 ? (
            <>
              <Separator /> {/* Separator before tags */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Tag className="mr-2 h-5 w-5 text-muted-foreground" />
                  タグ
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* Map over tags and display each as a Badge */}
                  {/* Using tag string as key assuming tags are unique strings. */}
                  {customer.tags.map((tag) => (
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
              <Separator /> {/* Separator even if no tags */}
              <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                <Tag className="h-5 w-5" />
                <span>タグは登録されていません。</span>
              </div>
            </>
          )}
          {/* --- End Tags Section --- */}
        </CardContent>
        {/* --- CardFooter for metadata --- */}
        <CardFooter className="flex flex-col items-start space-y-2 text-sm text-muted-foreground pt-4 border-t">
          {/* Creation Time */}
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4" />
            <span>登録日: {formattedCreationTime}</span>
          </div>
          {/* Customer ID with Tooltip for full ID */}
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>顧客ID: </span>
            {/* TooltipProvider should ideally wrap the root of your app, but included here for self-contained example */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Display a shortened version of the ID */}
                  <span className="underline cursor-help">{customer._id.substring(0, 8)}...</span>
                </TooltipTrigger>
                <TooltipContent>
                  {/* Display the full ID on hover */}
                  <p>{customer._id}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
        {/* --- End CardFooter --- */}
      </Card>
    </DashboardSection>
  )
}
