'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { convertDayOfWeekToJa } from '@/lib/schedules'
import { fetchQuery } from 'convex/nextjs'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { Label } from '@/components/ui/label'
import { MenuView, StaffView, OptionView, DateView, PaymentView, ConfirmView } from './_components'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { reservationFlexMessageTemplate } from '@/services/line/message_template/reservation_flex'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Image from 'next/image'
import { ReservationPaymentStatus } from '@/convex/types'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
// import { PointTaskQueueRepository } from '@/services/supabase/repositories'
import { CarteRepository } from '@/services/supabase/repositories/carte/CarteRepository'
import { CarteDetailRepository } from '@/services/supabase/repositories/carte/CarteDetailRepository'
import { formatDateToYYYYMMDD } from '@/lib/formatDate'
import { BASE_URL } from '@/lib/constants'

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
  Loader2,
} from 'lucide-react'
import type { StaffDisplay } from '@/lib/types'
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
import { PaymentMethod, ReservationStatus } from '@/convex/types'
import type { TimeRange } from '@/lib/types'
import { useMutation } from 'convex/react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useQuery } from 'convex/react'
import { RowType } from '@/services/supabase/SupabaseService'

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

// 統一されたセッション型 - LINE/Email両方のログインに対応
type SessionPayload = {
  customerUid: string
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  email?: string
  // LINE特有のフィールドはオプショナル
  lineUserId?: string
  name?: string
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

interface OrganizationCompleteData {
  organization: Doc<'organization'>
  config: Doc<'config'> | null
  reservationConfig: Doc<'reservation_config'> | null
  apiConfig: Doc<'api_config'> | null
}

// 複数選択されたオプションをカウントして配列にする関数を追加
const countOptionOccurrences = (
  options: Doc<'option'>[]
): { id: Id<'option'>; quantity: number; name: string; price: number }[] => {
  const counts = new Map<string, number>()

  options.forEach((option) => {
    counts.set(option._id, (counts.get(option._id) || 0) + 1)
  })

  return Array.from(counts.entries()).map(([optionId, quantity]) => ({
    id: optionId as Id<'option'>,
    quantity,
    name: options.find((opt) => opt._id === optionId)?.name ?? '不明',
    price: options.find((opt) => opt._id === optionId)?.sale_price ?? 0,
  }))
}

// 同じオプションをグループ化する関数を追加
const groupOptionsByName = (options: Doc<'option'>[]) => {
  const groupedOptions = new Map<
    string,
    { name: string; count: number; unitPrice: number; salePrice?: number }
  >()

  options.forEach((option) => {
    if (groupedOptions.has(option._id)) {
      const current = groupedOptions.get(option._id)!
      groupedOptions.set(option._id, {
        ...current,
        count: current.count + 1,
      })
    } else {
      groupedOptions.set(option._id, {
        name: option.name,
        count: 1,
        unitPrice: option.unit_price ?? 0,
        salePrice: option.sale_price,
      })
    }
  })

  return Array.from(groupedOptions.values())
}

export default function CalendarPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as Id<'organization'>
  const { liff } = useLiff()
  const { showErrorToast } = useErrorHandler()
  // STATES
  const customerRepository = useMemo(() => new CustomerRepository(), [])
  // const pointTaskQueueRepository = useMemo(() => new PointTaskQueueRepository(), [])
  const carteRepository = useMemo(() => new CarteRepository(), [])
  const carteDetailRepository = useMemo(() => new CarteDetailRepository(), [])
  const [sessionCustomer, setSessionCustomer] = useState<SessionPayload | null>(null)
  const [customerPhone, setCustomerPhone] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<{
    customer: RowType<'customer'> | null
    customerDetail: RowType<'customer_detail'> | null
    customerPoints: RowType<'customer_points'> | null
  } | null>(null)
  const [notes, setNotes] = useState<string>('')
  const [isPhoneValid, setIsPhoneValid] = useState(false) // 電話番号の有効性ステート
  const [organizationComplete, setOrganizationComplete] = useState<OrganizationCompleteData | null>(
    null
  )
  const [selectedMenus, setSelectedMenus] = useState<Doc<'menu'>[]>([])
  const [selectedStaffCompleted, setSelectedStaffCompleted] = useState<{
    staff: StaffDisplay | null
  } | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Doc<'option'>[]>([])
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
  const [availablePoints, setAvailablePoints] = useState<number>(0)
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
  const orgWeekSchedule = useQuery(
    api.organization.week_schedule.query.getAllByTenantAndOrg,
    sessionCustomer?.tenantId && sessionCustomer.orgId
      ? {
          tenant_id: sessionCustomer.tenantId,
          org_id: sessionCustomer.orgId,
        }
      : 'skip'
  )

  const pointConfig = useQuery(
    api.point.query.findByTenantAndOrg,
    sessionCustomer?.tenantId && sessionCustomer.orgId
      ? {
          tenant_id: sessionCustomer.tenantId,
          org_id: sessionCustomer.orgId,
        }
      : 'skip'
  )
  // Convex mutations
  const createReservationMutation = useMutation(api.reservation.mutation.create)
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
    router.push(`/reservation/${orgId}`)
    setIsLogout(false)
  }

  // クレジットカード決済処理を共通化
  const processCreditCardPayment = async (): Promise<string | null> => {
    if (
      !sessionCustomer ||
      !organizationComplete?.organization?._id ||
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
        org_id: organizationComplete.organization._id as Id<'organization'>,
        tenant_id: sessionCustomer.tenantId,
        customer_id: sessionCustomer.customerUid,
        staff_id: selectedStaffCompleted.staff._id as Id<'staff'>,
        customer_name: sessionCustomer.email
          ? sessionCustomer.email
          : (sessionCustomer.name ?? '不明'),
        staff_name: selectedStaffCompleted.staff.name ?? '不明',
        status: 'pending' as ReservationStatus,
        date: selectedDate ? formatDateToYYYYMMDD(selectedDate) : '',
        start_time_unix: reservationStartDateTime.getTime(),
        end_time_unix: reservationEndDateTime.getTime(),
        total_price: calculateTotal(), // 表示・保存用の最終合計金額
        coupon_id: appliedDiscount.couponId ?? undefined,
        payment_method: 'credit_card' as PaymentMethod,
        stripe_checkout_session_id: undefined,
        payment_status: 'pending' as ReservationPaymentStatus,
        menus: selectedMenus.map((menu) => ({
          id: menu._id,
          name: menu.name,
          price: menu.sale_price || menu.unit_price || 0,
          quantity: 1,
        })),
        options: countOptionOccurrences(selectedOptions),
        extra_charge: selectedStaffCompleted.staff.extra_charge || 0,
        use_points: 0, // 決済成功後に使用
        intended_point_use: usePoints, // 使用予定ポイントを記録
        coupon_discount: appliedDiscount.discount || undefined,
        featured_hair_images: [],
        notes: notes,
        pending_duration_minutes: 30, // 30分の有効期限
      }

      // 1. Convexに予約データを'pending'ステータスで作成
      let reservationId: Id<'reservation'> | null = null
      try {
        reservationId = await createReservationMutation(reservationData)

        // カルテのUpsert処理（クレジットカード決済時）
        try {
          // 顧客データが存在することを確認
          if (!customerData?.customer?.uid) {
            console.warn('[CalendarPage] Customer data not found, skipping carte creation')
          } else {
            // カルテを取得または作成
            const carte = await carteRepository.findOrCreateByCustomer(
              sessionCustomer.tenantId,
              organizationComplete.organization._id as Id<'organization'>,
              customerData.customer.uid,
              { ltv_price: 0 }
            )

            // カルテ詳細を作成
            await carteDetailRepository.createCarteDetail({
              tenant_id: sessionCustomer.tenantId,
              org_id: organizationComplete.organization._id as Id<'organization'>,
              carte_id: carte.id,
              reservation_id: reservationId, // Convex で作成された予約ID
              staff_id: reservationData.staff_id,
              staff_name: reservationData.staff_name, // スタッフ名を追加
              service_start_time: reservationData.start_time_unix
                ? new Date(reservationData.start_time_unix).toISOString()
                : undefined, // 施術開始時間を追加
              menu_details: reservationData.menus,
              option_details: reservationData.options,
              total_price: reservationData.total_price,
              customer_requests: notes, // 顧客のリクエスト（メモ欄）
              notes: '', // スタッフメモは空で初期化
              after_images: null, // 施術後画像は後で追加
            })

            console.log(
              `[CalendarPage] Created carte and carte_detail for customer ${sessionCustomer.customerUid}`
            )
          }
        } catch (carteError) {
          console.error('[CalendarPage] Error creating carte:', carteError)
          // カルテ作成に失敗してもユーザーにはエラーを表示しない（予約は既に作成済み）
        }
      } catch (error) {
        // 重複予約エラーの場合
        const errorData = error as {
          data?: {
            code?: string
            statusCode?: number
            severity?: string
            callFunc?: string
            message?: string
          }
        }
        if (errorData?.data?.code === 'CONFLICT' || errorData?.data?.statusCode === 409) {
          toast.error(
            '申し訳ございません。選択された時間帯は既に予約済みです。別の時間帯を選択してください。'
          )

          // 日時選択ステップに戻る（空き時間は自動的に再取得される）
          setCurrentStep('date')
          return null
        }

        // その他のエラー
        throw error
      }

      // 楽観的アプローチ: 在庫は予約作成時に即座に減算されるため、ここでの処理は不要

      // ポイントは決済成功後に使用されるため、ここでは処理しない
      if (usePoints > 0) {
        console.log(`決済成功後に${usePoints}ポイントが使用されます`)
      }

      // 顧客情報を更新（電話番号、最終予約日、予約回数）
      if (customerData?.customer) {
        const updatedCustomerData = {
          phone: customerPhone || customerData.customer.phone,
          email: customerData.customer.email,
          first_name: customerData.customer.first_name,
          last_name: customerData.customer.last_name,
          line_id: customerData.customer.line_id,
          line_user_name: customerData.customer.line_user_name,
          last_reservation_date_unix: Math.floor(reservationStartDateTime.getTime() / 1000),
          total_reservation_count: (customerData.customer.total_reservation_count || 0) + 1,
        }

        try {
          await customerRepository.updateCustomer(
            customerData.customer.uid,
            sessionCustomer.tenantId,
            organizationComplete.organization._id as Id<'organization'>,
            updatedCustomerData
          )
          console.log('顧客情報を更新しました')
        } catch (error) {
          console.error('顧客情報の更新に失敗しました:', error)
          // エラーでも予約処理は継続
        }
      }

      // 2. Stripe Checkoutセッションを作成するためのlineItemsを準備
      // 各アイテムの unit_amount には、独自システムで計算した割引適用後の価格を設定する

      const totalDiscountAmount = (appliedDiscount.discount || 0) + (usePoints || 0)

      const lineItemsRaw = [
        ...selectedMenus.map((menu) => ({
          name: menu.name,
          originalPrice: menu.sale_price || menu.unit_price || 0,
          type: 'menu' as const,
        })),
        ...countOptionOccurrences(selectedOptions).map(({ id, quantity }) => {
          const option = selectedOptions.find((opt) => opt._id === id)
          return {
            name: option?.name || 'オプション',
            originalPrice:
              (option?.sale_price ? option.sale_price : (option?.unit_price ?? 0)) * quantity,
            type: 'option' as const,
            quantity, // オプションの場合、quantityはここで考慮済みなので按分後の価格計算では使わない
          }
        }),
        ...(selectedStaffCompleted?.staff?.extra_charge &&
        selectedStaffCompleted.staff.extra_charge > 0
          ? [
              {
                name: '指名料',
                originalPrice: selectedStaffCompleted.staff.extra_charge,
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
        // 全額割引で実質0円の場合の処理 (例: Stripe Checkoutをスキップして予約を予約受付(confirmed)ステータスに変更する)
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
        stripeConnectId: organizationComplete.organization.stripe_account_id,
        reservationId,
        tenantId: sessionCustomer.tenantId,
        orgId,
        customerEmail: sessionCustomer.email,
        lineItems: stripeLineItems,
        couponId: appliedDiscount.couponId ?? undefined,
        pointsUsedAmount: usePoints,
      }
      console.log(
        'Request body for /api/stripe/connect/checkout:',
        JSON.stringify(requestBody, null, 2)
      )

      const response = await fetch('/api/stripe/checkout', {
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
      showErrorToast(error)
      return null
    }
  }

  const handleConfirmReservation = async () => {
    if (
      !sessionCustomer ||
      !organizationComplete?.organization?._id ||
      !selectedStaffCompleted?.staff ||
      !reservationStartDateTime ||
      !reservationEndDateTime ||
      !selectedPaymentMethod
    ) {
      console.error('予約に必要な情報が不足しています。')
      alert('予約に必要な情報が不足しています。選択内容をご確認ください。')
      return
    }

    setIsProcessingPayment(true)

    try {
      // 顧客情報を更新（電話番号、最終予約日、予約回数）
      if (customerData?.customer) {
        const updatedCustomerData = {
          phone: customerPhone || customerData.customer.phone,
          email: customerData.customer.email,
          first_name: customerData.customer.first_name,
          last_name: customerData.customer.last_name,
          line_id: customerData.customer.line_id,
          line_user_name: customerData.customer.line_user_name,
          // FIXME: これは予約が完了した時におこなうべき
          // last_reservation_date_unix: Math.floor(reservationStartDateTime.getTime() / 1000),
          // total_reservation_count: (customerData.customer.total_reservation_count || 0) + 1,
        }

        try {
          await customerRepository.updateCustomer(
            customerData.customer.uid,
            sessionCustomer.tenantId,
            organizationComplete.organization._id as Id<'organization'>,
            updatedCustomerData
          )
          console.log('顧客情報を更新しました')
        } catch (error) {
          console.error('顧客情報の更新に失敗しました:', error)
          // エラーでも予約処理は継続
        }
      }
      // 予約データを準備 (handleConfirmReservation内ではstatusをまだ設定しない)
      const reservationBaseData = {
        org_id: organizationComplete.organization._id as Id<'organization'>,
        tenant_id: sessionCustomer.tenantId,
        customer_id: sessionCustomer.customerUid,
        staff_id: selectedStaffCompleted.staff._id as Id<'staff'>,
        customer_name: sessionCustomer.email
          ? sessionCustomer.email
          : (sessionCustomer.name ?? '不明'),
        staff_name: selectedStaffCompleted.staff.name ?? '不明',
        status: 'confirmed' as ReservationStatus,
        date: selectedDate ? formatDateToYYYYMMDD(selectedDate) : '',
        start_time_unix: reservationStartDateTime.getTime(),
        end_time_unix: reservationEndDateTime.getTime(),
        total_price: calculateTotal(), // 表示・保存用の最終合計金額
        coupon_id: appliedDiscount.couponId ?? undefined,
        payment_method: selectedPaymentMethod,
        stripe_checkout_session_id: undefined,
        payment_status: 'pending' as ReservationPaymentStatus,
        menus: selectedMenus.map((menu) => ({
          id: menu._id,
          name: menu.name,
          price: menu.sale_price || menu.unit_price || 0,
          quantity: 1,
        })),
        options: countOptionOccurrences(selectedOptions),
        extra_charge: selectedStaffCompleted.staff.extra_charge || 0,
        use_points: usePoints,
        coupon_discount: appliedDiscount.discount || undefined,
        featured_hair_images: [],
        notes: notes,
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
        // 1. Convexに予約データを'confirmed'ステータスで作成（現金決済はすぐに予約受付）
        const reservationDataForCash = {
          ...reservationBaseData,
          status: 'confirmed' as ReservationStatus,
          intended_point_use: 0, // 現金決済は即座にポイント使用
        }

        let reservationId: Id<'reservation'> | null = null
        try {
          reservationId = await createReservationMutation(reservationDataForCash)

          // カルテのUpsert処理（現金決済時）
          try {
            // 顧客データが存在することを確認
            if (!customerData?.customer?.uid) {
              console.warn('[CalendarPage] Customer data not found, skipping carte creation')
            } else {
              // カルテを取得または作成
              const carte = await carteRepository.findOrCreateByCustomer(
                sessionCustomer.tenantId,
                organizationComplete.organization._id as Id<'organization'>,
                customerData.customer.uid,
                { ltv_price: 0 }
              )

              // 既存のLTV価格に今回の合計金額を加算　// FIXME: これは予約が完了した時におこなうべき
              // const newLtvPrice = (carte.ltv_price || 0) + reservationDataForCash.total_price
              // await carteRepository.updateLtvPrice(carte.id, newLtvPrice)

              // カルテ詳細を作成
              await carteDetailRepository.createCarteDetail({
                tenant_id: sessionCustomer.tenantId,
                org_id: organizationComplete.organization._id as Id<'organization'>,
                carte_id: carte.id,
                reservation_id: reservationId, // Convex で作成された予約ID
                staff_id: reservationDataForCash.staff_id,
                staff_name: reservationDataForCash.staff_name, // スタッフ名を追加
                service_start_time: reservationDataForCash.start_time_unix
                  ? new Date(reservationDataForCash.start_time_unix).toISOString()
                  : undefined, // 施術開始時間を追加（Unix時間はミリ秒単位）
                menu_details: reservationDataForCash.menus,
                option_details: reservationDataForCash.options,
                total_price: reservationDataForCash.total_price,
                customer_requests: notes, // 顧客のリクエスト（メモ欄）
                notes: '', // スタッフメモは空で初期化
                after_images: null, // 施術後画像は後で追加
              })

              console.log(
                `[CalendarPage] Created carte and carte_detail for customer ${sessionCustomer.customerUid}`
              )
            }
          } catch (carteError) {
            console.error('[CalendarPage] Error creating carte:', carteError)
            // カルテ作成に失敗してもユーザーにはエラーを表示しない（予約は既に作成済み）
          }
        } catch (error) {
          setIsProcessingPayment(false)

          // 重複予約エラーの場合
          const errorData = error as {
            data?: {
              code?: string
              statusCode?: number
              severity?: string
              callFunc?: string
              message?: string
            }
          }
          if (errorData?.data?.code === 'CONFLICT' || errorData?.data?.statusCode === 409) {
            toast.error(
              '申し訳ございません。選択された時間帯は既に予約済みです。別の時間帯を選択してください。'
            )

            // 日時選択ステップに戻る（空き時間は自動的に再取得される）
            setCurrentStep('date')
            return
          }

          // その他のエラー
          showErrorToast(error)
          return
        }

        // オプション在庫数の調整（現金決済は即座に在庫を減らす）
        const optionCounts = countOptionOccurrences(selectedOptions)
        for (const { id, quantity } of optionCounts) {
          // 選択されたオプションから対象のオプション情報を取得
          const option = selectedOptions.find((opt) => opt._id === id)
          if (option && option.in_stock !== undefined && option.in_stock !== null && quantity > 0) {
            // 現在の在庫数から使用数を減算
            try {
              await balanceStockMutation({
                option_id: id,
                quantity: -quantity, // 負の値で減算
              })
              console.log(`オプション「${option.name}」の在庫を${quantity}個減らしました`)
            } catch (error) {
              console.error(`オプション在庫の更新に失敗しました: ${error}`)
            }
          }
        }

        setIsProcessingPayment(false)

        // ポイントを利用していれば、アトミックポイント更新
        if (pointConfig?.is_active && usePoints && usePoints > 0 && customerData?.customer?.uid) {
          try {
            // Supabaseでアトミックポイント更新を実行
            const result = await customerRepository.updatePointsAtomic(
              sessionCustomer.customerUid,
              sessionCustomer.tenantId,
              organizationComplete.organization._id as Id<'organization'>,
              -usePoints, // 使用は負の値
              'used',
              'ポイント使用による割引',
              reservationId
            )
            console.log('ポイント使用処理が完了しました:', result)
          } catch (error) {
            console.error('ポイント処理でエラーが発生しました:', error)
            // ポイント処理のエラーは予約を妨げないようにする
          }
        }

        // クーポンを利用していれば、クーポントランザクションを作成
        if (
          appliedDiscount.couponId &&
          appliedDiscount.discount > 0 &&
          customerData?.customer?.uid
        ) {
          console.log('[CalendarPage] Creating coupon transaction:', {
            couponId: appliedDiscount.couponId,
            discount: appliedDiscount.discount,
            customerId: customerData.customer.uid,
            reservationId,
          })

          try {
            // APIエンドポイントを呼び出してクーポントランザクションを作成
            const response = await fetch('/api/coupon/create-transaction', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tenant_id: sessionCustomer.tenantId,
                org_id: organizationComplete.organization._id as Id<'organization'>,
                coupon_id: appliedDiscount.couponId,
                customer_id: customerData.customer.uid,
                reservation_id: reservationId!,
                discount_amount: appliedDiscount.discount,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || 'Failed to create coupon transaction')
            }

            const result = await response.json()
            console.log('[CalendarPage] クーポン利用履歴を作成しました:', result.data)
          } catch (error) {
            console.error('[CalendarPage] クーポン利用履歴の作成でエラーが発生しました:', error)
            // クーポン履歴のエラーは予約を妨げないようにする
          }
        } else {
          console.log('[CalendarPage] Skipping coupon transaction creation:', {
            hasCouponId: !!appliedDiscount.couponId,
            discount: appliedDiscount.discount,
            hasCustomerUid: !!customerData?.customer?.uid,
          })
        }

        if (sessionCustomer.lineUserId && organizationComplete.config) {
          // Lineにメッセージ予約の確認用Flexメッセージを作成
          const flexMessages = reservationFlexMessageTemplate(
            organizationComplete.organization, // 1. organization
            organizationComplete.config, // 2. orgConfig
            sessionCustomer.name ?? '不明', // 3. customerName
            organizationComplete.organization._id as Id<'organization'>, // 4. orgId
            sessionCustomer.customerUid, // 5. customerUid
            selectedStaffCompleted.staff, // 6. selectedStaff
            selectedDate!, // 7. selectedDate
            selectedTime!, // 8. selectedTimeSlot
            selectedMenus, // 9. selectedMenus
            selectedOptions, // 10. selectedOptions
            usePoints, // 11. usePoints
            appliedDiscount.discount || 0, // 12. couponDiscount
            calculateTotal(), // 13. calculateTotalPrice
            reservationId!, // 14. reservationId
            organizationComplete.reservationConfig?.available_cancel_days ?? 3 // 15. availableCancelDay
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
              accessToken: organizationComplete.apiConfig?.line_access_token,
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
              // サロンへのLINE通知を送信（エラーは無視）
              try {
                if (organizationComplete.apiConfig?.org_line_id) {
                  await fetch('/api/line/salon-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tenantId: sessionCustomer.tenantId,
                      organizationId: organizationComplete.organization._id,
                      reservationId: reservationId,
                      paymentMethod: 'cash',
                    }),
                  })
                }
              } catch (salonNotificationError) {
                console.warn('サロン通知の送信に失敗しました:', salonNotificationError)
                // サロン通知の失敗は顧客の予約処理をブロックしない
              }

              router.push(
                `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
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
          try {
            const mailSubject = `【${organizationComplete.organization.org_name}】ご予約内容の確認`

            const emailTemplateProps = {
              customerName: sessionCustomer.name || customerData?.customer?.first_name || 'お客様',
              customerEmail: sessionCustomer.email,
              orgName: organizationComplete.organization.org_name,
              orgPhone: organizationComplete.config?.phone,
              orgAddress: organizationComplete.config?.address,
              orgPostalCode: organizationComplete.config?.postal_code,
              reservationDate:
                selectedDate?.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                }) || '日付未定',
              reservationTime: selectedTime
                ? `${selectedTime.startHour}～${selectedTime.endHour}`
                : '時間未定',
              staffName: selectedStaffCompleted.staff.name,
              extraCharge: selectedStaffCompleted.staff.extra_charge,
              menus: selectedMenus.map((menu) => ({
                name: menu.name,
                price: menu.sale_price || menu.unit_price || 0,
              })),
              options: groupOptionsByName(selectedOptions).map((option) => ({
                name: option.name,
                price: option.salePrice || option.unitPrice || 0,
                count: option.count,
              })),
              subtotal: reservationBaseData.total_price,
              pointsUsed: usePoints > 0 ? usePoints : undefined,
              couponDiscount: appliedDiscount.discount > 0 ? appliedDiscount.discount : undefined,
              totalAmount: calculateTotal(),
              reservationRules: organizationComplete.config?.reservation_rules,
              reservationDetailUrl: `${BASE_URL}/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`,
            }

            const emailResponse = await fetch('/api/resend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: sessionCustomer.email,
                subject: mailSubject,
                templateProps: emailTemplateProps, // HTMLの代わりにtemplatePropsを渡す
              }),
            })

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json()
              console.error('メール送信APIエラー:', emailResponse.status, errorData)
              throw new Error(errorData.error || 'メール送信に失敗しました。')
            }
            const emailResult = await emailResponse.json()
            console.log('メール送信成功:', emailResult)

            // サロンへのLINE通知を送信（エラーは無視）
            try {
              if (organizationComplete.apiConfig?.org_line_id) {
                await fetch('/api/line/salon-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tenantId: sessionCustomer.tenantId,
                    organizationId: organizationComplete.organization._id,
                    reservationId: reservationId,
                    paymentMethod: 'cash',
                  }),
                })
              }
            } catch (salonNotificationError) {
              console.warn('サロン通知の送信に失敗しました:', salonNotificationError)
              // サロン通知の失敗は顧客の予約処理をブロックしない
            }

            router.push(
              `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
            )
          } catch (e) {
            console.error('メール送信処理エラー:', e)
            toast.error('メールの送信に失敗しましたが、予約は受け付けました。')
            // メール送信失敗時も予約完了ページには遷移する
            router.push(
              `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
            )
          }
        } else {
          toast.error('LINEにもメールにも通知できませんでしたが、予約は受け付けました。')
          router.push(
            `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
          )
        }

        // FIXME: これは予約が完了した時におこなうべき
        // ポイントを付与するqueueを作成
        // if (sessionCustomer?.customerUid && pointConfig && pointConfig.is_active) {
        //   // ポイント計算（割引前金額で計算）
        //   const calculateEarnedPoints = (
        //     menus: Doc<'menu'>[],
        //     options: Doc<'option'>[],
        //     extraCharge: number = 0
        //   ) => {
        //     // 1. ベース金額計算（クーポン割引前、税込金額）
        //     const baseAmount =
        //       menus.reduce((sum, menu) => {
        //         return sum + (menu.sale_price || menu.unit_price)
        //       }, 0) + extraCharge

        //     // 2. オプション金額追加
        //     const optionAmount = options.reduce((sum, option) => {
        //       return sum + (option.sale_price || option.unit_price)
        //     }, 0)

        //     // 3. 税込み総額（クーポン・ポイント使用前）
        //     const totalAmount = baseAmount + optionAmount

        //     // 4. ポイント計算（割引前金額で計算）
        //     const earnedPoints = pointConfig.is_fixed_point
        //       ? pointConfig.fixed_point || 0
        //       : Math.floor(totalAmount * ((pointConfig.point_rate || 0) / 100))

        //     return Math.max(0, earnedPoints)
        //   }

        //   const earnPoints = calculateEarnedPoints(
        //     selectedMenus,
        //     selectedOptions,
        //     selectedStaffCompleted?.staff?.extra_charge || 0
        //   )

        //   // ポイントが0より大きい場合のみキューを作成
        //   if (earnPoints > 0) {
        //     const scheduledForUnix =
        //       Math.floor(reservationStartDateTime.getTime() / 1000) + 60 * 60 * 24 * 30 // 予約日の30日後（Unix秒単位）

        //     try {
        //       // 顧客UIDが確実に存在することを確認
        //       if (!customerData?.customer?.uid) {
        //         console.warn('[CalendarPage] Customer UID not found, skipping point queue creation')
        //       } else {
        //         // Supabaseでポイントキューを作成する
        //         const pointQueue = await pointTaskQueueRepository.createPointTask({
        //           tenant_id: sessionCustomer.tenantId,
        //           org_id: organizationComplete.organization._id as Id<'organization'>,
        //           reservation_id: reservationId,
        //           customer_id: customerData.customer.uid,
        //           points: earnPoints,
        //           scheduled_for_unix: scheduledForUnix,
        //         })
        //         console.log('Point queue created:', pointQueue)
        //       }
        //     } catch (error) {
        //       console.error('Failed to create point queue:', error)
        //       // ポイントキュー作成に失敗しても予約は成功としてそのまま続行
        //     }
        //   }
        // }

        toast.success(
          '予約を受け付けしました。予約確認メールまたはLINEメッセージを送信しましたのでご確認ください。'
        )
        router.push(
          `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
        )
      }
    } catch (error) {
      showErrorToast(error)
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
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          // セッションが見つからない場合はリダイレクト
          console.error('認証セッションが見つかりません。予約画面に戻ります。')
          router.push(`/reservation/${orgId}`)
          return
        }

        console.log('response', response)

        const data = await response.json()
        let sessionCustomer: SessionPayload | null = null

        // APIから返されるsessionは既にデコード済みのオブジェクト
        if (data.session) {
          sessionCustomer = data.session as SessionPayload
          console.log('sessionCustomer', sessionCustomer)
        }

        setSessionCustomer(sessionCustomer)
        if (sessionCustomer?.orgId) {
          try {
            const organizationComplete = await fetchQuery(api.organization.query.getRelations, {
              tenant_id: sessionCustomer.tenantId,
              org_id: sessionCustomer.orgId as Id<'organization'>,
            })

            setOrganizationComplete(organizationComplete)

            if (sessionCustomer.customerUid === undefined || sessionCustomer.orgId === undefined) {
              // cookiesを明示的に削除
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
              router.push(`/reservation/${sessionCustomer.orgId}`)
            }

            const { customer, customerDetail, customerPoints } =
              await customerRepository.getCompleteCustomerData(
                sessionCustomer.customerUid,
                sessionCustomer.tenantId,
                organizationComplete.organization._id as Id<'organization'>
              )

            setCustomerData({
              customer,
              customerDetail,
              customerPoints,
            })

            // 実際のポイント数をセット
            setAvailablePoints(customerPoints?.total_points || 0)

            setCustomerPhone(customer?.phone || null)
            setIsPhoneValid(isValidPhoneNumber(customer?.phone || null)) // 初期値のバリデーション
          } catch (error) {
            console.error('サロン情報の取得に失敗しました:', error)
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            if (liff?.isLoggedIn()) {
              liff.logout()
            }
            toast.error('サロン情報の取得に失敗しました。サロンが削除されている可能性があります。')
            setOrganizationComplete(null)
          }
        } else {
          router.push('/reservation')
        }
      } catch (error) {
        console.error('セッション取得中にエラーが発生しました:', error)
        router.push(`/reservation/${sessionCustomer?.orgId}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [router, liff, orgId, customerRepository, sessionCustomer?.orgId])

  if (isLoading) return <Loading />

  if (!organizationComplete) {
    if (sessionCustomer?.orgId) {
      return router.push(`/reservation/${sessionCustomer.orgId}`)
    } else {
      return router.push('/reservation')
    }
  }

  // 合計金額の計算
  const calculateTotal = () => {
    // メニュー価格の合計
    const menuTotal = selectedMenus.reduce(
      (sum, menu) => sum + (menu.sale_price || menu.unit_price || 0),
      0
    )

    // オプション価格の合計（複数選択を考慮）
    const optionTotal = selectedOptions.reduce(
      (sum, option) => sum + (option.sale_price ? option.sale_price : (option.unit_price ?? 0)),
      0
    )

    // 指名料
    const extraChargeTotal = selectedStaffCompleted?.staff?.extra_charge || 0

    // 割引額
    const discount = appliedDiscount.discount + usePoints

    return menuTotal + optionTotal + extraChargeTotal - discount
  }

  const calculateTotalMinutes = () => {
    // メニュー時間の合計
    const menuMinutes = selectedMenus.reduce((sum, menu) => {
      return sum + (menu.duration_min || 0)
    }, 0)

    // オプション時間の合計（複数選択を考慮）
    const optionMinutes = selectedOptions.reduce((sum, option) => {
      return sum + (option.duration_min || 0)
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
        color: 'bg-accent-2 text-background',
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
                          ? `bg-background border border-accent-2 text-accent-2`
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
                        tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                        orgId={organizationComplete.organization._id as Id<'organization'>}
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
                        className="relative overflow-hidden w-full transition-all duration-200 ease-in-out"
                      >
                        <motion.div
                          className="flex items-center justify-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          次へ進む
                        </motion.div>
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
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
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
                        className="relative overflow-hidden w-full transition-all duration-200 ease-in-out"
                      >
                        <motion.div
                          className="flex items-center justify-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          次へ進む
                        </motion.div>
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
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
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
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
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
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
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
                                showErrorToast(error)
                                setIsCreatingCheckoutSession(false)
                              }
                            }}
                            disabled={
                              isCreatingCheckoutSession || isProcessingPayment || !isPhoneValid
                            }
                            className="relative overflow-hidden w-full"
                          >
                            <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              {isCreatingCheckoutSession ? (
                                <div className="flex items-center justify-center gap-2">
                                  処理中...
                                  <Loader2 className="animate-spin ml-2" />
                                </div>
                              ) : (
                                'クレジットカードで支払う'
                              )}
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
                            {isProcessingPayment ? (
                              <div className="flex items-center justify-center gap-2">
                                処理中...
                                <Loader2 className="animate-spin ml-2" />
                              </div>
                            ) : selectedPaymentMethod === 'credit_card' ? (
                              '予約内容を確認 (現金払い)'
                            ) : (
                              '予約を確定する'
                            )}
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

  return (
    <div className="container max-w-3xl mx-auto p-4" style={{ paddingBottom: bottomBarHeight }}>
      <div className="overflow-hidden flex items-center justify-between mb-2">
        <div>
          {/* サロン情報を表示するSheet */}
          <Sheet open={isSalonInfoSheetOpen} onOpenChange={setIsSalonInfoSheetOpen}>
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
                      ?.sort((a: Doc<'week_schedule'>, b: Doc<'week_schedule'>) => {
                        const dayA = dayOrder[a.day_of_week!] ?? 8 // 未定義の曜日は最後に
                        const dayB = dayOrder[b.day_of_week!] ?? 8 // 未定義の曜日は最後に
                        return dayA - dayB
                      })
                      .map((schedule: Doc<'week_schedule'>, index: number) => (
                        <div
                          key={index}
                          className="flex  items-center justify-start gap-1 border-b border-border pb-2"
                        >
                          <div className="flex  items-center justify-start gap-2 mr-3">
                            <div
                              className={`h-3 w-3 rounded-full border border-border ring-1 ring-offset-1 ${schedule.is_open ? 'bg-accent-2 ring-accent-2' : 'bg-destructive-foreground ring-destructive-foreground'}`}
                            />
                            <p className="text-sm text-muted-foreground text-nowrap">
                              {convertDayOfWeekToJa(schedule.day_of_week!)}
                            </p>
                          </div>
                          <p
                            className={`text-sm text-center font-bold ${schedule.is_open ? 'text-muted-foreground' : 'text-destructive'}`}
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

          {sessionCustomer?.name ? (
            <p className="text-sm flex items-center gap-2 mt-1">
              <CheckCheck className="w-5 h-5 text-accent-2 rounded-full p-1" />
              <span className="font-light">{sessionCustomer?.name} 様</span>
            </p>
          ) : (
            sessionCustomer?.email && (
              <p className="text-sm flex items-center gap-2 mt-1">
                <CheckCheck className="w-5 h-5 text-accent-2" />
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
          <DialogFooter className="flex flex-col md:flex-row gap-4">
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
