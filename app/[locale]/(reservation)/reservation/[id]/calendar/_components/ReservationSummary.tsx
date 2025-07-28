'use client'

import { Doc } from '@/convex/_generated/dataModel'
import { motion } from './DynamicMotion'
import type { StaffDisplay } from '@/lib/types'

interface ReservationSummaryProps {
  selectedMenus: Doc<'menu'>[]
  selectedStaffCompleted: { staff: StaffDisplay | 'free' | null } | null
  selectedOptions: Doc<'option'>[]
  selectedDate: Date | null
  selectedTime: { startHour: string; endHour: string } | null
  calculateTotal: () => number
  calculateTotalMinutes: () => number
  pointConfig: { is_active?: boolean; is_fixed_point?: boolean; fixed_point?: number; point_rate?: number } | null
  groupOptionsByName: (options: Doc<'option'>[]) => { name: string; count: number; unitPrice: number; salePrice?: number }[]
  isAutoAssignedStaff: (staff: StaffDisplay | 'free' | null | undefined) => boolean
}

export function ReservationSummary({
  selectedMenus,
  selectedStaffCompleted,
  selectedOptions,
  selectedDate,
  selectedTime,
  calculateTotal,
  calculateTotalMinutes,
  pointConfig,
  groupOptionsByName,
  isAutoAssignedStaff,
}: ReservationSummaryProps) {
  return (
    <div className="bg-muted/50 p-4 rounded-lg mb-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <motion.div
            className="text-sm space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {selectedMenus.length > 0 && (
              <div>
                <span className="font-bold">メニュー</span>
                <br />
                {selectedMenus.map((menu, index) => (
                  <span key={menu._id}>
                    {menu.name}
                    {index < selectedMenus.length - 1 ? '、' : ''}
                  </span>
                ))}
              </div>
            )}

            {selectedStaffCompleted?.staff && (
              <div>
                <span className="font-bold">スタッフ</span>
                <br />
                <span>
                  {selectedStaffCompleted.staff === 'free' ||
                  isAutoAssignedStaff(selectedStaffCompleted.staff)
                    ? '指名フリー'
                    : selectedStaffCompleted.staff?.name || '不明'}
                </span>
              </div>
            )}

            {selectedDate && selectedTime && (
              <div>
                <span className="font-bold">日時</span>
                <br />
                <span>
                  {selectedDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}{' '}
                  {selectedTime.startHour} - {selectedTime.endHour}
                </span>
              </div>
            )}

            {selectedOptions.length > 0 && (
              <div>
                <span className="font-bold">オプション</span>
                <br />
                {groupOptionsByName(selectedOptions).map((option, index) => (
                  <span key={index}>
                    {option.name}
                    {option.count > 1 ? ` ×${option.count}` : ''}
                    {index < groupOptionsByName(selectedOptions).length - 1 ? '、' : ''}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
          <motion.p
            className="font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            合計: ¥{calculateTotal().toLocaleString()} / {calculateTotalMinutes()}分
          </motion.p>
        </div>
        <div className="flex flex-col items-end justify-between gap-2 w-2/7">
          {pointConfig?.is_active && (
            <motion.p
              className="text-xs font-bold mb-2 border border-link-foreground text-link-foreground rounded-full px-2 py-1 text-nowrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              獲得予定のポイント:{' '}
              <span className="font-bold">
                {Math.floor(
                  pointConfig?.is_fixed_point
                    ? (pointConfig.fixed_point ?? 0)
                    : calculateTotal() * ((pointConfig?.point_rate ?? 0) / 100)
                )}
              </span>
              P
            </motion.p>
          )}
        </div>
      </div>
    </div>
  )
}