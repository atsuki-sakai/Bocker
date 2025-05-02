'use client'

import Image from 'next/image'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/common'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useSalon } from '@/hooks/useSalon'
import { convertGender, Gender } from '@/services/convex/shared/types/common'
import { Instagram } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useState } from 'react'
type StaffViewProps = {
  selectedStaff: Doc<'staff'> | null
  onChangeStaffAction: (staff: StaffDisplay | null) => void
}

export type StaffDisplay = {
  _id: Id<'staff'>
  name: string | undefined
  age: number | undefined
  email: string | undefined
  gender: Gender | undefined
  description: string | undefined
  imgPath: string | undefined
  isActive: boolean | undefined
  tags: string[] | undefined
  _creationTime: number | undefined
  extraCharge: number | undefined
  priority: number | undefined
  instagramLink: string | undefined
  featuredHairimgPath: string[] | undefined
}

export const StaffView = ({ selectedStaff, onChangeStaffAction }: StaffViewProps) => {
  const [infoStaff, setInfoStaff] = useState<StaffDisplay | null>(null)
  const { salonId } = useSalon()
  const staffsDisplayData = useQuery(
    api.staff.core.query.listDisplayData,
    salonId
      ? {
          salonId: salonId,
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
    return (a.extraCharge ?? 0) - (b.extraCharge ?? 0)
  })

  return (
    <div>
      <h2 className="text-base">スタッフを選択</h2>
      <p className="text-gray-600 mb-4 text-sm">担当してほしいスタッフを選択してください。</p>
      <div className="space-y-3">
        {sortedStaffs.map((staff) => (
          <div key={staff._id} className="flex items-center justify-between border rounded-lg p-4">
            <div className="flex items-start gap-2">
              {staff.imgPath && staff.imgPath !== '' && (
                <Image
                  src={staff.imgPath}
                  alt={staff.name ? staff.name : 'Staff Image'}
                  width={40}
                  height={40}
                  className="rounded-sm w-14 h-14"
                />
              )}
              <div className="flex justify-start items-start flex-col">
                <p className="font-medium">
                  {staff.name}{' '}
                  <span className="text-sm text-gray-500">
                    {convertGender(staff.gender as Gender)}
                  </span>
                </p>
                <div className="flex items-end gap-2 text-slate-500">
                  <p className="text-xs">指名料</p>
                  <span className="text-sm text-green-600">
                    {staff.extraCharge ? `¥${staff.extraCharge.toLocaleString()}` : `無料`}
                  </span>
                </div>
                <Button className="p-0 m-0" variant="ghost" onClick={() => setInfoStaff(staff)}>
                  <span className="text-xs font-light underline text-blue-600">詳細を見る</span>
                </Button>
              </div>
            </div>
            <Button
              variant={selectedStaff?._id === staff._id ? 'default' : 'outline'}
              onClick={() => {
                onChangeStaffAction(staff)
              }}
            >
              {selectedStaff?._id === staff._id ? '選択中' : '選択する'}
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={!!infoStaff} onOpenChange={() => setInfoStaff(null)}>
        <DialogContent className="max-h-[90vh] w-[90vw] md:max-w-[500px] overflow-y-auto">
          <DialogHeader className="mt-4">
            {infoStaff?.imgPath && infoStaff.imgPath !== '' && (
              <div className="flex justify-center mb-4">
                <div className="relative w-full aspect-square rounded-sm overflow-hidden">
                  <Image
                    src={infoStaff?.imgPath ?? ''}
                    alt={infoStaff?.name ?? ''}
                    fill
                    sizes="(max-width: 42rem) 100vw, 42rem"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            <DialogTitle className="text-start pt-2 flex items-center justify-between gap-2">
              <div>
                {infoStaff?.name}{' '}
                <span className="text-xs text-slate-500 text-nowrap">
                  {infoStaff?.gender != null && `| ${convertGender(infoStaff?.gender as Gender)}`}
                  {infoStaff?.age != null && ` | ${infoStaff.age}歳`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-700">指名料</span>
                {infoStaff?.extraCharge ? (
                  <span className="text-sm text-green-600">
                    {`¥${infoStaff.extraCharge.toLocaleString()}`}
                  </span>
                ) : (
                  <span className="text-sm text-green-600">無料</span>
                )}
              </div>
              {infoStaff?.instagramLink && (
                <a href={infoStaff.instagramLink} target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-5 h-5 text-pink-500" />
                </a>
              )}
            </DialogTitle>

            {infoStaff?.tags && infoStaff.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {infoStaff.tags.map((tag, index) => (
                  <div
                    key={`tag-${index}`}
                    className=" bg-slate-50 border border-slate-500 rounded-md px-1.5"
                  >
                    <span className="text-xs text-slate-500">{tag}</span>
                  </div>
                ))}
              </div>
            )}
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {infoStaff?.description && (
                  <p className="text-start text-clip bg-slate-50 rounded-md p-1 my-2">
                    {infoStaff.description}
                  </p>
                )}

                <p className="text-sm font-medium text-start pt-4 text-slate-700">得意なスタイル</p>
                {infoStaff?.featuredHairimgPath && infoStaff.featuredHairimgPath.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {infoStaff.featuredHairimgPath.map((imgPath, idx) => (
                      <div
                        key={`featured-hair-img-${idx}`}
                        className="relative w-full aspect-square rounded-md overflow-hidden"
                      >
                        <Image
                          src={imgPath}
                          alt={infoStaff.name ?? ''}
                          fill
                          sizes="(max-width: 42rem) 100vw, 42rem"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground bg-slate-50 rounded-md p-1 my-2">
                    過去のスタイル理歴はありません。
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}