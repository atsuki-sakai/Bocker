'use client'


import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { convertDayOfWeekToJa } from '@/lib/schedule'
import { fetchQuery } from 'convex/nextjs'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { Label } from '@/components/ui/label'
import { MenuView, StaffView, OptionView, DateView, PaymentView, ConfirmView } from './_components'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { reservationFlexMessageTemplate } from '@/services/line/message_template/reservation_flex'
import { jwtDecode } from 'jwt-decode'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Image from 'next/image'

import {
  Check,
  CheckCheck,
  LogOut,
  ShoppingCart,
  User2,
  Settings,
  Calendar,
  CreditCard,
  CheckCircle,
  ChevronRight,
} from 'lucide-react'
import type { StaffDisplay } from './_components/StaffView.tsx'
import { Separator } from '@/components/ui/separator'
import { Questionnaire } from './_components/Questionnaire'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useLiff } from '@/hooks/useLiff'
import { ModeToggle } from '@/components/common'
import { PaymentMethod, ReservationStatus } from '@/services/convex/shared/types/common'
import type { TimeRange } from '@/lib/type'
import { useMutation } from 'convex/react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'
import { useQuery } from 'convex/react'

// 曜日をソートするための順序を定義
const dayOrder: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7, // 日曜日を最後にする場合は 7, 最初にする場合は 0
}

type LineSessionPayload = {
  lineUserId: string
  customerId: string
  salonId: string
  name?: string
  email?: string
  // 必要に応じて他のフィールドも追加
}

// 予約ステップの定義
type ReservationStep = 'menu' | 'staff' | 'option' | 'date' | 'payment' | 'confirm'

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

// 電話番号バリデーション関数
const isValidPhoneNumber = (phone: string | null): boolean => {
  if (!phone) return false
  // ハイフンあり・なし両対応の簡易的なバリデーション
  const phoneRegex = /^\d{2,4}-?\d{2,4}-?\d{3,4}$/
  return phoneRegex.test(phone)
}

interface SalonCompleteData {
  salon: Doc<'salon'>
  config: Doc<'salon_config'>
  scheduleConfig: Doc<'salon_schedule_config'>
  apiConfig: Doc<'salon_api_config'>
}

// 複数選択されたオプションをカウントして配列にする関数を追加
const countOptionOccurrences = (
  options: Doc<'salon_option'>[]
): { optionId: Id<'salon_option'>; quantity: number }[] => {
  const counts = new Map<string, number>()

  options.forEach((option) => {
    counts.set(option._id, (counts.get(option._id) || 0) + 1)
  })

  return Array.from(counts.entries()).map(([optionId, quantity]) => ({
    optionId: optionId as Id<'salon_option'>,
    quantity,
  }))
}

// 同じオプションをグループ化する関数を追加
const groupOptionsByName = (options: Doc<'salon_option'>[]) => {
  const groupedOptions = new Map<string, { name: string; count: number }>()

  options.forEach((option) => {
    if (groupedOptions.has(option._id)) {
      const current = groupedOptions.get(option._id)!
      groupedOptions.set(option._id, {
        name: current.name,
        count: current.count + 1,
      })
    } else {
      groupedOptions.set(option._id, {
        name: option.name,
        count: 1,
      })
    }
  })

  return Array.from(groupedOptions.values())
}

