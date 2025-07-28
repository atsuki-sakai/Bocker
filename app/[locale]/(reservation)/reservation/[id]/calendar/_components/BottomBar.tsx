'use client'

import { motion } from './DynamicMotion'
import { Button } from '@/components/ui/button'
import { Doc } from '@/convex/_generated/dataModel'
import type { StaffDisplay } from '@/lib/types'

type ReservationStep = 'menu' | 'staff' | 'option' | 'date' | 'payment' | 'coupon' | 'confirm'

interface BottomBarProps {
  currentStep: ReservationStep
  selectedMenus: Doc<'menu'>[]
  selectedStaffCompleted: { staff: StaffDisplay | 'free' | null } | null
  selectedOptions: Doc<'option'>[]
  selectedDate: Date | null
  selectedTime: { startHour: string; endHour: string } | null
  reservationStartDateTime: Date | null
  reservationEndDateTime: Date | null
  selectedPaymentMethod: string | null
  calculateTotal: () => number
  calculateTotalMinutes: () => number
  pointConfig: Doc<'point_config'> | null | undefined
  groupOptionsByName: (options: Doc<'option'>[]) => { name: string; count: number; unitPrice: number; salePrice?: number }[]
  isAutoAssignedStaff: (staff: StaffDisplay | 'free' | null | undefined) => boolean
  goToPreviousStep: () => void
  goToNextStep: () => void
  bottomBarHeight: number
}

export function BottomBar({
  currentStep,
  selectedMenus,
  selectedStaffCompleted,
  selectedOptions,
  selectedDate,

  reservationStartDateTime,
  reservationEndDateTime,
  selectedPaymentMethod,
  calculateTotal,
  calculateTotalMinutes,
  pointConfig,
  groupOptionsByName,
  isAutoAssignedStaff,
  goToPreviousStep,
  goToNextStep,
  bottomBarHeight,
}: BottomBarProps) {
  const getNextButtonText = () => {
    switch (currentStep) {
      case 'menu':
        return 'スタッフを選択'
      case 'staff':
        return 'オプションを選択'
      case 'option':
        return '日時を選択'
      case 'date':
        return '支払い方法を選択'
      case 'payment':
        return 'クーポンを選択'
      case 'coupon':
        return '予約内容を確認'
      case 'confirm':
        return '予約を確定'
      default:
        return '次へ'
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'staff':
        return !!selectedStaffCompleted
      case 'date':
        return !!(reservationStartDateTime && reservationEndDateTime && selectedDate)
      case 'payment':
        return !!selectedPaymentMethod
      default:
        return true
    }
  }

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50"
      style={{ height: bottomBarHeight }}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="container max-w-3xl mx-auto flex justify-between items-center">
        <div className="flex flex-col items-start justify-between gap-2 w-5/7">
          <motion.div className="text-xs text-muted-foreground">
            {selectedMenus.length > 0 && (
              <div>
                <span className="font-bold">メニュー</span>
                <br />
                {selectedMenus.map((menu) => menu.name).join('、')}
              </div>
            )}

            {selectedStaffCompleted?.staff && (
              <div>
                <span className="font-bold">スタッフ</span>
                <br />
                {selectedStaffCompleted.staff === 'free' ||
                isAutoAssignedStaff(selectedStaffCompleted.staff)
                  ? '指名フリー'
                  : selectedStaffCompleted.staff?.name || '不明'}
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
          <div className="flex space-x-2">
            {currentStep !== 'menu' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  variant="outline"
                  onClick={goToPreviousStep}
                  className="relative overflow-hidden"
                >
                  <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    戻る
                  </motion.span>
                </Button>
              </motion.div>
            )}
            {currentStep !== 'confirm' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  onClick={goToNextStep}
                  disabled={!canProceed()}
                  className="relative overflow-hidden"
                >
                  <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    {getNextButtonText()}
                  </motion.span>
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}