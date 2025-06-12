'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { DashboardSection } from '@/components/common'
import Image from 'next/image'
import type { RowType } from '@/services/supabase/SupabaseService'
import { format } from 'date-fns'
import {
  convertReservationStatus,
  ReservationStatus,
  convertPaymentMethod,
  PaymentMethod,
} from '@/convex/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { RESERVATION_STATUS_VALUES } from '@/convex/types'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { CustomerRepository } from '@/services/supabase/repositories/customer'
import { useTranslations } from 'next-intl'

const statusColorMap = {
  confirmed: 'bg-palette-2-foreground border border-palette-2 text-palette-2',
  cancelled: 'bg-palette-4-foreground border border-palette-4 text-palette-4',
  pending: 'bg-warning-foreground border border-warning text-warning',
  completed: 'bg-palette-5-foreground border border-palette-5 text-palette-5',
  refunded: 'bg-palette-3-foreground border border-palette-3 text-palette-3',
}

export default function ReservationPage() {
  const { reservation_id } = useParams()
  const { showErrorToast } = useErrorHandler()
  const router = useRouter()
  const t = useTranslations('reservationDetail')
  const commonT = useTranslations('common')
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const [customerData, setCustomerData] = useState<{
    customer: RowType<'customer'> | null
    customerDetail: RowType<'customer_detail'> | null
    customerPoints: RowType<'customer_points'> | null
  } | null>(null)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const reservationData = useQuery(api.reservation.query.getWithDetailById, {
    id: reservation_id as Id<'reservation'>,
  })
  const [status, setStatus] = useState<ReservationStatus>(
    reservationData?.reservation?.status as ReservationStatus
  )

  const updateStatus = useMutation(api.reservation.mutation.updateStatus)
  const deleteReservation = useMutation(api.reservation.mutation.kill)

  const reservationMenuDetails = useQuery(
    api.menu.query.getDisplayByIds,
    reservationData && reservationData.reservationDetail
      ? {
          menu_ids: reservationData.reservationDetail.menus.map((menu) => menu.id) as Id<'menu'>[],
          option_ids: reservationData.reservationDetail.options.map(
            (option) => option.id
          ) as Id<'option'>[],
        }
      : 'skip'
  )

  const staff = useQuery(
    api.staff.query.getRelatedTables,
    reservationData?.reservation?.staff_id
      ? {
          tenant_id: reservationData.reservation.tenant_id,
          org_id: reservationData.reservation.org_id,
          staff_id: reservationData.reservation.staff_id as Id<'staff'>,
        }
      : 'skip'
  )

  useEffect(() => {
    if (reservationData) {
      setStatus(reservationData.reservation.status as ReservationStatus)
    }
  }, [reservationData])

  useEffect(() => {
    async function fetchCustomerData() {
      if (!reservationData?.reservation?.customer_id) {
        return
      }

      setCustomerLoading(true)
      setCustomerError(null)

      try {
        const customerRepository = new CustomerRepository()
        const data = await customerRepository.getCompleteCustomerData(
          reservationData.reservation.customer_id,
          reservationData.reservation.tenant_id,
          reservationData.reservation.org_id
        )
        setCustomerData(data)
      } catch (error) {
        console.error('Failed to fetch customer data:', error)
        setCustomerError(t('errors.fetchCustomerData'))
      } finally {
        setCustomerLoading(false)
      }
    }

    fetchCustomerData()
  }, [
    reservationData?.reservation?.customer_id,
    reservationData?.reservation?.tenant_id,
    reservationData?.reservation?.org_id,
    t,
  ])

  if (!reservationData || !staff || !reservationMenuDetails) return <Loading />

  const formatUnixTimestamp = (unixTimestamp: number) => {
    return format(new Date(unixTimestamp), 'yyyy年MM月dd日 HH:mm')
  }

  const handleShowUpdateStatusModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsUpdateStatusModalOpen(true)
  }

  const handleUpdateStatus = async () => {
    try {
      await updateStatus({
        reservation_id: reservationData.reservation._id,
        status: status,
      })

      toast.success(t('statusUpdated'))
      router.push('/dashboard/reservation')
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsUpdateStatusModalOpen(false)
    }
  }

  const handleShowDeleteModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsDeleteModalOpen(true)
  }

  const handleDeleteReservation = async () => {
    try {
      await deleteReservation({ reservation_id: reservationData.reservation._id })
      toast.success(t('reservationDeleted'))
      router.push('/dashboard/reservation')
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsDeleteModalOpen(false)
    }
  }

  return (
    <DashboardSection
      title={t('title')}
      backLink="/dashboard/reservation"
      backLinkTitle={t('backToList')}
    >
      <div className="flex flex-col gap-8 bg-background">
        <div className="border-b pb-4">
          <div className="flex justify-end w-full">
            <div className="flex gap-4">
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ReservationStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  {RESERVATION_STATUS_VALUES.map((status, index) => (
                    <SelectItem key={index} value={status}>
                      {convertReservationStatus(status as ReservationStatus)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="default" onClick={(e) => handleShowUpdateStatusModal(e)}>
                {t('changeStatus')}
              </Button>

              <Button variant="destructive" onClick={(e) => handleShowDeleteModal(e)}>
                {t('delete')}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p
                className={`w-fit px-4 py-1 my-2 rounded-md font-medium text-sm ${statusColorMap[reservationData.reservation.status as ReservationStatus]}`}
              >
                {convertReservationStatus(reservationData.reservation.status as ReservationStatus)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('dateTime')}:</p>
              <p className="font-medium text-lg">
                {formatUnixTimestamp(reservationData.reservation.start_time_unix ?? 0)} -{' '}
                {format(new Date(reservationData.reservation.start_time_unix ?? 0), 'HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('totalAmount')}:</p>
              <p className="font-medium text-lg">
                ¥{reservationData.reservationDetail?.total_price}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('paymentMethod')}:</p>
              <p className="font-medium text-lg">
                {convertPaymentMethod(
                  reservationData.reservationDetail?.payment_method as PaymentMethod
                )}
              </p>
            </div>
            {reservationData.reservationDetail?.notes &&
              reservationData.reservationDetail?.notes.trim() !== '' && (
                <div className="text-muted-foreground text-sm">
                  <p className="font-medium text-lg">{t('notes')}:</p>
                  <p className="text-muted-foreground text-sm">
                    {reservationData.reservationDetail?.notes}
                  </p>
                </div>
              )}
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-3">{t('customerInfo')}</h2>
          {reservationData?.reservation?.customer_id ? (
            <>
              {customerLoading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <span className="text-muted-foreground">{t('loadingCustomerData')}...</span>
                </div>
              )}

              {customerError && <p className="text-red-500">{customerError}</p>}

              {customerData && !customerLoading && (
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground">{t('customerName')}:</p>
                    <p className="font-medium text-lg">
                      {customerData.customer?.line_user_name
                        ? customerData.customer?.line_user_name
                        : customerData.customer?.last_name && customerData.customer?.first_name
                          ? `${customerData.customer?.last_name} ${customerData.customer?.first_name}`
                          : t('notSet')}
                    </p>
                  </div>

                  {customerData.customer?.phone && (
                    <div>
                      <p className="text-muted-foreground">{t('phoneNumber')}:</p>
                      <p className="font-medium">{customerData.customer?.phone}</p>
                    </div>
                  )}

                  {customerData.customer?.email && (
                    <div>
                      <p className="text-muted-foreground">{t('email')}:</p>
                      <p className="font-medium">{customerData.customer?.email}</p>
                    </div>
                  )}

                  {customerData.customerDetail && (
                    <>
                      {customerData.customerDetail.age && (
                        <div>
                          <p className="text-muted-foreground">{t('age')}:</p>
                          <p className="font-medium">{t('yearsOld', { age: customerData.customerDetail.age })}</p>
                        </div>
                      )}

                      {customerData.customerDetail.gender && (
                        <div>
                          <p className="text-muted-foreground">{t('gender')}:</p>
                          <p className="font-medium">{customerData.customerDetail.gender}</p>
                        </div>
                      )}
                    </>
                  )}

                  {customerData.customerPoints && (
                    <div>
                      <p className="text-muted-foreground">{t('points')}:</p>
                      <p className="font-medium">
                        {t('pointsCount', { count: customerData.customerPoints.total_points || 0 })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              {t('noCustomerLinked')}
            </p>
          )}
        </div>
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-3">{t('assignedStaff')}</h2>
          <div className="flex flex-col md:flex-row items-center gap-4">
            {staff.images.length > 0 && (
              <div className="relative h-auto w-full max-w-xs border border-border shadow-sm rounded-md overflow-hidden flex items-center justify-center">
                <Image
                  src={staff.images[0].original_url}
                  alt={staff.name ?? ''}
                  width={180}
                  height={180}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div>
              <p className="font-medium text-lg">{staff.name}</p>
              {staff.description && (
                <p className="text-muted-foreground text-sm mt-1">{staff.description}</p>
              )}
              {staff.tags && staff.tags.length > 0 && (
                <div className="mt-2">
                  {staff.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-muted rounded-full px-3 py-1 text-sm font-semibold text-muted-foreground mr-2 mb-2"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-3">{t('reservationContent')}</h2>
          {reservationMenuDetails?.menus?.length > 0 && (
            <div className="flex flex-col gap-3">
              {reservationData.reservationDetail?.menus?.map((reservationMenuItem, index) => {
                const menuDetail = reservationMenuDetails.menus.find(
                  (detail) => detail._id === reservationMenuItem.id
                )

                if (!menuDetail) return null

                return (
                  <div key={index} className="border rounded-lg p-3">
                    <p className="font-medium text-lg">{menuDetail.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {t('quantity')}: {reservationMenuItem.quantity}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t('duration')}: {menuDetail.duration_min} {t('minutes')}
                    </p>
                    <p className="font-semibold text-md mt-1">
                      {t('price')}: ¥
                      {(menuDetail.sale_price ?? menuDetail.unit_price ?? 0).toLocaleString()}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {reservationMenuDetails?.options?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">{t('options')}</h3>
              <ul className="list-disc list-inside">
                {reservationMenuDetails.options.map((option, index) => (
                  <li key={index} className="text-muted-foreground">
                    {option.name} - ¥{option.unit_price?.toLocaleString()} x{' '}
                    {reservationData.reservationDetail?.options?.find((o) => o.id === option._id)
                      ?.quantity ?? 0}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {reservationMenuDetails?.menus?.length === 0 && (
            <p className="text-muted-foreground">{t('noMenuReserved')}</p>
          )}
        </div>
        {reservationData.reservationDetail?.notes &&
          reservationData.reservationDetail?.notes.trim() !== '' && (
            <div>
              <h2 className="text-xl font-semibold mb-3">{t('notes')}</h2>
              <div className="bg-muted p-3 rounded-lg text-muted-foreground">
                {reservationData.reservationDetail?.notes}
              </div>
            </div>
          )}
      </div>
      <Dialog open={isUpdateStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changeStatusDialog.title')}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateStatusModalOpen(false)}>
              {commonT('cancel')}
            </Button>
            <Button variant="default" onClick={handleUpdateStatus}>
              {commonT('update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              {commonT('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteReservation}>
              {commonT('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardSection>
  )
}