export default function CalendarPage() {
  const router = useRouter()
  const params = useParams()
  const salonId = params.id as Id<'salon'>
  const { liff } = useLiff()
  // STATES
  const [sessionCustomer, setSessionCustomer] = useState<LineSessionPayload | null>(null)
  const [customer, setCustomer] = useState<Doc<'customer'> | null>(null)
  const [customerPhone, setCustomerPhone] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>('')
  const [isPhoneValid, setIsPhoneValid] = useState(false) // 電話番号の有効性ステート
  const [salonComplete, setSalonComplete] = useState<SalonCompleteData | null>(null)
  const [selectedMenus, setSelectedMenus] = useState<Doc<'menu'>[]>([])
  const [selectedStaffCompleted, setSelectedStaffCompleted] = useState<{
    staff: StaffDisplay | null
  } | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Doc<'salon_option'>[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<TimeRange | null>(null)
  const [reservationStartDateTime, setReservationStartDateTime] = useState<Date | null>(null)
  const [reservationEndDateTime, setReservationEndDateTime] = useState<Date | null>(null)
  const [currentStep, setCurrentStep] = useState<ReservationStep>('menu')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<{
    discount: number
    couponId: Id<'coupon'> | null
  }>({ discount: 0, couponId: null })
  const [usePoints, setUsePoints] = useState<number>(0)
  const [availablePoints, setAvailablePoints] = useState<number>(1000) // 仮の値、実際にはAPIから取得
  const [direction, setDirection] = useState(0) // アニメーションの方向を制御
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false)
  const [questionnaireStep, setQuestionnaireStep] = useState(1)
  const [isLogout, setIsLogout] = useState(false)
  const totalSteps = 10 // Questionnaireと合わせる
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isCreatingCheckoutSession, setIsCreatingCheckoutSession] = useState(false) // 追加
  const [isSalonInfoSheetOpen, setIsSalonInfoSheetOpen] = useState(false)

  // bottomBar高さ測定用のrefとstate
  const bottomBarRef = useRef<HTMLDivElement>(null)
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0)

  // Convex queries
  const salonWeekSchedule = useQuery(api.schedule.salon_week_schedule.query.getAllBySalonId, {
    salonId: salonId as Id<'salon'>,
  })

  const pointConfig = useQuery(api.point.config.query.findBySalonId, {
    salonId: salonId,
  })
  const customerPoints = useQuery(
    api.customer.points.query.findBySalonAndCustomerId,
    sessionCustomer?.customerId
      ? {
          salonId: salonId,
          customerId: sessionCustomer.customerId as Id<'customer'>,
        }
      : 'skip' // sessionCustomer?.customerIdがない場合はクエリを実行しない
  )

  // Convex mutations
  const createReservationMutation = useMutation(api.reservation.mutation.create)
  const updateCustomerMutation = useMutation(api.customer.core.mutation.update)
  const createPointQueueMutation = useMutation(api.point.task_queue.mutation.create)
  const createPointTransactionMutation = useMutation(api.point.transaction.mutation.create)
  const updateCustomerPointsMutation = useMutation(api.customer.points.mutation.update)
  const balanceStockMutation = useMutation(api.option.mutation.balanceStock)

  // ステップ変更時に画面トップへ自動スクロール
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [currentStep])

  // bottomBarの高さを測定してpadding-bottomに予約
  useEffect(() => {
    if (bottomBarRef.current) {
      setBottomBarHeight(bottomBarRef.current.offsetHeight)
    }
  }, [selectedMenus, selectedStaffCompleted, selectedOptions])

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
        setCurrentStep('confirm')
        break
      case 'confirm':
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
      case 'confirm':
        setCurrentStep('payment')
        // ポイント使用をクリア
        setUsePoints(0)
        break
    }
  }

  const handleShowLogoutDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setShowLogoutDialog(true)
  }

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsLogout(true)
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    if (liff?.isLoggedIn()) {
      liff.logout()
    }
    toast.success('ログアウトしました。')
    router.push(`/reservation/${salonId}`)
    setIsLogout(false)
  }

  // クレジットカード決済処理を共通化
  const processCreditCardPayment = async (): Promise<string | null> => {
    if (
      !sessionCustomer ||
      !salonComplete?.salon?._id ||
      !selectedStaffCompleted?.staff ||
      !reservationStartDateTime ||
      !reservationEndDateTime
    ) {
      console.error('予約に必要な情報が不足しています。')
      toast.error('予約に必要な情報が不足しています。選択内容をご確認ください。')
      return null
    }

    try {
      // 予約データを準備 (status: 'pending' で作成)
      const reservationData = {
        salonId: salonComplete.salon._id as Id<'salon'>,
        customerId: sessionCustomer.customerId as Id<'customer'>,
        customerName: sessionCustomer.email ? sessionCustomer.email : sessionCustomer.name,
        staffId: selectedStaffCompleted.staff._id as Id<'staff'>,
        staffName: selectedStaffCompleted.staff.name,
        menus: selectedMenus.map((menu) => ({ menuId: menu._id, quantity: 1 })),
        options: countOptionOccurrences(selectedOptions),
        totalPrice: calculateTotal(), // 表示・保存用の最終合計金額
        // 割引前の本来の合計金額 (小計)
        unitPrice:
          selectedMenus.reduce((sum, menu) => sum + (menu.salePrice || menu.unitPrice || 0), 0) +
          selectedOptions.reduce(
            (sum, option) => sum + (option.salePrice ? option.salePrice : (option.unitPrice ?? 0)),
            0
          ) +
          (selectedStaffCompleted.staff.extraCharge || 0),
        status: 'pending' as ReservationStatus,
        startTimeUnix: reservationStartDateTime.getTime(),
        endTimeUnix: reservationEndDateTime.getTime(),
        usePoints: usePoints,
        couponId: appliedDiscount.couponId || undefined,
        couponDiscount: appliedDiscount.discount || undefined,
        paymentMethod: 'credit_card' as PaymentMethod,
        notes: notes,
      }

      // 1. Convexに予約データを'pending'ステータスで作成
      const reservationId = await createReservationMutation(reservationData)

      // オプション在庫数の調整
      const optionCounts = countOptionOccurrences(selectedOptions)
      for (const { optionId, quantity } of optionCounts) {
        const option = selectedOptions.find((opt) => opt._id === optionId)
        if (option && option.inStock !== undefined && option.inStock !== null) {
          const newStock = Math.max(0, option.inStock - quantity)
          try {
            await balanceStockMutation({
              optionId,
              newQuantity: newStock,
            })
            console.log(`オプション「${option.name}」の在庫を${newStock}に更新しました`)
          } catch (error) {
            console.error(`オプション在庫の更新に失敗しました: ${error}`)
            throw error
          }
        }
      }

      // 2. Stripe Checkoutセッションを作成するためのlineItemsを準備
      //    各アイテムの unit_amount には、独自システムで計算した割引適用後の価格を設定する

      const totalDiscountAmount = (appliedDiscount.discount || 0) + (usePoints || 0)

      const lineItemsRaw = [
        ...selectedMenus.map((menu) => ({
          name: menu.name,
          originalPrice: menu.salePrice || menu.unitPrice || 0,
          type: 'menu' as const,
        })),
        ...countOptionOccurrences(selectedOptions).map(({ optionId, quantity }) => {
          const option = selectedOptions.find((opt) => opt._id === optionId)
          return {
            name: option?.name || 'オプション',
            originalPrice:
              (option?.salePrice ? option.salePrice : (option?.unitPrice ?? 0)) * quantity,
            type: 'option' as const,
            quantity, // オプションの場合、quantityはここで考慮済みなので按分後の価格計算では使わない
          }
        }),
        ...(selectedStaffCompleted?.staff?.extraCharge &&
        selectedStaffCompleted.staff.extraCharge > 0
          ? [
              {
                name: '指名料',
                originalPrice: selectedStaffCompleted.staff.extraCharge,
                type: 'staff_charge' as const,
              },
            ]
          : []),
      ]

      const subtotalBeforeDiscount = lineItemsRaw.reduce((sum, item) => sum + item.originalPrice, 0)

      const stripeLineItems = lineItemsRaw
        .map((item) => {
          let discountedPrice = item.originalPrice
          if (totalDiscountAmount > 0 && subtotalBeforeDiscount > 0) {
            const itemDiscountShare =
              (item.originalPrice / subtotalBeforeDiscount) * totalDiscountAmount
            discountedPrice = Math.max(0, item.originalPrice - itemDiscountShare) // 価格がマイナスにならないように
          }
          // Stripeのunit_amountは整数である必要があるため、四捨五入または切り捨て/切り上げ
          // JPYの場合、Stripeは最小通貨単位（円）で扱うので、小数点以下は通常不要
          const finalAmount = Math.round(discountedPrice)

          return {
            price_data: {
              currency: 'jpy',
              product_data: { name: item.name },
              // オプションの場合、originalPriceが既にquantityを考慮しているので、
              // unit_amountには按分後の価格をそのまま設定（Stripe側でquantity=1で扱わせる）
              // ただし、元のcheckoutOptionsの構造と合わせるため、ここではitemがもつquantityで割るか、
              // lineItemsRaw作成時にオプションのoriginalPriceを単価にし、ここでquantityを渡すか検討が必要
              // 今回は、オプションも単一アイテムとして扱い、quantityは1でStripeに渡す想定で進める
              // そのため、countOptionOccurrencesで集約されたオプションは、Stripe上では1つのラインアイテムになる
              unit_amount: finalAmount,
            },
            quantity: item.type === 'option' && item.quantity ? item.quantity : 1, // オプションの場合のみ元の数量をStripeに渡す
          }
        })
        .filter(
          (item) =>
            item.price_data.unit_amount > 0 ||
            (item.price_data.unit_amount === 0 &&
              item.quantity > 0 &&
              subtotalBeforeDiscount === totalDiscountAmount)
        )
      // 全額割引の場合など、0円のアイテムも送信する必要がある場合がある。
      // Stripeは0円のラインアイテムを許可するが、最低支払額（JPYで50円）には注意。
      // ここでは、0円でも数量があれば送信し、そうでなければフィルタリング。
      // ただし、合計がStripeの最低金額を下回る場合はエラーになる。
      // もし合計が0円の場合は、Stripe Checkoutではなく別の処理（無料予約完了など）を検討する必要がある。

      // Stripeに渡す最終的なラインアイテムの合計金額を計算 (デバッグ用)
      const totalAmountForStripe = stripeLineItems.reduce(
        (sum, item) => sum + item.price_data.unit_amount * item.quantity,
        0
      )
      console.log('Total amount for Stripe:', totalAmountForStripe)
      if (totalAmountForStripe < 50 && totalAmountForStripe > 0) {
        console.warn('Stripeに渡す合計金額が50円未満です。Stripe側でエラーになる可能性があります。')
      }
      if (totalAmountForStripe === 0 && subtotalBeforeDiscount > 0) {
        // 全額割引で実質0円の場合の処理 (例: Stripe Checkoutをスキップして予約を確定)
        // このシナリオは別途設計が必要
        console.log('合計金額が0円のため、Stripe Checkoutはスキップします。')
        // ここで予約ステータスを 'confirmed' に更新し、完了ページへリダイレクトするなどの処理を行う。
        // handleConfirmReservation の現金払いと同様のロジックを参考に実装できる。
        // 今回は processCreditCardPayment のスコープ外として、エラーを投げるか、
        // 何もしないで return null するかなどを検討。
        // ここでは一旦、エラーとして処理を進めないようにする。
        toast.error(
          '合計金額が0円になるため、クレジットカード決済はご利用いただけません。別の決済方法を選択するか、お問い合わせください。'
        )
        return null // またはエラーをスロー
      }

      // 3. バックエンドAPIを呼び出してStripe Checkoutセッションを作成
      const requestBody = {
        stripeConnectId: salonComplete.salon.stripeConnectId,
        reservationId,
        salonId,
        customerEmail: sessionCustomer.email,
        lineItems: stripeLineItems,
      }
      console.log(
        'Request body for /api/stripe/connect/checkout:',
        JSON.stringify(requestBody, null, 2)
      )

      const response = await fetch('/api/stripe/connect/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Stripe Checkoutセッションの作成に失敗しました。')
      }

      const responseData = await response.json()
      const checkoutUrl = responseData.checkoutUrl

      if (checkoutUrl) {
        return checkoutUrl
      } else {
        throw new Error('Checkout URLが取得できませんでした。')
      }
    } catch (error) {
      toast.error(handleErrorToMsg(error))
      return null
    }
  }

  const handleConfirmReservation = async () => {
    if (
      !sessionCustomer ||
      !salonComplete?.salon?._id ||
      !selectedStaffCompleted?.staff ||
      !reservationStartDateTime ||
      !reservationEndDateTime ||
      !selectedPaymentMethod
    ) {
      console.error('予約に必要な情報が不足しています。')
      // TODO: ユーザーにエラーメッセージを表示 (例: トースト通知)
      alert('予約に必要な情報が不足しています。選択内容をご確認ください。')
      return
    }

    setIsProcessingPayment(true)

    const { isAvailable } = await fetchQuery(api.reservation.query.countAvailableSheetInTimeRange, {
      salonId: salonId as Id<'salon'>,
      startTime: reservationStartDateTime.getTime(),
      endTime: reservationEndDateTime.getTime(),
    })
    if (!isAvailable) {
      toast.error('同時に予約できる人数を超えています。')
      return
    }

    try {
      if (customer && customerPhone && customerPhone !== customer.phone) {
        await updateCustomerMutation({
          customerId: customer._id,
          phone: customerPhone,
        })
      }
      // 予約データを準備 (handleConfirmReservation内ではstatusをまだ設定しない)
      const reservationBaseData = {
        salonId: salonComplete.salon._id as Id<'salon'>,
        customerId: sessionCustomer.customerId as Id<'customer'>,
        customerName: sessionCustomer.email ? sessionCustomer.email : sessionCustomer.name,
        staffId: selectedStaffCompleted.staff._id as Id<'staff'>,
        staffName: selectedStaffCompleted.staff.name,
        menus: selectedMenus.map((menu) => ({ menuId: menu._id, quantity: 1 })), // quantityは現状1で固定
        options: countOptionOccurrences(selectedOptions), // 複数選択を考慮してカウント
        totalPrice: calculateTotal(),
        unitPrice:
          calculateTotal() +
          (usePoints && usePoints > 0 ? usePoints : 0) +
          (appliedDiscount.discount && appliedDiscount.discount > 0 ? appliedDiscount.discount : 0),
        // status: 'pending' as ReservationStatus, // statusは決済方法によって分岐後に設定
        startTimeUnix: reservationStartDateTime.getTime(),
        endTimeUnix: reservationEndDateTime.getTime(),
        usePoints: usePoints,
        couponId: appliedDiscount.couponId || undefined, // クーポン機能実装時に追加
        couponDiscount: appliedDiscount.discount || undefined, // ポイント割引とは別の純粋なクーポン割引額を想定
        paymentMethod: selectedPaymentMethod,
        notes: notes, // 問診票の内容などを将来的に結合
      }

      if (selectedPaymentMethod === 'credit_card') {
        const checkoutUrl = await processCreditCardPayment()
        if (checkoutUrl) {
          router.push(checkoutUrl)
          // リダイレクト後はこのページの操作は不要なため、isProcessingPaymentの解除はしない
        } else {
          // 決済処理失敗
          setIsProcessingPayment(false)
        }
      } else if (selectedPaymentMethod === 'cash') {
        // 1. Convexに予約データを'confirmed'ステータスで作成
        const reservationDataForCash = {
          ...reservationBaseData,
          status: 'confirmed' as ReservationStatus,
        }
        const reservationId = await createReservationMutation(reservationDataForCash)

        // オプション在庫数の調整
        // 選択されたオプションの数を集計して在庫を調整
        const optionCounts = countOptionOccurrences(selectedOptions)
        for (const { optionId, quantity } of optionCounts) {
          // 選択されたオプションから対象のオプション情報を取得
          const option = selectedOptions.find((opt) => opt._id === optionId)
          if (option && option.inStock !== undefined && option.inStock !== null) {
            // 現在の在庫数から使用数を減算
            const newStock = Math.max(0, option.inStock - quantity)
            try {
              await balanceStockMutation({
                optionId,
                newQuantity: newStock,
              })
              console.log(`オプション「${option.name}」の在庫を${newStock}に更新しました`)
            } catch (error) {
              console.error(`オプション在庫の更新に失敗しました: ${error}`)
            }
          }
        }

        setIsProcessingPayment(false)

        // ポイントを利用していればauthPinCodeを送信してポイントを店舗で利用できるように

        if (usePoints && usePoints > 0 && customerPoints?._id) {
          const pointTransaction = await createPointTransactionMutation({
            salonId: salonComplete.salon._id,
            reservationId: reservationId,
            customerId: sessionCustomer.customerId as Id<'customer'>,
            points: usePoints,
            transactionType: 'used', // 獲得、使用、調整、期限切れ
            transactionDateUnix: new Date().getTime(),
          })
          console.log(pointTransaction)

          await updateCustomerPointsMutation({
            lastTransactionDateUnix: new Date().getTime(),
            customerPointsId: customerPoints._id as Id<'customer_points'>,
            totalPoints: customerPoints.totalPoints ? customerPoints.totalPoints - usePoints : 0,
          })
        }

        if (sessionCustomer.lineUserId) {
          // Lineにメッセージ予約の確認用Flexメッセージを作成
          const flexMessages = reservationFlexMessageTemplate(
            salonComplete.config,
            customer!,
            selectedStaffCompleted.staff,
            selectedDate!,
            selectedTime!,
            selectedMenus,
            selectedOptions,
            reservationBaseData.unitPrice, // 小計（割引前）
            usePoints, // 使用ポイント
            appliedDiscount.discount || 0, // クーポン割引額
            calculateTotal(), // 最終合計料金
            reservationId,
            salonComplete.scheduleConfig.availableCancelDays ?? 3
          )
          // Lineにメッセージ送信
          const response = await fetch('/api/line/flex-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lineId: sessionCustomer?.lineUserId,
              messages: flexMessages,
              accessToken: salonComplete.apiConfig.lineAccessToken,
            }),
          })

          if (!response.ok) {
            let errorData
            try {
              errorData = await response.json()
            } catch (e) {
              console.log(e)
              try {
                errorData = await response.text()
              } catch (textError) {
                console.log(textError)
                errorData = `Status: ${response.status}, StatusText: ${response.statusText}`
              }
            }
            console.error('LINEメッセージ送信APIエラー:', response.status, errorData)
            const errorMessage =
              typeof errorData === 'object' && errorData !== null && errorData.message
                ? errorData.message
                : typeof errorData === 'string' && errorData
                  ? errorData
                  : `サーバーエラー: ${response.status}`
            throw new Error(`LINEメッセージ送信に失敗しました: ${errorMessage}`)
          }

          try {
            const result = await response.json()
            if (result.success) {
              router.push(
                `/reservation/${salonId}/calendar/complete?reservationId=${reservationId}`
              )
            } else {
              throw new Error(result.error || result.message || 'メッセージ送信処理に失敗しました')
            }
          } catch (e) {
            console.error('LINEメッセージ送信APIからのレスポンス処理エラー:', e)
            throw new Error(
              'LINEメッセージ送信APIからの応答の処理中にエラーが発生しました。詳細はコンソールネットワークタブを確認してください。'
            )
          }
        } else if (sessionCustomer.email) {
          // FIXME:  メールアドレスへ確認メールの送信
          // ドメインを取得してから実装
        } else {
          toast.error('LINEにもメールにも通知できませんでしたが、予約は受け付けました。')
          router.push(`/reservation/${salonId}/calendar/complete?reservationId=${reservationId}`)
        }

        // ポイントを付与するqueueを作成
        if (sessionCustomer?.customerId && pointConfig) {
          const earnPoints = Math.floor(
            pointConfig.isFixedPoint
              ? (pointConfig.fixedPoint ?? 0)
              : calculateTotal() * ((pointConfig.pointRate ?? 0) / 100)
          )

          const scheduledForUnix = reservationStartDateTime.getTime() + 1000 * 60 * 60 * 24 * 30 // 予約日の30日後

          const pointQueue = await createPointQueueMutation({
            salonId: salonComplete.salon._id,
            reservationId: reservationId,
            customerId: sessionCustomer.customerId as Id<'customer'>,
            points: earnPoints,
            scheduledForUnix: scheduledForUnix,
          })
          console.log(pointQueue)
        }

        toast.success('予約を受け付けしました。')
      }
    } catch (error) {
      toast.error(handleErrorToMsg(error))
      setIsProcessingPayment(false)
    }
  }

  // USE EFFECT
  useEffect(() => {
    // JWT Cookieからセッション情報を取得
    const fetchSession = async () => {
      try {
        setIsLoading(true)

        // HTTPOnly Cookieの内容をAPIを経由して取得
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        })

        if (!response.ok) {
          // セッションが見つからない場合はリダイレクト
          console.error('認証セッションが見つかりません。予約画面に戻ります。')
          router.push(`/reservation/${salonId}`)
          return
        }

        const data = await response.json()
        let sessionCustomer: LineSessionPayload | null = null

        if (data.session) {
          try {
            sessionCustomer = jwtDecode<LineSessionPayload>(data.session)
            console.log('sessionCustomer', sessionCustomer)
          } catch (e) {
            console.error('JWTデコード失敗:', e)
            sessionCustomer = null
          }
        }

        setSessionCustomer(sessionCustomer)

        if (sessionCustomer?.salonId) {
          try {
            const { salon, config, apiConfig, scheduleConfig } = await fetchQuery(
              api.salon.core.query.getRelations,
              { id: sessionCustomer.salonId as Id<'salon'> }
            )

            setSalonComplete(
              salon && config && apiConfig && scheduleConfig
                ? {
                    salon: salon as Doc<'salon'>,
                    config: config as Doc<'salon_config'>,
                    apiConfig: apiConfig as Doc<'salon_api_config'>,
                    scheduleConfig: scheduleConfig as Doc<'salon_schedule_config'>,
                  }
                : null
            )

            if (sessionCustomer.customerId === undefined || sessionCustomer.salonId === undefined) {
              // cookiesを明示的に削除
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
              router.push(`/reservation/${salonId}`)
            }

            const customerPointConfig = await fetchQuery(
              api.customer.points.query.findBySalonAndCustomerId,
              {
                salonId: sessionCustomer.salonId as Id<'salon'>,
                customerId: sessionCustomer.customerId as Id<'customer'>,
              }
            )
            setAvailablePoints(customerPointConfig?.totalPoints || 0)
            const customer = await fetchQuery(api.customer.core.query.getById, {
              customerId: sessionCustomer.customerId as Id<'customer'>,
            })
            setCustomer(customer)
            setCustomerPhone(customer?.phone || null)
            setIsPhoneValid(isValidPhoneNumber(customer?.phone || null)) // 初期値のバリデーション
          } catch (error) {
            console.error('サロン情報の取得に失敗しました:', error)
            setSalonComplete(null)
          }
        } else {
          router.push('/reservation')
        }
      } catch (error) {
        console.error('セッション取得中にエラーが発生しました:', error)
        router.push(`/reservation/${salonId}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [router, salonId])

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
    // メニュー価格の合計
    const menuTotal = selectedMenus.reduce(
      (sum, menu) => sum + (menu.salePrice || menu.unitPrice || 0),
      0
    )

    // オプション価格の合計（複数選択を考慮）
    const optionTotal = selectedOptions.reduce(
      (sum, option) => sum + (option.salePrice ? option.salePrice : (option.unitPrice ?? 0)),
      0
    )

    // 指名料
    const extraChargeTotal = selectedStaffCompleted?.staff?.extraCharge || 0

    // 割引額
    const discount = appliedDiscount.discount + usePoints

    return menuTotal + optionTotal + extraChargeTotal - discount
  }

  const calculateTotalMinutes = () => {
    // メニュー時間の合計
    const menuMinutes = selectedMenus.reduce((sum, menu) => {
      return sum + (menu.timeToMin || 0)
    }, 0)

    // オプション時間の合計（複数選択を考慮）
    const optionMinutes = selectedOptions.reduce((sum, option) => {
      return sum + (option.timeToMin || 0)
    }, 0)

    return menuMinutes + optionMinutes
  }

  // ステップインジケーターのレンダリング
  const renderStepIndicator = () => {
    const steps = [
      {
        key: 'menu',
        label: 'メニュー',
        icon: ShoppingCart,
        color: 'bg-chart-1 text-background',
      },
      {
        key: 'staff',
        label: 'スタッフ',
        icon: User2,
        color: 'bg-chart-2 text-background',
      },
      {
        key: 'option',
        label: 'オプション',
        icon: Settings,
        color: 'bg-chart-3 text-background',
      },
      {
        key: 'date',
        label: '日時',
        icon: Calendar,
        color: 'bg-chart-4 text-background',
      },
      {
        key: 'payment',
        label: '決済',
        icon: CreditCard,
        color: 'bg-chart-5 text-background',
      },
      {
        key: 'confirm',
        label: '確認',
        icon: CheckCircle,
        color: 'bg-active text-background',
      },
    ]

    return (
      <div className="relative mb-4 w-full max-w-3xl mx-auto">
        {/* ② ステップ丸要素群 */}
        <div className="relative grid grid-cols-6 gap-2">
          {steps.map((step, index) => {
            const isActive = currentStep === step.key
            const isCompleted = index < steps.findIndex((s) => s.key === currentStep)
            return (
              <div key={step.key} className="flex flex-col items-center">
                <motion.div
                  className={`
                    z-10 w-8 h-8 rounded-full flex items-center justify-center
                    ${
                      isActive
                        ? `${step.color}`
                        : isCompleted
                          ? `bg-background border border-active text-active`
                          : 'bg-background border border-muted-foreground text-muted-foreground'
                    }
                  `}
                  /* アニメーションもここでお好みで */
                >
                  {isCompleted ? <Check size={18} /> : <step.icon size={18} />}
                </motion.div>
                <span
                  className={`tracking-wide text-xs text-nowrap scale-75 ${isActive ? 'font-bold' : 'text-muted-foreground'}`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
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
          className="w-full max-w-3xl mx-auto"
        >
          {(() => {
            switch (currentStep) {
              case 'menu':
                return (
                  <div>
                    <motion.h2
                      className="text-lg font-bold"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      メニューを選択
                    </motion.h2>
                    <motion.p
                      className="text-muted-foreground mb-2 text-xs"
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
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={selectedMenus.length === 0}
                        className="relative overflow-hidden w-full"
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
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!selectedStaffCompleted}
                        className="relative overflow-hidden w-full"
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
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button onClick={goToNextStep} className="relative overflow-hidden w-full">
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
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!reservationStartDateTime || !reservationEndDateTime}
                        className="relative overflow-hidden w-full"
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
                      selectedPaymentMethod={selectedPaymentMethod as PaymentMethod}
                      onChangePaymentMethodAction={(method) => setSelectedPaymentMethod(method)}
                    />
                    <motion.div
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!selectedPaymentMethod}
                        className="relative overflow-hidden w-full"
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'confirm':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <ConfirmView
                      salonId={salonComplete.salon._id as Id<'salon'>}
                      selectedMenus={selectedMenus}
                      selectedOptions={selectedOptions}
                      selectedStaff={selectedStaffCompleted?.staff as StaffDisplay | null}
                      availablePoints={availablePoints ?? 0}
                      usePoints={usePoints}
                      selectedPaymentMethod={selectedPaymentMethod as PaymentMethod}
                      onChangePointsAction={(points: number) => setUsePoints(points)}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onApplyCoupon={(discount: number, couponId: Id<'coupon'>) =>
                        setAppliedDiscount({ discount, couponId })
                      }
                    />
                    <Separator className="my-6" />
                    <div className="flex flex-col gap-2 my-4">
                      <Label className="text-primary">ご予約者様のお電話番号</Label>
                      <Input
                        type="tel"
                        placeholder="電話番号を入力してください (例: 090-1234-5678)"
                        value={customerPhone || ''}
                        className="w-full"
                        onChange={(e) => {
                          const phone = e.target.value
                          setCustomerPhone(phone)
                          setIsPhoneValid(isValidPhoneNumber(phone))
                        }}
                      />
                      {!isPhoneValid && customerPhone !== null && customerPhone !== '' && (
                        <p className="text-xs text-destructive">
                          有効な電話番号の形式で入力してください。
                        </p>
                      )}
                      {(!customerPhone || customerPhone === '') && (
                        <p className="text-xs text-destructive">
                          ご予約をされるお客様のお電話番号を入力してください
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 my-4">
                      <Label className="text-primary">備考</Label>
                      <Textarea
                        rows={8}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full"
                        placeholder="ご要望などあればご記入ください。"
                      />
                    </div>

                    <motion.div
                      className="mt-8 flex flex-col gap-4 justify-center items-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex w-full gap-4">
                        {selectedPaymentMethod === 'credit_card' && (
                          <Button
                            onClick={async () => {
                              setIsCreatingCheckoutSession(true)
                              try {
                                const checkoutUrl = await processCreditCardPayment()
                                if (checkoutUrl) {
                                  router.push(checkoutUrl)
                                } else {
                                  setIsCreatingCheckoutSession(false)
                                }
                              } catch (error) {
                                console.error('Error during credit card payment process:', error)
                                toast.error(
                                  handleErrorToMsg(error) ||
                                    'クレジットカード決済中にエラーが発生しました。'
                                )
                                setIsCreatingCheckoutSession(false)
                              }
                            }}
                            disabled={
                              isCreatingCheckoutSession || isProcessingPayment || !isPhoneValid
                            }
                            className="relative overflow-hidden w-full"
                          >
                            <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              {isCreatingCheckoutSession ? '処理中...' : 'クレジットカードで支払う'}
                            </motion.span>
                          </Button>
                        )}
                        <Button
                          onClick={handleConfirmReservation}
                          disabled={
                            isProcessingPayment ||
                            !isPhoneValid ||
                            selectedPaymentMethod === 'credit_card'
                          }
                          className="relative overflow-hidden w-full"
                        >
                          <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            {isProcessingPayment
                              ? '処理中...'
                              : selectedPaymentMethod === 'credit_card'
                                ? '予約内容を確認 (現金払い)'
                                : '予約を確定する'}
                          </motion.span>
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )
            }
          })()}
        </motion.div>
      </AnimatePresence>
    )
  }

  if (isLogout) {
    return <Loading />
  }

  console.log(salonComplete)

  return (
    <div className="container max-w-3xl mx-auto p-4" style={{ paddingBottom: bottomBarHeight }}>
      <div className="overflow-hidden flex items-center justify-between mb-2">
        <div>
          {/* サロン情報を表示するSheet */}
          <Sheet open={isSalonInfoSheetOpen} onOpenChange={setIsSalonInfoSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost">
                <h1 className="text-xl font-bold text-primary hover:underline cursor-pointer break-words">
                  {salonComplete.config.salonName}
                </h1>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto p-6">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl font-bold">
                  {salonComplete.config.salonName}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6">
                {salonComplete.config.imgPath && (
                  <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                    <Image
                      src={salonComplete.config.imgPath}
                      alt={salonComplete.config.salonName ?? ''}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">店舗情報</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {salonComplete.config.description}
                  </p>
                </div>
                <div className="flex flex-col justify-start items-start mb-4">
                  <p className="text-lg text-primary font-bold">営業日</p>
                  <div className="flex flex-col items-start gap-2 mt-2">
                    {salonWeekSchedule
                      ?.sort((a, b) => {
                        const dayA = dayOrder[a.dayOfWeek!] ?? 8 // 未定義の曜日は最後に
                        const dayB = dayOrder[b.dayOfWeek!] ?? 8 // 未定義の曜日は最後に
                        return dayA - dayB
                      })
                      .map((schedule, index) => (
                        <div
                          key={index}
                          className="flex  items-center justify-start gap-1 border-b border-border pb-2"
                        >
                          <div className="flex  items-center justify-start gap-2 mr-3">
                            <div
                              className={`h-3 w-3 rounded-full border border-border ring-1 ring-offset-1 ${schedule.isOpen ? 'bg-active ring-active' : 'bg-destructive-foreground ring-destructive-foreground'}`}
                            />
                            <p className="text-sm text-muted-foreground text-nowrap">
                              {convertDayOfWeekToJa(schedule.dayOfWeek!)}
                            </p>
                          </div>
                          <p
                            className={`text-sm text-center font-bold ${schedule.isOpen ? 'text-muted-foreground' : 'text-destructive'}`}
                          >
                            {schedule.isOpen
                              ? `${schedule.startHour} ~ ${schedule.endHour}`
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
                      <strong>住所:</strong> {salonComplete.config.postalCode}{' '}
                      {salonComplete.config.address}
                    </li>
                    <li>
                      <strong>電話:</strong>{' '}
                      <a
                        href={`tel:${salonComplete.config.phone}`}
                        className="hover:underline text-blue-500"
                      >
                        {salonComplete.config.phone}
                      </a>
                    </li>
                    <li>
                      <strong>メール:</strong>{' '}
                      <a
                        href={`mailto:${salonComplete.config.email}`}
                        className="hover:underline text-blue-500"
                      >
                        {salonComplete.config.email}
                      </a>
                    </li>
                  </ul>
                </div>
                {salonComplete.config.reservationRules && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">予約ルール</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {salonComplete.config.reservationRules}
                    </p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {sessionCustomer?.name ? (
            <p className="text-sm flex items-center gap-2 mt-1">
              <CheckCheck className="w-5 h-5 text-active rounded-full p-1" />
              <span className="font-light">{sessionCustomer?.name} 様</span>
            </p>
          ) : (
            sessionCustomer?.email && (
              <p className="text-sm flex items-center gap-2 mt-1">
                <CheckCheck className="w-5 h-5 text-active" />
                <span className="font-light">{sessionCustomer?.email}</span>
              </p>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <div className="flex flex-col items-center gap-2">
            <Button size="icon" variant="outline" onClick={(e) => handleShowLogoutDialog(e)}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <Separator className="my-2 mb-3" />

      {renderStepIndicator()}

      <div className="mb-6">{renderStepContent()}</div>

      {(selectedMenus.length > 0 || selectedStaffCompleted || selectedOptions.length > 0) && (
        <motion.div
          ref={bottomBarRef}
          className="fixed bottom-0 left-0 right-0 z-20 px-4 py-2 bg-background border-t shadow-md"
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
                    {selectedStaffCompleted.staff.name}
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
              <motion.p
                className="text-xs font-bold mb-2 border border-link-foreground text-link-foreground rounded-full px-2 py-1 text-nowrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                獲得予定のポイント:{' '}
                <span className="font-bold">
                  {Math.floor(
                    pointConfig?.isFixedPoint
                      ? (pointConfig.fixedPoint ?? 0)
                      : calculateTotal() * ((pointConfig?.pointRate ?? 0) / 100)
                  )}
                </span>
                P
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
                {currentStep !== 'confirm' && (
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
      <Dialog open={isQuestionnaireOpen} onOpenChange={setIsQuestionnaireOpen}>
        <DialogContent className="overflow-y-auto h-[90vh] flex flex-col justify-start items-start">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">問診票</DialogTitle>
          </DialogHeader>
          <Questionnaire
            onComplete={(data) => {
              console.log('data', data)
            }}
            onStepChange={setQuestionnaireStep}
          />
          {questionnaireStep === totalSteps && (
            <Button
              className="w-full"
              onClick={() => {
                setIsQuestionnaireOpen(false)
                console.log('予約完了')
              }}
            >
              予約を確定する
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ログアウト</DialogTitle>
          </DialogHeader>
          <DialogDescription>ログアウトしますか？</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={(e) => {
                setShowLogoutDialog(false)
                handleLogout(e)
              }}
            >
              ログアウト
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
