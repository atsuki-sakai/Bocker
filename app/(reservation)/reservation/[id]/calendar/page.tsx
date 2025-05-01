'use client'

import { useEffect, useState } from 'react'
import { getCookie } from '@/lib/utils'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { MenuView, StaffView, OptionView, DateView, PaymentView, PointView } from './_components'
import { Button } from '@/components/ui/button'

// 予約ステップの定義
type ReservationStep = 'menu' | 'staff' | 'option' | 'date' | 'payment' | 'point'

export default function CalendarPage() {
  // STATES
  const [salonComplete, setSalonComplete] = useState<{
    salon: Partial<Doc<'salon'>>
    config: Partial<Doc<'salon_config'>>
    scheduleConfig: Partial<Doc<'salon_schedule_config'>>
    apiConfig: Partial<Doc<'salon_api_config'>>
  } | null>(null)
  const [selectedMenus, setSelectedMenus] = useState<Doc<'menu'>[]>([])
  const [selectedStaffCompleted, setSelectedStaffCompleted] = useState<{
    staff: Doc<'staff'>
    staff_config: Doc<'staff_config'>
  } | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Doc<'salon_option'>[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentStep, setCurrentStep] = useState<ReservationStep>('menu')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'credit' | 'cash' | 'line_pay' | 'paypay' | null
  >(null)
  const [usePoints, setUsePoints] = useState<number>(0)
  const [availablePoints, setAvailablePoints] = useState<number>(1000) // 仮の値、実際にはAPIから取得

  // FUNCTIONS
  const fetchSalonComplete = () => {
    const cookie = getCookie(LINE_LOGIN_SESSION_KEY)
    const cookieJson = cookie ? JSON.parse(cookie) : null
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
        } catch (error) {
          console.error('サロン情報の取得に失敗しました:', error)
          setSalonComplete(null)
        } finally {
          setIsLoading(false)
        }
      }
      fetchSalon()
    } else {
      console.warn('セッションにsalonIdが見つかりません')
      setSalonComplete(null)
      setIsLoading(false)
    }
  }

  // 次のステップに進む
  const goToNextStep = () => {
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
        break
      case 'payment':
        setCurrentStep('date')
        // 決済方法の選択をクリア
        setSelectedPaymentMethod(null)
        break
      case 'point':
        setCurrentStep('payment')
        // ポイント使用をクリア
        setUsePoints(0)
        break
    }
  }

  // USE EFFECT
  useEffect(() => {
    fetchSalonComplete()
    setAvailablePoints(1000) // 仮の値、実際にはAPIから取得
  }, [])

  if (isLoading) return <Loading />

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
    return menuTotal + optionTotal
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
        {steps.map((step, index) => (
          <div key={step.key} className="flex flex-col items-center relative">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === step.key
                  ? 'bg-blue-500 text-white'
                  : index < steps.findIndex((s) => s.key === currentStep)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < steps.findIndex((s) => s.key === currentStep) ? '✓' : index + 1}
            </div>
            <span
              className={`text-xs mt-1 ${
                currentStep === step.key ? 'text-blue-500 font-bold' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // 現在のステップに応じたコンテンツのレンダリング
  const renderStepContent = () => {
    switch (currentStep) {
      case 'menu':
        return (
          <div>
            <h2 className="text-base">メニューを選択</h2>
            <p className="text-gray-600 mb-2 text-xs">
              予約したいメニューを選択してください。複数選択可能です。
            </p>

            {salonComplete?.salon._id ? (
              <MenuView
                salonId={salonComplete.salon._id as Id<'salon'>}
                selectedMenuIds={selectedMenus.map((menu) => menu._id)}
                onChangeMenusAction={(menus) => setSelectedMenus(menus)}
              />
            ) : (
              <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
                サロン情報が取得できませんでした。ページを再読み込みするか、後ほど再度お試しください。
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button onClick={goToNextStep} disabled={selectedMenus.length === 0}>
                次へ進む
              </Button>
            </div>
          </div>
        )
      case 'staff':
        return (
          <div>
            <StaffView
              selectedStaff={selectedStaffCompleted?.staff as Doc<'staff'> | null}
              onChangeStaffAction={(staff, staff_config) => {
                if (staff && staff_config) {
                  setSelectedStaffCompleted({ staff, staff_config })
                }
              }}
            />
            <div className="mt-6 flex justify-center">
              <Button onClick={goToNextStep} disabled={!selectedStaffCompleted}>
                次へ進む
              </Button>
            </div>
          </div>
        )
      case 'option':
        return (
          <div>
            <OptionView
              selectedOptions={selectedOptions}
              onChangeOptionsAction={(options) => setSelectedOptions(options)}
            />
            <div className="mt-6 flex justify-center">
              <Button onClick={goToNextStep}>次へ進む</Button>
            </div>
          </div>
        )
      case 'date':
        return (
          <div>
            <DateView
              selectedDate={selectedDate}
              onChangeDateAction={(date) => setSelectedDate(date)}
            />
            <div className="mt-6 flex justify-center">
              <Button onClick={goToNextStep} disabled={!selectedDate}>
                次へ進む
              </Button>
            </div>
          </div>
        )
      case 'payment':
        return (
          <div>
            <PaymentView
              selectedPaymentMethod={selectedPaymentMethod}
              onChangePaymentMethodAction={(method) => setSelectedPaymentMethod(method)}
            />
            <div className="mt-6 flex justify-center">
              <Button onClick={goToNextStep} disabled={!selectedPaymentMethod}>
                次へ進む
              </Button>
            </div>
          </div>
        )
      case 'point':
        return (
          <div>
            <PointView
              selectedMenus={selectedMenus}
              selectedOptions={selectedOptions}
              selectedStaff={selectedStaffCompleted?.staff as Doc<'staff'> | null}
              selectedStaffConfig={
                selectedStaffCompleted?.staff_config as Doc<'staff_config'> | null
              }
              totalAmount={calculateTotal()}
              availablePoints={availablePoints ?? 1000}
              usePoints={usePoints}
              onChangePointsAction={(points) => setUsePoints(points)}
            />
            <div className="mt-6 flex justify-center">
              <Button onClick={() => console.log('予約完了')}>予約を確定する</Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {renderStepIndicator()}

      <div className="mb-6">{renderStepContent()}</div>

      {(selectedMenus.length > 0 || selectedStaffCompleted || selectedOptions.length > 0) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                {selectedMenus.length > 0 && `メニュー: ${selectedMenus.length}点`}
                {selectedStaffCompleted?.staff &&
                  ` | スタッフ: ${selectedStaffCompleted.staff.name}`}
                {selectedOptions.length > 0 && ` | オプション: ${selectedOptions.length}点`}
              </p>
              <p className="font-bold">合計: ¥{calculateTotal().toLocaleString()}</p>
            </div>
            <div className="flex space-x-2">
              {currentStep !== 'menu' && (
                <Button variant="outline" onClick={goToPreviousStep}>
                  戻る
                </Button>
              )}
              {currentStep !== 'point' && <Button onClick={goToNextStep}>次へ</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
