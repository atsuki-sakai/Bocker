'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/common'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { convertGender, Gender } from '@/convex/types'
import { Instagram } from 'lucide-react'
import { getDayOfWeek } from '@/lib/schedules'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useState } from 'react'
import type { StaffDisplay } from '@/lib/types'

type StaffViewProps = {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  selectedMenuIds: Id<'menu'>[]
  selectedStaff: Doc<'staff'> | null
  onChangeStaffAction: (staff: StaffDisplay | null) => void
}


export const StaffView = ({
  tenantId,
  orgId,
  selectedMenuIds,
  selectedStaff,
  onChangeStaffAction,
}: StaffViewProps) => {
  const [infoStaff, setInfoStaff] = useState<StaffDisplay | null>(null)
  const staffsDisplayData = useQuery(
    api.staff.query.findByAvailableStaffs,
    orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          menu_ids: selectedMenuIds,
        }
      : 'skip'
  )

  if (!staffsDisplayData) {
    return <Loading />
  }

  // Staffs を priority の降順に並び替える
  const sortedStaffs = [...staffsDisplayData].sort((a, b) => {
    const priDiff = (b.priority ?? 0) - (a.priority ?? 0)
    if (priDiff !== 0) return priDiff
    return (a.extra_charge ?? 0) - (b.extra_charge ?? 0)
  })

  const today = new Date()
  const todayDayOfWeek = getDayOfWeek(today)

  return (
    <div>
      <h2 className="text-base">スタッフを選択</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        担当してほしいスタッフを選択してください。
      </p>
      <div className="space-y-3">
        {sortedStaffs.length > 0 ? (
          sortedStaffs.map((staff) => (
            <div
              key={staff._id}
              className="flex items-center justify-between border rounded-lg p-4"
            >
              <div className="flex items-start gap-2">
                {staff.images && staff.images.length > 0 && staff.images[0].thumbnail_url && (
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <Image
                      src={staff.images[0].thumbnail_url}
                      alt={staff.name ? staff.name : 'Staff Image'}
                      fill
                      sizes="56px"
                      className="rounded-sm object-cover"
                      onError={(e) => {
                        console.error('Staff image load error:', {
                          staffName: staff.name,
                          imageUrl: staff.images?.[0]?.thumbnail_url,
                          error: e
                        });
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-start items-start flex-col">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs  font-bold text-destructive`}>
                      {staff.week_schedules?.find(
                        (schedule) => schedule.day_of_week === todayDayOfWeek
                      )?.is_open
                        ? null
                        : '本日休み'}
                    </p>
                  </div>
                  <p className="font-medium">
                    {staff.name}{' '}
                    <span className="text-sm text-muted-foreground">
                      {convertGender(staff.gender as Gender)}
                    </span>
                  </p>
                  <div className="flex items-end gap-2 text-muted-foreground">
                    <p className="text-xs">指名料</p>
                    <span className="text-sm text-active">
                      {staff.extra_charge ? `¥${staff.extra_charge.toLocaleString()}` : `無料`}
                    </span>
                  </div>
                  <Button
                    className="p-0 m-0"
                    variant="ghost"
                    onClick={() =>
                      setInfoStaff({
                        _id: staff._id,
                        name: staff.name,
                        age: staff.age,
                        gender: staff.gender,
                        description: staff.description,
                        images: staff.images,
                        is_active: staff.is_active,
                        tags: staff.tags,
                        _creationTime: staff._creationTime,
                        extra_charge: staff.extra_charge,
                        priority: staff.priority,
                        instagram_link: staff.instagram_link,
                        featured_hair_images: staff.featured_hair_images,
                      })
                    }
                  >
                    <span className="text-xs font-light underline text-link-foreground">
                      詳細を見る
                    </span>
                  </Button>
                </div>
              </div>
              <Button
                variant={selectedStaff?._id !== staff._id ? 'default' : 'selected'}
                onClick={() => {
                  onChangeStaffAction(staff)
                }}
              >
                {selectedStaff?._id === staff._id ? '選択中' : '選択する'}
              </Button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full border rounded-lg p-4 bg-muted">
            <p className="text-muted-foreground  text-sm">対応可能なスタッフが見つかりません。</p>

            <p className="text-muted-foreground text-sm">
              メニューの変更、組み合わせの変更をお願いします。
            </p>
          </div>
        )}
      </div>
      <Dialog open={!!infoStaff} onOpenChange={() => setInfoStaff(null)}>
        <DialogContent className="overflow-y-auto">
          <DialogHeader className="mt-4">
            {infoStaff?.images &&
              infoStaff.images.length > 0 &&
              infoStaff.images[0].original_url && (
                <div className="flex justify-center mb-4">
                  <div className="relative w-full aspect-square rounded-sm overflow-hidden">
                    <Image
                      src={infoStaff?.images[0].original_url ?? ''}
                      alt={infoStaff?.name ?? ''}
                      width={1900}
                      height={1900}
                      className="object-cover"
                    />
                  </div>
                </div>
              )}

            <DialogTitle className="text-start pt-2 flex items-center justify-between gap-2">
              <div>
                {infoStaff?.name}{' '}
                <span className="text-xs text-muted-foreground text-nowrap">
                  {infoStaff?.gender != null && `| ${convertGender(infoStaff?.gender as Gender)}`}
                  {infoStaff?.age != null && ` | ${infoStaff.age}歳`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">指名料</span>
                {infoStaff?.extra_charge ? (
                  <span className="text-sm text-active">
                    {`¥${infoStaff.extra_charge.toLocaleString()}`}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">無料</span>
                )}
              </div>
              {infoStaff?.instagram_link && (
                <Link href={infoStaff.instagram_link} target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-5 h-5 text-pink-500" />
                </Link>
              )}
            </DialogTitle>

            {infoStaff?.tags && infoStaff.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {infoStaff.tags.map((tag, index) => (
                  <Badge key={`tag-${index}`} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {infoStaff?.description && (
                  <p className="text-start text-clip  my-2">{infoStaff.description}</p>
                )}

                {infoStaff?.featured_hair_images && infoStaff.featured_hair_images.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-start pt-4 text-muted-foreground">
                      得意なスタイル
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {infoStaff.featured_hair_images.map((imgPath, idx) => (
                        <div
                          key={`featured-hair-img-${idx}`}
                          className="relative w-full aspect-square rounded-md overflow-hidden"
                        >
                          <Image
                            src={imgPath.original_url}
                            alt={infoStaff.name ?? ''}
                            fill
                            sizes="(max-width: 42rem) 100vw, 42rem"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </DialogDescription>
            <DialogFooter>
              <div className="flex items-center justify-between w-full gap-2">
                <Button variant="outline" onClick={() => setInfoStaff(null)}>
                  閉じる
                </Button>
                <Button
                  onClick={() => {
                    onChangeStaffAction(infoStaff)
                    setInfoStaff(null)
                  }}
                >
                  選択する
                </Button>
              </div>
            </DialogFooter>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
