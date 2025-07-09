'use client'

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTenantAndOrganization } from "@/hooks/useTenantAndOrganization";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { convertReservationStatus } from "@/convex/types";
import { Button } from "../ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useErrorHandler } from "@/hooks/useErrorHandler";
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

  if (subscription === undefined || notifications === undefined) {
    return <Loading />
  }

  return (
    <div className="relative h-full w-full">
      {notifications?.length === 0 ? (
        <div className="absolute -top-3 right-0 flex items-center justify-center gap-2 z-10">
          <CheckCircle2 className="w-4 h-4 text-accent-2" />
          <p className="text-xs">新規予約通知はありません。</p>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full overflow-x-auto">
          <AccordionItem value="notifications">
            <div className="flex items-center gap-2 w-full">
              <AccordionTrigger className="py-2 px-3 rounded-lg transition-colors hover:no-underline flex-1">
                <div className="flex flex-col md:flex-row items-start md:items-center md:gap-2 w-full">
                  <span className="text-sm font-medium">新規予約通知</span>
                  {notifications && notifications.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs">
                      <strong className="text-base text-accent-2"> {notifications.length}</strong>{' '}
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
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <AccordionContent className="pt-2 overflow-x-auto w-full">
              <div className="space-y-2">
                {notifications?.map((notification) => (
                  <div
                    key={notification._id}
                    className="flex items-center justify-between p-2 gap-2"
                  >
                    <div className="flex flex-col items-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleKillNotification(notification._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col gap-1 w-full text-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-accent-2-foreground text-accent-2 border border-accent-2 rounded-md">
                          {convertReservationStatus(notification.status)}
                        </span>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-bold text-accent-2">
                            {format(notification.start_time_unix, 'yyyy年MM月dd日 HH:mm')} ~{' '}
                            {format(notification.end_time_unix, 'HH:mm')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground mx-2">
                          担当 - {notification.staff_name} /
                        </span>
                        <span className="text-sm font-medium">
                          顧客名 - {notification.customer_name} 様
                        </span>
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