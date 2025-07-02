'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { DashboardSection } from '@/components/common'
import Image from 'next/image'
import type { RowType } from '@/services/supabase/SupabaseService'
import { format } from 'date-fns'
import type { Gender } from '@/convex/types'
import {
  convertReservationStatus,
  ReservationStatus,
  convertPaymentMethod,
  convertPaymentStatus,
  PaymentMethod,
  convertGender,
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
import { Loader2 } from 'lucide-react'
import { fetchMutation } from 'convex/nextjs'

const statusColorMap = {
  confirmed: 'bg-palette-2 border border-palette-2-foreground text-palette-2-foreground',
  cancelled: 'bg-palette-4 border border-palette-4-foreground text-palette-4-foreground',
  pending: 'bg-warning border border-warning-foreground text-warning-foreground',
  completed: 'bg-palette-5 border border-palette-5-foreground text-palette-5-foreground',
  refunded: 'bg-palette-3 border border-palette-3-foreground text-palette-3-foreground',
}

export default function ReservationPage() {
  const { reservation_id } = useParams()
  const { showErrorToast } = useErrorHandler()
  const router = useRouter()
  const t = useTranslations('reservationDetail')
  const commonT = useTranslations('common')
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isStaffChangeModalOpen, setIsStaffChangeModalOpen] = useState(false)
  const [selectedNewStaffId, setSelectedNewStaffId] = useState<Id<'staff'> | null>(null)
  const [isChangingStaff, setIsChangingStaff] = useState(false)

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
  const deleteReservation = useMutation(api.reservation.mutation.kill)
  const changeStaff = useMutation(api.reservation.mutation.changeStaffForFreeNomination)

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

  // 利用可能なスタッフ一覧を取得（スタッフ変更用）
  const { results: availableStaffsData } = usePaginatedQuery(
    api.staff.query.list,
    reservationData?.reservation?.is_free_nomination
      ? {
          tenant_id: reservationData.reservation.tenant_id,
          org_id: reservationData.reservation.org_id,
        }
      : 'skip',
    { initialNumItems: 50 }
  )

  const availableStaffs = availableStaffsData || []

  // 通常の指名スタッフ情報を取得（指名フリーでstaff_idが設定されている場合も含む）
  const staff = useQuery(
    api.staff.query.getRelatedTables,
    reservationData?.reservation?.staff_id &&
      (!reservationData?.reservation?.is_free_nomination ||
        (reservationData?.reservation?.is_free_nomination &&
          !reservationData?.reservation?.assigned_staff_id))
      ? {
          tenant_id: reservationData.reservation.tenant_id,
          org_id: reservationData.reservation.org_id,
          staff_id: reservationData.reservation.staff_id as Id<'staff'>,
        }
      : 'skip'
  )

  // 指名フリーの場合の割り当てスタッフ情報を取得
  const assignedStaff = useQuery(
    api.staff.query.getRelatedTables,
    reservationData?.reservation?.is_free_nomination &&
      reservationData?.reservation?.assigned_staff_id
      ? {
          tenant_id: reservationData.reservation.tenant_id,
          org_id: reservationData.reservation.org_id,
          staff_id: reservationData.reservation.assigned_staff_id as Id<'staff'>,
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

  // ローディング条件を指名フリー予約に対応
  const shouldShowLoading = () => {
    // 基本データがない場合
    if (!reservationData || !reservationMenuDetails) {
      return true
    }

    // 指名フリー予約の場合
    if (reservationData.reservation.is_free_nomination) {
      // assigned_staff_idがある場合はassignedStaffのデータを待つ
      if (reservationData.reservation.assigned_staff_id && !assignedStaff) {
        return true
      }
      // staff_idがあるがassigned_staff_idがない場合は、staffデータを確認
      if (
        !reservationData.reservation.assigned_staff_id &&
        reservationData.reservation.staff_id &&
        !staff
      ) {
        return true
      }
      // どちらもない場合はスタッフ未割り当てなのでLoading不要
      return false
    }

    // 通常の指名予約の場合
    if (reservationData.reservation.staff_id && !staff) {
      return true
    }

    return false
  }

  if (shouldShowLoading()) {
    return <Loading />
  }

  const formatUnixTimestamp = (unixTimestamp: number) => {
    return format(new Date(unixTimestamp), 'yyyy年MM月dd日 HH:mm')
  }

  const handleShowUpdateStatusModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsUpdateStatusModalOpen(true)
  }

  const handleUpdateStatus = async () => {
    try {
      if (!reservationData) return

      await fetchMutation(api.reservation.manage.handleReservationManage, {
        mode: 'status',
        payload: {
          reservationId: reservationData.reservation._id,
          status: status,
        },
      })

      toast.success(t('statusUpdated'))
      router.push('/dashboard/reservation')
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsUpdateStatusModalOpen(false)
    }
  }

  const handleDeleteReservation = async () => {
    try {
      if (!reservationData) return
      await deleteReservation({
        reservation_id: reservationData.reservation._id,
        tenant_id: reservationData.reservation.tenant_id,
        org_id: reservationData.reservation.org_id,
      })
      toast.success(t('reservationDeleted'))
      router.push('/dashboard/reservation')
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsDeleteModalOpen(false)
    }
  }

  const handleStaffChange = async () => {
    if (!selectedNewStaffId || !reservationData) return

    try {
      setIsChangingStaff(true)
      await changeStaff({
        reservation_id: reservationData.reservation._id,
        new_staff_id: selectedNewStaffId,
        changed_by: 'admin', // 管理画面からの変更
      })

      toast.success('スタッフを変更しました')
      setIsStaffChangeModalOpen(false)
      // ページをリロードして最新データを取得
      router.refresh()
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsChangingStaff(false)
    }
  }

  if (!reservationData) return <Loading />

  return (
    <DashboardSection
      title={t('title')}
      backLink="/dashboard/reservation"
      backLinkTitle={t('backToList')}
    >
      <div className="flex flex-col gap-4 bg-background">
        <p className="text-sm text-muted-foreground">
          施術が完了した予約は必ず「施術完了」に変更してください。
          <br />
          施術完了に変更しない場合、ポイントの付与やその他の処理に影響が出ます。
        </p>
        <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md leading-relaxed border border-muted-foreground w-fit">
          一度 <strong>完了、キャンセル、または返金した予約</strong>{' '}
          のステータスを変更することはできません。
          <br />
          予約を再度受け付ける場合は、一度 <strong>キャンセル</strong> し{' '}
          <strong>新規予約作成</strong> を行ってください。
          <br />
          <strong>保留</strong> の予約は予約枠の計算に含まれずその時間帯は予約可能となります。
          <br />
          それを防ぎたい場合は<strong>予約受付済み</strong>に設定してください。
        </div>
        <div className="border-b pb-4">
          <div
            className={`flex justify-end w-full ${
              reservationData.reservation.status === 'completed' ||
              reservationData.reservation.status === 'cancelled' ||
              reservationData.reservation.status === 'refunded'
                ? 'hidden'
                : ''
            }`}
          >
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
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <p
                  className={`w-fit px-4 py-1 my-2 rounded-md font-medium text-sm ${statusColorMap[reservationData.reservation.status as ReservationStatus]}`}
                >
                  {convertReservationStatus(
                    reservationData.reservation.status as ReservationStatus
                  )}
                </p>
              </div>

              <div className="border border-primary rounded-md px-4 py-1 w-fit">
                <p className="text-primary text-sm font-medium">
                  {convertPaymentStatus(reservationData.reservation.payment_status)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">{t('dateTime')}:</p>
              <p className="font-medium text-lg">
                {formatUnixTimestamp(reservationData.reservation.start_time_unix ?? 0)} -{' '}
                {format(new Date(reservationData.reservation.end_time_unix ?? 0), 'HH:mm')}
              </p>
            </div>
            <div>
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium mr-2">メニュー</span> ¥
                  {reservationData.reservationDetail?.menus
                    ?.reduce((acc, menu) => acc + menu.quantity * (menu.price ?? 0), 0)
                    .toLocaleString()}{' '}
                </p>
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium mr-2">オプション</span> ¥
                  {reservationData.reservationDetail?.options
                    .reduce((acc, option) => acc + option.quantity * (option.price ?? 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium mr-2">指名料</span> ¥
                  {reservationData.reservationDetail?.extra_charge?.toLocaleString() ?? 0}
                </p>
                <div className="flex items-center mt-3">
                  <p className="text-primary text-base font-bold">
                    <span className="font-medium mr-2">{t('totalAmount')}</span> ¥
                    {reservationData.reservationDetail?.total_price?.toLocaleString() ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">{t('paymentMethod')}:</p>
              <p className="font-medium text-lg">
                {convertPaymentMethod(
                  reservationData.reservationDetail?.payment_method as PaymentMethod
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-3">{t('customerInfo')}</h2>
          {reservationData?.reservation?.customer_id ? (
            <>
              {customerLoading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-border"></div>
                  <span className="text-muted-foreground">{t('loadingCustomerData')}...</span>
                </div>
              )}

              {customerError && <p className="text-destructive">{customerError}</p>}

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
                      {customerData.customerDetail.gender && (
                        <div>
                          <p className="text-muted-foreground">{t('gender')}:</p>
                          <p className="font-medium">
                            {convertGender(customerData.customerDetail.gender as Gender, true)}
                          </p>
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
            <p className="text-muted-foreground">{t('noCustomerLinked')}</p>
          )}
        </div>
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-3">{t('assignedStaff')}</h2>
          {reservationData.reservation.is_free_nomination && (
            <div className="mb-4 p-3 bg-purple-100 rounded-md">
              <p className="text-sm font-medium text-muted-foreground">🎯 指名フリー予約</p>
            </div>
          )}
          {staff || assignedStaff ? (
            <div className="flex items-center gap-4">
              {((staff || assignedStaff)?.images?.length ?? 0) > 0 &&
                (staff || assignedStaff)?.images[0].thumbnail_url && (
                  <div className="relative h-auto border border-border shadow-sm rounded-md overflow-hidden flex items-center justify-center">
                    <Image
                      src={(staff || assignedStaff)!.images[0].thumbnail_url!}
                      alt={(staff || assignedStaff)?.name ?? ''}
                      width={150}
                      height={150}
                      className=""
                    />
                  </div>
                )}
              <div>
                <p className="font-medium text-lg">
                  {reservationData.reservation.is_free_nomination && assignedStaff
                    ? `${assignedStaff.name} (自動割り当て)`
                    : (staff || assignedStaff)?.name}
                </p>
                {(staff || assignedStaff)?.description && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {(staff || assignedStaff)?.description}
                  </p>
                )}
                {((staff || assignedStaff)?.tags?.length ?? 0) > 0 && (
                  <div className="mt-2">
                    {(staff || assignedStaff)?.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block bg-muted rounded-full px-3 py-1 text-sm font-semibold text-muted-foreground mr-2 mb-2"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {/* スタッフ変更は指名フリー予約（is_free_nomination: true）の場合のみ可能 */}
                {reservationData.reservation.is_free_nomination && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsStaffChangeModalOpen(true)}
                      disabled={
                        reservationData.reservation.status === 'completed' ||
                        reservationData.reservation.status === 'cancelled' ||
                        reservationData.reservation.status === 'refunded'
                      }
                    >
                      スタッフを変更
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">
              <p>スタッフ未割り当て</p>
              {/* スタッフ割り当ては指名フリー予約（is_free_nomination: true）の場合のみ可能 */}
              {reservationData.reservation.is_free_nomination && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsStaffChangeModalOpen(true)}
                  disabled={
                    reservationData.reservation.status === 'completed' ||
                    reservationData.reservation.status === 'cancelled' ||
                    reservationData.reservation.status === 'refunded'
                  }
                >
                  スタッフを割り当て
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-3">{t('reservationContent')}</h2>
          {reservationMenuDetails?.menus?.length && reservationMenuDetails?.menus?.length > 0 && (
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

          {reservationMenuDetails?.options && reservationMenuDetails?.options?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">{t('options')}</h3>
              <ul className="list-disc list-inside">
                {reservationMenuDetails.options &&
                  reservationMenuDetails.options.length > 0 &&
                  reservationMenuDetails.options.map((option, index) => (
                    <li key={index} className="text-muted-foreground">
                      {option.name} - ¥{option.unit_price?.toLocaleString()} x{' '}
                      {reservationData.reservationDetail?.options?.find((o) => o.id === option._id)
                        ?.quantity ?? 0}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {reservationMenuDetails?.menus?.length && reservationMenuDetails?.menus?.length === 0 && (
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
      <Dialog open={isStaffChangeModalOpen} onOpenChange={setIsStaffChangeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スタッフを変更</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              指名フリー予約のスタッフを変更します。新しいスタッフを選択してください。
            </p>
            <Select
              value={selectedNewStaffId || undefined}
              onValueChange={(value) => setSelectedNewStaffId(value as Id<'staff'>)}
            >
              <SelectTrigger>
                <SelectValue placeholder="スタッフを選択" />
              </SelectTrigger>
              <SelectContent>
                {availableStaffs
                  ?.filter((staff) => {
                    // 現在割り当てられているスタッフを除外
                    const currentAssignedStaffId =
                      reservationData?.reservation?.assigned_staff_id ||
                      reservationData?.reservation?.staff_id
                    return staff._id !== currentAssignedStaffId
                  })
                  ?.map((staff) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      {staff.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStaffChangeModalOpen(false)}>
              {commonT('cancel')}
            </Button>
            <Button onClick={handleStaffChange} disabled={!selectedNewStaffId || isChangingStaff}>
              {isChangingStaff ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  変更中...
                </>
              ) : (
                '変更する'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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