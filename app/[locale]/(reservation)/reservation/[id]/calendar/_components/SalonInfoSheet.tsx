'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { Doc } from '@/convex/_generated/dataModel'
import { convertDayOfWeekToJa } from '@/lib/schedules'

interface OrganizationCompleteData {
  organization: Doc<'organization'>
  config: Doc<'config'> | null
  reservationConfig: Doc<'reservation_config'> | null
  apiConfig: Doc<'api_config'> | null
}

interface SalonInfoSheetProps {
  organizationComplete: OrganizationCompleteData
  orgWeekSchedule: Doc<'week_schedule'>[] | undefined
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

// 曜日をソートするための順序を定義
const dayOrder: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

export function SalonInfoSheet({ 
  organizationComplete, 
  orgWeekSchedule, 
  isOpen, 
  onOpenChange 
}: SalonInfoSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost">
          <h1 className="text-xl font-bold text-primary hover:underline cursor-pointer break-words">
            {organizationComplete.organization.org_name}
          </h1>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold">
            {organizationComplete.organization.org_name}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-6">
          {organizationComplete.config?.images &&
            organizationComplete.config.images.length > 0 && (
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden shadow-md">
                <Image
                  src={organizationComplete.config?.images[0].original_url ?? ''}
                  alt={organizationComplete.organization.org_name ?? ''}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
            )}

          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">店舗情報</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {organizationComplete.config?.description}
            </p>
          </div>
          <div className="flex flex-col justify-start items-start mb-4">
            <p className="text-lg text-primary font-bold">営業日</p>
            <div className="flex flex-col items-start gap-2 mt-2">
              {orgWeekSchedule
                ?.sort((a, b) => dayOrder[a.day_of_week] - dayOrder[b.day_of_week])
                .map((schedule, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-start gap-1 border-b border-border pb-2"
                  >
                    <div className="flex items-center justify-start gap-2 mr-3">
                      <div
                        className={`h-3 w-3 rounded-full border border-border ring-1 ring-offset-1 ${
                          schedule.is_open 
                            ? 'bg-accent-2 ring-accent-2' 
                            : 'bg-destructive-foreground ring-destructive-foreground'
                        }`}
                      />
                      <p className="text-sm text-muted-foreground text-nowrap">
                        {convertDayOfWeekToJa(schedule.day_of_week! as any)}
                      </p>
                    </div>
                    <p
                      className={`text-sm text-center font-bold ${
                        schedule.is_open ? 'text-muted-foreground' : 'text-destructive'
                      }`}
                    >
                      {schedule.is_open
                        ? `${schedule.start_hour} ~ ${schedule.end_hour}`
                        : '休日'}
                    </p>
                  </div>
                ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">連絡先</h3>
            <ul className="list-none space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>住所:</strong> {organizationComplete.config?.postal_code}{' '}
                {organizationComplete.config?.address}
              </li>
              <li>
                <strong>電話:</strong>{' '}
                <a
                  href={`tel:${organizationComplete.config?.phone}`}
                  className="hover:underline text-blue-500"
                >
                  {organizationComplete.config?.phone}
                </a>
              </li>
              <li>
                <strong>メール:</strong>{' '}
                <a
                  href={`mailto:${organizationComplete.organization.org_email}`}
                  className="hover:underline text-blue-500"
                >
                  {organizationComplete.organization.org_email}
                </a>
              </li>
            </ul>
          </div>
          
          {organizationComplete.config?.reservation_rules && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">予約ルール</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {organizationComplete.config?.reservation_rules}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}