'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
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
import { User } from 'lucide-react'
import type { SubscriptionPlanName } from '@/convex/types'

type StaffViewProps = {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  planName: SubscriptionPlanName
  selectedMenuIds: Id<'menu'>[]
  selectedStaff: Doc<'staff'> | 'free' | null
  onChangeStaffAction: (staff: StaffDisplay | 'free' | null) => void
}


export const StaffView = ({
  tenantId,
  orgId,
  planName,
  selectedMenuIds,
  selectedStaff,
  onChangeStaffAction,
}: StaffViewProps) => {
  const [infoStaff, setInfoStaff] = useState<StaffDisplay | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const staffsDisplayData = useQuery(
    api.staff.query.findByAvailableStaffs,
    orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          planName: planName,
          menu_ids: selectedMenuIds,
        }
      : 'skip'
  )

  if (!staffsDisplayData) {
    return <Loading />
  }

  // クエリ内で既にソート済みなので、そのまま使用
  const sortedStaffs = staffsDisplayData

  const today = new Date()
  const todayDayOfWeek = getDayOfWeek(today)

  return (
    <div>
      <h2 className="text-base">スタッフを選択</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        担当してほしいスタッフを選択してください。
      </p>
      
      {/* 指名フリーボタン */}
      <div className="mb-4">
        <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/50">
          <div className="flex items-start gap-2">
            <div className="relative w-14 h-14 flex-shrink-0">
              <div className="w-full h-full flex items-center justify-center bg-primary/10 rounded-sm">
                <User className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="flex justify-start items-start flex-col">
              <p className="font-medium">指名フリー</p>
              <p className="text-xs text-muted-foreground">
                空いているスタッフが自動で割り当てられます
              </p>
              <div className="flex items-end gap-2 text-muted-foreground">
                <p className="text-xs">指名料</p>
                <span className="text-sm text-accent-2">無料</span>
              </div>
            </div>
          </div>
          <Button
            variant={selectedStaff === 'free' ? 'selected' : 'default'}
            onClick={() => onChangeStaffAction('free')}
          >
            {selectedStaff === 'free' ? '選択中' : '選択する'}
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        {sortedStaffs.length > 0 ? (
          sortedStaffs.map((staff) => (
            <div
              key={staff._id}
              className="flex items-center justify-between border rounded-lg p-4"
            >
              <div className="flex items-start gap-2">
                <div className="relative w-14 h-14 flex-shrink-0">
                  {staff.images &&
                  staff.images.length > 0 &&
                  staff.images[0].thumbnail_url &&
                  !imageErrors.has(staff._id) ? (
                    <Image
                      src={staff.images[0].thumbnail_url}
                      alt={staff.name ? staff.name : 'Staff Image'}
                      fill
                      sizes="56px"
                      className="rounded-sm object-cover"
                      onError={(e) => {
                        const imgElement = e.currentTarget as HTMLImageElement
                        console.error('Staff image load error:', {
                          staffName: staff.name,
                          staffId: staff._id,
                          thumbnailUrl: staff.images?.[0]?.thumbnail_url,
                          originalUrl: staff.images?.[0]?.original_url,
                          errorType: e.type,
                          imageSrc: imgElement.src,
                          imageNaturalWidth: imgElement.naturalWidth,
                          imageNaturalHeight: imgElement.naturalHeight,
                        })
                        // デバッグ: URLの構造を分析
                        if (staff.images?.[0]?.thumbnail_url) {
                          try {
                            const url = new URL(staff.images[0].thumbnail_url)
                            console.error('URL breakdown:', {
                              fullUrl: url.href,
                              hostname: url.hostname,
                              pathname: url.pathname,
                              decodedPathname: decodeURIComponent(url.pathname),
                              protocol: url.protocol,
                            })
                          } catch (urlError) {
                            console.error('Invalid URL format:', urlError)
                          }
                        }
                        // エラーが発生した画像を記録
                        setImageErrors((prev) => new Set(prev).add(staff._id))
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded-sm">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
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
                    <span className="text-sm text-accent-2">
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
                variant={selectedStaff !== 'free' && selectedStaff?._id === staff._id ? 'selected' : 'default'}
                onClick={() => {
                  onChangeStaffAction(staff)
                }}
              >
                {selectedStaff !== 'free' && selectedStaff?._id === staff._id ? '選択中' : '選択する'}
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
                  <span className="text-sm text-accent-2">
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
