'use client'

import { Button } from '@/components/ui/button'
import { motion } from './DynamicMotion'

type ReservationStep = 'menu' | 'staff' | 'option' | 'date' | 'payment' | 'coupon' | 'confirm'

interface NavigationButtonsProps {
  currentStep: ReservationStep
  goToPreviousStep: () => void
  goToNextStep: () => void
  canProceed: boolean
  isProcessing?: boolean
}

export function NavigationButtons({
  currentStep,
  goToPreviousStep,
  goToNextStep,
  canProceed,
  isProcessing = false,
}: NavigationButtonsProps) {
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

  return (
    <div className="flex space-x-2">
      {currentStep !== 'menu' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button variant="outline" onClick={goToPreviousStep}>
            戻る
          </Button>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button 
          onClick={goToNextStep} 
          disabled={!canProceed || isProcessing}
          className="min-w-[120px]"
        >
          {isProcessing ? '処理中...' : getNextButtonText()}
        </Button>
      </motion.div>
    </div>
  )
}