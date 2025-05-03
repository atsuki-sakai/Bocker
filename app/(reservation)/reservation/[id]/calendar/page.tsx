'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getCookie, deleteCookie } from '@/lib/utils'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { MenuView, StaffView, OptionView, DateView, PaymentView, PointView } from './_components'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCheck, LogOut } from 'lucide-react'
import type { StaffDisplay } from './_components/StaffView.tsx'
import { Separator } from '@/components/ui/separator'
import type { TimeRange } from '@/lib/type'

export type LoginSession = {
  salonId: Id<'salon'>
  customerId: Id<'customer'>
  lineId?: string
  email?: string
  phone?: string
  lineUserName?: string
  tags?: string[]
}

// 予約ステップの定義
type ReservationStep = 'menu' | 'staff' | 'option' | 'date' | 'payment' | 'point'

// アニメーションバリアント
const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
}

// ステップインジケーターのアニメーション
const indicatorVariants = {
  inactive: { scale: 1 },
  active: {
    scale: [1, 1.1, 1],
    backgroundColor: '#3b82f6',
    transition: { duration: 0.5 },
  },
  completed: {
    backgroundColor: '#22c55e',
    transition: { duration: 0.3 },
  },
}

export default function CalendarPage() {
  const router = useRouter()
  const params = useParams()
  const salonId = params.id as Id<'salon'>

  // STATES
  const [sessionCustomer, setSessionCustomer] = useState<LoginSession | null>(null)
  const [salonComplete, setSalonComplete] = useState<{
    salon: Partial<Doc<'salon'>>
    config: Partial<Doc<'salon_config'>>
    scheduleConfig: Partial<Doc<'salon_schedule_config'>>
    apiConfig: Partial<Doc<'salon_api_config'>>
  } | null>(null)
  const [selectedMenus, setSelectedMenus] = useState<Doc<'menu'>[]>([])
  const [selectedStaffCompleted, setSelectedStaffCompleted] = useState<{
    staff: StaffDisplay | null
  } | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Doc<'salon_option'>[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<TimeRange | null>(null)
  const [reservationStartDateTime, setReservationStartDateTime] = useState<Date | null>(null)
  const [reservationEndDateTime, setReservationEndDateTime] = useState<Date | null>(null)
  const [currentStep, setCurrentStep] = useState<ReservationStep>('menu')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'credit' | 'cash' | 'line_pay' | 'paypay' | null
  >(null)
  const [usePoints, setUsePoints] = useState<number>(0)
  const [availablePoints, setAvailablePoints] = useState<number>(1000) // 仮の値、実際にはAPIから取得
  const [direction, setDirection] = useState(0) // アニメーションの方向を制御

  // FUNCTIONS
  const fetchSalonComplete = async () => {}

  // 次のステップに進む
  const goToNextStep = () => {
    setDirection(1) // 前進方向を設定
    switch (currentStep) {
      case 'menu':
        setCurrentStep('staff')
        break
      case 'staff':
        setCurrentStep('option')
        break
      case 'option':
        setCurrentStep('date')
        break
      case 'date':
        setCurrentStep('payment')
        break
      case 'payment':
        setCurrentStep('point')
        break
      case 'point':
        // 予約完了処理
        console.log('予約完了')
        break
    }
  }

  // 前のステップに戻る
  const goToPreviousStep = () => {
    setDirection(-1) // 後退方向を設定
    switch (currentStep) {
      case 'staff':
        setCurrentStep('menu')
        // スタッフの選択をクリア
        setSelectedStaffCompleted(null)
        break
      case 'option':
        setCurrentStep('staff')
        // オプションの選択をクリア
        setSelectedOptions([])
        break
      case 'date':
        setCurrentStep('option')
        // 日付の選択をクリア
        setSelectedDate(null)
        setSelectedTime(null)
        setReservationStartDateTime(null)
        setReservationEndDateTime(null)
        break
      case 'payment':
        setCurrentStep('date')
        setSelectedPaymentMethod(null)
        break
      case 'point':
        setCurrentStep('payment')
        // ポイント使用をクリア
        setUsePoints(0)
        break
    }
  }

  const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    deleteCookie(LINE_LOGIN_SESSION_KEY)
    router.push(`/reservation/${salonId}`)
  }

  // USE EFFECT
  useEffect(() => {
    const cookie = getCookie(LINE_LOGIN_SESSION_KEY)
    const cookieJson: LoginSession | null = cookie ? JSON.parse(cookie) : null
    setSessionCustomer(cookieJson)
    if (cookieJson?.salonId) {
      const fetchSalon = async () => {
        try {
          setIsLoading(true)
          const { salon, config, apiConfig, scheduleConfig } = await fetchQuery(
            api.salon.core.query.getRelations,
            { id: cookieJson.salonId as Id<'salon'> }
          )
          setSalonComplete(
            config && apiConfig && scheduleConfig
              ? { salon, config, apiConfig, scheduleConfig }
              : null
          )

          const customerPointConfig = await fetchQuery(
            api.customer.points.query.findBySalonAndCustomerId,
            {
              salonId: cookieJson.salonId as Id<'salon'>,
              customerId: cookieJson.customerId as Id<'customer'>,
            }
          )
          setAvailablePoints(customerPointConfig?.totalPoints || 0)
        } catch (error) {
          console.error('サロン情報の取得に失敗しました:', error)
          setSalonComplete(null)
        } finally {
          setIsLoading(false)
        }
      }
      fetchSalon()
    } else {
      router.push('/reservation/')
    }
  }, [])

  if (isLoading) return <Loading />

  if (!salonComplete) {
    if (salonId) {
      return router.push(`/reservation/${salonId}`)
    } else {
      return router.push('/reservation')
    }
  }

  // 合計金額の計算
  const calculateTotal = () => {
    const menuTotal = selectedMenus.reduce(
      (sum, menu) => sum + (menu.salePrice || menu.unitPrice || 0),
      0
    )
    const optionTotal = selectedOptions.reduce(
      (sum, option) => sum + (option.salePrice ?? option.unitPrice ?? 0),
      0
    )
    const extraChargeTotal = selectedStaffCompleted?.staff?.extraCharge || 0
    return menuTotal + optionTotal + extraChargeTotal
  }

  const calculateTotalMinutes = () => {
    const totalMinutes = selectedMenus.reduce((sum, menu) => {
      return sum + (menu.ensureTimeToMin || menu.timeToMin || 0)
    }, 0)
    return totalMinutes
  }

  // ステップインジケーターのレンダリング
  const renderStepIndicator = () => {
    const steps = [
      { key: 'menu', label: 'メニュー' },
      { key: 'staff', label: 'スタッフ' },
      { key: 'option', label: 'オプション' },
      { key: 'date', label: '日時' },
      { key: 'payment', label: '決済' },
      { key: 'point', label: 'ポイント' },
    ]

    return (
      <div className="flex justify-between mb-4 px-2">
        {steps.map((step, index) => {
          // ステップの状態を判定
          const isActive = currentStep === step.key
          const isCompleted = index < steps.findIndex((s) => s.key === currentStep)

          return (
            <div key={step.key} className="flex flex-col items-center relative">
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                initial="inactive"
                animate={isActive ? 'active' : isCompleted ? 'completed' : 'inactive'}
                variants={indicatorVariants}
                style={{
                  backgroundColor: isActive ? '#3b82f6' : isCompleted ? '#22c55e' : '#e5e7eb',
                }}
              >
                {isCompleted ? <Check size={18} /> : index + 1}
              </motion.div>

              <motion.span
                className="text-xs mt-1"
                initial={{ color: '#6b7280' }}
                animate={{
                  color: isActive ? '#3b82f6' : '#6b7280',
                  fontWeight: isActive ? 700 : 400,
                  transition: { duration: 0.3 },
                }}
              >
                {step.label}
              </motion.span>
            </div>
          )
        })}
      </div>
    )
  }

  // 現在のステップに応じたコンテンツのレンダリング
  const renderStepContent = () => {
    return (
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full"
        >
          {(() => {
            switch (currentStep) {
              case 'menu':
                return (
                  <div>
                    <motion.h2
                      className="text-base"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      メニューを選択
                    </motion.h2>
                    <motion.p
                      className="text-gray-600 mb-2 text-xs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      予約したいメニューを選択してください。複数選択可能です。
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <MenuView
                        salonId={salonComplete.salon._id as Id<'salon'>}
                        selectedMenuIds={selectedMenus.map((menu) => menu._id)}
                        onChangeMenusAction={(menus) => setSelectedMenus(menus)}
                      />
                    </motion.div>

                    <motion.div
                      className="mt-6 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={selectedMenus.length === 0}
                        className="relative overflow-hidden"
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </div>
                )
              case 'staff':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <StaffView
                      selectedMenuIds={selectedMenus.map((menu) => menu._id)}
                      selectedStaff={selectedStaffCompleted?.staff as Doc<'staff'> | null}
                      onChangeStaffAction={(staff) => {
                        if (staff) {
                          setSelectedStaffCompleted({ staff })
                        }
                      }}
                    />
                    <motion.div
                      className="mt-6 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!selectedStaffCompleted}
                        className="relative overflow-hidden"
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'option':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <OptionView
                      selectedOptions={selectedOptions}
                      onChangeOptionsAction={(options) => setSelectedOptions(options)}
                    />
                    <motion.div
                      className="mt-6 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button onClick={goToNextStep} className="relative overflow-hidden">
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'date':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <DateView
                      selectedDate={selectedDate}
                      selectedStaff={selectedStaffCompleted?.staff as Doc<'staff'> | null}
                      selectedTime={selectedTime}
                      totalMinutes={calculateTotalMinutes()}
                      onChangeDateAction={(date) => {
                        setSelectedDate(date)
                        setSelectedTime(null)
                        setReservationStartDateTime(null)
                        setReservationEndDateTime(null)
                      }}
                      onChangeTimeAction={(time) => {
                        setSelectedTime(time)
                        if (selectedDate) {
                          const startDateTime = new Date(selectedDate)
                          const [sh, sm] = time.startHour.split(':').map(Number)
                          startDateTime.setHours(sh, sm, 0, 0)
                          const endDateTime = new Date(selectedDate)
                          const [eh, em] = time.endHour.split(':').map(Number)
                          endDateTime.setHours(eh, em, 0, 0)
                          setReservationStartDateTime(startDateTime)
                          setReservationEndDateTime(endDateTime)
                        }
                      }}
                    />
                    <motion.div
                      className="mt-6 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!reservationStartDateTime || !reservationEndDateTime}
                        className="relative overflow-hidden"
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'payment':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <PaymentView
                      selectedMenus={selectedMenus}
                      selectedPaymentMethod={selectedPaymentMethod}
                      onChangePaymentMethodAction={(method) => setSelectedPaymentMethod(method)}
                    />
                    <motion.div
                      className="mt-6 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!selectedPaymentMethod}
                        className="relative overflow-hidden"
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'point':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <PointView
                      selectedMenus={selectedMenus}
                      selectedOptions={selectedOptions}
                      selectedStaff={selectedStaffCompleted?.staff as StaffDisplay | null}
                      totalAmount={calculateTotal()}
                      availablePoints={availablePoints ?? 1000}
                      usePoints={usePoints}
                      onChangePointsAction={(points) => setUsePoints(points)}
                    />
                    <motion.div
                      className="mt-6 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={() => console.log('予約完了')}
                        className="relative overflow-hidden bg-green-500 hover:bg-green-600"
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          予約を確定する
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
            }
          })()}
        </motion.div>
      </AnimatePresence>
    )
  }

  console.log('reservationStartDateTime', reservationStartDateTime)
  console.log('reservationEndDateTime', reservationEndDateTime)
  console.log('selectedDate', selectedDate)

  return (
    <div className="container mx-auto px-4 py-6 pb-[40%]">
      {renderStepIndicator()}
      <div className="mb-2 overflow-hidden flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500">ログイン中のユーザー</p>
          {sessionCustomer?.lineUserName ? (
            <p className="text-sm flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-green-500 border border-green-500 rounded-full p-1" />
              <span className="font-bold">{sessionCustomer?.lineUserName} 様</span>
            </p>
          ) : (
            sessionCustomer?.email && (
              <p className="text-sm flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-green-500" />
                <span className="font-bold">{sessionCustomer?.email}</span>
              </p>
            )
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button size="icon" onClick={(e) => handleLogout(e)}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Separator className="my-3" />
      <div className="mb-6 overflow-hidden">{renderStepContent()}</div>

      {(selectedMenus.length > 0 || selectedStaffCompleted || selectedOptions.length > 0) && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-20 px-4 py-2 bg-white border-t shadow-md"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex flex-col items-start justify-between gap-2 w-2/3">
              <motion.div className="text-xs text-gray-600">
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
                    {selectedStaffCompleted.staff.name}
                  </div>
                )}

                {selectedOptions.length > 0 && (
                  <div>
                    <span className="font-bold">オプション</span>
                    <br />
                    {selectedOptions.map((option) => option.name).join('、')}
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
            <div className="flex flex-col items-end justify-between gap-2 w-1/3">
              <motion.p
                className="text-xs mb-2 border border-green-600 text-green-600 rounded-full px-2 py-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                保有ポイント: {availablePoints?.toLocaleString()}
              </motion.p>
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
                {currentStep !== 'point' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button
                      onClick={goToNextStep}
                      disabled={
                        (currentStep === 'staff' && !selectedStaffCompleted) ||
                        (currentStep === 'date' &&
                          (!reservationStartDateTime ||
                            !reservationEndDateTime ||
                            !selectedDate)) ||
                        (currentStep === 'payment' && !selectedPaymentMethod)
                      }
                      className="relative overflow-hidden"
                    >
                      <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        次へ
                      </motion.span>
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
