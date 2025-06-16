'use client'

import { DashboardSection, withManagerAccess } from '@/components/common' // Assuming this is your layout component
import { useParams } from 'next/navigation'
import { Loading } from '@/components/common' // Assuming this is your loading component
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
import { useTranslations, useLocale } from 'next-intl'

// Import date formatting library
import { formatDate } from '@/lib/formatDate'
import type { SupportedLocale } from '@/lib/dateLocale'

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
  const t = useTranslations('customers')
  const locale = useLocale() as SupportedLocale

  // 状態管理
  const [completeCustomer, setCompleteCustomer] = useState<CompleteCustomerData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const customerRepo = useMemo(() => new CustomerRepository(), [])
  
  // Date formatting states
  const [formattedCreationTime, setFormattedCreationTime] = useState('')
  const [formattedBirthday, setFormattedBirthday] = useState('')
  const [formattedLastReservationDate, setFormattedLastReservationDate] = useState('')

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
          toast.error(t('customerNotFound'))
        }
      } catch (error) {
        console.error('顧客データの取得に失敗しました:', error)
        toast.error(t('fetchError'))
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchCustomerData()
  }, [tenantId, orgId, customerUid, isLoaded, customerRepo, t])

  // Date formatting
  useEffect(() => {
    const formatDates = async () => {
      if (completeCustomer?.customer?.created_at) {
        const formatted = await formatDate(new Date(completeCustomer.customer.created_at), 'PPP p', locale)
        setFormattedCreationTime(formatted)
      } else {
        setFormattedCreationTime(t('unknown'))
      }

      if (completeCustomer?.customerDetail?.birthday) {
        const formatted = await formatDate(new Date(completeCustomer.customerDetail.birthday), 'PPP', locale)
        setFormattedBirthday(formatted)
      } else {
        setFormattedBirthday(t('notRegistered'))
      }

      if (completeCustomer?.customer?.last_reservation_date_unix) {
        const formatted = await formatDate(
          new Date(completeCustomer.customer.last_reservation_date_unix * 1000),
          'PPP p',
          locale
        )
        setFormattedLastReservationDate(formatted)
      } else {
        setFormattedLastReservationDate(t('noReservationHistory'))
      }
    }

    formatDates()
  }, [completeCustomer, locale, t])

  // ローディング状態の表示
  if (!isLoaded || isLoadingData || !completeCustomer || !completeCustomer.customer) {
    return <Loading />
  }

  return (
    // Use the existing DashboardSection for consistent layout
    <DashboardSection
      title={t('customerDetails')}
      backLink="/dashboard/customer"
      backLinkTitle={t('list')}
      infoBtn={{
        text: t('edit'),
        link: `/dashboard/customer/${customerUid}/edit`,
      }}
    >
      <div>
        <div className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <h3 className="text-3xl font-bold text-primary">
              {completeCustomer.customer.last_name ?? t('notRegistered')}{' '}
              {completeCustomer.customer.first_name ?? t('notRegistered')}
              <span className="text-sm text-muted-foreground ml-1">{t('honorific')}</span>
            </h3>
          </div>
          <Badge>
            <div className="flex flex-col md:flex-row items-center justify-end space-x-2">
              <span className="text-sm font-medium">{t('totalPoints')}</span>
              <span className="text-base ml-1">
                {completeCustomer.customerPoints?.total_points ?? 0}
              </span>
            </div>
          </Badge>
        </div>
        {completeCustomer.customer.line_user_name && (
          <div className="flex flex-col md:flex-row items-center justify-start space-x-2">
            <p className="w-fit text-sm mt-1 text-accent-2 border-accent-2 border rounded-md font-bold py-1 px-3">
              {t('lineUserName')}: {completeCustomer.customer.line_user_name}
            </p>
          </div>
        )}
        <div className="space-y-6 pt-4">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <User className="mr-2 h-5 w-5 text-muted-foreground" />
              {t('basicInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Last Name */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">{t('lastName')}:</span>
                <span className="text-base font-semibold">
                  {completeCustomer.customer.last_name || t('notRegistered')}
                </span>
              </div>
              {/* First Name */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">{t('firstName')}:</span>
                <span className="text-base font-semibold">
                  {completeCustomer.customer.first_name || t('notRegistered')}
                </span>
              </div>
              {/* Phone Number - spans both columns on medium screens and above */}
              <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('phone')}:</span>
                <span className="text-base">
                  {completeCustomer.customer.phone || t('notRegistered')}
                </span>
              </div>
              <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('email')}:</span>
                <span className="text-base">
                  {completeCustomer.customer.email || t('notRegistered')}
                </span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <NotebookPen className="mr-2 h-5 w-5 text-muted-foreground" />
              {t('additionalInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('birthday')}:</span>
                <span className="text-base">{formattedBirthday}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('age')}:</span>
                <span className="text-base">
                  {completeCustomer.customerDetail?.age
                    ? t('ageValue', { age: completeCustomer.customerDetail.age })
                    : t('notRegistered')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Cake className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('gender')}:</span>
                <span className="text-base">
                  {completeCustomer.customerDetail?.gender === 'male'
                    ? t('male')
                    : completeCustomer.customerDetail?.gender === 'female'
                      ? t('female')
                      : t('unselected')}
                </span>
              </div>
              {/* Notes - potentially long, use ScrollArea or Collapsible */}
              <div className="col-span-1 md:col-span-2">
                {' '}
                {/* Notes span full width */}
                <span className="text-sm font-medium text-muted-foreground flex items-center mb-2">
                  <NotebookPen className="mr-2 h-5 w-5 text-muted-foreground" />
                  {t('notes')}:
                </span>
                {completeCustomer.customerDetail?.notes ? (
                  <ScrollArea className="h-24 w-full rounded-md border p-4 text-sm">
                    {' '}
                    {/* ScrollArea for long notes */}
                    {completeCustomer.customerDetail.notes}
                  </ScrollArea>
                ) : (
                  <p className="text-base text-muted-foreground italic">{t('noNotes')}</p>
                )}
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <History className="mr-2 h-5 w-5 text-muted-foreground" />
              {t('usageInfo')}
            </h3>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">{t('lastVisit')}:</span>
              <span className="text-sm">{formattedLastReservationDate}</span>
            </div>
            <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
              <span className="text-sm font-medium text-muted-foreground">{t('visitCount')}:</span>
              <span className="text-sm">
                {t('visitCountValue', {
                  count: completeCustomer.customer.total_reservation_count || 0,
                })}
              </span>
            </div>
          </div>

          {completeCustomer.customer.tags && completeCustomer.customer.tags.length > 0 ? (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Tag className="mr-2 h-5 w-5 text-muted-foreground" />
                  {t('tags')}
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
              <div className="flex items-center space-x-2 text-muted-foreground text-sm pb-2">
                <Tag className="h-5 w-5" />
                <span>{t('noTags')}</span>
              </div>
            </>
          )}
          {/* --- End Tags Section --- */}
        </div>
        <div className="flex flex-col items-start space-y-2 text-sm text-muted-foreground pt-4 border-t">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4" />
            <span>
              {t('registrationDate')}: {formattedCreationTime}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>{t('customerId')}: </span>

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
