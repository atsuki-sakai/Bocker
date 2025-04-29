'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { DashboardSection } from '@/components/common'
import Image from 'next/image'
import { format } from 'date-fns'
import { convertReservationStatus, ReservationStatus } from '@/services/convex/shared/types/common'
import { convertPaymentMethod, PaymentMethod } from '@/services/convex/shared/types/common'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/common'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { RESERVATION_STATUS_VALUES } from '@/services/convex/shared/types/common'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'

const statusColorMap = {
  confirmed: 'bg-green-50 border border-green-500 text-green-500',
  cancelled: 'bg-red-50 border border-red-500 text-red-500',
  pending: 'bg-yellow-50 border border-yellow-500 text-yellow-500',
  completed: 'bg-blue-50 border border-blue-500 text-blue-500',
  refunded: 'bg-gray-50 border border-gray-500 text-gray-500',
}
export default function ReservationPage() {
  const { reservation_id } = useParams()

  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false)
  const reservation = useQuery(api.reservation.query.getById, {
    reservationId: reservation_id as Id<'reservation'>,
  })
  const [status, setStatus] = useState<ReservationStatus>(reservation?.status as ReservationStatus)

  const updateStatus = useMutation(api.reservation.mutation.updateStatus)

  const customer = useQuery(
    api.customer.core.query.getById,
    reservation?.customerId ? { customerId: reservation?.customerId as Id<'customer'> } : 'skip'
  )

  const reservationMenuDetails = useQuery(
    api.menu.core.query.getDisplayByIds,
    reservation
      ? {
          menuIds: reservation?.menus?.map((menu) => menu.menuId) as Id<'menu'>[],
          options: reservation?.options?.map((option) => option.optionId) as Id<'salon_option'>[],
        }
      : 'skip'
  )

  const staff = useQuery(
    api.staff.core.query.getById,
    reservation?.staffId
      ? {
          id: reservation.staffId as Id<'staff'>,
        }
      : 'skip'
  )

  useEffect(() => {
    if (reservation) {
      setStatus(reservation.status as ReservationStatus)
    }
  }, [reservation])

  if (!reservation || !staff || !reservationMenuDetails) return <Loading />

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
        reservationId: reservation._id,
        status: status,
      })
      toast.success('ステータスを変更しました')
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    } finally {
      setIsUpdateStatusModalOpen(false)
    }
  }

  return (
    <DashboardSection
      title="予約詳細"
      backLink="/dashboard/reservation"
      backLinkTitle="予約一覧に戻る"
    >
      <div className="flex flex-col gap-8 bg-white">
        <div className="border-b pb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold mb-3">予約概要</h2>
            <div className="flex gap-4">
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ReservationStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ステータスを選択" />
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
                ステータス変更
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">ステータス:</p>
              <p
                className={`w-fit px-4 my-2 rounded-md font-medium text-lg ${statusColorMap[reservation.status as ReservationStatus]}`}
              >
                {convertReservationStatus(reservation.status as ReservationStatus)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">日時:</p>
              <p className="font-medium text-lg">
                {formatUnixTimestamp(reservation.startTime_unix ?? 0)} -{' '}
                {format(new Date(reservation.endTime_unix ?? 0), 'HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-gray-600">合計金額:</p>
              <p className="font-medium text-lg">¥{reservation.totalPrice?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">支払い方法:</p>
              <p className="font-medium text-lg">
                {convertPaymentMethod(reservation.paymentMethod as PaymentMethod)}
              </p>
            </div>
          </div>
        </div>

        {customer && (
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-3">お客様情報</h2>
            <div>
              <p className="text-gray-600">お客様名:</p>
              <p className="font-medium text-lg">{customer.fullName || 'N/A'}</p>
            </div>
          </div>
        )}
        {!customer && reservation?.customerId && (
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-3">お客様情報</h2>
            <p className="text-gray-600">お客様情報は見つかりませんでした。</p>
          </div>
        )}
        {!reservation?.customerId && (
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-3">お客様情報</h2>
            <p className="text-gray-600">この予約にはお客様情報が関連付けられていません。</p>
          </div>
        )}
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-3">担当スタッフ</h2>
          <div className="flex items-center gap-4">
            {staff.imgPath && (
              <div className="w-16 h-16 rounded-full overflow-hidden">
                <Image
                  src={staff.imgPath}
                  alt={staff.name ?? ''}
                  width={64}
                  height={64}
                  objectFit="cover"
                />
              </div>
            )}
            <div>
              <p className="font-medium text-lg">{staff.name}</p>
              {staff.description && (
                <p className="text-gray-700 text-sm mt-1">{staff.description}</p>
              )}
              {staff.tags && staff.tags.length > 0 && (
                <div className="mt-2">
                  {staff.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
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
          <h2 className="text-xl font-semibold mb-3">予約内容</h2>
          {reservationMenuDetails?.menus?.length > 0 && (
            <div className="flex flex-col gap-3">
              {reservation.menus?.map((reservationMenuItem, index) => {
                const menuDetail = reservationMenuDetails.menus.find(
                  (detail) => detail._id === reservationMenuItem.menuId
                )

                if (!menuDetail) return null

                return (
                  <div key={index} className="border rounded-lg p-3">
                    <p className="font-medium text-lg">{menuDetail.name}</p>
                    <p className="text-gray-700 text-sm">数量: {reservationMenuItem.quantity}</p>
                    <p className="text-gray-700 text-sm">時間: {menuDetail.timeToMin} 分</p>
                    <p className="font-semibold text-md mt-1">
                      価格: ¥{(menuDetail.salePrice ?? menuDetail.unitPrice ?? 0).toLocaleString()}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {reservationMenuDetails?.options?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">オプション</h3>
              <ul className="list-disc list-inside">
                {reservationMenuDetails.options.map((option, index) => (
                  <li key={index} className="text-gray-700">
                    {option.name} - ¥{option.unitPrice?.toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {reservationMenuDetails?.menus?.length === 0 && (
            <p className="text-gray-600">予約されたメニューはありません。</p>
          )}
        </div>
        {reservation.notes && reservation.notes.trim() !== '' && (
          <div>
            <h2 className="text-xl font-semibold mb-3">備考</h2>
            <div className="bg-gray-100 p-3 rounded-lg text-gray-800">{reservation.notes}</div>
          </div>
        )}
      </div>
      <Dialog
        open={isUpdateStatusModalOpen}
        onOpenChange={setIsUpdateStatusModalOpen}
        title="予約ステータス変更"
        description="予約のステータスを変更しますか？"
        onConfirmAction={handleUpdateStatus}
      />
    </DashboardSection>
  )
}
