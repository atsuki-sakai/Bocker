'use client'

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTenantAndOrganization } from "@/hooks/useTenantAndOrganization";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from 'date-fns/locale'
import { Button } from '../ui/button'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Loading } from '@/components/common'

export default function ReservationNotificationList() {
  const { tenantId, orgId, subscription } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const notifications = useQuery(
    api.reservation.notification.query.list,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip'
  )

  const killNotification = useMutation(api.reservation.notification.mutation.kill)
  const killAllNotifications = useMutation(api.reservation.notification.mutation.killAll)

  const handleKillNotification = (notificationId: Id<'reservation_notification'>) => {
    if (notificationId) {
      try {
        killNotification({
          reservation_notification_id: notificationId as Id<'reservation_notification'>,
        })
        toast.success('通知を確認しました。')
      } catch (error) {
        showErrorToast(error)
      }
    }
  }

  const handleKillAllNotifications = () => {
    try {
      killAllNotifications({
        tenant_id: tenantId as Id<'tenant'>,
        org_id: orgId as Id<'organization'>,
      })
      toast.success('通知を全て削除しました。')
    } catch (error) {
      showErrorToast(error)
    }
  }

  if (notifications === undefined) {
    return <Loading />
  }

  return (
    <div className={`relative h-full w-full ${subscription === null ? 'hidden' : ''}`}>
      {notifications?.length === 0 ? (
        <div className="absolute -top-3 right-0 flex items-center justify-center gap-2 z-10">
          <CheckCircle2 className="w-4 h-4 text-accent-2" />
          <p className="text-xs md:text-sm text-muted-foreground">新規予約通知はありません。</p>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full overflow-x-auto">
          <AccordionItem value="notifications">
            <div className="flex justify-between items-center gap-2 w-full">
              <AccordionTrigger className="py-1 mb-2 px-3 bg-link border border-link-foreground text-muted-foreground rounded-lg transition-colors hover:no-underline flex-1">
                <div className="flex flex-col md:flex-row items-start md:items-center md:gap-2 w-full">
                  {notifications && notifications.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs">
                      <strong className="text-base text-link-foreground">
                        {' '}
                        {notifications.length}
                      </strong>{' '}
                      件の新規予約
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <Button
                className="mr-5"
                variant="destructive"
                size="sm"
                onClick={() => handleKillAllNotifications()}
              >
                <span className="text-xs hidden md:block">全て確認済みにする</span>
                <span className="text-xs md:hidden">全て確認</span>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <AccordionContent className="pt-2 overflow-x-auto w-full">
              <div className="space-y-2">
                {notifications?.map((notification) => (
                  <div key={notification._id} className="flex items-center justify-between ">
                    <div className="flex flex-col items-center mr-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleKillNotification(notification._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col gap-1 w-full text-nowrap">
                      <div className="flex flex-col md:flex-row  items-start md:items-center gap-2">
                        <div className="flex gap-4 items-center">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-primary">
                              {format(notification.start_time_unix, 'yyyy年MM月dd日(EEE)', {
                                locale: ja,
                              })}
                            </span>
                            <span className="text-sm text-link-foreground underline">
                              {format(notification.start_time_unix, 'HH:mm')} ~{' '}
                              {format(notification.end_time_unix, 'HH:mm')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            <small className="font-bold border border-muted-foreground rounded-md px-1 py-0.5 mr-1">
                              担当
                            </small>
                            {notification.staff_name}
                            {' - '}
                            <small className="font-bold border border-muted-foreground rounded-md px-1 py-0.5 mr-1">
                              顧客名
                            </small>
                            {notification.customer_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}